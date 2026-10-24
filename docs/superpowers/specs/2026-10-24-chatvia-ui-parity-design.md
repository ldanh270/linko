# Chatvia reference UI parity

Status: approved by the user on 2026-10-24; implementation and verification tracked in the execution ledger.

## Intent

Rebuild Linko's authenticated interface to match all five supplied SingleFile HTML references in `docs/assests/`, including their layout, typography, icons, colors, spacing, borders, rows, chat bubbles, and composer. Keep Linko's existing working features and shared API contracts. Separate presentation from behavior and remove duplication at real shared boundaries.

The reference files are the visual specification. This is a faithful integration, not a new art direction.

## Evidence and current architecture

- References: `chats.htm`, `group.htm`, `contacts.htm`, `profile.htm`, `settings.htm`.
- All five were rendered locally in Chrome at 1440 × 900. They show the same open conversation on the right while the selected left panel changes.
- Measured desktop dimensions: navigation rail 75px; secondary panel 380px; remaining width belongs to the chat. Reference desktop breakpoint is 1024px.
- Reference font: Public Sans, body approximately 15px, normal line height 1.5. The saved files embed Public Sans, Remix Icon, and Material Design Icons font data.
- Reference panel background: `#f5f7fb`; chat and navigation surfaces: white; primary violet: `#7269ef`; secondary text: `#74788d`. Extract the remaining exact values from computed styles, rather than estimating them from screenshots.
- Current stack: Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, TanStack Query 5, Zod 4, shared `@linko/contracts`, Vitest and Playwright.
- `shared/layout/AppShell.tsx` currently provides a 76px rail and a padded, centered main area. `ConversationPage.tsx` adds a second, boxed sidebar. This must become one edge-to-edge workspace.
- Inbox, groups, people, settings, profile form and conversation pages currently mix some behavior into JSX files. Split the touched screens into hooks and focused presentation components.
- Existing APIs support messaging, attachments, replies, mentions, pins, group lifecycle, profiles, friends, requests, notifications and theme preference. Reuse them.

## Approach

Use one React workspace built on the existing feature modules and shared primitives. Extract the visual tokens and necessary local font/icon assets from the supplied references, then reconstruct their markup as typed React components.

Embedding the HTML as iframes would isolate navigation and use static demo content rather than Linko data. Copying each page independently would duplicate the rail and conversation interface five times. Neither satisfies the requested integration and SOLID/DRY requirements. The shared React workspace is the proposed implementation approach.

## Screen mapping

| Reference | Existing route(s) | Required result |
| --- | --- | --- |
| `chats.htm` | `/inbox`, `/direct/[conversationId]`, `/groups/[conversationId]` | Search, compact people strip, recent conversation rows, active row, unread pills, timestamps; shared conversation header/timeline/composer. |
| `group.htm` | `/groups` | Search, compact initial-avatar group rows with `#` prefix, create-group action; same right conversation pane. |
| `contacts.htm` | `/people` | Search, contacts grouped alphabetically, per-person action menu, add-contact action; preserve friend requests, profile preview and opening a direct conversation. |
| `profile.htm` | `/profile` | Centered identity/avatar, biography, About accordion and attached-files section; existing profile editing remains available from the panel action. |
| `settings.htm` | `/settings` | Centered account identity, edit-avatar action, Personal Info/Privacy/Security/Help accordions; existing theme and logout controls remain reachable. |

Existing create-group, group-info, management, invitation and attachment routes continue to work in a secondary detail layout. They must not inherit a 380px width accidentally.

## Shared architecture and responsibilities

1. `AppShell`: compose the navigation rail and route content; no API calls or route business rules in JSX.
2. `NavigationRail` / `NavigationItem` / mobile navigation: render destinations from one constant registry. Order matches the reference: profile, chats, groups, contacts, settings. Brand action at the top; theme and current avatar at the bottom.
3. `MessengerWorkspace`: compose `sidebar` and `conversation` slots. Exactly one secondary panel and one conversation pane; no nested inbox sidebar inside the pane.
4. `SidebarPanel`, `SidebarHeader`, `SearchInput`, `Accordion`, `Modal`, `DropdownMenu`, `Icon`, `Avatar`: domain-neutral shared components only where multiple screens need them. Extend existing primitives before introducing replacements. Icons must match Remix silhouettes; do not use Unicode approximations.
5. Feature panels own their presentation and use feature hooks for queries, mutations, URL state, mapping and callbacks. Page files only compose the panels and workspace.
6. Conversation presentation: `ConversationHeader`, `MessageTimeline`, `MessageBubble`, `MessageAttachment`, `MessageComposer`, `ReplyPreview`, `MentionList`. Existing realtime/query transport stays behind hooks.
7. Pure typed mappers prepare row/bubble/contact view models. JSX does not calculate initials, sender ownership, relative time, grouping, filenames or route URLs.

Components export one component per file, stay approximately <=150 lines and <=7 props, and use composition or grouped view models where appropriate. Hooks have one responsibility; a giant page hook is not the target architecture. Add English TSDoc for exported contracts and functions.

## Navigation and selected conversation

