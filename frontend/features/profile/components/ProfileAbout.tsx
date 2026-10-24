import type { mapProfileDetails } from "../profile.mapper"

/** Prepared label/value rows avoid mapping private profile fields in multiple components. */
export interface ProfileAboutProps { readonly details: readonly ReturnType<typeof mapProfileDetails>[number][] }

/** Render the reference definition-list spacing for account details. UI only. */
export function ProfileAbout({ details }: ProfileAboutProps) {
  return <dl className="profile-details">{details.map((detail) => <div key={detail.label}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl>
}
