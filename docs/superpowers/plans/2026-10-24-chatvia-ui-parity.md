# Chatvia UI Parity Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task in the current checkout. Steps use checkbox syntax for tracking. This is a requested planning deliverable; product implementation awaits review of the linked design. No additional worktree or execution-method decision is needed.

**Execution status:** Completed after user approval. The checklists below retain the original planning detail; final implementation decisions, review fixes and measured verification results are recorded in [the execution ledger](2026-10-24-chatvia-ui-parity-progress.md). Local integration uses the approved current branch; no push or merge.

**Goal:** Integrate all five `docs/assests/*.htm` interfaces into the existing Linko web application with matching styles, reusable components and existing functional APIs.

**Architecture:** Keep existing feature APIs, contracts, auth, query and theme providers. Compose one navigation rail with feature-specific sidebar panels and a reusable conversation pane. Separate feature hooks and pure view-model mapping from presentation; use shared visual primitives and tokens for repeated UI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS 4, TanStack Query 5, Zod 4, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-24-chatvia-ui-parity-design.md`.

## Global Constraints

- Exact visual sources: `chats.htm`, `group.htm`, `contacts.htm`, `profile.htm`, `settings.htm` in `docs/assests/`.
- Desktop rail 75px; sidebar 380px; desktop breakpoint 1024px; edge-to-edge chat, independent scrolling and `100dvh`.
- Public Sans approximately 15px/1.5; reference violet `#7269ef`, sidebar `#f5f7fb`, secondary text `#74788d`; verify other values from computed styles.
- Keep Linko branding, Vietnamese copy and real DTO data. No demo identities in production code, iframe embedding, fake online/call/settings behavior or backend schema changes.
- Reuse current API adapters and `@linko/contracts`; ObjectId in API strings; URL params/constants remain the source of truth.
- New/touched UI contains presentation only; state, effects, mapping, handlers and API calls belong to hooks or pure modules. One exported component per file; <=~150 lines; <=~7 props; English TSDoc for exports.
- Preserve all existing message/group/friend/profile/auth behaviors. Shared controls own complete accessible states.
- Leave original untracked `docs/assests/` inputs unstaged. Commit only owned changes, never push.

## Review Focus

1. A selected conversation may be past the first inbox page or inaccessible: resolve through cursor pages, distinguish missing/loading/error, and do not silently open a different chat. Task 2 tests this.
2. Switching conversations or receiving a late mutation result must not clear another recipient's draft or append another conversation's realtime message. Task 3 tests this.
3. URL-backed debounced search plus pagination/back navigation must preserve the actual visible state. Task 4/5 tests this.
4. Long Vietnamese names, missing/broken avatars, null content, attachment-only messages and narrow screens must stay usable. Task 1/3/7 tests this.
5. A single list/profile query failure must not replace a still-working conversation; sign-out must clear private content. Task 2/6/7 tests this.

## File ownership and composition

Paths below are relative to `frontend/` unless otherwise stated. These are planned files, not existing exports. Reuse existing files when they already own the responsibility.

