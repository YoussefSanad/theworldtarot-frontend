/**
 * Coming-soon page copy. Text follows the Figma coming-soon frame (node
 * 270:63) — a lossy PSD-to-Figma conversion, so layout and assets are
 * reinterpreted against the homepage's existing patterns, but the copy
 * itself is transcribed as drafted.
 */

export const comingSoon = {
  heading: "the time is coming.",
  body: ["as the wheel turns,", "a new world of symbols, story,", "and transformation draws near."],
  leadIn: "Join the opening list and be among the first to enter",
  emailLabel: "email:",
  consent:
    "I agree to receive occasional emails from The World Tarot about launch updates, new features, and special announcements. I understand I can unsubscribe at any time.",
  submitLabel: "request an invitation",
  /*
   * The button's one other label, and it is never clickable. There is
   * deliberately no "sending" label: the wait is shown by the loader beside the
   * button, so the button keeps its own name while it is disabled.
   */
  sentLabel: "request received",
  /*
   * Takes `leadIn`'s place once the request lands. Lowercase to match `heading`
   * and `body` rather than `leadIn`, which is the one sentence-cased line on the
   * page — the confirmation belongs to the page's voice, not the form's label.
   */
  success: ["your request has been received", "your invitation to the world tarot will arrive soon"],
  /* Sits in a narrow slot beside the button, so it reads as three short lines. */
  error: "request failed, please try again",
  finePrint: ["We respect your privacy.", "Your email will never be sold or shared. See our Privacy Policy."],
};
