"use client"
import { useSyncExternalStore } from "react"
import { SOCKET_EVENTS, SOCKET_LIFECYCLE } from "@linko/contracts"
import { getSharedChatSocket, type ChatSocket } from "@/features/chat/api/chatSocket"

let observedSocket: ChatSocket | null = null
const connectedSnapshot = () => typeof navigator === "undefined" || navigator.onLine && (observedSocket?.connected ?? true)
const serverSnapshot = () => true
const subscribe = (listener: () => void) => {
  const socket = getSharedChatSocket()
  observedSocket = socket
  window.addEventListener("online", listener)
  window.addEventListener("offline", listener)
  socket.on(SOCKET_EVENTS.CONNECT, listener)
  socket.on(SOCKET_LIFECYCLE.DISCONNECT, listener)
  return () => {
    window.removeEventListener("online", listener)
    window.removeEventListener("offline", listener)
    socket.off(SOCKET_EVENTS.CONNECT, listener)
    socket.off(SOCKET_LIFECYCLE.DISCONNECT, listener)
  }
}

/** Mark cached coordinates paused immediately when the viewer loses network or realtime transport. */
export function useLocationConnectivity(): boolean {
  return useSyncExternalStore(subscribe, connectedSnapshot, serverSnapshot)
}
