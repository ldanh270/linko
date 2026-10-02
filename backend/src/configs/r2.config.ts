export type R2StorageSettings = {
    accountId: string
    accessKeyId: string
    secretAccessKey: string
    publicBucketName: string
    privateBucketName: string
    publicBaseUrl: string
}

const required = (name: string) => {
    const value = process.env[name]?.trim()
    if (!value) throw new Error(`Missing required R2 setting: ${name}`)
    return value
}

const isBucketName = (value: string) =>
    value.length >= 3 &&
    value.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(value)

export const getR2Settings = (): R2StorageSettings => {
    const accountId = required("R2_ACCOUNT_ID")
    if (!/^[a-f0-9]{32}$/i.test(accountId)) {
        throw new Error("R2_ACCOUNT_ID must be the 32-character Cloudflare account ID")
    }

    const publicBucketName = required("R2_PUBLIC_BUCKET_NAME")
    const privateBucketName = required("R2_PRIVATE_BUCKET_NAME")
    if (!isBucketName(publicBucketName) || !isBucketName(privateBucketName)) {
        throw new Error("R2 bucket names must be valid lowercase S3 bucket names")
    }
    if (publicBucketName === privateBucketName) {
        throw new Error("R2_PUBLIC_BUCKET_NAME and R2_PRIVATE_BUCKET_NAME must be different")
    }

    const rawBaseUrl = required("R2_PUBLIC_BASE_URL")
    let publicBaseUrl: URL
    try {
        publicBaseUrl = new URL(rawBaseUrl)
    } catch {
        throw new Error("R2_PUBLIC_BASE_URL must be an HTTPS URL for the public media domain")
    }
    if (
        publicBaseUrl.protocol !== "https:" ||
        publicBaseUrl.username ||
        publicBaseUrl.password ||
        publicBaseUrl.search ||
        publicBaseUrl.hash
    ) {
        throw new Error("R2_PUBLIC_BASE_URL must be an HTTPS URL without credentials, query, or fragment")
    }

    return {
        accountId,
        accessKeyId: required("R2_ACCESS_KEY_ID"),
        secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
        publicBucketName,
        privateBucketName,
        publicBaseUrl: rawBaseUrl.replace(/\/+$/, ""),
    }
}
