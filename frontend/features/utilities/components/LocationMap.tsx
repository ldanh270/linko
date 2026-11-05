"use client"
import type { LocationShareDto } from "@linko/contracts"
import { useLocationMap } from "../hooks/useLocationMap"
import "leaflet/dist/leaflet.css"

/** Authorized latest points passed by the owning resource query. */
export interface LocationMapProps { readonly shares: readonly LocationShareDto[] }
/** Render an attributed, optional map; source status remains readable if tiles fail. UI only. */
export function LocationMap({ shares }: LocationMapProps) {
  const { ref, failed } = useLocationMap(shares)
  return <div className="grid gap-1"><div ref={ref} className="relative z-0 h-56 w-full rounded-md overflow-hidden border border-border" aria-label="Bản đồ vị trí đang chia sẻ" />{failed && <p role="status" className="text-xs text-text-secondary">Bản đồ chưa tải được. Thời điểm và độ chính xác bên dưới vẫn có thể xem.</p>}</div>
}
