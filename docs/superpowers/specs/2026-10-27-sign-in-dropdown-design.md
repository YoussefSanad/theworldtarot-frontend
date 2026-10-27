# Signing in from the masthead

A design for moving sign-in into a dropdown under the masthead's account icon,
redesigning the `/login/` page that stays behind it, and giving both a notion of
where a visitor should land once they are in.

Written 27 October 2026.

## Why this exists

The Viewing Room's paywall panel has a sign-in line in it, and it has had one
since the room was built. It points at `/login/?next=/viewing-room/`, and the
comment beside it says the return path is a later ticket's and that the link is
the one it will honour. Nothing honours it: `/login/` has never read a query
string, and the sign in form sends everybody to `/readings/` whatever brought
them there.

So the immediate fault is small and real — a visitor who already owns the pass,
is looking at the panel that sells it, and clicks the one line offering them a
way in, lands on the readings page instead of in the room they just paid to
enter.

Fixing only that would be five lines. The decision taken here is to fix the
shape instead: **the reason that visitor had to leave the room at all is that
signing in is a page.** A dropdown under the account icon lets them sign in
where they are standing, and the return path mostly stops being a problem rather
than getting solved.

The `/login/` page does not go away. Links arrive at it cold — from the paywall
on a phone, and from the two password mails — and it also reads as unfinished
today, which is the second half of the work.

## Goals

- A visitor can sign in without leaving the page they are on.
- A visitor refused by the paywall can sign in without leaving the room.
- Somebody who signs in lands somewhere that makes sense for who they are.
- `/login/` looks like a page this site designed, not a form on a background.
- Signing out asks first, in every place it can be done.

## Non-goals

- A member area. There is still nothing to land in, which is why the landing
  rule below leans on the Viewing Room and the homepage.
- Changing how the password mails are built. The backend owns the shape of those
  links (`{site}/set-password/?token=…&email=…`, held as backend config) and
  this work does not ask it to change. A visitor arriving from one of those mails
  gets the default landing.
- Changing the sign-in refusal's vagueness. See "What must not change".
- Order history, or anything else in the contract's "still to design".

## Anti-goals

Things that would make this a failure even if it shipped and worked:

- **A visitor stranded in the paywall.** The panel has no close button, no
  Escape and no backdrop dismiss, because the room behind it is inert and a
  dismissable paywall over a dead room only appears to work. Stacking a
  dropdown on it must not recreate the trap the panel carefully avoids: the
  dropdown has to be closable even though the thing beneath it is not.
- **A sign-in form that exists three times.** One form, one set of field
  wiring, one failure mapping. A second copy in the dropdown is how one of them
  quietly loses its `aria-describedby`.
- **A redirect that leaves our site.** `?next=` is attacker-supplied. A `next`
  of `https://…` or `//elsewhere.example` would turn our sign-in link into a
  way to bounce somebody onto a page that looks like ours and asks for their
  password.
- **A member seeing a frame of the paywall**, or of a signed-out masthead. The
  existing `asking` state exists for exactly this and must survive.

## What must not change

These are load-bearing and documented as such in the code. A builder who
"improves" one of them has broken something the backend relies on.

- **The sign-in refusal stays vague.** A wrong password, an address with no
  account, and an account made by a settled order whose owner has never chosen a
  password are one outcome on the wire. `API_CONTRACT.md` says the backend
  answers all three identically and will not change. `loginCopy.refused` is the
  one sentence for all three and it must keep sending unclaimed accounts to the
  forgot-password flow, which is their only way out.
- **Asking for a reset link always succeeds.** `POST /api/v1/forgot-password`
  is always 200 with the same body. The copy must never say a message was sent.
- **`device_name` is never sent to `/api/v1/login`.** It switches the API to
  bearer tokens and no session cookie; the website is the cookie flow.
- **Nothing caches `/me`.** No `localStorage`, no persisted store. It is
  `no-store` and different for every caller.
- **The two password pages share no sentence a person reads.** Somebody who has
  never had a password is not resetting one.

## The landing rule

Where a visitor goes once they are signed in. One rule, used by the dropdown,
the drawer and the page alike.

