import type { mapProfileDetails } from "../profile.mapper"

/** Prepared label/value rows avoid mapping private profile fields in multiple components. */
export interface ProfileAboutProps { readonly details: readonly ReturnType<typeof mapProfileDetails>[number][] }

/** Render the reference definition-list spacing for account details. UI only. */
export function ProfileAbout({ details }: ProfileAboutProps) {
  return (
    <dl className="grid gap-5 wrap-anywhere [&_dt]:text-xs [&_dt]:text-text-secondary [&_dt]:mb-1 [&_dd]:text-sm [&_dd]:text-text-primary">
      {details.map((detail) => (
        <div key={detail.label}>
          <dt>{detail.label}</dt>
          <dd>{detail.value}</dd>
        </div>
      ))}
    </dl>
  )
}
