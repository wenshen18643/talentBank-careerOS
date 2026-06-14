import type { MatchStrength } from "@/lib/matching-core";
import styles from "@/app/employer.module.css";

const variant: Record<MatchStrength, string> = {
  strong: styles.strengthStrong,
  promising: styles.strengthPromising,
  stretch: styles.strengthStretch,
};

const label: Record<MatchStrength, string> = {
  strong: "Strong fit",
  promising: "Promising",
  stretch: "Worth a look",
};

/**
 * A worded fit indicator — deliberately not a number. Conveys the engine's read
 * as language the employer can reason about.
 */
export default function StrengthBadge({ strength }: { strength: MatchStrength }) {
  return (
    <span className={`${styles.strength} ${variant[strength]}`}>
      <span aria-hidden>◆</span>
      {label[strength]}
    </span>
  );
}
