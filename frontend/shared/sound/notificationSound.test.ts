import { describe, expect, it, vi } from "vitest"
import { NotificationSoundPlayer } from "./notificationSound"

describe("NotificationSoundPlayer", () => {
  it("should_be_enabled_by_default", () => {
    const player = new NotificationSoundPlayer()
    expect(player.isEnabled()).toBe(true)
  })

  it("should_toggle_enabled_state_and_persist", () => {
    const player = new NotificationSoundPlayer()
    player.setEnabled(false)
    expect(player.isEnabled()).toBe(false)
    player.setEnabled(true)
    expect(player.isEnabled()).toBe(true)
  })

  it("should_safely_noop_or_play_when_web_audio_is_not_present", () => {
    const player = new NotificationSoundPlayer()
    expect(() => player.play()).not.toThrow()
  })

  it("should_use_audio_context_nodes_when_available", () => {
    const mockOscillator = {
      type: "sine",
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }
    const mockGain = {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    }
    const mockContext = {
      currentTime: 10,
      state: "running",
      destination: {},
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      resume: vi.fn(async () => {}),
    }

    vi.stubGlobal("AudioContext", vi.fn(() => mockContext))

    const player = new NotificationSoundPlayer()
    player.play()

    expect(mockContext.createOscillator).toHaveBeenCalled()
    expect(mockContext.createGain).toHaveBeenCalled()
    expect(mockOscillator.start).toHaveBeenCalled()
    expect(mockOscillator.stop).toHaveBeenCalled()
  })

  it("should_throttle_rapid_successive_plays_within_cooldown", () => {
    const mockContext = {
      currentTime: 10,
      state: "running",
      destination: {},
      createOscillator: vi.fn(() => ({
        type: "sine",
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      })),
      createGain: vi.fn(() => ({
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
      })),
      resume: vi.fn(async () => {}),
    }

    vi.stubGlobal("AudioContext", vi.fn(() => mockContext))
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-10-25T12:00:00.000Z"))

    const player = new NotificationSoundPlayer()
    player.play()
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(2)

    // Call again within cooldown period (e.g. +200ms)
    vi.advanceTimersByTime(200)
    player.play()
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(2) // Still 2, throttled!

    // Advance beyond cooldown (e.g. +800ms)
    vi.advanceTimersByTime(800)
    player.play()
    expect(mockContext.createOscillator).toHaveBeenCalledTimes(4) // Played again!

    vi.useRealTimers()
  })
})
