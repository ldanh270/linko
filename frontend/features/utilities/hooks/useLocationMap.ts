"use client"
import { useEffect, useRef, useState } from "react"
import type { LocationShareDto } from "@linko/contracts"
import { UTILITY_UI } from "../utility.constants"
import { useUtilityIdentity } from "../utility-identity"
import type { Map as LeafletMap, LayerGroup } from "leaflet"

/** Create a client-only map with no route/history storage or coordinate-bearing application URL. */
export function useLocationMap(shares: readonly LocationShareDto[]) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const mapRef = useRef<LeafletMap | null>(null)
  const layersRef = useRef<LayerGroup | null>(null)
  const name = useUtilityIdentity()
  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; layersRef.current = null }, [])
  useEffect(() => {
    const node = ref.current
    if (!node) return
    let disposed = false
    void import("leaflet").then((L) => {
      if (disposed) return
      const points = shares.flatMap((share) => share.position ? [{ share, point: L.latLng(share.position.latitude, share.position.longitude) }] : [])
      layersRef.current?.clearLayers()
      if (!points.length) return
      if (!mapRef.current) {
        const map = L.map(node, { scrollWheelZoom: false }).setView(points[0].point, 15)
        mapRef.current = map
        layersRef.current = L.layerGroup().addTo(map)
        L.tileLayer(UTILITY_UI.MAP_TILE_URL, { attribution: UTILITY_UI.MAP_ATTRIBUTION, maxZoom: 19 }).on("tileerror", () => setFailed(true)).addTo(map)
        if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((entry) => entry.point)), { padding: [24, 24], maxZoom: 16 })
      }
      const layers = layersRef.current
      if (!layers) return
      for (const { share, point } of points) {
        L.circleMarker(point, { radius: 8, color: "#7269ef", fillOpacity: 0.8 }).addTo(layers).bindTooltip(name(share.creatorId))
        if (share.position) L.circle(point, { radius: Math.min(share.position.accuracy, 5000), weight: 1, color: "#7269ef" }).addTo(layers)
      }
    }).catch(() => { if (!disposed) setFailed(true) })
    return () => { disposed = true }
  }, [shares, name])
  return { ref, failed }
}