1. If there is a usable return path, go there.
2. Otherwise, if the customer holds a Viewing Room pass, go to the Viewing Room.
3. Otherwise, go to the homepage.

`/readings/` stops being anybody's landing place. It was only ever there because
there was no member area, and the homepage is the better answer to "we do not
know what you came for".

Step 2 costs nothing: `signIn()` already answers with the `Customer`, and
`hasViewingRoomAccess` is on it. No second call, no guessing.

**From the dropdown, steps 2 and 3 do not navigate at all.** Somebody who signs
in from the masthead is already somewhere they chose to be, and moving them off
it would be the dropdown's whole advantage thrown away. The rule above is for
arrivals at `/login/`. The dropdown closes and the page re-decides in place.

### Where it lives

`src/lib/return-path.ts`, as two functions the caller composes:

- `readReturnPath(raw: string | null): string | null` — the raw `next` value in,
  a usable path or `null` out.
- `landingFor(customer: Customer): string` — steps 2 and 3 only.

**Two functions rather than one taking both**, because the dropdown needs
`landingFor` with no `next` anywhere in sight, and a single function would have
to be handed an argument its main caller does not have. A seam of its own for
the reason `viewing-room-access.ts` gives: it is pure, it is the piece most
likely to be got subtly wrong, and it is testable without a DOM.

### What counts as a usable return path

A `next` is honoured only if it is a path on this site:

