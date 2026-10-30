"use client"

import { useState } from "react"
import { Button } from "@/shared/components/Button"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { notificationSound } from "@/shared/sound/notificationSound"

import { useI18n } from "@/shared/i18n/useI18n"

/** Render sound notifications configuration with live test chime action. UI only. */
export function SoundNotificationSection() {
  const { copy } = useI18n()
  const [isEnabled, setIsEnabled] = useState(() => notificationSound.isEnabled())

  const handleToggle = () => {
    const next = !isEnabled
    setIsEnabled(next)
    notificationSound.setEnabled(next)
    if (next) {
      notificationSound.play()
    }
  }

  const handleTest = () => {
    notificationSound.play()
  }

  return (
    <article className="surface-panel p-6 grid gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div>
          <h2 className="text-lg font-semibold">{copy.settings.soundTitle}</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            {copy.settings.soundDescription}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-none">
          <Button size="small" variant="secondary" onClick={handleTest} title={copy.settings.soundTest}>
            <Icon name={ICON_NAMES.BELL} /> {copy.settings.soundTest}
          </Button>
          <Button
            size="small"
            variant={isEnabled ? "primary" : "secondary"}
            onClick={handleToggle}
            aria-pressed={isEnabled}
          >
            {isEnabled ? copy.settings.soundOn : copy.settings.soundOff}
          </Button>
        </div>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">
        {copy.settings.soundNote}
      </p>
    </article>
  )
}