| Area | Modify | Create | Responsibility |
| --- | --- | --- | --- |
| Foundation | `app/globals.css`, `app/layout.tsx`, `shared/theme/tokens.css`, `shared/components/{Avatar,Button,IconButton,Input,Link}.tsx` | `shared/theme/reference-fonts.css`, `public/fonts/{public-sans,remixicon}.woff2`, `shared/icons/{icon.constants.ts,Icon.tsx}`, `shared/components/{Accordion,SearchInput}.tsx`, `shared/components/Modal/{Modal.tsx,useModal.ts}`, `shared/components/DropdownMenu/{DropdownMenu.tsx,useDropdownMenu.ts}`, `shared/components/{avatar.utils.ts,useAvatar.ts}` | Tokens, local assets, accessible reusable controls. |
| Layout | `shared/layout/{AppShell.tsx,useAppShell.ts,navigation.constants.ts}`, `shared/layout/route.constants.ts` | `shared/layout/{NavigationRail,NavigationItem,MobileNavigation,MessengerWorkspace,SidebarPanel,SidebarHeader,DetailLayout}.tsx`, `shared/layout/{workspace.constants.ts,workspace.types.ts,useWorkspaceNavigation.ts}` | Shared geometry and URL-preserving navigation; domain-neutral slots. |
| Inbox | `features/inbox/{pages/InboxPage.tsx,components/ConversationList.tsx,hooks/useInboxSidebar.ts,inbox.constants.ts}` | `features/inbox/components/{InboxSidebar,ConversationListRow,RecentPeopleStrip,RecentPerson}.tsx`, `features/inbox/hooks/{useInboxPage,useSelectedConversation}.ts`, `features/inbox/{inbox.mapper.ts,inbox.types.ts}` | Conversation queries, selection resolution, search/filter/pagination, rows. |
| Chat | `features/chat/{pages/ConversationPage.tsx,hooks/useConversationChat.ts}` | `features/chat/components/{ConversationPane,ConversationHeader,MessageTimeline,MessageBubble,MessageAttachment,MessageComposer,ReplyPreview,MentionList,MentionOption,ConversationEmptyState}.tsx`, `features/chat/hooks/{useConversationPane,useMessageComposer,useMessageTimeline}.ts`, `features/chat/{chat.constants.ts,chat.types.ts,chat.mapper.ts}` | One chat renderer and its behavior; direct/group parity. |
| Groups | `features/groups/{pages/GroupsPage.tsx,group.constants.ts}` | `features/groups/components/{GroupsSidebar,GroupListRow}.tsx`, `features/groups/hooks/useGroupsPage.ts` | Compact reference group list over existing inbox/group API. |
| People | `features/people/pages/PeoplePage.tsx` | `features/people/{people.constants.ts,people.types.ts,people.mapper.ts}`, `features/people/hooks/{usePeoplePage,useFriendActions}.ts`, `features/people/components/{ContactsSidebar,ContactGroup,ContactRow,FriendRequests,FriendRequestRow,PersonProfilePanel}.tsx`, `features/people/components/AddContactModal/{AddContactModal.tsx,useAddContactModal.ts}` | Alphabetical contacts, search, requests and typed menu actions. |
| Profile | `features/profile/{pages/ProfilePage.tsx,components/ProfileForm.tsx,hooks/useProfilePage.ts}` | `features/profile/profile.constants.ts`, `features/profile/components/{ProfileSidebar,ProfileIdentity,ProfileAbout,ProfileAttachments}.tsx`, `features/profile/hooks/useProfileForm.ts`, `features/profile/components/ProfileEditModal/{ProfileEditModal.tsx,useProfileEditModal.ts}` | Identity/details panel and existing upload/edit behavior. |
| Settings | `features/settings/pages/SettingsPage.tsx` | `features/settings/settings.constants.ts`, `features/settings/hooks/useSettingsPage.ts`, `features/settings/components/{SettingsSidebar,PersonalInfoSection,AppearanceSection,PrivacySection,SecuritySection,HelpSection}.tsx`, `features/settings/components/LogoutDialog/{LogoutDialog.tsx,useLogoutDialog.ts}` | Account/settings accordions, theme and safe logout. |
| Verification | `test/e2e/foundation.spec.ts`, `playwright.config.ts` if needed | `test/e2e/{reference-parity.spec.ts,messenger-flows.spec.ts,fixtures/messenger.ts}` plus focused mapper/hook/component tests beside their modules | Deterministic functional and visual evidence. |

Do not introduce a separate feature framework, component-library replacement, generalized form engine or generic configurable list renderer. Add a form dependency only if needed to satisfy the repository form-library rule: first check existing workspace packages, then choose one compatible React library and integrate it only with touched forms. Zod remains the shared schema layer; no duplicate API validations.

## Shared interface decisions

- `Icon({ name, className, ...decorativeAttributes }: IconProps)` consumes `IconName` derived from `ICON_NAMES`; asset mapping is centralized.
- `Avatar({ label, src?, size?, className? }: AvatarProps)` keeps existing call sites valid and supports real images, initials fallback and load failure. Mapping/state belongs to utilities/hooks.
- `MessengerWorkspace({ sidebar, conversation, isConversationView? }: MessengerWorkspaceProps)` accepts ReactNode slots; it cannot import any feature module.
- `SidebarPanel({ children, header, className? }: SidebarPanelProps)` owns panel/background/scroll framing. `SidebarHeader` owns heading/action composition.
- `useSelectedConversation()` returns a typed selection object with `conversationId`, `kind`, `item`, `status`, `error` and `onRetry`. Path params take precedence on canonical conversation routes; otherwise use the validated `conversation` query param. Resolve only accessible inbox entries across cursor pages.
- `useWorkspaceNavigation()` returns primary links carrying a validated selection, active destination and mobile back link. Navigation target selection belongs to constants. Existing `/direct/[conversationId]` and `/groups/[conversationId]` routes remain canonical.
- `ConversationPane({ conversationId, kind }: ConversationPaneProps)` is keyed by conversation ID at its composition boundary so local behavior resets on recipient changes. It contains no second sidebar.
- `useConversationPane({ conversationId, kind })` orchestrates existing chat/pin/member hooks and prepares header/timeline/composer props; shared transport remains in existing API files.
- Use readonly feature view-model types in `*.types.ts` for rows and bubbles. No second API DTO schema, no duplicated field constants or enums.

