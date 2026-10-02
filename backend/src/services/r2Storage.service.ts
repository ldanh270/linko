import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getR2Settings } from "#/configs/r2.config"

type R2BucketScope = "public" | "private"

let client: S3Client | undefined

const getClient = (settings: ReturnType<typeof getR2Settings>) => {
    client ??= new S3Client({
        region: "auto",
        endpoint: `https://${settings.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey,
        },
    })
    return client
}

const getBucketName = (scope: R2BucketScope, settings: ReturnType<typeof getR2Settings>) =>
    scope === "public" ? settings.publicBucketName : settings.privateBucketName

export const putR2Object = async ({
    bucket,
    key,
    body,
    contentType,
}: {
    bucket: R2BucketScope
    key: string
    body: Buffer
    contentType: string
}) => {
    const settings = getR2Settings()
    await getClient(settings).send(
        new PutObjectCommand({
            Bucket: getBucketName(bucket, settings),
            Key: key,
            Body: body,
            ContentType: contentType,
        }),
    )
}

export const deleteR2Object = async ({ bucket, key }: { bucket: R2BucketScope; key: string }) => {
    const settings = getR2Settings()
    await getClient(settings).send(
        new DeleteObjectCommand({ Bucket: getBucketName(bucket, settings), Key: key }),
    )
}

export const getPrivateR2Object = async (key: string) => {
    const settings = getR2Settings()
    const result = await getClient(settings).send(
        new GetObjectCommand({ Bucket: settings.privateBucketName, Key: key }),
    )
    if (!result.Body) throw new Error("R2 object has no response body")

    return {
        body: result.Body as unknown as NodeJS.ReadableStream,
        contentType: result.ContentType,
        contentLength: result.ContentLength,
    }
}

export const getPublicR2Url = (key: string) => {
    const settings = getR2Settings()
    const encodedKey = key.split("/").map(encodeURIComponent).join("/")
    return `${settings.publicBaseUrl}/${encodedKey}`
}
