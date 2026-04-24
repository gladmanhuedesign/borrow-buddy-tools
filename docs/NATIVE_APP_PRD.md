# Native App PRD — Borrow Buddy

**Version:** 1.0
**Last Updated:** 2026-04-24
**Audience:** Native iOS / Android engineering team
**Companion docs:** [`PRD.md`](./PRD.md) (product requirements), [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) (full DB reference), [`NATIVE_APP_SETUP.md`](./NATIVE_APP_SETUP.md) (Capacitor wrapper setup)

---

## 1. Executive Summary

Borrow Buddy is a community-based tool sharing platform. Members of trusted private groups can list tools they own, browse what neighbors have, and run a full request → approve → pickup → return workflow. AI-powered photo recognition auto-fills tool metadata (brand, category, condition, power source) from a single photo.

This document specifies everything a native engineering team needs to **recreate full functional parity** with the existing web app on iOS and Android, including data model, backend contract, business logic, screen inventory, user flows, and native-only concerns (camera, push, offline, deep links, biometrics).

**Backend is fixed.** The native apps must use the existing Supabase project (`wpmelbovrxfyrckhwonf`) — the same database, RLS policies, edge functions, and storage buckets that power the web app. **No backend rewrites.**

---

## 2. Platform Targets

| Platform | Min Version | Notes |
|----------|-------------|-------|
| iOS      | 15.0+       | Swift / SwiftUI recommended |
| Android  | API 26 (Android 8.0)+ | Kotlin / Jetpack Compose recommended |
| Tablet   | iPad + Android tablets | Adaptive layouts, not phone-stretched |

Both platforms must ship feature-complete on day one. No platform-exclusive features in v1.

---

## 3. Tech Stack & Backend Contract

### 3.1 Backend (existing, do not change)
- **Database:** Supabase Postgres, project ref `wpmelbovrxfyrckhwonf`
- **Auth:** Supabase Auth (email/password + Google OAuth)
- **Storage:** Supabase Storage buckets `tool-images` (public), `avatars` (public)
- **Edge Functions:** Deno runtime, deployed at `https://wpmelbovrxfyrckhwonf.supabase.co/functions/v1/<name>`
- **Realtime:** Postgres changes channel for notifications

### 3.2 Native SDKs

| Concern | iOS | Android |
|---------|-----|---------|
| Supabase client | `supabase-swift` | `supabase-kt` |
| Auth (Google) | `GoogleSignIn-iOS` + Supabase OAuth | `Credential Manager` + Supabase OAuth |
| Push notifications | APNs via Firebase or native | FCM |
| Camera / photo picker | `PHPickerViewController`, `AVFoundation` | `ActivityResultContracts.PickVisualMedia`, CameraX |
| Biometrics | `LocalAuthentication` (Face ID / Touch ID) | `BiometricPrompt` |
| Local storage | `Keychain` + `CoreData`/SQLite | `EncryptedSharedPreferences` + Room |
| Deep links | Universal Links + URL scheme | App Links + URL scheme |
| Image caching | `Nuke` or `Kingfisher` | `Coil` |

### 3.3 API Keys (safe for client)
- Supabase URL: `https://wpmelbovrxfyrckhwonf.supabase.co`
- Anon (publishable) key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (from `.env`)
- ⚠️ **Never bundle the service role key** in either app.

---

## 4. Data Model (Reference)

> Full column-level detail, RLS policies, and triggers live in [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md). What follows is the **minimum** an app developer must internalize.

### 4.1 Entity Relationship

```
auth.users (Supabase managed)
  └── profiles (1:1) ── display_name, avatar_url
        │
        ├── groups (created_by) ─────┐
        │                            │
        ├── group_members (M:N) ─── groups
        │   role: 'admin' | 'member'
        │
        ├── group_invites
        │   email, invite_code, expires_at
        │
        ├── tools (owner_id) ─────── tool_categories (FK)
        │   │                        tool_group_visibility (M:N hide-list)
        │   ├── tool_requests (requester_id, tool_id)
        │   │     status: pending | approved | denied | picked_up |
        │   │             return_pending | returned | canceled | overdue
        │   │     │
        │   │     ├── request_messages (chat thread per request)
        │   │     └── tool_history (immutable audit log)
        │   │
        ├── notifications (user_id)
        └── user_preferences (1:1)
```