- It begins with a single `/` and the second character is not `/` or `\`.
- It contains no control characters.
- Its **path portion** is not `/login/`, which would be a loop. Matched on the
  path rather than on string equality, so `/login/?next=/login/` is refused too.

Anything else is dropped silently and the visitor falls through to step 2. There
is nothing worth telling them: a refused `next` is either a bug on our side or
an attack on theirs, and neither is actionable from a sign-in form.

The path's own query string and fragment are kept, so `?next=/library/?card=3`
survives intact.

## The dropdown

A third panel in a masthead that already has two. `LocaleMenu` in
`LocaleControls.tsx` is the one to copy: click to toggle, dismiss on
outside-pointerdown, Escape or Tab out, and focus returns to the trigger on
close. `NavDropdown` already borrows it, so this is a third caller of an
established behaviour rather than a new interaction.

Taking that behaviour wholesale also answers the paywall worry: the dropdown is
dismissable because there is something usable behind it — the panel — while the
panel is not, because there is nothing usable behind *it*. Two different rules
in one view, each correct for its own layer. The builder should say so in a
comment; it looks like an inconsistency until you know why.

### Before `/me` answers

`useSignedIn` returns `undefined` until `/me` lands, with an 8-second deadline.
Today that falls into `AccountControl`'s signed-out branch, so the masthead
draws the sign-in link at once — right for a link, and a question for a trigger.

**The trigger draws the signed-out form during `asking`, and the panel
re-renders in place if `/me` lands while it is open.** Not disabled: a control
that is dead for up to eight seconds is worse than a panel that corrects itself,
and the same reasoning already governs `useSignedIn`'s own deadline — a visitor
can act on a form and cannot act on a spinner.

If the panel's contents are replaced under an open dropdown, focus must be
re-seated inside it. `PaywallModal` already does exactly this when signing out
swaps its contents, and its implementation is the one to follow.

**The trigger stops being a `<Link>` and becomes a `<button>`** in the
signed-out state. See "Verification" — a browser check selects it by element
type today.

### What it holds

**Signed out:** the sign-in form, compact. Email, password, submit, and the
forgotten-password line. The forgot flow swaps the panel's contents in place,
the same swap the page does today — one submit on screen at a time, so the
return key cannot reach the wrong one.

**Signed in:** who they are, and a way out. `customerLabel` decides what to
call them — their name when they have one, their address when they do not,
which is the ordinary case for a buyer whose account was made by a settled
order.

**Signing out:** a confirmation, drawn inside the dropdown rather than as a
dialog over it. See "Signing out".

### The form is shared

One `SignInForm`, with a compact variant for the dropdown. Not a second
component: the field wiring, the failure mapping, the forgot-password swap and
the accessibility attributes are all things that must not drift between two
copies.

**The form must not own the navigation.** Today it calls `router.push` itself.
The page wants the landing rule; the dropdown wants to stay put. So success
hands the `Customer` to the caller and the caller decides — a callback, in
whichever shape the compact variant ends up taking.

This also keeps `useSearchParams` out of the form. The dropdown is rendered by
`SiteHeader`, which is the root layout's chrome on **every** route: a form that
read the query string itself would either hold every route dynamic under static
export or need its own `Suspense` boundary in the header. Reading `next` is the
page's job, because the page is the only caller that has one.

**This is the part of the design most likely to need revisiting.** The same form
now has to look right in a designed full-page panel and in a box under a header
icon, which is a real spread. If the variant prop starts branching on more than
spacing and type scale, that is the signal to split the *presentation* and keep
sharing the logic — not the signal to fork the whole form.

### Over the paywall

The paywall's sign-in line stops being a link to `/login/` and becomes a control
that opens the masthead dropdown. The header is `z-50` and the panel is `z-30`,
so the dropdown already renders above it with no stacking work.

The modal's own notes say the two things it deliberately leaves open are
navigating away and signing in. This keeps both and removes the navigation from
the second.

**On success the dropdown closes and the panel re-decides in place.** This is
free: `useSignedIn` is a shared store and publishes to every reader at once, so
a pass holder's panel disappears and the room comes alive, while a customer
without the pass drops to the no-pass screen with their account named on it.
`AccountLine` already relies on this in reverse for sign-out.

The paywall is the one place where "signed in but still refused" is a normal
outcome, and the no-pass screen is what it lands on. Nothing new to build.

### On a phone

The masthead is a drawer below the desktop-nav breakpoint, and the drawer is
already a full-height panel with an account slot in it. **The form becomes a
section inside the drawer**, not a sheet over it.

The drawer locks scroll while open and resets the masthead palette to the
site's own; a form added to it inherits both. `SiteHeader` has a note about
crossing the breakpoint with the drawer open — a builder adding a section to
the drawer should read it rather than rediscover it.

The paywall's sign-in control opens the drawer on a phone, the same as it opens
the dropdown on a desktop. **That requires the scroll lock to be fixed first**;
see below.

### One scroll lock, not two

`PaywallModal` sets `document.body.style.overflow = "hidden"` on mount and
restores the value it captured on unmount. The drawer in `SiteHeader` does the
same to both `documentElement` and `body`, restoring what *it* captured. Two
independent save-and-restore pairs on one property.

Interleaved, they corrupt each other: the paywall captured its "previous" before
the drawer existed, so whichever unwinds second wins and the page can be left
unscrollable. The case is not hypothetical — signing out from inside the drawer
on the Viewing Room unmounts a member's paywall while the drawer is open, which
is exactly that interleaving.

**Extract the lock into one shared seam** that counts its holders and restores
the original value only when the last one releases. Both callers move onto it.
This is a prerequisite for the phone path above rather than a cleanup to do
afterwards.

Two related layering facts the builder should know rather than discover:

- The drawer is `position: fixed` inside `<header>`, which is outside the
  room's `inert` subtree, so the drawer's own controls stay reachable. That part
  needs nothing.
- The drawer renders a full-bleed backdrop at the header's layer, above the
  paywall's. A dismissable backdrop over an undismissable panel is fine —
  dismissing the drawer returns the visitor to the paywall, which is where they
  were — but it is a third layer over the room and the two-layer intent above
  does not cover it. Keep the drawer's backdrop dismissing the drawer only, and
  never the paywall.
- `SiteHeader` closes the drawer when the viewport crosses into desktop-nav
  width. On the Viewing Room that would drop a half-typed sign-in form. Accepted
  rather than solved: it takes a deliberate resize mid-form, and the alternative
  is carrying form state across two different renderings of the masthead.

## Signing out

Today sign-out is instant in two implementations — the masthead's
`AccountControl` and the paywall's `AccountLine` — across three rendered
instances, because `SiteHeader` renders `AccountControl` twice, on the desktop
row and in the drawer.

**One shared confirmation component in `components/account/`**, used by all
three. Its wording lives in `content/` with the rest. Three local renderings
agreeing by copied copy is how one of them is later changed alone.

The confirmation is plain: a short question, confirm, cancel. **No warning
language.** Signing out costs nothing here; there is no unsaved work and no
member area to be thrown out of, and copy that implied otherwise would be
lying to make the button feel important.

What must survive from the current implementation, in both places:

- The local session is cleared **whether or not the API answered**. A masthead
  still showing somebody's name after they pressed sign out is the one outcome
  that reads as a fault.
- A refused sign-out is swallowed, not logged. It almost always means the
  session had already ended, and there is nothing a person can do with the
  difference.
- The paywall's panel re-seats focus when its contents change, because signing
  out replaces them while the panel stays open.

## The `/login/` page

It stays, and it is redesigned to the standard of the paywall panel rather than
tidied.

### What is actually wrong with it

Worth being precise, because most of what looks wrong with it is not.

Already correct and not to be "fixed": it uses the site's own type and colour
tokens (`font-display`, `text-champagne`, `text-ash`, `text-note`); `.field` is
the newsletter field's styling from Figma, transparent with an ash border and a
gold focus glow; the submit button already disables and swaps to "Signing in…"
while the request is in flight; every field has a real `<label for>`, correct
`autocomplete`, `aria-invalid` and `aria-describedby` wired to its error, and
the whole-form refusal is a `role="alert"`. The password pages carry a hidden
username input so password managers save a usable entry.

What is actually missing is **presence**. `Panel` is a bare 36.25rem column with
`py-24` and nothing else — and in particular no `PageAtmosphere`. That is what
reads as unfinished.

Not quite "unlike every other page": `/set-password/`, `/reset-password/` and
`CheckoutComplete` have no atmosphere either, and `CheckoutComplete` documents
its own reason for that. So this is a gap shared by the account surfaces rather
than one page's oversight, and it is fixed for all three account pages at once.

### The ground

All three account pages take `variant="card-reference"` — **the night sky on
`#091828`** that the card detail and suit reference pages use.