### Task 1: Reference tokens, local assets and shared controls

**Files:** Foundation row above; focused tests beside Avatar, Accordion, Modal and DropdownMenu. Document extracted asset provenance in `public/fonts/README.md`.

**Interfaces:** Produce the shared controls and icon/avatar signatures above. Retain existing Button/Input/Link compatibility.

- [ ] Extract font payloads and required icon glyph mappings from the saved HTML. Record source filenames and font family/weight. Keep large reference images and original HTML outside committed production assets.
- [ ] Measure search field, nav targets, row paddings, borders, header/composer heights and bubble geometry in the reference render; complete a small token table in the spec from computed values.
- [ ] Write failing meaningful interaction tests: avatar image failure falls back to initials; accordion toggles via keyboard; menu closes with Escape/outside click and returns focus; dialog traps focus, closes correctly and restores focus; loading actions block duplicate clicks.
- [ ] Run the focused tests and confirm the intended failures before implementation.
- [ ] Implement tokens/fonts/icons and the controls. Preserve Vietnamese font fallback. Consolidate dark-mode tokens; no duplicated system/light/dark variable definitions. Respect reduced motion.
- [ ] Verify with `pnpm -C frontend test -- shared/components` and `pnpm -C frontend typecheck`; all selected tests pass and typecheck exits 0.
- [ ] Review and commit owned files: `feat(ui): establish reference visual primitives`.

### Task 2: Shared workspace and selected-conversation navigation

**Files:** Layout row, `features/inbox/hooks/useSelectedConversation.ts`, `features/inbox/hooks/useInboxSidebar.ts`; tests for workspace navigation and selection.

**Interfaces:** Consume Task 1 controls. Produce workspace slots, validated selection and navigation signatures above. Keep feature data queries outside `shared/`.

- [ ] Test selection from direct/group route paths; selection preservation on primary-panel links; invalid IDs; no selection; inaccessible selection; selection found on a later inbox page; list failure with a separately working conversation.
- [ ] Test mobile requested-panel visibility with a carried selection, canonical chat back navigation and refresh/back URL restoration.
- [ ] Run focused tests to confirm failure before implementation.
- [ ] Implement the 75px rail, 380px panel and remaining conversation region at >=1024px; mobile bottom navigation below it. Give secondary detail pages their own unconstrained content layout. Remove outer max-width/padding only for messenger routes.
- [ ] Implement URL navigation and cursor-based selection resolution with abort-aware existing APIs. Do not silently default to the first conversation. Preserve filter/search params that belong to the destination; do not copy unrelated panel params.
- [ ] Verify focused tests, existing URL-hook tests and typecheck; expected all pass. Keep shared layout free of feature imports.
- [ ] Commit: `feat(ui): compose shared messenger workspace`.

### Task 3: Reference conversation pane and preserved messaging

**Files:** Chat row; use existing `useGroupPins`, inbox selection, profile query, membership API and attachment viewer route builder. Focused composer/timeline/mapper tests.

**Interfaces:** Consume selection/workspace from Task 2. Produce reusable `ConversationPane` and the typed pane/composer hooks. Existing `useConversationChat(conversationId)` remains the API transport owner.

