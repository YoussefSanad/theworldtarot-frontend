# Sign-in Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move signing in into a dropdown under the masthead's account icon, redesign the `/login/` page that stays behind it, and give both a notion of where a visitor should land.

**Architecture:** A pure `return-path.ts` seam decides destinations; `SignInForm` gains a compact variant and stops navigating, handing its `Customer` to whichever caller owns the navigation; the account control becomes a dropdown built on `LocaleMenu`'s established open/dismiss/focus-return pattern; one shared scroll lock replaces the two that currently fight.

**Tech Stack:** Next.js static export (`output: "export"`, `trailingSlash`), React 19, Tailwind v4 with `globals.css` layers, `motion/react` for panel animation, Node's built-in test runner, Playwright for browser checks.

**Spec:** `docs/superpowers/specs/2026-10-27-sign-in-dropdown-design.md`

## Global Constraints

- **Read `node_modules/next/dist/docs/` before writing route or rendering code.** This Next.js version has breaking changes from training data (`AGENTS.md`).
- **The sign-in refusal stays vague.** `loginCopy.refused` covers a wrong password, an unknown address, and an unclaimed account. The backend answers all three identically and will not change. Never narrow it.
- **Asking for a reset link always succeeds.** Copy must never say a message was sent.
- **`device_name` is never sent to `/api/v1/login`.** It switches the API to bearer tokens and no session cookie.
- **Nothing caches `/me`.** No `localStorage`, no persisted store, no service worker.
- **The two password pages share no sentence a person reads.** Each needs its own wording for every new string.
- **Trailing slashes are part of every internal path:** `/login/`, `/viewing-room/`, `/set-password/`, `/reset-password/`.
- **No dev server, no browser screenshots to check appearance.** The user verifies visuals themselves. Browser checks assert behaviour only, via `npm run build && npm run check:<name>`.
- Verification: `npm test`, `npm run lint`, `npm run build`.

## Review Focus

Five things the spec implies that no task's happy path would exercise. Each has its test added to the task that owns the code.

1. **`next` carrying a crafted value** — `//host`, `/\host`, `javascript:`, a control character, `/login/?next=/login/`. A visitor must land on the default, never off-site. (Task 1)
2. **The panel's contents replaced under an open dropdown** — `/me` lands, or a sign-out completes, while focus is inside. Focus must be re-seated inside the panel, not dropped to `<body>`. (Task 5)
3. **Two scroll locks unwinding out of order** — the paywall unmounts while the drawer is open. The page must stay scrollable. (Task 3)
4. **A sign-out whose API call fails** — the local session must still clear, and nothing may reach the console as an unhandled rejection. (Task 4)
5. **A signed-in visitor arriving at `/login/` with and without a `next`** — with one, redirect; without one, draw the form so they can switch accounts. (Task 7)

---

## File Structure

**Create:**
- `src/lib/return-path.ts` — pure destination logic. Consumed by the login page and the dropdown.
- `src/lib/return-path.test.ts`
- `src/lib/scroll-lock.ts` — one reference-counted lock over `html`/`body` overflow.
- `src/lib/scroll-lock.test.ts`
- `src/components/account/SignOutConfirm.tsx` — the shared confirmation, used by all three sign-out sites.
- `src/components/account/AccountMenu.tsx` — the dropdown: trigger, panel, and the signed-out/signed-in/confirming states.

**Modify:**
- `src/content/login.ts` — drop `afterSignIn`; add the dropdown's and confirmation's strings.
- `src/content/passwords.ts` — add a success-link string to each of the two copies.
- `src/components/account/SignInForm.tsx` — compact variant; hand `Customer` to the caller instead of navigating.
- `src/components/account/PasswordForm.tsx` — a link on the success panel.
- `src/components/account/AccountControl.tsx` — becomes the dropdown's host; sign-out moves behind the confirmation.
- `src/components/layout/SiteHeader.tsx` — drawer uses the shared lock; drawer gains the form section.
- `src/components/viewing-room/PaywallModal.tsx` — uses the shared lock.
- `src/components/viewing-room/UnlockPanel.tsx` — sign-in link becomes a control that opens the menu.
- `src/components/viewing-room/AccountLine.tsx` — sign-out behind the confirmation.
- `src/app/(site)/login/page.tsx` — Suspense boundary, atmosphere, redesign.
- `src/app/(site)/set-password/page.tsx`, `reset-password/page.tsx` — atmosphere.
- `scripts/check-login.mjs`, `scripts/check-viewing-room.mjs` — four broken assertions, plus new coverage.