### 4.2 Tables — Quick Reference

| Table | Purpose | Key Columns | Write Access |
|-------|---------|-------------|--------------|
| `profiles` | User display info | `id`, `display_name`, `avatar_url` | Owner only (UPDATE); INSERT via trigger |
| `groups` | Sharing community | `id`, `name`, `is_private`, `creator_id` | Creator only |
| `group_members` | Membership + role | `group_id`, `user_id`, `role` | Admins, creators, self |
| `group_invites` | Email-based invites | `group_id`, `email`, `invite_code`, `expires_at` | Admins / creators |
| `tools` | Tool listings | `id`, `name`, `owner_id`, `category_id`, `status`, `image_url`, `brand`, `power_source`, `condition` | Owner only |
| `tool_categories` | Reference data | `id`, `name` | Read-only |
| `tool_group_visibility` | Per-group hide list | `tool_id`, `group_id`, `is_hidden` | Tool owner |
| `tool_requests` | Borrow requests | `id`, `tool_id`, `requester_id`, `status`, `start_date`, `end_date` | Owner + requester |
| `request_messages` | Per-request chat | `request_id`, `sender_id`, `content`, `is_read` | Participants |
| `tool_history` | Audit log | All transitions | INSERT via trigger only |
| `notifications` | In-app notifications | `user_id`, `type`, `title`, `message`, `data`, `read` | INSERT via trigger; user can mark read |
| `user_preferences` | Notification toggles | `email_notifications`, `push_notifications`, `tool_request_notifications`, `group_invite_notifications` | Owner only |

### 4.3 Enums (string values stored in `text` columns)

```
ToolStatus      = available | borrowed | unavailable | damaged | maintenance
ToolCondition   = new | excellent | good | fair | worn | poor
ToolPowerSource = battery | corded | gas | manual | pneumatic | hybrid
RequestStatus   = pending | approved | denied | picked_up |
                  return_pending | returned | canceled | overdue
GroupRole       = admin | member
NotificationType= tool_request | request_approved | request_denied |
                  request_message | group_invite | pickup_reminder |
                  return_reminder | overdue
```

### 4.4 RLS — What This Means for the Client

All tables enforce Row-Level Security server-side. **The native client does not need to filter by user_id in queries** — Supabase will return only rows the authenticated user is allowed to see. Examples:

- `SELECT * FROM tools` → returns only tools owned by the user OR owned by other members of their groups (and not on the per-group hide list).
- `INSERT INTO group_members` → blocked unless the user is a group admin/creator OR adding themselves via a valid invite.
- `INSERT INTO notifications` → **always blocked from the client.** Notifications are created by database triggers in response to inserts on `tool_requests`, `request_messages`, `group_invites`.

If a query returns empty when you expect data, it is almost always an RLS rule, not a bug in the query.

---

## 5. Backend APIs

### 5.1 Database Access
Use the Supabase SDK directly. No custom REST layer exists. All CRUD goes through `supabase.from('<table>').select/insert/update/delete()`.

### 5.2 Edge Functions

| Function | Method | Auth | Purpose |
|----------|--------|------|---------|
| `analyze-tool-image` | POST | JWT required | Send a single image URL/base64; returns `{ name, brand, category, condition, power_source, confidence }` via Gemini 2.5 Flash through Lovable AI Gateway. |
| `batch-analyze-tools` | POST | JWT required | Re-analyzes the calling user's tools that are missing `brand` or `power_source`. Returns per-tool result list. Rate-limited internally (500ms between tools). |
| `generate-thumbnails` | POST | JWT required | Generates 150px and 400px variants for an uploaded tool image. Called automatically after upload. |

Invoke via:
```
supabase.functions.invoke('analyze-tool-image', { body: { image: "<url-or-base64>" } })
```