**It is a night sky, not the parchment its name and some of its older comments
suggest.** That variant was a warm forest wash once and is not any more; the
rule above it in `globals.css` notes the masthead went back to the site's blue
once the ground stopped being pale. A builder who reads "the one light ground on
the site" in `PageAtmosphere.tsx`'s own comment is reading a stale description
of a variant that has since been replaced.

This matters because it is why the choice is cheap. On a dark ground:

- The forms keep every colour they have. `text-champagne`, `text-ash` and
  `.field`'s ash border and gold focus glow are all built for night and need no
  light variant.
- `.field` stays shared with the newsletter form untouched.
- The masthead needs no `:has()` light-page override. The one that exists for
  `.library-card-page` is about a pale ground and does not apply.

If any of those three turn out to be needed, something has changed about the
variant and the choice of ground should come back to the client rather than be
worked around.

### What it becomes

A designed surface: the atmosphere above, and a panel with the paywall's level
of care — its display heading, its gold rule, its sense of being a made thing
rather than a form on a background.

The builder has latitude here and should look at `UnlockPanel` and
`PaywallModal` for the house style before inventing one. Two cautions from
those files: the paywall's type is scaled to the viewport rather than
transcribed from the artboard, because literal transcription made the panel read
as a page instead of a panel; and the gold button is the site's own `btn-gold`
rather than a gradient rebuilt locally.

### What it does differently

- It reads `?next=` and applies the landing rule. This means it reads the query
  string, which it has never done — so it needs a `Suspense` boundary, exactly
  as the two password pages already have, with a `null` fallback for the same
  reason: a heading that flashes into a different heading reads as a fault.
- **Already signed in, with a `next`:** go straight there. Somebody sent them
  here to get somewhere and they already have the right to be there.
- **Already signed in, without a `next`:** draw the form. The only reason to
  visit `/login/` while signed in is to become somebody else.
- `/readings/` is no longer the destination.