Builder proposal: preserve existing direct/group conversation URLs. Carry a validated `conversation` query parameter when navigating from an open conversation to a different primary panel, so the same chat remains visible on desktop as it does in the references. The parameter accepts a MongoDB ObjectId; derive the conversation type from accessible inbox data, never from untrusted client claims.

Opening a chat from a row still uses its canonical direct/group route. The rail carries the selection to the target panel. A fresh `/profile`, `/settings`, `/groups`, `/people` or `/inbox` without a selected conversation shows an intentional empty conversation state. Do not auto-open another person's messages or manufacture the sample Doris Brown conversation.

Browser refresh/back restores panel, selection, filters and expanded section state. URL params are the source of truth. Search uses the existing debounced replace-history behavior, resets pagination, and omits defaults. Inbox and groups search only the loaded pages unless a server search endpoint is added in a separately approved scope; provide honest loaded-results wording and retain pagination.

On small screens the list and conversation become separate views, with a back action. A selected-chat query must not hide a requested Profile/Settings/Contacts panel on mobile. The rail becomes bottom navigation; use `100dvh`, safe-area padding, independent scroll regions and no horizontal page overflow.

## Visual contract

- Desktop baseline: 1440 × 900; also verify 1280 × 800. Small-screen baselines: 390 × 844 and existing 360px shell coverage. Check 768px and 1024px transitions.
- Match reference surfaces, spacing, 24px sidebar padding, heading scale, 56px navigation hit areas, avatar sizes, search field, active row and red unread badges.
- Chat header and composer stay fixed within the pane; the timeline scrolls independently. Incoming bubbles are violet with white text; own messages are pale gray. Match corners, tails, sender names, timestamps, date separators and compact action menus.
- Derive sender ownership from the authenticated profile ID and message sender ID. Never infer ownership from message index or alternating order.
- Self-host extracted matching fonts/icons with their provenance documented. Preserve Vietnamese coverage with the existing Be Vietnam Pro fallback where the embedded Public Sans subset has no Vietnamese glyph. Keep fonts local; no runtime dependency on the demo website.
- Reuse theme provider, storage key and system mode; consolidate light/dark tokens without duplicating media-query values. The supplied light snapshots are the strict comparison target; dark mode is coherent with their embedded dark palette.
- Shared controls own hover, pressed, focus-visible, disabled, loading and reduced-motion behavior. Preserve semantics, labels, keyboard access and sufficient hit areas.
- Compare component geometry/styles separately from dynamic names, dates and message content. Fixture screenshots supply stable comparison data; production uses actual DTOs.

## Functional boundaries and unsupported demo details

Keep all existing working actions: message send/retry idempotency, files and limits, reply/mention/pin, older-history pagination, read markers, realtime updates, group creation/info/invitations, friends/requests, profile save/upload and sign-out.

The design files also show phone/video calling, real presence, typing, location, availability editing, security/privacy options and a theme-demo style switcher. Existing contracts do not establish these capabilities. Proposed behavior:

- Keep call/video icon positions with disabled states and a clear unavailable label; no success toast for an unimplemented action.
- Show real presence/typing only if an existing event provides it. Otherwise omit activity assertions rather than fake green indicators.
- Display unavailable location/time/profile-file data as a clear unset/empty state. Do not invent API fields or stored user settings.
- Privacy/Security/Help sections may explain current supported behavior; any actual change control must be connected to an existing capability. Never introduce fake switches.
- Keep Linko branding, real user avatars/content and Vietnamese product copy; keep reference layout/style. Sample identities and English demo text are screenshot fixtures only.
- Omit the floating template-sales/style-switcher control because it has no Linko product function.

These are explicit builder proposals, not previously approved product decisions. They do not require backend or API schema changes.

## Error and state contract

Every query-backed block needs loading, empty, error and retry states, including each sidebar and the conversation pane. One failing sidebar query must not destroy a working conversation. Unauthorized/deleted/unavailable selected conversations show a safe recoverable state. Preserve shared HTTP normalization and generic technical-error messages. Clear selection and cached private data on sign-out as current auth code requires.

Menus and dialogs support keyboard dismissal/focus return; logout and destructive actions require confirmation. Async mutations report success/failure and block double submission. Selected file previews revoke object URLs. Changing conversations clears composer/reply/mention/file state and never leaks a draft into a different recipient.

## Acceptance and proof

1. All five routes visibly reproduce their corresponding references within the dynamic-content and unsupported-feature boundaries above.
2. One shared rail/workspace/timeline/composer; no duplicated shell per screen, no iframe/static HTML implementation.
3. URL restoration and responsive list/chat navigation work without horizontal overflow.
4. Existing real features remain reachable; message ownership, upload validation, retry identity and query isolation are tested.
5. Updated files satisfy repository separation, constants, typing and documentation rules.
6. Run frontend lint, typecheck, unit tests, Playwright flows and production build. Capture screenshots for all five panels in stable seeded/mock fixtures and review them against local reference renders at identical viewport sizes.
7. Review the diff and create local conventional commits as required by `AGENTS.md`; do not stage the user's original untracked `docs/assests/` inputs or push.

## Implementation order

Visual tokens/assets and primitives → shared workspace/navigation → conversation presentation and hooks → inbox/groups → contacts → profile/settings → responsive and visual parity verification.

One integration plan covers this shared frontend subsystem. Independent backend feature expansion is outside this change.
