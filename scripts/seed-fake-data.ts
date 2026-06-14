import { createUser } from "../src/lib/users";
import { createJob } from "../src/lib/jobs";
import { createEntry, applyRefinement } from "../src/lib/entries";
import { runMatching } from "../src/lib/matching";
import { skills } from "../src/lib/taxonomy";
import { getDb } from "../src/lib/db";
import type { EntryType } from "../src/lib/entries-core";

const firstNames = [
  "Ada", "Grace", "Alan", "Tim", "Linus", "Margaret", "Dennis", "Ken",
  "Barbara", "Donald", "Vint", "Radia", "Frances", "John", "Edsger",
  "Guido", "Brendan", "Yukihiro", "James", "Kristen", "Martin", "Kent",
  "Ward", "Robert", "Sandi", "Dave", "Joe", "Armstrong", "Joe", "Simon",
  "Leslie", "Robin", "Carol", "Mitchell", "Barry", "Paul", "David",
  "Andrew", "Brian", "Courtenay", "Rebecca", "Jennifer", "Matthew",
  "Michael", "Sarah", "Emily", "Daniel", "Jessica", "Christopher", "Laura",
];

const lastNames = [
  "Lovelace", "Hopper", "Turing", "Berners-Lee", "Torvalds", "Hamilton",
  "Ritchie", "Thompson", "Liskov", "Knuth", "Cerf", "Perlman", "Allen",
  "McCarthy", "Dijkstra", "van Rossum", "Eich", "Matsumoto", "Gosling",
  "Nygaard", "Fowler", "Beck", "Cunningham", "Martin", "Metz", "Thomas",
  "Armstrong", "Stoyanovich", "Peyton Jones", "Lamport", "Milner", "Wirfs-Brock",
  "Boehm", "Booch", "Graham", "Cutler", "Heinemeier Hansson", "Ng", "Karpathy",
  "Goodfellow", "Bengio", "Hinton", "LeCun", "Howard", "Wolf", "Vaswani",
  "Schmidhuber", "Schulman", "Brockman", "Sutskever",
];

const companies = [
  "Acme Payments", "Basil Fintech", "Clover Health", "Dahlia AI",
  "Evergreen Logistics", "Fern Commerce", "Ginkgo Security", "Hawthorn Cloud",
];

const jobTemplates = [
  { title: "Staff Engineer, Payments", required: ["Payments Infrastructure", "Backend Development"], nice: ["Distributed Systems", "Reliability Engineering"] },
  { title: "Senior Frontend Engineer", required: ["Frontend Development", "UI Design"], nice: ["Design Systems", "UX Research"] },
  { title: "Data Engineer", required: ["Data Engineering", "Backend Development"], nice: ["Machine Learning", "Data Analysis"] },
  { title: "Product Manager", required: ["Product Management"], nice: ["Strategy", "Stakeholder Management", "Data Analysis"] },
  { title: "DevOps Engineer", required: ["DevOps", "Cloud Infrastructure"], nice: ["Security Engineering", "Backend Development"] },
  { title: "AI Engineer", required: ["Machine Learning", "Data Science"], nice: ["Python", "Data Engineering"] },
  { title: "UX Researcher", required: ["UX Research"], nice: ["Product Design", "UI Design"] },
  { title: "Engineering Manager", required: ["People Management", "Team Leadership"], nice: ["Hiring & Mentoring", "Strategy"] },
  { title: "Security Engineer", required: ["Security Engineering"], nice: ["Cloud Infrastructure", "DevOps"] },
  { title: "Mobile Engineer", required: ["Mobile Development"], nice: ["Frontend Development", "Backend Development"] },
];

