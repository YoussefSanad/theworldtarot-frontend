/**
 * A Schema.org block in the document.
 *
 * `dangerouslySetInnerHTML` is how a JSON-LD script is written in React and
 * there is no safer form — the content is a `<script>` body, so React's escaping
 * would corrupt it rather than protect it. What makes it safe here is the input:
 * every caller passes a literal built by `lib/structured-data.ts` from bundled
 * copy, never anything a visitor or the API supplied. The `<` escape guards the
 * one case that would still bite if that ever stopped being true — a `</script>`
 * inside a string ending the block early.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