There is a beat before `/me` answers during which we do not know which case
applies. The form is what shows during that beat, and a redirect lands after it
— the same wait the Viewing Room covers with its veil. Do not add a spinner: a
visitor can act on a form and cannot act on a spinner, which is the reasoning
`useSignedIn` already applies to its 8-second deadline.

## The password pages

Barely touched, deliberately. `/set-password/` and `/reset-password/` keep their
tokens, their words, their endpoints and their vagueness about dead links.

One change: **their success panel gains a way onward.** Today it draws a
heading and a sentence and nothing clickable — a visitor who has just set a
password is told they can sign in whenever they like, with no way to do it. It
gains a link to `/login/`, and the landing rule decides where they end up from
there.

Both `setPasswordCopy` and `resetPasswordCopy` need their own wording for that
link. They already have a `signInPrompt` string, but it is written for a dead
link ("Go to the sign in page") and shown only on failure; a success needs its
own sentence in each file. Reusing one string across both pages would break the
rule that these two pages share no sentence a person reads.

A visitor arriving from either mail gets the default landing, since the mail's
link carries no return path. For a pass buyer that is the Viewing Room, which
happens to be exactly where the claim mail's reader was heading.

## Decisions taken here, so a builder does not have to guess

Marked as the author's calls rather than the client's:

- A refused `next` falls through silently rather than showing a message.
- `next` keeps its own query string and fragment.
- `/login/` as a `next` is refused by its path portion, to avoid a loop.
- Surrounding whitespace in a `next` is trimmed, since mail clients add it.
- The return-path seam is two functions, not one.
- The form hands its `Customer` to the caller instead of navigating.
- The sign-out confirmation uses no warning language, and is one shared
  component rather than three agreeing renderings.
- The dropdown is dismissable although the paywall beneath it is not.
- From the dropdown, a successful sign-in does not navigate.
- The account trigger draws the signed-out form during `asking` rather than
  being disabled.
- A resize across the desktop-nav breakpoint may drop a half-typed form in the
  drawer. Accepted.

The client decided the rest: the dropdown itself, the paywall control opening it,
the forgot flow swapping inside it, sign-out confirming everywhere, the full
redesign of `/login/`, the shared form, the ground all three account pages sit
on, and the phone opening the drawer rather than keeping a link.

## Left to the builder

- The visual design of the dropdown panel and the redesigned `/login/` page,
  within the house style described above.
- The exact wording of the sign-out confirmation and the two success links.
- How the compact variant is expressed — a prop, a context, or a wrapper — and
  the shape of the success callback that goes with it.
- The shape of the shared scroll lock.
- Whether the paywall's sign-in control is a button that opens the dropdown
  directly, or dispatches something the header listens for.

## Verification

Per `AGENTS.md`:

- Unit tests (`npm test`) for the return-path reader and the landing rule. The
  reader's refusals are the ones worth being thorough about: `//host`, `/\host`,
  `https://`, `javascript:`, control characters, relative paths, and `/login/`.
- Lint (`npm run lint`).
- A browser check for the flow a unit test cannot see: the paywall's sign-in
  control opening the dropdown, and the panel re-deciding on success without a
  reload. `scripts/check-login.mjs` and `scripts/check-viewing-room.mjs` both
  exist and fake the API themselves; this belongs with one of them.

**Four existing assertions break and are part of the work, not a surprise:**

- `check-login.mjs` selects the masthead control as
  `header a[aria-label="Sign in"]`. It stops matching when the trigger becomes
  a `<button>`.
- `check-login.mjs` asserts the post-sign-in URL is `/readings/`, in two
  places. Both become the landing rule's answer.
- `check-viewing-room.mjs` reads the paywall's sign-in `href` and expects
  `/login/?next=/viewing-room/`. The control is no longer a link with an href.
- `check-viewing-room.mjs` finds that control by `role="link"`, in two places.
  It becomes a button.

`check-login.mjs` deliberately keeps its own copies of `content/login.ts`
sentences so that changing the copy does not silently pass — which means it will
not fail loudly on a changed destination either. It asserts the old URL happily.
Update it rather than trusting it.
- The user verifies the visual result themselves. Do not launch a dev server or
  drive a browser to check how it looks.