---

### Task 1: The return-path seam

**Files:**
- Create: `src/lib/return-path.ts`
- Test: `src/lib/return-path.test.ts`

**Interfaces:**
- Consumes: `Customer` from `src/lib/session.ts`.
- Produces:
  - `readReturnPath(raw: string | null): string | null`
  - `landingFor(customer: Customer): string`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Customer } from "./session.ts";
import { landingFor, readReturnPath } from "./return-path.ts";

function customer(hasViewingRoomAccess: boolean): Customer {
  return { id: 1, name: null, email: "jane@example.com", hasViewingRoomAccess };
}

test("keeps a path on this site", () => {
  assert.equal(readReturnPath("/viewing-room/"), "/viewing-room/");
});

test("keeps a path's own query string and fragment", () => {
  assert.equal(readReturnPath("/library/?card=3#notes"), "/library/?card=3#notes");
});

test("refuses an absolute URL, however friendly the host looks", () => {
  assert.equal(readReturnPath("https://theworldtarot.com/viewing-room/"), null);
  assert.equal(readReturnPath("http://elsewhere.example/"), null);
});

test("refuses a protocol-relative URL", () => {
  assert.equal(readReturnPath("//elsewhere.example/viewing-room/"), null);
  assert.equal(readReturnPath("/\\elsewhere.example"), null);
});

test("refuses a scheme that is not a page at all", () => {
  assert.equal(readReturnPath("javascript:alert(1)"), null);
  assert.equal(readReturnPath("data:text/html,<script></script>"), null);
});

test("refuses a relative path, which is not ours to resolve", () => {
  assert.equal(readReturnPath("viewing-room/"), null);
  assert.equal(readReturnPath("../admin/"), null);
});

test("refuses an absent, empty or whitespace-only parameter", () => {
  assert.equal(readReturnPath(null), null);
  assert.equal(readReturnPath(""), null);
  assert.equal(readReturnPath("   "), null);
});

test("refuses a control character smuggled into the path", () => {
  assert.equal(readReturnPath("/viewing-room/\nSet-Cookie: a=b"), null);
  assert.equal(readReturnPath("/viewing\troom/"), null);
});

test("refuses the sign in page itself, by path and not by equality", () => {
  assert.equal(readReturnPath("/login/"), null);
  assert.equal(readReturnPath("/login/?next=/login/"), null);
});

test("trims the surrounding whitespace a mail client can add", () => {
  assert.equal(readReturnPath("  /viewing-room/  "), "/viewing-room/");
});

test("sends a pass holder to the Viewing Room", () => {
  assert.equal(landingFor(customer(true)), "/viewing-room/");
});