- [ ] Test sender alignment from actual IDs, consecutive sender/date grouping, nullable message content, attachment-only content, broken avatars and long text.
- [ ] Test composer blocking empty/double submits, 5-file/10-MiB limits from contracts, reply cancellation, mentions, stable `clientMessageId` on retry and a new ID after editing.
- [ ] Test switching conversations clears local composer state; stale send callbacks cannot clear a new draft; realtime events for another conversation never enter the current timeline; history pagination preserves readable scroll position. Add the narrow behavior guard only if the extracted presentation exposes an existing bug.
- [ ] Run focused tests and record expected failures.
- [ ] Move state/handlers out of `ConversationPage`. Extract header, timeline, bubble, file, composer and mention/reply components. Use `MESSAGE_FIELDS` and shared constants for repeated boundary fields. Add an explicit empty timeline state.
- [ ] Match incoming violet/outgoing pale bubbles, tails, sender labels, timestamps and date dividers. Wire image/file previews to the existing attachment viewer. Add local message search using URL state and actual loaded history; unsupported call/video controls remain disabled with labels.
- [ ] Keep send/retry, sockets, read markers, pins, members, uploads and history connected to existing hooks. Render header/list/query errors independently.
- [ ] Verify focused tests plus existing messaging, attachments, reply/mentions, pins and realtime API tests; lint and typecheck must pass.
- [ ] Commit: `feat(chat): match reference conversation interface`.

### Task 4: Chats and groups panels

**Files:** Inbox/groups rows plus focused mapper/page-hook tests. Retain existing query keys where equivalent to avoid double fetching.

**Interfaces:** Produce `InboxSidebar` and `GroupsSidebar`, compact row view models, selection links, search/filter/pagination state. Consume Task 3 conversation pane.

- [ ] Test URL-backed kind/search/cursor behavior, debounce and back restoration; resetting a filter clears its cursor. Invalid values fall back to defaults. Search clearly applies to loaded results and keeps older-page navigation available.
- [ ] Test empty/loading/error/retry, unread badges, null last message and group vs direct route generation.
- [ ] Run tests to confirm failure, then move all InboxPage/GroupsPage behavior into their feature hooks and pure mappers.
- [ ] Implement reference Chats header/search/people strip/recent rows and Groups header/search/initial-avatar `#` rows. People strip uses available contacts, without asserting online presence. Unread/new indicators require actual DTO facts; no hard-coded demo badges.
- [ ] Compose pages using `MessengerWorkspace` and a shared selected conversation/empty pane. Ensure canonical conversation routes use this same inbox panel and have one sidebar.
- [ ] Verify focused tests, existing inbox/read-state/group-creation API tests, lint and typecheck.
- [ ] Commit: `feat(ui): integrate chats and groups reference panels`.

### Task 5: Contacts panel and existing friend flows

**Files:** People row; tests for grouping, URL search, requests and direct-chat actions.

**Interfaces:** `usePeoplePage()` prepares grouped contact/search/request state; `useFriendActions()` owns mutations and consistent success/failure feedback. Row props are small view models plus callbacks.

- [ ] Test Vietnamese display-name grouping/sorting, empty names, duplicate search results, min search length, debounce/replace/back restoration and selected public profile URL state.
- [ ] Test request/accept pending states, failed mutations, existing friend and already-requested conditions, direct conversation navigation and request-list invalidation.
- [ ] Run focused tests to confirm failure before implementing.
- [ ] Extract existing query/mutation code from PeoplePage; centralize its scattered query keys/messages/params into feature constants. Render compact alphabetic headings/rows and a shared menu with supported actions.
- [ ] Implement add-contact modal using existing public search and friend request APIs. Keep incoming requests and profile preview reachable in focused panels without widening the reference sidebar.
- [ ] Verify focused tests, direct-friends/profile API tests, lint and typecheck.
- [ ] Commit: `feat(people): match reference contacts panel`.

### Task 6: Profile and settings panels

**Files:** Profile/settings rows; profile form, settings/theme/logout tests. Reuse the same profile query key for sidebar, rail, settings and message ownership.

**Interfaces:** `useProfileForm(options)` owns form validation, file preview lifetime and submit mapping. `useSettingsPage()` owns theme options and profile/settings state. Dedicated modal hooks own modal state.

