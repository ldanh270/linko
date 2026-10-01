import cloudinary from "#/configs/cloudinary.config"

import multer from "multer"
import { CloudinaryStorage } from "multer-storage-cloudinary"

const sanitizeFilename = (name: string) => {
    return name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove vietnamese sign
        .replace(/[^a-zA-Z0-9]/g, "-") // Remove special sign with "-"
        .replace(/-+/g, "-") // Avoid multi "-"
        .replace(/^-|-$/g, "") // Remove first and last "-"
}

/**
 * Middleware to transfer uploaded file to Cloundinary
 * Response image url instead of save to server hardware
 */
const storage = new CloudinaryStorage({
    /**
     * Connect with Cloudinary account
     * Include CLOUD_NAME, API_KEY, API SECRET
     */
    cloudinary: cloudinary,

    /**
     * Dinamic configuration
     * Always run whenever a file uploaded
     * @param req request info (body, header, ...)
     * @param file upload file info (file name, type, metadata, ...)
     * @returns file info after uploaded to Cloudinary
     */
    params: async (req, file) => {
        // Auto classify folder
        const folderName = file.fieldname === "avatar" ? "linko/avatars" : "linko/backgrounds"

        const nameWithoutExt = file.originalname.split(".").slice(0, -1).join(".")
        const safeName = sanitizeFilename(nameWithoutExt)
        const publicId = `${Date.now()}-${safeName}`

        return {
            // Folder that file was added to
            folder: folderName,
            // Convert to jpg to save space & bandwidth
            format: "jpg",
            // Only accept image for avoid error
            resource_type: "image",
            // Filter upload format type (Remove junk files)
            // allowed_formats: ["jpg", "png", "jpeg", "webp"],
            // Resize for oversize images ()
            transformation: [
                { width: 800, crop: "limit" }, // Only zoom out if width < 800 not zoom in
                { quality: "auto" }, // Auto optimize quality
                { fetch_format: "auto" }, // Auto choose format (depending on broswer)
            ],
            // File name (id) on Cloudinary
            public_id: publicId,
        }
    },
})

const uploadCloud = multer({ storage })

export { uploadCloud }
