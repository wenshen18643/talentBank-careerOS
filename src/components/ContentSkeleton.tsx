import skeleton from "@/components/skeleton.module.css";

const default_card_count = 3;

/**
 * Localized shimmer for a page's content region while its data streams in
 * behind a Suspense boundary. Unlike AppShellSkeleton it renders no chrome, so
 * the real sidebar and page header stay painted and only the data-dependent
 * cards animate — the load reads as "this section is filling in", not "the whole
 * app is still booting".
 */
export default function ContentSkeleton({
  cardCount = default_card_count,
}: {
  cardCount?: number;
}) {
  return (
    <div className={skeleton.cards} aria-busy="true" aria-label="Loading">
      {Array.from({ length: cardCount }).map((_, index) => (
        <div key={index} className={`${skeleton.block} ${skeleton.card}`} />
      ))}
    </div>
  );
}