- [ ] Test initial profile loading/error/retry, avatar fallback, absent biography/location, edit success/failure and safe technical-error text. Test invalid file type/size and object-URL revocation on replacement/unmount.
- [ ] Test shared profile cache updates propagate to rail/settings, pending save blocks duplicates, theme mode persists through existing provider, and logout requires confirmation/clears selection/private cache/returns to login.
- [ ] Test accordion section URL state and refresh/back restoration, dialog focus and settings failure leaving the selected chat usable.
- [ ] Run focused tests to confirm failure before implementing.
- [ ] Build profile identity/biography/About/Files sections matching reference. Put existing edit fields and both image uploads into a dedicated edit modal; do not lose existing background-upload support.
- [ ] Build settings identity/Personal Info/Privacy/Security/Help accordions. Keep working theme options and logout reachable. Unsupported data/settings show honest read-only/unset states with no invented request body fields.
- [ ] Keep pages as composition only. Reuse shared accordions and identity view; avoid duplicating profile fields, avatar handling and modal markup.
- [ ] Verify focused tests plus profile/theme/session tests; lint and typecheck.
- [ ] Commit: `feat(ui): integrate profile and settings reference panels`.

### Task 7: Responsive, visual parity and integration verification

**Files:** Verification row, targeted corrections only in owned UI files. Screenshots go in the task visualization directory or ignored Playwright artifacts, not `docs/assests/`.

**Interfaces:** Stable typed fixtures implement the actual shared DTOs and response envelope; use existing API route constants in request interception. No production demo-data fallback.

- [ ] Extend Playwright setup with complete deterministic session/profile/inbox/history/friend fixtures. Existing foundation tests currently mock refresh only; mock required data endpoints to avoid incidental network failures and ensure valid current-user ownership.
- [ ] Add flows across all five primary panels with an open chat; refresh/back/selection restoration; message send and failed retry; contact search/open chat; profile edit; theme/logout. Include no selection, query failures, invalid selection and missing selection past first page.
- [ ] Capture each panel at 1440×900, 1280×800 and 390×844; exercise 360px and breakpoint widths 768/1024. Assert no horizontal overflow, independent panel/timeline scroll, reachable composer/nav, keyboard focus, correct single active destination and no duplicated sidebars.
- [ ] Compare reference and implementation at identical viewports, with stable fixture strings where possible. Check measured rail/sidebar/header/search/composer geometry plus fonts/colors/bubbles/row density. Review all five screenshots visually; image differences alone do not establish parity when copy differs. Correct visible mismatches.
- [ ] Run `pnpm -C frontend lint`, `pnpm -C frontend typecheck`, `pnpm -C frontend test`, `pnpm -C frontend exec playwright test`, and `pnpm -C frontend build`. Expected: exit 0 for each. If required browser binaries are unavailable, use the installed Chrome executable or the existing supported browser setup and document the exact command; do not claim an unrun check passed.
- [ ] Review the full diff for feature regressions, duplication, shared-to-feature dependency violations, inline UI behavior, oversized files, magic boundary fields, missing docs and unrelated changes. Fix concrete findings and rerun only affected checks plus final gates.
- [ ] Commit final owned changes with a conventional message; verify `git status --short` and `git log -1 --oneline`. Original `docs/assests/` inputs remain untracked unless the user separately requests them committed.

## Completion report

Report implemented routes, important preserved behaviors, validation results, screenshot locations and commit IDs. Explicitly identify the supported/disabled demo-feature boundaries. Claim visual parity only after reviewing actual implementation screenshots against all five references.

## Plan self-review

- All five source files have an owning task (Chats/Groups: Task 4, Contacts: Task 5, Profile/Settings: Task 6); their common chat belongs to Task 3.
- Shared layout and assets are owned once (Tasks 1–2). Later tasks consume the interfaces defined above.
- Each review-focus failure mode has named tests in its owning task.
- Data model/API expansion is excluded; default decisions are stated in the spec for user review.
- No product implementation, dependency installation or code refactoring is claimed by this planning document.

## Baseline evidence (2026-10-24)

- `pnpm -C frontend typecheck`: exit 0.
- `pnpm -C frontend lint`: exit 0.
- `pnpm -C frontend test`: 23 files, 80 tests passed, exit 0.
- All five local reference files rendered successfully in installed Chrome at 1440×900; reference screenshots are in the task visualization directory.
- Browser rendering used `@playwright/test` with the installed Chrome executable because the default Playwright headless binary is absent. `file://` references rendered successfully; a localhost attempt was denied by the execution environment. Reassess localhost access during application verification rather than claiming browser integration tests were run.
- A separate builder check of the design reported no important unanswered planning questions.
- Build and application E2E/visual parity checks have not been run in this planning phase.
