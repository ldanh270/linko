import type { MessageAttachmentSpec } from "#/configs/uploadPolicy.config"

import { createInflateRaw } from "node:zlib"

type ZipEntry = {
    name: string
    method: number
    compressedSize: number
    uncompressedSize: number
    localHeaderOffset: number
}

const getZipEntries = (buffer: Buffer): Map<string, ZipEntry> | null => {
    const minOffset = Math.max(0, buffer.length - 22 - 65_535)
    let eocdOffset = -1

    for (let offset = buffer.length - 22; offset >= minOffset; offset--) {
        if (buffer.readUInt32LE(offset) === 0x06054b50) {
            eocdOffset = offset
            break
        }
    }

    if (eocdOffset < 0 || eocdOffset + 22 > buffer.length) return null
    if (buffer.readUInt16LE(eocdOffset + 4) !== 0 || buffer.readUInt16LE(eocdOffset + 6) !== 0) {
        return null
    }

    const entryCount = buffer.readUInt16LE(eocdOffset + 10)
    const centralDirectorySize = buffer.readUInt32LE(eocdOffset + 12)
    let offset = buffer.readUInt32LE(eocdOffset + 16)
    const directoryEnd = offset + centralDirectorySize
    if (entryCount === 0 || entryCount > 20_000 || directoryEnd > eocdOffset) return null

    const entries = new Map<string, ZipEntry>()
    for (let index = 0; index < entryCount; index++) {
        if (offset + 46 > directoryEnd || buffer.readUInt32LE(offset) !== 0x02014b50) return null

        const flags = buffer.readUInt16LE(offset + 8)
        const method = buffer.readUInt16LE(offset + 10)
        const compressedSize = buffer.readUInt32LE(offset + 20)
        const uncompressedSize = buffer.readUInt32LE(offset + 24)
        const nameLength = buffer.readUInt16LE(offset + 28)
        const extraLength = buffer.readUInt16LE(offset + 30)
        const commentLength = buffer.readUInt16LE(offset + 32)
        const diskNumber = buffer.readUInt16LE(offset + 34)
        const localHeaderOffset = buffer.readUInt32LE(offset + 42)
        const entryEnd = offset + 46 + nameLength + extraLength + commentLength

        if (
            (flags & 1) !== 0 ||
            diskNumber !== 0 ||
            compressedSize === 0xffffffff ||
            uncompressedSize === 0xffffffff ||
            localHeaderOffset === 0xffffffff ||
            entryEnd > directoryEnd
        ) {
            return null
        }

        const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength).toLowerCase()
        if (entries.has(name)) return null

        entries.set(name, { name, method, compressedSize, uncompressedSize, localHeaderOffset })
        offset = entryEnd
    }

    if (offset !== directoryEnd) return null
    if ([...entries.keys()].some((entry) => /(^|\/)vbaproject\.bin$/i.test(entry))) return null
    return entries
}

const readZipEntryPrefix = async (
    buffer: Buffer,
    entry: ZipEntry,
    maxBytes: number,
    requireComplete: boolean,
): Promise<Buffer | null> => {
    const headerOffset = entry.localHeaderOffset
    if (
        headerOffset + 30 > buffer.length ||
        buffer.readUInt32LE(headerOffset) !== 0x04034b50 ||
        (buffer.readUInt16LE(headerOffset + 6) & 1) !== 0 ||
        buffer.readUInt16LE(headerOffset + 8) !== entry.method
    ) {
        return null
    }

    const nameLength = buffer.readUInt16LE(headerOffset + 26)
    const extraLength = buffer.readUInt16LE(headerOffset + 28)
    const localName = buffer
        .toString("utf8", headerOffset + 30, headerOffset + 30 + nameLength)
        .toLowerCase()
    if (localName !== entry.name) return null

    const dataOffset = headerOffset + 30 + nameLength + extraLength
    const dataEnd = dataOffset + entry.compressedSize
    if (
        dataEnd > buffer.length ||
        (requireComplete && entry.uncompressedSize > maxBytes)
    ) {
        return null
    }

    const compressed = buffer.subarray(dataOffset, dataEnd)
    let prefix: Buffer

    if (entry.method === 0) {
        prefix = compressed.subarray(0, maxBytes)
    } else if (entry.method === 8) {
        prefix = await inflatePrefix(compressed, maxBytes)
    } else {
        return null
    }

    if (requireComplete && prefix.length !== entry.uncompressedSize) return null
    if (!requireComplete && prefix.length < Math.min(entry.uncompressedSize, maxBytes)) return null
    return prefix
}

