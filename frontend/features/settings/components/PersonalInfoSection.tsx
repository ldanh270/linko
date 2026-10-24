import { Button } from "@/shared/components/Button"
import { Icon } from "@/shared/icons/Icon"
import { ICON_NAMES } from "@/shared/icons/icon.constants"
import { ProfileAbout } from "@/features/profile/components/ProfileAbout"
import type { useProfilePage } from "@/features/profile/hooks/useProfilePage"

/** Real profile details and editor entry point. */
export interface PersonalInfoSectionProps { readonly profile: ReturnType<typeof useProfilePage>; readonly onEdit: () => void }

/** Render reference account details with the existing edit action. UI only. */
export function PersonalInfoSection({ profile, onEdit }: PersonalInfoSectionProps) {
  return <div className="relative"><Button className="float-right" size="small" variant="secondary" onClick={onEdit}><Icon name={ICON_NAMES.EDIT} /> Sửa</Button><ProfileAbout details={profile.details} /></div>
}