### 5.3 Storage

- **Bucket `tool-images`** (public read): path convention `{owner_id}/{tool_id}/{timestamp}.{ext}`. After upload, call `generate-thumbnails` to create `_150` and `_400` variants in the same folder.
- **Bucket `avatars`** (public read): path convention `{user_id}/avatar.{ext}`.

Upload size cap: 10 MB. Resize/compress on-device before upload (target longest edge ≤ 2000 px, JPEG quality 85).

### 5.4 Realtime
Subscribe to notifications using Postgres changes:
```
supabase
  .channel('notifications')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, handler)
  .subscribe()
```

---

## 6. Authentication

### 6.1 Methods
1. **Email + password** — `supabase.auth.signUp` / `signInWithPassword`
2. **Google OAuth** — Native flow:
   - iOS: `GIDSignIn` → ID token → `supabase.auth.signInWithIdToken({ provider: 'google', token })`
   - Android: Credential Manager → Google ID token → same Supabase call
3. **Password reset** — `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'borrowbuddy://reset-password' })`. App must handle the deep link and present a "set new password" screen calling `supabase.auth.updateUser({ password })`.

### 6.2 Session Management
- Persist the session in **Keychain (iOS)** / **EncryptedSharedPreferences (Android)** — never plaintext.
- Refresh tokens automatically; the SDK handles this if configured with a secure storage adapter.
- Listen to `onAuthStateChange` to drive navigation between the auth stack and the main tab bar.

### 6.3 Biometric Unlock (optional, recommended)
After first successful login, prompt to enable Face ID / Touch ID / fingerprint. On subsequent app launches, gate access to the cached session behind a biometric prompt. Setting lives in `user_preferences` (add a column `biometric_unlock_enabled boolean default false` if not present — see §13).

---

## 7. Screen Inventory

Tab bar (bottom): **Home** · **Tools** · **Add** (center, prominent) · **Requests** · **Profile**

| # | Screen | Web equivalent | Native notes |
|---|--------|----------------|--------------|
| 1 | Splash / launch | — | Show logo, check session, route |
| 2 | Onboarding (3 slides) | — | First-launch only, skippable |
| 3 | Login | `/login` | Email/password + "Continue with Google" |
| 4 | Register | `/register` | Display name + email + password |
| 5 | Forgot password | — | Email entry → toast → return |
| 6 | Reset password | — | Triggered by deep link |
| 7 | Home / Dashboard | `Dashboard.tsx` | Quick actions, active borrows/lends, pending actions, recent feed |
| 8 | Tools list | `Tools.tsx` | Search bar, filter sheet, grid/list toggle |
| 9 | Tool detail | `ToolDetail.tsx` | Image carousel, owner info, description (bulleted), Request button |
| 10 | Add tool | `AddTool.tsx` | **Camera-first**: capture or pick → AI analyze → review form → submit |
| 11 | Edit tool | `EditTool.tsx` | Same form as Add, prefilled |
| 12 | Search results | `SearchResults.tsx` | Triggered from search input |
| 13 | Requests list | `Requests.tsx` | Tabs: Borrowing / Lending; filter by status |
| 14 | Request detail | `RequestDetail.tsx` | Status timeline, action buttons, message thread |
| 15 | Groups list | `Groups.tsx` | Cards with member count, create FAB |
| 16 | Group detail | `GroupDetail.tsx` | Members, tools shared, invite button |
| 17 | Create group | `CreateGroup.tsx` | Name, description, privacy toggle |
| 18 | Join group | `JoinGroup.tsx` | Triggered by invite deep link |
| 19 | Invitations | `Invitations.tsx` | Pending invites for current user's email |
| 20 | Profile | `Profile.tsx` | Avatar, display name, stats |
| 21 | Settings | `Settings.tsx` | Notifications, biometrics, theme, sign out |
| 22 | Notifications | dropdown on web | Full-screen list on mobile, swipe to mark read |
| 23 | Help / FAQ | `Help.tsx` | Static content |

---

