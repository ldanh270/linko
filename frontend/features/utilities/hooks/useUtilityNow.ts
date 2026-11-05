"use client"
import { useEffect, useState } from "react"

/** Keep utility countdowns current without impure presentation calculations. */
export function useUtilityNow() {
  const [now, setNow] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [])
  return now
}
