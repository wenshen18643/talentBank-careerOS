import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import {
  ArcIcon,
  ArrowIcon,
  LandscapeIcon,
  LinkIcon,
  SpeechIcon,
} from "@/components/icons";
import styles from "./landing.module.css";

const promises = [
  {
    icon: LandscapeIcon,
    title: "See the landscape, not a single answer",
    body: "We surface the realistic range of trajectories for people who share your shape — skills, schooling, prior roles, geography — and name the trade-offs of each path instead of pretending there is one right move.",
  },
  {
    icon: ArcIcon,
    title: "Career as a continuous arc",
    body: "A career isn't a stack of job applications. It's a forty-year line with phases, plateaus, pivots, and skills that compound. The system holds that long view so your next step is read in context, not in isolation.",
  },
  {
    icon: SpeechIcon,
    title: "Human language, not black-box scores",
    body: "Every recommendation explains why it makes sense and where the uncertainty sits. No opaque match percentages, no false precision — just reasoning you can actually argue with.",
  },
  {
    icon: LinkIcon,
    title: "Connect both sides honestly",
    body: "Be findable at the right moment for the right reason. Employers spot the right person before they're publicly looking — without the spam and noise that makes everyone cynical.",
  },
];

export default function LandingPage() {
  return (
    <>
      <SiteNav />
      <main>
        <section className={`container ${styles.hero}`}>
          <div>
            <span className={styles.kicker}>A career operating system</span>
            <h1 className={styles.heroTitle}>
              Your career is a 40-year arc. Most tools see <em>one job.</em>
            </h1>
            <p className={styles.heroLede}>
              Career OS is a living record of what you actually did — turned into
              a CV that tells the truth, and matching that looks forward to where
              you&apos;re headed, not backward at your last title.
            </p>
            <div className={styles.heroActions}>
              <Link href="/signup" className="btn btn-primary">
                Start your ledger
                <ArrowIcon width={18} height={18} />
              </Link>
              <Link href="/#how" className="btn btn-ghost">
                See how it works
              </Link>
            </div>
            <p className={styles.heroNote}>
              No credit card. Logs stay yours. Employers only see you once you
              match and you approve.
            </p>
          </div>
          <TrajectoryScene />
        </section>

        <section id="how" className={`container ${styles.section}`}>
          <div className={styles.sectionHead}>
            <h2>Four honest promises</h2>
            <p>
              The recruitment internet is loud, retroactive, and cynical. Career
              OS is built on the opposite instincts.
            </p>
          </div>
          <div className={styles.promises}>
            {promises.map((promise) => (
              <article key={promise.title} className={styles.promise}>
                <promise.icon className={styles.promiseIcon} />
                <div>
                  <h3>{promise.title}</h3>
                  <p>{promise.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section + " " + styles.sectionDark}>
          <div className="container">
            <div className={styles.split}>
              <div className={styles.sectionHead} style={{ marginBottom: 0 }}>
                <h2>The Living Ledger</h2>
                <p>
                  Most CVs are written from memory, stressed, the night before an
                  application. Yours is written continuously — a running record of
                  projects, decisions, and the moments you led. Log it rough; the
                  Improve&nbsp;&amp; Expand engine turns it into a bullet that
                  earns its place, without inventing a single number.
                </p>
              </div>
              <LedgerPreview />
            </div>
          </div>
        </section>

        <section id="honest" className={`container ${styles.section}`}>
          <div className={styles.split}>
            <div>
              <h2 style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)", letterSpacing: "-0.022em" }}>
                Matching that respects where you&apos;re going
              </h2>
              <p className="muted" style={{ marginTop: "1rem", fontSize: "1.05rem", maxWidth: "52ch" }}>
                Traditional hiring screens for the last job you did, punishing
                anyone trying to switch. Career OS reads the trajectory in your
                ledger against an employer&apos;s real criteria — and you stay
                invisible until there&apos;s a genuine match and you say yes.
              </p>
              <ul style={{ marginTop: "1.5rem", paddingLeft: 0, listStyle: "none", display: "grid", gap: "0.9rem" }}>
                {[
                  "You are never dumped into a pipeline without consenting.",
                  "Employers see a reason for the match, not just a score.",
                  "Outreach is one deliberate, human click — never a blast.",
                ].map((line) => (
                  <li key={line} style={{ display: "grid", gridTemplateColumns: "1.4rem 1fr", gap: "0.6rem", color: "var(--ink-soft)" }}>
                    <span style={{ color: "var(--accent)" }} aria-hidden>
                      ◆
                    </span>
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles.ledgerCard}>
              <span className="tag">Why this match</span>
              <p style={{ fontSize: "1.05rem", lineHeight: 1.55 }}>
                &ldquo;Three logged projects show ownership of payments
                reliability at growing scale — the exact arc this Staff role is
                hiring for, even though their current title is Senior.&rdquo;
              </p>
              <p className="muted" style={{ fontSize: "0.9rem" }}>
                Confidence: stated plainly, with the two assumptions it rests on —
                not hidden behind a number.
              </p>
            </div>
          </div>
        </section>

        <section className={`container ${styles.cta}`}>
          <h2>Start the record you&apos;ll be glad you kept.</h2>
          <p>Five minutes today beats a panicked rewrite the night before.</p>
          <div style={{ marginTop: "2rem", display: "flex", gap: "0.8rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" className="btn btn-primary">
              Create your ledger
              <ArrowIcon width={18} height={18} />
            </Link>
            <Link href="/login" className="btn btn-ghost">
              I already have one
            </Link>
          </div>
        </section>

        <footer className={`container ${styles.footer}`}>
          <span>Career OS — the long view of your work.</span>
          <span>A prototype. Your data stays local.</span>
        </footer>
      </main>
    </>
  );
}

function TrajectoryScene() {
  return (
    <div className={styles.scene} aria-hidden>
      <svg
        className={styles.sceneSvg}
        viewBox="0 0 400 352"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          className={styles.pathGhost}
          d="M40 250 C 120 250, 150 220, 360 220"
        />
        <path
          className={styles.pathGhost}
          d="M40 250 C 130 250, 180 170, 360 90"
        />
        <path
          className={styles.path}
          pathLength={1}
          d="M40 250 C 120 250, 150 150, 230 130 C 300 113, 320 70, 360 50"
        />
        {[
          [40, 250],
          [165, 138],
          [360, 50],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} className={styles.node} cx={cx} cy={cy} r={6} />
        ))}
      </svg>
      <span className={styles.sceneLabel} style={{ left: "6%", bottom: "20%" }}>
        First role
      </span>
      <span className={styles.sceneLabel} style={{ left: "34%", top: "33%" }}>
        Pivot · new skills compound
      </span>
      <span className={styles.sceneLabel} style={{ right: "5%", top: "8%" }}>
        Where you&apos;re heading
      </span>
    </div>
  );
}

function LedgerPreview() {
  return (
    <div className={styles.ledgerCard}>
      <div>
        <span className="tag">Raw log · 30 seconds</span>
        <p className={styles.ledgerRaw} style={{ marginTop: "0.6rem" }}>
          &ldquo;spent q3 fixing our checkout. it kept timing out at peak. moved
          to a queue, got error rate way down, fewer support tickets.&rdquo;
        </p>
      </div>
      <span className={styles.ledgerArrow}>Improve &amp; Expand ↓</span>
      <div>
        <p className={styles.ledgerBullet}>
          Re-architected a failing checkout flow onto an async queue, cutting
          peak-hour payment errors and the support load that followed.
        </p>
        <div className={styles.metricRow} style={{ marginTop: "0.7rem" }}>
          <span className="tag">reliability</span>
          <span className="tag">queues</span>
          <span className="tag">payments</span>
        </div>
      </div>
    </div>
  );
}