const inflatePrefix = (compressed: Buffer, maxBytes: number) =>
    new Promise<Buffer>((resolve, reject) => {
        const inflater = createInflateRaw()
        const chunks: Buffer[] = []
        let size = 0
        let settled = false

        inflater.on("data", (chunk: Buffer) => {
            const part = chunk.subarray(0, maxBytes - size)
            if (part.length) {
                chunks.push(part)
                size += part.length
            }
            if (size >= maxBytes && !settled) {
                settled = true
                resolve(Buffer.concat(chunks, size))
                inflater.destroy()
            }
        })
        inflater.once("end", () => {
            if (settled) return
            settled = true
            resolve(Buffer.concat(chunks, size))
        })
        inflater.once("error", (error) => {
            if (settled) return
            settled = true
            reject(error)
        })
        inflater.end(compressed)
    })

const removeCommentsAndCData = (xml: string) =>
    xml.replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "")

const removeXmlDeclaration = (xml: string) =>
    xml.replace(/^\s*(?:<\?xml\b[\s\S]*?\?>\s*)?/i, "")

const hasMainPartDeclaration = (contentTypesXml: string, spec: MessageAttachmentSpec) => {
    if (!spec.zipEntry || !spec.mainContentType) return false

    const contentTypes = removeXmlDeclaration(removeCommentsAndCData(contentTypesXml))
    if (!/^<(?:[\w.-]+:)?Types(?=[\s>])/i.test(contentTypes)) return false

    const expectedPart = `/${spec.zipEntry}`
    return [...contentTypes.matchAll(/<Override(?=[\s>])([^>]*)\/?\s*>/gi)].some(
        ([, attributes]) => {
            const partName = /\bPartName\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1]
            const contentType = /\bContentType\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1]
            return partName === expectedPart && contentType === spec.mainContentType
        },
    )
}

const hasExpectedMainPartRoot = (mainPartXml: string, spec: MessageAttachmentSpec) => {
    if (!spec.mainRoot) return false
    const mainPart = removeXmlDeclaration(removeCommentsAndCData(mainPartXml))
    return new RegExp(`^<([\\w.-]+:)?${spec.mainRoot}(?=[\\s>])`, "i").test(mainPart)
}

export const isValidOpenXmlPackage = async (buffer: Buffer, spec: MessageAttachmentSpec) => {
    if (!spec.zipEntry || !spec.mainRoot || !spec.mainContentType) return false

    let entries: Map<string, ZipEntry> | null
    try {
        entries = getZipEntries(buffer)
    } catch {
        return false
    }
    if (!entries) return false

    const contentTypesEntry = entries.get("[content_types].xml")
    const mainEntry = entries.get(spec.zipEntry)
    if (!contentTypesEntry || !mainEntry) return false

    let contentTypesBuffer: Buffer | null
    let mainPartBuffer: Buffer | null
    try {
        contentTypesBuffer = await readZipEntryPrefix(buffer, contentTypesEntry, 256 * 1024, true)
        mainPartBuffer = await readZipEntryPrefix(buffer, mainEntry, 16 * 1024, false)
    } catch {
        return false
    }
    if (!contentTypesBuffer || !mainPartBuffer) return false

    let contentTypesXml: string
    let mainPartXml: string
    try {
        contentTypesXml = new TextDecoder("utf-8", { fatal: true }).decode(contentTypesBuffer)
        // The main part is a bounded prefix and may end midway through a UTF-8 character.
        mainPartXml = new TextDecoder("utf-8").decode(mainPartBuffer)
    } catch {
        return false
    }

    return (
        hasMainPartDeclaration(contentTypesXml, spec) &&
        hasExpectedMainPartRoot(mainPartXml, spec)
    )
}
