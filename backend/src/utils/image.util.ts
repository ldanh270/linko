import { getProfileImageFormat, normalizeUploadMimeType } from "#/configs/uploadPolicy.config"
import { deleteR2Object, getPublicR2Url, putR2Object } from "#/services/r2Storage.service"

import { randomUUID } from "node:crypto"
import sharp from "sharp"

export type ImageParams = {
    url?: string
    id?: string
}

export class InvalidProfileImageError extends Error {}

export const storeProfileImage = async ({
    userId,
    field,
    file,
}: {
    userId: string
    field: "avatar" | "background"
    file: Express.Multer.File
}): Promise<{ url: string; id: string }> => {
    const format = getProfileImageFormat(normalizeUploadMimeType(file.mimetype))
    if (!format) throw new InvalidProfileImageError("Profile images must be JPEG, PNG, or WebP")

    let body: Buffer
    try {
        const metadata = await sharp(file.buffer, {
            failOn: "error",
            limitInputPixels: 100_000_000,
        }).metadata()
        if (metadata.format !== format) {
            throw new InvalidProfileImageError("Image bytes do not match the declared content type")
        }

        body = await sharp(file.buffer, { failOn: "error", limitInputPixels: 100_000_000 })
            .rotate()
            .resize({ width: 800, withoutEnlargement: true })
            .jpeg({ quality: 82 })
            .toBuffer()
    } catch (error) {
        if (error instanceof InvalidProfileImageError) throw error
        throw new InvalidProfileImageError("The uploaded profile image is invalid")
    }
    const key = `${field === "avatar" ? "avatars" : "backgrounds"}/${userId}/${randomUUID()}.jpg`

    await putR2Object({ bucket: "public", key, body, contentType: "image/jpeg" })
    return { url: getPublicR2Url(key), id: `r2:${key}` }
}

export const deleteStoredProfileImage = async (image: ImageParams) => {
    if (!image.id) return

    if (image.id.startsWith("r2:")) {
        await deleteR2Object({ bucket: "public", key: image.id.slice(3) })
        return
    }

    const { default: cloudinary } = await import("#/configs/cloudinary.config")
    await cloudinary.uploader.destroy(image.id)
}
