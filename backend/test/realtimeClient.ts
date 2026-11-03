import { vi } from "vitest"

/** Exercise Socket.IO over its actual WebSocket transport without a second client dependency. */
export class RealtimeTestClient {
    readonly events: { event: string; payload: unknown }[] = []
    private readonly packets: string[] = []
    private requestId = 0

    /** Keep transport construction in the test boundary. */
    private constructor(private readonly socket: WebSocket) {}

    /** Perform Engine.IO and authenticated Socket.IO handshakes against a local test server. */
    static async connect(origin: string, token: string): Promise<RealtimeTestClient> {
        const socket = new WebSocket(`${origin.replace("http", "ws")}/socket.io/?EIO=4&transport=websocket`)
        const client = new RealtimeTestClient(socket)
        socket.addEventListener("message", (event) => {
            const packet = String(event.data)
            client.packets.push(packet)
            if (packet.startsWith("0")) socket.send(`40${JSON.stringify({ token })}`)
            if (packet === "2") socket.send("3")
            if (packet.startsWith("42")) {
                const [name, payload] = JSON.parse(packet.slice(2)) as [string, unknown]
                client.events.push({ event: name, payload })
            }
        })
        await vi.waitFor(() => { if (!client.packets.some((packet) => packet.startsWith("40"))) throw new Error("Socket handshake pending") })
        return client
    }

    /** Send an event without acknowledgement, as typing inputs do in the application. */
    emit(event: string, payload: unknown): void { this.socket.send(`42${JSON.stringify([event, payload])}`) }

    /** Await an actual acknowledgement so assertions observe completed server handlers. */
    async request(event: string, payload: unknown): Promise<unknown> {
        const id = ++this.requestId
        this.socket.send(`42${id}${JSON.stringify([event, payload])}`)
        return vi.waitFor(() => {
            const reply = this.packets.find((packet) => packet.startsWith(`43${id}[`))
            if (!reply) throw new Error("Socket acknowledgement pending")
            return (JSON.parse(reply.slice(`43${id}`.length)) as unknown[])[0]
        })
    }

    /** Wait for a matching server event without discarding earlier transport packets. */
    async waitFor(event: string, predicate: (payload: unknown) => boolean = () => true): Promise<unknown> {
        return vi.waitFor(() => {
            const match = this.events.find((entry) => entry.event === event && predicate(entry.payload))
            if (!match) throw new Error(`Socket event pending: ${event}`)
            return match.payload
        })
    }

    /** Release transport resources before the test shuts down Redis and MongoDB. */
    async close(): Promise<void> {
        if (this.socket.readyState === WebSocket.CLOSED) return
        await new Promise<void>((resolve) => { this.socket.addEventListener("close", () => resolve(), { once: true }); this.socket.close() })
    }
}
