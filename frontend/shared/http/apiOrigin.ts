const LOCAL_BACKEND_ORIGIN = "http://localhost:5000"
const configuredApiOrigin = process.env.NEXT_PUBLIC_API_URL?.trim()

/** Public backend origin shared by HTTP and Socket.IO transports. */
export const API_ORIGIN = (
  configuredApiOrigin || (process.env.NODE_ENV === "development" ? LOCAL_BACKEND_ORIGIN : "")
).replace(/\/+$/, "")
