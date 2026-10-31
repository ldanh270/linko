"use client"

import Link from "next/link"
import { USER_PROFILE_FIELDS, type ProfileDto } from "@linko/contracts"
import { Avatar } from "@/shared/components/Avatar"
import { Button } from "@/shared/components/Button"
import { Card, CardHeader, CardContent } from "@/shared/components/Card"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { APP_ROUTES } from "@/shared/layout/route.constants"
import { useI18n } from "@/shared/i18n/useI18n"

export interface AccountSummarySectionProps {
  readonly profile: ProfileDto
}

/** Render a clean, read-only account summary card with direct navigation to the dedicated profile page. UI only. */
export function AccountSummarySection({ profile }: AccountSummarySectionProps) {
  const { copy } = useI18n()
  const displayName = profile[USER_PROFILE_FIELDS.DISPLAY_NAME] || profile[USER_PROFILE_FIELDS.USERNAME]
  const username = `@${profile[USER_PROFILE_FIELDS.USERNAME]}`
  const avatarUrl = profile[USER_PROFILE_FIELDS.AVATAR_URL]

  return (
    <Card>
      <CardHeader
        title={copy.settings.accountTitle}
        description={copy.settings.accountDescription}
        action={
          <Link href={APP_ROUTES.PROFILE}>
            <Button size="small" variant="secondary">
              <Icon name={ICON_NAMES.PROFILE} /> {copy.settings.viewProfileBtn}
            </Button>
          </Link>
        }
      />
      <CardContent>
        <div className="flex items-center gap-4">
          <Avatar label={displayName} src={avatarUrl} size="large" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{displayName}</h3>
            <p className="text-sm text-text-secondary truncate">{username}</p>
            {profile[USER_PROFILE_FIELDS.BIO] && (
              <p className="text-xs text-text-muted mt-1 line-clamp-2">{profile[USER_PROFILE_FIELDS.BIO]}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