## 8. Critical User Flows

### 8.1 Add a Tool (camera-first)
1. User taps center **Add** tab → action sheet: "Take Photo" / "Choose from Library"
2. Camera/picker opens → user captures image
3. App resizes image client-side, uploads to `tool-images` bucket, gets public URL
4. App calls `analyze-tool-image` with the URL → loading spinner with "Analyzing your tool…" copy
5. Form opens prefilled with AI suggestions; each AI-filled field shows a subtle ✨ icon
6. User edits name, category (required), condition, brand, power source, instructions
7. User selects which groups can see the tool (default: all). Hidden groups create `tool_group_visibility` rows with `is_hidden=true`.
8. Submit → INSERT into `tools` → trigger generates thumbnails → return to tool detail

### 8.2 Borrow a Tool
1. User opens tool detail → taps **Request to Borrow**
2. Date range picker (start + end, end ≥ start, start ≥ today)
3. Optional message field
4. Submit → INSERT into `tool_requests` (status: `pending`)
5. Trigger creates notification for owner; if owner has push enabled, FCM/APNs delivers it
6. Borrower sees request in **Requests → Borrowing** tab with status badge
7. Owner approves or denies via Request Detail
8. On `picked_up`: borrower confirms in app; tool status → `borrowed`
9. On return: borrower taps "Initiate Return" → status `return_pending`
10. Owner confirms with optional condition notes → status `returned`; tool status → `available`

### 8.3 Group Invite (deep link)
1. Admin generates invite → row inserted in `group_invites` with unique `invite_code`
2. App generates a Universal Link / App Link: `https://borrow-buddy.app/invite/{invite_code}`
3. Recipient taps link → app opens to **Join Group** screen with group preview
4. If not signed in, route through auth, preserving the invite code
5. Accept → INSERT into `group_members` (RLS allows because email matches and invite exists)
6. Navigate to group detail

### 8.4 Realtime Notification
1. App establishes Supabase realtime subscription on launch (filtered by `user_id`)
2. New notification row → SDK callback → app updates badge count + shows in-app banner
3. If app is backgrounded, push notification (APNs/FCM) is delivered separately by an edge function or scheduled job (see §10).

---

## 9. Native-Only Capabilities

### 9.1 Camera
- Request `NSCameraUsageDescription` (iOS) and `CAMERA` permission (Android) only when the user taps "Take Photo" — never on launch.
- Provide a clear in-context explainer if denied; deep link to settings.

### 9.2 Push Notifications
- Register for APNs / FCM after user grants permission (request in context: when toggling "Push notifications" in Settings, or after the first request is created).
- Store device token in a new `device_tokens` table (see §13 for migration).
- An edge function (`send-push-notification`, to build) listens via DB trigger or runs on `notifications` insert and pushes to all of the user's tokens, respecting `user_preferences.push_notifications`.

### 9.3 Offline Mode
- **Read-only offline:** Cache the user's owned tools, active requests, and groups using Room/CoreData.
- Show a "You're offline" banner when network is unavailable.
- Queue write actions (request submission, message send) and replay when reconnected.

### 9.4 Deep Links
| URL | Action |
|-----|--------|
| `borrowbuddy://reset-password?token=…` | Open password reset screen |
| `https://borrow-buddy.app/invite/{code}` | Open Join Group |
| `https://borrow-buddy.app/tool/{id}` | Open Tool Detail |
| `https://borrow-buddy.app/request/{id}` | Open Request Detail |

Configure Universal Links (`apple-app-site-association`) and App Links (`assetlinks.json`) on the marketing site.

### 9.5 Native Sharing
- Tool detail → Share sheet with deep link
- Group detail → Share invite link via system share sheet

### 9.6 Biometrics
See §6.3.

### 9.7 Haptics
- Light haptic on tab change
- Success haptic on request approval / tool added
- Error haptic on failed validation

---

## 10. Notifications Architecture

