"use client"

const SOUND_STORAGE_KEY = "linko:sound_notifications"

/**
 * Synthesize a modern, bright, pleasant "ting" chime using Web Audio API.
 * Works natively in all modern browsers with 0 asset downloads and 0 network latency.
 */
export class NotificationSoundPlayer {
  private ctx: AudioContext | null = null
  private enabled: boolean = true
  private lastPlayedAt: number = 0
  public static readonly COOLDOWN_MS = 800

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(SOUND_STORAGE_KEY)
        if (stored !== null) {
          this.enabled = stored === "true"
        }
      } catch {
        // LocalStorage unavailable
      }
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(value: boolean): void {
    this.enabled = value
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(SOUND_STORAGE_KEY, String(value))
      } catch {
        // LocalStorage unavailable
      }
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioCtx) {
          this.ctx = new AudioCtx()
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        void this.ctx.resume().catch(() => {})
      }
      return this.ctx
    } catch {
      return null
    }
  }

  resetCooldown(): void {
    this.lastPlayedAt = 0
  }

  play(): void {
    if (!this.enabled || typeof window === "undefined") return

    const now = Date.now()
    if (now - this.lastPlayedAt < NotificationSoundPlayer.COOLDOWN_MS) {
      return
    }
    this.lastPlayedAt = now

    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime

      // 1. Primary "ting" bell oscillator: A5 (880 Hz) to D6 (1174.66 Hz)
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = "sine"
      osc1.frequency.setValueAtTime(880, now)
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.05)

      // Bell envelope: instant punch then smooth exponential decay
      gain1.gain.setValueAtTime(0.28, now)
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.4)

      osc1.connect(gain1)
      gain1.connect(ctx.destination)

      // 2. High sparkle harmonic: E7 (2637 Hz) for a crisp glass-like ping
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.type = "sine"
      osc2.frequency.setValueAtTime(2637, now)

      gain2.gain.setValueAtTime(0.07, now)
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.2)

      osc2.connect(gain2)
      gain2.connect(ctx.destination)

      osc1.start(now)
      osc2.start(now)
      osc1.stop(now + 0.45)
      osc2.stop(now + 0.45)
    } catch {
      // Autoplay restriction or unsupported audio context
    }
  }
}

export const notificationSound = new NotificationSoundPlayer()
