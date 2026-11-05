/** Explicit overlap choice for local times repeated by a daylight-saving transition. */
export type TimeDisambiguation = "reject" | "earlier" | "later"

/** Convert a local calendar input in an IANA zone, rejecting DST gaps and unresolved overlaps. */
export function localToInstant(local: string, timezone: string, disambiguation: TimeDisambiguation = "reject"): string {
  const base = Date.parse(`${local}:00Z`)
  if (!Number.isFinite(base)) throw new Error("Thời gian không hợp lệ.")
  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
  const target = local.replace("T", " ")
  const offsets = new Set<number>()
  for (const hours of [-24, -12, 0, 12, 24]) {
    const sample = base + hours * 3600000
    offsets.add(Date.parse(`${formatter.format(sample).replace(" ", "T")}:00Z`) - sample)
  }
  const candidates = [...offsets].map((offset) => base - offset).filter((instant) => formatter.format(instant) === target).sort()
  if (!candidates.length) throw new Error("Giờ này không tồn tại do chuyển giờ mùa hè. Hãy chọn giờ khác.")
  if (candidates.length > 1 && disambiguation === "reject") throw new Error("Giờ này xuất hiện hai lần. Hãy chọn lần sớm hoặc lần muộn.")
  return new Date(disambiguation === "later" ? candidates[candidates.length - 1] : candidates[0]).toISOString()
}

/** Format an instant for a datetime-local control in a chosen IANA zone. */
export function instantToLocal(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(instant)).replace(" ", "T")
}

/** Present an instant with its timezone so participants can distinguish local meeting times. */
export function formatUtilityTime(instant: string, timezone?: string): string {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", ...(timezone ? { timeZone: timezone } : {}) }).format(new Date(instant))
}