### 10.1 In-App (already implemented server-side)
DB triggers create `notifications` rows on:
- New `tool_request` → notify tool owner
- `tool_request` status change to `approved`/`denied` → notify requester
- New `request_messages` row → notify the other party
- New `group_invites` row → notify invitee (if they have an account)

### 10.2 Push (native — to build)
Required new components:
1. **Migration:** create `device_tokens` table (`user_id`, `token`, `platform`, `created_at`).
2. **Edge function `register-device-token`**: upserts the token for the authenticated user.
3. **Edge function `send-push-notification`**: triggered by a DB webhook on `notifications` INSERT, looks up the user's tokens, checks `user_preferences`, and dispatches via APNs (iOS) and FCM (Android).
4. **Secrets needed:** `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_AUTH_KEY`, `FCM_SERVER_KEY`.

---

## 11. UX & Design System

The native apps must feel native, **not** a webview. However, the visual identity must match the web app:

- **Theme:** Dark mode by default (matches web). Support light mode via system setting.
- **Surfaces:** Use elevation tokens (surface-1 → surface-3) instead of hard borders — see `mem://style/design-system-elevation`.
- **Glassmorphism** on top app bar / header (matches web).
- **Color tokens:** Mirror the HSL values defined in `src/index.css`. Do not hardcode colors.
- **Typography:** System font (SF Pro on iOS, Roboto on Android) — do not ship custom web fonts.
- **Tool tile design:** 320pt full-bleed image, gradient overlay, owner avatar pill — see `mem://features/tool-tiles`.
- **Badges:** Solid border, 60% opacity background, white text — see `mem://style/component-badges`.
- **Hover states (web) → pressed states (native):** 7% primary opacity overlay.

---

## 12. Non-Functional Requirements

| Concern | Target |
|---------|--------|
| Cold start | < 2s on iPhone 12 / Pixel 6 |
| Image upload (photo → tool created) | < 8s including AI analysis |
| Crash-free sessions | > 99.5% |
| Accessibility | WCAG 2.1 AA, full VoiceOver / TalkBack support, Dynamic Type |
| Localization | Strings externalized; English only at launch |
| Analytics | Track key funnels (sign up, tool added, request created, request returned). PostHog or Firebase Analytics. |
| App size | < 30 MB download |

---

## 13. Required Backend Additions for Native

These do **not** exist yet and must be added before launch. Each is a small, well-scoped migration / function.

1. **`device_tokens` table** — push token registry.
2. **`send-push-notification` edge function** — dispatch APNs + FCM.
3. **`register-device-token` edge function** — secure upsert from the native client.
4. **Optional `user_preferences.biometric_unlock_enabled`** column.
5. **Universal Link / App Link verification files** hosted on the marketing site (`apple-app-site-association`, `.well-known/assetlinks.json`).

Coordinate these migrations with the web team — they touch shared infrastructure but are additive and non-breaking.

---

## 14. Out of Scope for v1

- In-app payments / rentals
- Damage deposits / insurance
- Calendar (iCal) integration
- Map / location-based discovery
- In-app video calls between borrower / owner
- Apple Watch / Wear OS companions
- Tablet split-view (single-column layout acceptable on tablets at launch)

---

## 15. Acceptance Criteria

The native app is "done" when:
- ✅ A new user can sign up, create a group, invite a friend, add a tool with a photo, and complete a full borrow/return cycle entirely on device.
- ✅ Push notifications fire reliably for all four notification types within 10 seconds of the source event.
- ✅ Deep links route correctly from email, SMS, and the system share sheet, including when the app is cold-started.
- ✅ The app behaves correctly offline for read operations and queues write operations.
- ✅ All user-visible flows match the web app's information architecture and copy.
- ✅ Both apps pass App Store Review and Google Play pre-launch report with zero policy violations.

---

## 16. References

- Product PRD: [`docs/PRD.md`](./PRD.md)
- Database schema (full): [`docs/DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md)
- Existing Capacitor wrapper setup: [`docs/NATIVE_APP_SETUP.md`](./NATIVE_APP_SETUP.md)
- Supabase project: `wpmelbovrxfyrckhwonf`
- Web app source: this repository
