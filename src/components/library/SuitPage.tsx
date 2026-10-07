import { ComingSoonPage } from "@/components/library/ComingSoonPage";
import { SuitReferencePage } from "@/components/library/suit/SuitReferencePage";
import { comingSoon, findSuit } from "@/content/library";

/**
 * A suit's page: her reference page when the copy exists, the holding page when
 * it does not.
 *
 * The four routes are their own directories rather than another dynamic
 * segment, which is what keeps `/library/swords-tarot-suit-meaning/` from
 * resolving as a card: a static segment wins over `[card]` in Next's matching.
 *
 * **The branch below is the one the card route already has**, and it is
 * unreachable today — all four suits carry copy. It stays for the same reason
 * that one does: a suit whose words are pulled should answer, not 404.
 */
export function SuitPage({ slug }: { slug: string }) {
  const suit = findSuit(slug);

  if (!suit) {
    throw new Error(`Unknown suit "${slug}"`);
  }

  if (!suit.content) {
    return <ComingSoonPage heading={suit.title} message={comingSoon.suit} current={suit.slug} />;
  }

  return <SuitReferencePage suit={suit} content={suit.content} />;
}
