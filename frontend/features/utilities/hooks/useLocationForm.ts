"use client"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { utilityApi } from "../api/utility.api"
import { getLocationPublisher } from "../location-publisher"
import { useUtilityAction } from "./useUtilityAction"

/** Request a fresh position only after the person deliberately confirms sharing. */
function initialPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error("Thiết bị không hỗ trợ vị trí.")); return }
    navigator.geolocation.getCurrentPosition(resolve, (error) => reject(new Error(error.code === 1 ? "Bạn chưa cho phép truy cập vị trí. Mở cài đặt trình duyệt để cho phép rồi thử lại." : "Không lấy được vị trí. Kiểm tra GPS và kết nối rồi thử lại.")), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
  })
}
/** Own duration consent, initial GPS acquisition and publishing-tab identity. */
export function useLocationForm(conversationId: string, onClose: () => void) {
  const requestId = useRef(crypto.randomUUID())
  const publisherId = useRef(crypto.randomUUID())
  const [error, setError] = useState<string | null>(null)
  const form = useForm({ defaultValues: { durationMinutes: "15", consent: false } })
  const mutation = useUtilityAction(async (values: { durationMinutes: string; consent: boolean }) => {
    try {
      setError(null)
      const position = await initialPosition()
      const share = await utilityApi.createLocation(conversationId, { clientMessageId: requestId.current, publisherId: publisherId.current, durationMinutes: Number(values.durationMinutes), latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy })
      getLocationPublisher().start(share, publisherId.current)
      return share
    } catch (failure) { setError(failure instanceof Error && !("status" in failure) ? failure.message : "Chưa chia sẻ được vị trí. Hãy thử lại."); throw failure }
  }, onClose)
  return { ...form, submit: form.handleSubmit((values) => { if (values.consent && !mutation.isPending) mutation.mutate(values) }), isPending: mutation.isPending, error }
}
