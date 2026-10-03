import { getProfileImageFormat, normalizeUploadMimeType } from "#/configs/uploadPolicy.config"
import { deleteR2Object, getPublicR2Url, putR2Object } from "#/services/r2Storage.service"

import { randomUUID } from "node:crypto"
import sharp from "sharp"

/** Stored public image metadata used to remove replaced R2 or legacy media. */
export type ImageParams = {
    url?: string
    id?: string
}

/** Uploaded image bytes required by public profile and group avatar storage. */
export interface ImageUpload {
    readonly buffer: Buffer
    readonly mimetype: string
}

/** Describe an image whose bytes do not match the accepted image contract. */
export class InvalidProfileImageError extends Error {
    /** Create a validation error for an image that cannot be stored safely. */
    constructor(message: string) {
        super(message)
        this.name = new.target.name
    }
}

/** Validate, normalize, and store a public profile or group avatar image. */
export const storeProfileImage = async ({
    userId,
    field,
    file,
}: {
    userId: string
    field: "avatar" | "background"
    file: ImageUpload
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

/** Remove a public R2 image or its legacy Cloudinary equivalent. */
export const deleteStoredProfileImage = async (image: ImageParams) => {
    if (!image.id) return

    if (image.id.startsWith("r2:")) {
        await deleteR2Object({ bucket: "public", key: image.id.slice(3) })
        return
    }

    const { default: cloudinary } = await import("#/configs/cloudinary.config")
    await cloudinary.uploader.destroy(image.id)
}