const bulletTemplates: Record<EntryType, string[]> = {
  project: [
    "Led a cross-functional team to deliver {outcome}, reducing {metric} by {pct}%.",
    "Built and shipped {feature}, handling {volume} daily transactions.",
    "Re-architected {system} to improve {metric}, cutting latency by {pct}%.",
  ],
  decision: [
    "Chose {tech} over {alt} to reduce {metric} by {pct}%.",
    "Migrated the team from {alt} to {tech}, improving {metric}.",
    "Advocated for {approach}, which decreased {metric} by {pct}%.",
  ],
  leadership: [
    "Grew the team from {size} to {size2} engineers while maintaining delivery pace.",
    "Mentored {count} junior engineers to promotion within {months} months.",
    "Led the incident response for {event}, restoring service in {minutes} minutes.",
  ],
  skill: [
    "Productionised {tech} across {count} services, improving {metric}.",
    "Built internal tooling in {tech} that saved {hours} hours per week.",
    "Implemented {practice} across the team, reducing {metric} by {pct}%.",
  ],
  win: [
    "Won {award} for delivering {outcome} ahead of schedule.",
    "Closed {deal} by building a working prototype in {days} days.",
    "Recovered {amount} in revenue by fixing {issue}.",
  ],
};

const entryTypes: EntryType[] = ["project", "decision", "leadership", "skill", "win"];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randSubset<T>(arr: T[], min: number, max: number): T[] {
  const count = Math.floor(Math.random() * (max - min + 1)) + min;
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fill(template: string): string {
  return template
    .replace("{outcome}", rand(["a new checkout flow", "a fraud detection system", "a real-time dashboard", "a mobile rewrite"]))
    .replace("{metric}", rand(["error rate", "page load time", "deployment time", "customer churn", "infrastructure cost", "support tickets"]))
    .replace("{pct}", String(randInt(15, 85)))
    .replace("{feature}", rand(["one-click checkout", "subscription billing", "identity verification", "search autocomplete"]))
    .replace("{volume}", rand(["1M", "5M", "10M", "100K"]))
    .replace("{system}", rand(["the payments pipeline", "the auth service", "the data warehouse", "the mobile API"]))
    .replace("{tech}", rand(["Kafka", "Kubernetes", "React", "PostgreSQL", "TensorFlow", "Stripe"]))
    .replace("{alt}", rand(["RabbitMQ", "Docker Swarm", "Angular", "MySQL", "scikit-learn", "Adyen"]))
    .replace("{approach}", rand(["event-driven architecture", "trunk-based development", "continuous deployment", "service mesh"]))
    .replace("{size}", String(randInt(2, 5)))
    .replace("{size2}", String(randInt(6, 12)))
    .replace("{count}", String(randInt(2, 8)))
    .replace("{months}", String(randInt(6, 18)))
    .replace("{event}", rand(["a payment outage", "a data pipeline failure", "a security incident", "a critical bug"]))
    .replace("{minutes}", String(randInt(10, 120)))
    .replace("{hours}", String(randInt(2, 20)))
    .replace("{practice}", rand(["unit testing", "observability", "code review", "SLOs"]))
    .replace("{award}", rand(["the quarterly innovation award", "a company-wide shoutout", "a team excellence award"]))
    .replace("{deal}", rand(["an enterprise contract", "a strategic partnership", "a high-value renewal"]))
    .replace("{days}", String(randInt(3, 14)))
    .replace("{amount}", rand(["$500K", "$1.2M", "$2M", "$800K"]))
    .replace("{issue}", rand(["a checkout bug", "a billing discrepancy", "a reporting error"]));
}

function makeName(index: number): string {
  return `${firstNames[index % firstNames.length]} ${lastNames[(index * 7) % lastNames.length]}`;
}

function getOrCreateUser(input: {
  email: string;
  name: string;
  password: string;
  role: "recruiter" | "candidate";
  company?: string;
}): { id: number; role: string } | null {
  const existing = getDb()
    .prepare("SELECT id, role FROM users WHERE email = ?")
    .get(input.email.trim().toLowerCase()) as { id: number; role: string } | undefined;
  if (existing) return existing;
  const result = createUser(input);
  if (!result.ok) {
    console.log(`Failed to create ${input.email}: ${result.error}`);
    return null;
  }
  return { id: result.id, role: result.role };
}

const runSuffix = Math.floor(Math.random() * 100000).toString(36);

async function main() {
  const recruiters: { id: number; company: string }[] = [];
  for (let i = 0; i < companies.length; i++) {
    const user = getOrCreateUser({
      email: `recruiter${i + 1}@test.dev`,
      name: `Recruiter ${i + 1}`,
      password: "password123",
      role: "recruiter",
      company: companies[i],
    });
    if (user) {
      recruiters.push({ id: user.id, company: companies[i] });
    }
  }

  // Fallback: use any existing recruiters in the DB
  if (recruiters.length === 0) {
    const existing = getDb()
      .prepare("SELECT id, company FROM users WHERE role = 'recruiter' ORDER BY id")
      .all() as Array<{ id: number; company: string | null }>;
    for (const rec of existing) {
      if (rec.company) recruiters.push({ id: rec.id, company: rec.company });
    }
  }

  const jobs: { id: number; employerId: number }[] = [];
  for (let i = 0; i < jobTemplates.length; i++) {
    const tmpl = jobTemplates[i];
    const recruiter = recruiters[i % recruiters.length];
    const job = createJob(recruiter.id, {
      title: tmpl.title,
      description: `We are hiring a ${tmpl.title} to own critical systems and drive outcomes.`,
      location: rand(["Kuala Lumpur", "Selangor", "Remote (Malaysia)", "Penang", null]),
      required_skills: tmpl.required,
      nice_skills: tmpl.nice,
      criteria: rand([
        "Someone moving into ownership of complex systems.",
        "A senior contributor ready to mentor others.",
        "A generalist who can deepen into the domain.",
        "A product-minded engineer who can shape roadmap.",
      ]),
    });
    jobs.push({ id: job.id, employerId: recruiter.id });
  }

  const candidates: { id: number; skills: string[] }[] = [];
  for (let i = 0; i < 50; i++) {
    const candidateSkills = randSubset(skills as string[], 3, 8);
    const result = createUser({
      email: `candidate${i + 1}-${runSuffix}@test.dev`,
      name: makeName(i),
      password: "password123",
      role: "candidate",
    });
    if (!result.ok) {
      console.log(`Skipped candidate ${i + 1}: ${result.error}`);
      continue;
    }

    // Update skills directly since updateCandidateProfile is in another module
    getDb()
      .prepare("UPDATE users SET headline = ?, location = ?, skills = ? WHERE id = ?")
      .run(
        rand(["Senior Engineer", "Staff Engineer", "Engineering Lead", "Product Manager", "Data Scientist", "Designer"]),
        rand(["Kuala Lumpur", "Selangor", "Penang", "Johor", "Remote (Malaysia)"]),
        JSON.stringify(candidateSkills),
        result.id,
      );

    candidates.push({ id: result.id, skills: candidateSkills });

    const entryCount = randInt(1, 3);
    for (let j = 0; j < entryCount; j++) {
      const type = rand(entryTypes);
      const bullet = fill(rand(bulletTemplates[type]));
      const entry = createEntry({
        user_id: result.id,
        type,
        raw_text: bullet,
        occurred_at: null,
      });

      const entrySkills = randSubset(candidateSkills, 1, 3);
      applyRefinement(result.id, entry.id, {
        title: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${bullet.split(" ").slice(0, 3).join(" ")}`,
        impact: "Improved outcomes for the team.",
        metrics: ["20%", "50%", "2x"].slice(0, randInt(0, 2)),
        skills: entrySkills,
        scope: rand(["Team of 3", "Cross-functional", "Solo ownership", "Org-wide"]),
        bullet,
      });
    }
  }

  console.log(`Created ${recruiters.length} recruiters, ${jobs.length} jobs, ${candidates.length} candidates.`);

  // Run matching for each job
  for (const job of jobs) {
    try {
      const summary = await runMatching(job.employerId, job.id);
      console.log(`Job ${job.id}: evaluated ${summary.evaluated}, surfaced ${summary.surfaced}`);
    } catch (error) {
      console.error(`Job ${job.id} matching failed:`, (error as Error).message);
    }
  }
}

main();