test("sends everybody else home", () => {
  assert.equal(landingFor(customer(false)), "/");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test --experimental-strip-types --import=./scripts/test-register.mjs src/lib/return-path.test.ts`
Expected: FAIL — cannot resolve `./return-path.ts`.

- [ ] **Step 3: Implement both functions in `src/lib/return-path.ts`**

`readReturnPath` trims, then refuses unless the value starts with `/`, its second character is neither `/` nor `\`, it contains no character below U+0020, and its path portion (everything before the first `?` or `#`) is not `/login/`. `landingFor` returns `"/viewing-room/"` when `customer.hasViewingRoomAccess`, else `"/"`.

Document in the module docblock why it is a seam of its own (pure, easy to get subtly wrong, testable without a DOM — the reasoning `viewing-room-access.ts` gives) and why it is two functions rather than one (the dropdown needs `landingFor` with no `next` in sight).

- [ ] **Step 4: Run to verify it passes**

Run: the same command. Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/return-path.ts src/lib/return-path.test.ts
git commit -m "feat: add the return-path seam"
```

---

### Task 2: Copy for the new surfaces

**Files:**
- Modify: `src/content/login.ts`, `src/content/passwords.ts`

**Interfaces:**
- Produces: `loginCopy.menu` (`{ triggerLabel, heading, signedInAs, signOut }`), `loginCopy.signOutConfirm` (`{ question, confirm, cancel, busyLabel }`), and `PasswordPageCopy.successSignInPrompt` on both copies. `afterSignIn` is **removed**.

- [ ] **Step 1: Remove `afterSignIn` from `src/content/login.ts`**

Its only reader is `SignInForm`, which stops navigating in Task 6. Leave `signInPath` — three places import it.

- [ ] **Step 2: Add `loginCopy.menu` and `loginCopy.signOutConfirm`**

The confirmation wording is a plain question with confirm and cancel, **no warning language**: signing out costs nothing here, and copy implying otherwise would be lying to make a button feel important. Record that reasoning in a comment beside it.

- [ ] **Step 3: Add `successSignInPrompt` to `PasswordPageCopy` and to both copy objects**

Two different sentences. `setPasswordCopy`'s reader has just claimed an account; `resetPasswordCopy`'s has just changed a password. The existing `signInPrompt` is written for a dead link and stays as it is.

- [ ] **Step 4: Verify the types still compile**

Run: `npm run lint`
Expected: no errors. `SignInForm` still importing `afterSignIn` is expected to fail here — if it does, leave it; Task 6 fixes it. If lint is clean, the import was already gone.

- [ ] **Step 5: Commit**

```bash
git add src/content/login.ts src/content/passwords.ts
git commit -m "feat: add copy for the account menu and sign-out confirmation"
```

---

### Task 3: One scroll lock

**Files:**
- Create: `src/lib/scroll-lock.ts`, `src/lib/scroll-lock.test.ts`
- Modify: `src/components/viewing-room/PaywallModal.tsx:60-68`, `src/components/layout/SiteHeader.tsx:104-122`

**Interfaces:**
- Produces: `lockScroll(): () => void` — locks on the first holder, restores the original values when the last holder releases. Returns its own release function, idempotent.

Covers Review Focus item 3.

- [ ] **Step 1: Write the failing tests**

```ts
test("locks on the first holder and restores on the last release", ...)
test("a second holder does not re-capture the already-locked values", ...)
test("releases out of order and still restores the original values", ...)
test("releasing twice is harmless", ...)
test("pads the root by the scrollbar width and removes the padding on release", ...)
```

The out-of-order test is the one that matters: acquire A, acquire B, release A, release B, then assert `documentElement.style.overflow` and `body.style.overflow` are back to their pre-lock values. That is the paywall-unmounting-under-an-open-drawer case.

Stub `document` the way `src/lib/passwords.test.ts` stubs `globalThis.document`, and restore it in `after`.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test --experimental-strip-types --import=./scripts/test-register.mjs src/lib/scroll-lock.test.ts`
Expected: FAIL — cannot resolve `./scroll-lock.ts`.

- [ ] **Step 3: Implement `lockScroll` in `src/lib/scroll-lock.ts`**

Module-scoped holder count and a single captured snapshot of `documentElement.style.overflow`, `documentElement.style.paddingRight` and `body.style.overflow`. Capture only when the count goes 0 → 1; restore only when it returns to 0. Scrollbar padding comes from `window.innerWidth - documentElement.clientWidth`, applied to the root, as `SiteHeader` does today.

The docblock states why this exists: two independent save-and-restore pairs on one property corrupt each other, and the paywall captured its "previous" before the drawer existed.

- [ ] **Step 4: Run to verify it passes**

Run: the same command. Expected: PASS.

- [ ] **Step 5: Move both callers onto it**

`PaywallModal`'s effect becomes `useEffect(() => lockScroll(), [])`. `SiteHeader`'s drawer effect calls it when the drawer opens and calls the returned release on close. Keep each site's existing comment about *why* it locks; replace only the mechanism, and point both at the seam.

- [ ] **Step 6: Verify**

Run: `npm test && npm run lint`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/scroll-lock.ts src/lib/scroll-lock.test.ts src/components/viewing-room/PaywallModal.tsx src/components/layout/SiteHeader.tsx
git commit -m "fix: one reference-counted scroll lock, not two that fight"
```

---

### Task 4: The shared sign-out confirmation

**Files:**
- Create: `src/components/account/SignOutConfirm.tsx`
- Modify: `src/components/account/AccountControl.tsx`, `src/components/viewing-room/AccountLine.tsx`

**Interfaces:**
- Consumes: `loginCopy.signOutConfirm` (Task 2); `signOut` and `customerLabel` from `src/lib/session.ts`.
- Produces: `SignOutConfirm({ onConfirmed, onCancel, className })` — renders the question and two buttons, performs the sign-out itself, calls `onConfirmed` after the local session is cleared.

Covers Review Focus item 4.

- [ ] **Step 1: Implement `SignOutConfirm`**

It owns the whole sign-out, so the three call sites cannot disagree about it. Three behaviours must survive from today's two implementations, each with the comment explaining it:

- The local session clears **whether or not the API answered** — a masthead still showing somebody's name after they pressed this is the one outcome read as a fault.
- A refused sign-out is **caught, not just `finally`-ed**: `AccountControl`'s current comment records that a discarded promise surfaced as an unhandled rejection.
- The confirm button disables while the call is in flight, using `signOutConfirm.busyLabel`.

It calls `setCustomer(null)` via `useSignedIn` and then `onConfirmed`.

- [ ] **Step 2: Move `AccountLine` onto it**

`AccountLine` keeps naming the account — the contract warns that people pay under one address and sign in as another — and its "switch" control now reveals `SignOutConfirm` in place rather than signing out immediately. Keep `pretend` working, since `?state=no-pass` is the only way to review that panel.

- [ ] **Step 3: Strip the sign-out logic from `AccountControl`**

Delete its `onSignOut`, `leaving` state and the three comments now living in `SignOutConfirm`. Task 5 replaces what it renders; for this task it only needs to compile and keep showing the label and a control.

- [ ] **Step 4: Verify**

Run: `npm test && npm run lint`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/account/SignOutConfirm.tsx src/components/account/AccountControl.tsx src/components/viewing-room/AccountLine.tsx
git commit -m "feat: confirm before signing out, once, everywhere"
```

---

### Task 5: The account dropdown

**Files:**
- Create: `src/components/account/AccountMenu.tsx`
- Modify: `src/components/account/AccountControl.tsx`

**Interfaces:**
- Consumes: `SignInForm`'s compact variant (Task 6 — build this task's panel against the signature in that task's Interfaces block), `SignOutConfirm` (Task 4), `loginCopy.menu` (Task 2), `useSignedIn`.
- Produces: `AccountMenu({ onNavigate, className })`, and an imperative open for the paywall (Task 9): `openAccountMenu(): void` exported from this module, plus a `data-account-menu` hook on the trigger for check scripts.

**How `openAccountMenu` reaches the component:** a module-scoped store in the shape `useSignedIn.ts` already uses — a `Set` of listeners, read with `useSyncExternalStore`. Its docblock gives the reasoning this case shares: two components need one answer, and syncing it between them in effects is how they end up disagreeing. Here the state is "is the menu open", and the paywall is a third party that has to set it without being a parent.

`AccountControl` is rendered **twice** by `SiteHeader` — desktop row and drawer — so a naive shared flag opens both at once. Each instance must only respond when its own rendering is the visible one; the drawer is `desktop-nav:hidden` and the desktop row is hidden below that breakpoint, so a hidden instance opening is invisible but still steals focus. Give the store the instance's surface (`"row" | "drawer"`) and have `openAccountMenu` target the one that matches the current breakpoint.

Covers Review Focus item 2.

- [ ] **Step 1: Build the panel on `LocaleMenu`'s pattern**

`src/components/layout/LocaleControls.tsx:199-250` is the reference and the behaviour is copied wholesale rather than reinvented: click to toggle; `pointerdown` outside closes; `Escape` closes and returns focus to the trigger; `Tab` closes without fighting the browser's focus movement; `wasOpen`/`dismissed` refs decide whether focus returns. `NavDropdown` is a second caller of the same pattern, so this is the third.

Carry a `data-account-menu` attribute on the trigger. `LocaleMenu` explains the convention: a check script must open the panel before asserting on its contents, and copy changes while a hook does not.

The trigger is a `<button>` in every state now, not a `<Link>` when signed out. Keep `AccountIcon` and the `aria-label` from `headerActions.account.label`.

- [ ] **Step 2: Re-seat focus when the panel's contents change**

A sign-out completing, or `/me` landing, replaces the panel's contents while focus may be inside. `PaywallModal:71-78` does exactly this and is the implementation to follow: if the panel no longer contains `document.activeElement`, focus its first focusable.

- [ ] **Step 3: Draw the three states**

Signed out — the compact `SignInForm`. Signed in — `customerLabel(customer)` and a sign-out control. Confirming — `SignOutConfirm` in place of the signed-in contents.

**During `asking` (`customer === undefined`) it draws the signed-out form**, not a disabled trigger: a control dead for up to eight seconds is worse than a panel that corrects itself, which is `useSignedIn`'s own reasoning about its deadline. Comment it, because it looks like an oversight.

- [ ] **Step 4: Sign-in success does not navigate**

The panel closes and nothing else happens. `useSignedIn` is a shared store, so every reader — masthead, paywall — re-decides at once. Comment that this is why no navigation is needed.

- [ ] **Step 5: Replace `AccountControl`'s body with `AccountMenu`**

`AccountControl` keeps its name and its `onNavigate` prop, since `SiteHeader` renders it twice and the drawer passes `closeMenu`.

- [ ] **Step 6: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: all pass. The build matters here — a `useSearchParams` reaching the header would fail it.

- [ ] **Step 7: Commit**

```bash
git add src/components/account/AccountMenu.tsx src/components/account/AccountControl.tsx
git commit -m "feat: sign in from a dropdown under the masthead"
```

---

### Task 6: The form stops navigating, and learns a compact variant

**Files:**
- Modify: `src/components/account/SignInForm.tsx`

**Interfaces:**
- Produces: `SignInForm({ onSignedIn, variant })` where `onSignedIn: (customer: Customer) => void` and `variant?: "page" | "compact"` (default `"page"`).

- [ ] **Step 1: Replace `router.push(afterSignIn)` with `onSignedIn(customer)`**

`signIn()` already answers with the `Customer`; pass it through. Drop `useRouter` and the `afterSignIn` import.

Document why the form no longer owns the navigation: the page wants the landing rule, the dropdown wants to stay put, and `useSearchParams` must stay out of a component the header renders on every route — under static export that would either hold every route dynamic or need a `Suspense` boundary in the header.

- [ ] **Step 2: Add the `variant` prop**

`"compact"` tightens spacing and type scale for the dropdown; `"page"` is today's rendering. **Spacing and scale only.** If the prop starts branching on more than that, split the presentation and keep sharing the logic rather than forking the form — the field wiring, failure mapping, forgot-password swap and accessibility attributes must not drift.

The forgot-password swap works unchanged in both: one submit on screen at a time, so the return key cannot reach the wrong form.

- [ ] **Step 3: Verify**

Run: `npm test && npm run lint`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/account/SignInForm.tsx
git commit -m "refactor: the sign-in form reports success instead of navigating"
```

---

### Task 7: The login page honours a return path

**Files:**
- Modify: `src/app/(site)/login/page.tsx`

**Interfaces:**
- Consumes: `readReturnPath`, `landingFor` (Task 1); `SignInForm`'s `onSignedIn` (Task 6).

Covers Review Focus item 5.

- [ ] **Step 1: Wrap the form in a `Suspense` boundary with a `null` fallback**

The page has never read a query string and its current comment says so — update that comment rather than leaving it contradicting the code. The two password pages already do this; copy their reasoning for the blank fallback: there is nothing true to say before the query string is read, and a heading that flashes into a different heading reads as a fault.

- [ ] **Step 2: Apply the landing rule on success**

`onSignedIn` pushes `readReturnPath(searchParams.get("next")) ?? landingFor(customer)`.

- [ ] **Step 3: Redirect an already-signed-in visitor only when there is a `next`**

With a `next`, replace to it. Without one, draw the form — the only reason to visit `/login/` while signed in is to become somebody else.

The form is what shows during the beat before `/me` answers. **No spinner:** a visitor can act on a form and cannot act on a spinner.

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build`
Expected: both pass, and `out/login/index.html` exists — the route must stay static.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(site)/login/page.tsx"
git commit -m "feat: /login/ returns a visitor to where they came from"
```

---

### Task 8: Ground and polish for the three account pages

**Files:**
- Modify: `src/app/(site)/login/page.tsx`, `src/app/(site)/set-password/page.tsx`, `src/app/(site)/reset-password/page.tsx`, `src/components/account/FormPanel.tsx`

- [ ] **Step 1: Add `PageAtmosphere variant="card-reference"` to all three**

**That variant is a night sky on `#091828`**, the ground the card detail and suit reference pages use — not parchment. `PageAtmosphere.tsx`'s own comment calls it "the one light ground on the site", which is a stale description of a variant that has since been replaced; `globals.css:1794` is the current truth. The forms therefore keep every colour they have, `.field` needs no light variant, and no masthead `:has()` override is needed.

If any of those three turn out to be needed, something has changed about the variant: stop and take the choice of ground back to the client rather than working around it.

Follow `CardReferencePage.tsx:49` on positioning — `PageAtmosphere` is `absolute inset-0` and resolves against the nearest positioned ancestor.

- [ ] **Step 2: Give `/login/` the paywall's level of care**

`UnlockPanel` and `PaywallModal` are the house style. Two cautions from them: type is scaled to the viewport rather than transcribed from the artboard (literal transcription made the paywall read as a page instead of a panel), and the gold button is the site's own `btn-gold` rather than a gradient rebuilt locally.

`Panel` in `FormPanel.tsx` is shared with the password pages, so changes there land on all three — which is wanted.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: both pass. **Do not screenshot or launch a dev server**; the user checks the appearance.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(site)/login/page.tsx" "src/app/(site)/set-password/page.tsx" "src/app/(site)/reset-password/page.tsx" src/components/account/FormPanel.tsx
git commit -m "feat: the account pages get the site's ground and presence"
```

---

### Task 9: The paywall opens the menu

**Files:**
- Modify: `src/components/viewing-room/UnlockPanel.tsx:133-146`

**Interfaces:**
- Consumes: `openAccountMenu` and the `data-account-menu` hook (Task 5).

- [ ] **Step 1: Replace the link with a control that opens the menu**

The `<Link href="/login/?next=/viewing-room/">` becomes a button. Its comment currently says the return path "is #132's, and this is the link it will honour" — rewrite it: the visitor no longer leaves the room, so there is nothing to return from.

The header is `z-50` and the panel `z-30`, so the menu already renders above it with no stacking work.

- [ ] **Step 2: Note why two dismissal rules coexist**

The dropdown is dismissable; the paywall beneath it is not. Each is correct for its own layer — there is something usable behind the dropdown and nothing usable behind the paywall. It reads as an inconsistency until you know why, so say so in a comment.

- [ ] **Step 3: On a phone, the control opens the drawer**

Same control, same place. Task 3's shared lock is what makes this safe. The drawer's backdrop must dismiss the drawer only and never the paywall.

- [ ] **Step 4: Verify**

Run: `npm run lint && npm run build`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/viewing-room/UnlockPanel.tsx
git commit -m "feat: the paywall signs a visitor in without leaving the room"
```

---

### Task 10: The drawer's sign-in section

**Files:**
- Modify: `src/components/layout/SiteHeader.tsx:340-352`

- [ ] **Step 1: Render the account form as a section in the drawer**

Not a sheet over it. The drawer is already a full-height panel with an account slot; the form becomes one more thing in it, inheriting the scroll lock and the masthead palette reset the drawer already applies.

- [ ] **Step 2: Leave the breakpoint behaviour as it is**

`SiteHeader` closes the drawer when the viewport crosses into desktop-nav width, which would drop a half-typed form. **Accepted rather than solved:** it takes a deliberate resize mid-form, and the alternative is carrying form state across two renderings of the masthead. Comment it so the next reader knows it was weighed.

Read `SiteHeader`'s existing note on crossing that boundary with the drawer open before touching this.

- [ ] **Step 3: Verify**

Run: `npm run lint && npm run build`
Expected: both pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/SiteHeader.tsx
git commit -m "feat: sign in from the mobile drawer"
```

---

### Task 11: A way onward from the password pages

**Files:**
- Modify: `src/components/account/PasswordForm.tsx:99-107`

**Interfaces:**
- Consumes: `copy.successSignInPrompt` (Task 2); `signInPath`.

- [ ] **Step 1: Add the link to the success panel**

Today it draws a heading and a sentence and nothing clickable — a visitor who has just set a password is told they can sign in whenever they like, with no way to do it. The link goes to `signInPath`; the landing rule decides where they end up from there.

Use `copy.successSignInPrompt`, not the existing `signInPrompt`, which is written for a dead link and shown only on failure.

The link carries no `next`: the backend owns the shape of the mail's link and this work does not ask it to change, so these visitors get the default landing. For a pass buyer that is the Viewing Room, which is where the claim mail's reader was heading anyway.

- [ ] **Step 2: Verify**

Run: `npm test && npm run lint`
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/account/PasswordForm.tsx
git commit -m "feat: a way onward once a password is set"
```

---

### Task 12: Repair and extend the browser checks

**Files:**
- Modify: `scripts/check-login.mjs`, `scripts/check-viewing-room.mjs`

- [ ] **Step 1: Fix the four broken assertions**

- `check-login.mjs:34` — `SIGN_IN_ICON` is `header a[aria-label="Sign in"]`. The trigger is a `<button>` now; select it by `data-account-menu`.
- `check-login.mjs:208,220` and `:248` — assert `/readings/`. Replace with the landing rule's answer for each fixture. `CUSTOMER` and `NAMELESS` need a known `has_viewing_room_access` for the destination to be predictable.
- `check-viewing-room.mjs:237-238` — reads the sign-in `href` and expects `/login/?next=/viewing-room/`. It is a button with no href; assert it opens the menu instead.
- `check-viewing-room.mjs:327,535` — find that control by `role="link"`. It is a button now.

`check-login.mjs` deliberately keeps its own copies of `content/login.ts` sentences so changed copy does not silently pass — which means it will **not** fail loudly on a changed destination either. It asserts the old URL happily. Update it rather than trusting a green run.

- [ ] **Step 2: Add the flows a unit test cannot see**

In `check-viewing-room.mjs`: the paywall's control opens the menu; signing in there closes it and the panel re-decides **without a reload** — a pass holder's paywall disappears, a customer without one drops to the no-pass screen.

In `check-login.mjs`: a signed-in visitor at `/login/?next=/library/` lands on `/library/`; at `/login/` with no `next` they get the form.

- [ ] **Step 3: Verify**

Run: `npm run build && npm run check:login && npm run check:viewing-room`
Expected: both pass. These serve `out/` and fake the API themselves — neither needs staging or a real customer.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-login.mjs scripts/check-viewing-room.mjs
git commit -m "test: cover signing in from the masthead and the paywall"
```

---

## Final verification

- [ ] `npm test` — all unit tests
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] `npm run check:login`
- [ ] `npm run check:viewing-room`
- [ ] Confirm `out/login/index.html`, `out/set-password/index.html` and `out/reset-password/index.html` exist — all three routes must stay static.
- [ ] Hand the visual result to the user to check. Do not launch a dev server or drive a browser to judge appearance.
