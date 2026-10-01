import cloudinary from "#/configs/cloudinary.config"

interface ImageParams {
    url: string
    id: string
}

/**
 *
 * @param currentImage Current image in database
 * @param newFile Upload image (If exists)
 * @param shouldDelete Delete status (If "null" => true)
 * @returns
 * - Object { url, id }: If existing new image
 * - null: If delete image
 * - undefined: If not change
 */
export const processImageHelper = async ({
    currentImage,
    newFile,
    shouldDelete,
}: {
    currentImage: ImageParams | null | undefined
    newFile: Express.Multer.File | undefined
    shouldDelete: boolean
}) => {
    // CASE 1: Upload new file
    if (newFile) {
        // Delete old file
        if (currentImage?.id) {
            await cloudinary.uploader.destroy(currentImage.id)
        }
        // Return new image
        return {
            url: newFile.path,
            id: newFile.filename,
        }
    }

    // CASE 2: Delete image
    if (shouldDelete) {
        if (currentImage?.id) {
            await cloudinary.uploader.destroy(currentImage.id)
        }

        return null
    }

    // CASE 3: Not change image
    return undefined
}
