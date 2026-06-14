/**
 * Maps free-text résumé content onto the controlled skill taxonomy. Pure logic,
 * no network: the offline path is a deterministic keyword matcher and the Kimi
 * path is constrained to return only on-list skills, so résumé import can
 * pre-select a candidate's profile skills the same canonical set matching uses.
 */

import { extractFirstJsonObject } from "@/lib/json-extract";
import { filterValidSkills, skills } from "@/lib/taxonomy";

/**
 * Keyword aliases per canonical skill. A skill is inferred when any of its
 * aliases appears in the résumé. Single alphanumeric tokens match on word
 * boundaries; multi-word or symbol-bearing aliases match as substrings.
 */
const skill_aliases: Readonly<Record<string, readonly string[]>> = {
  "Frontend Development": [
    "frontend",
    "front end",
    "react",
    "vue",
    "angular",
    "svelte",
    "tailwind",
    "css",
    "html",
    "next.js",
  ],
  "Backend Development": [
    "backend",
    "back end",
    "node.js",
    "express",
    "django",
    "flask",
    "spring boot",
    "rails",
    "graphql",
    "rest api",
    "fastapi",
    ".net",
  ],
  "Mobile Development": [
    "ios",
    "android",
    "swift",
    "kotlin",
    "react native",
    "flutter",
    "mobile app",
    "swiftui",
  ],
  DevOps: [
    "devops",
    "ci/cd",
    "jenkins",
    "github actions",
    "gitlab ci",
    "terraform",
    "ansible",
    "docker",
    "kubernetes",
    "helm",
  ],
  "Cloud Infrastructure": [
    "aws",
    "azure",
    "gcp",
    "google cloud",
    "cloud infrastructure",
    "ec2",
    "lambda",
    "serverless",
    "cloudformation",
  ],
  "Distributed Systems": [
    "distributed systems",
    "kafka",
    "microservices",
    "event-driven",
    "event driven",
    "sharding",
    "message queue",
    "grpc",
  ],
  "Reliability Engineering": [
    "sre",
    "site reliability",
    "reliability",
    "on-call",
    "on call",
    "incident response",
    "observability",
    "prometheus",
    "grafana",
    "slo",
  ],
  "Security Engineering": [
    "security engineering",
    "appsec",
    "penetration testing",
    "vulnerability",
    "owasp",
    "encryption",
    "infosec",
    "soc 2",
  ],
  "QA & Testing": [
    "quality assurance",
    "test automation",
    "selenium",
    "cypress",
    "playwright",
    "end-to-end testing",
    "unit testing",
    "manual testing",
  ],
  "Payments Infrastructure": [
    "payments",
    "stripe",
    "billing system",
    "paypal",
    "checkout",
    "pci",
    "fraud detection",
    "payment gateway",
  ],
  "Data Engineering": [
    "data engineering",
    "etl",
    "data pipeline",
    "airflow",
    "spark",
    "snowflake",
    "dbt",
    "data warehouse",
    "redshift",
  ],
  "Data Analysis": [
    "data analysis",
    "data analyst",
    "sql",
    "tableau",
    "reporting",
    "analytics",
  ],
  "Machine Learning": [
    "machine learning",
    "deep learning",
    "tensorflow",
    "pytorch",
    "nlp",
    "computer vision",
    "llm",
    "model training",
    "scikit-learn",
  ],
  "Data Science": [
    "data science",
    "data scientist",
    "statistical",
    "predictive model",
    "jupyter",
    "regression",
    "experimentation",
  ],
  "Business Intelligence": [
    "business intelligence",
    "looker",
    "power bi",
    "kpi",
    "bi dashboard",
  ],
  "Database Administration": [
    "database administration",
    "dba",
    "postgresql",
    "postgres",
    "mysql",
    "mongodb",
    "oracle db",
    "query optimization",
  ],
  "Product Management": [
    "product manager",
    "product management",
    "roadmap",
    "product backlog",
    "prd",
    "product owner",
    "user stories",
  ],
  "Product Design": [
    "product design",
    "figma",
    "wireframe",
    "prototyping",
    "interaction design",
    "user flows",
  ],
  "UX Research": [
    "ux research",
    "user research",
    "usability testing",
    "user interviews",
    "personas",
  ],
  "UI Design": ["ui design", "visual design", "ui/ux", "mockups"],
  "Design Systems": [
    "design system",
    "component library",
    "design tokens",
    "storybook",
    "style guide",
  ],
  "Technical Writing": [
    "technical writing",
    "technical writer",
    "documentation",
    "api documentation",
    "user guides",
  ],
  "Project Management": [
    "project management",
    "project manager",
    "scrum master",
    "agile",
    "jira",
    "sprint planning",
    "kanban",
    "pmp",
  ],
  Operations: [
    "operations management",
    "process improvement",
    "logistics",
    "supply chain",
    "operational efficiency",
  ],
  Sales: [
    "account executive",
    "sales quota",
    "salesforce",
    "lead generation",
    "business development",
  ],
  Marketing: [
    "marketing",
    "seo",
    "content marketing",
    "campaign",
    "brand strategy",
    "social media",
    "email marketing",
    "growth marketing",
  ],
  "Customer Success": [
    "customer success",
    "customer support",
    "account management",
    "client retention",
    "churn",
    "onboarding customers",
  ],
  Finance: [
    "finance",
    "accounting",
    "financial analysis",
    "budgeting",
    "forecasting",
    "fp&a",
    "audit",
  ],
  "Human Resources": [
    "human resources",
    "recruiting",
    "recruitment",
    "talent acquisition",
    "payroll",
    "employee onboarding",
  ],
  Procurement: [
    "procurement",
    "purchasing",
    "vendor management",
    "supplier management",
    "sourcing",
    "contract negotiation",
  ],
  "People Management": [
    "people management",
    "direct reports",
    "performance reviews",
    "managed a team",
    "team of",
  ],
  "Team Leadership": [
    "team leadership",
    "team lead",
    "tech lead",
    "led a team",
    "led the team",
    "squad lead",
  ],
  Strategy: [
    "strategic planning",
    "go-to-market",
    "business strategy",
    "product strategy",
  ],
  "Stakeholder Management": [
    "stakeholder management",
    "cross-functional",
    "cross functional",
    "executive stakeholders",
    "stakeholder alignment",
  ],
  "Hiring & Mentoring": [
    "hiring",
    "mentoring",
    "mentored",
    "coaching",
    "interviewing candidates",
    "mentorship",
  ],
};

function normalise(text: string): string {
  const stripped = text
    .toLowerCase()
    .replace(/[^a-z0-9+#./& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return ` ${stripped} `;
}

function aliasMatches(haystack: string, alias: string): boolean {
  const isSingleToken = /^[a-z0-9]+$/.test(alias);
  return isSingleToken ? haystack.includes(` ${alias} `) : haystack.includes(alias);
}

/**
 * Deterministic résumé-to-taxonomy mapping. Returns canonical, de-duplicated
 * skills in the taxonomy's own order. Used when no Kimi key is set, the call
 * fails, and as a recall floor merged with the model's answer.
 */
export function inferSkillsOffline(resume_text: string): string[] {
  const haystack = normalise(resume_text);
  const matched: string[] = [];
  for (const skill of skills) {
    const aliases = skill_aliases[skill] ?? [];
    if (aliases.some((alias) => aliasMatches(haystack, alias))) {
      matched.push(skill);
    }
  }
  return filterValidSkills(matched);
}

const skill_system_prompt = `You map a résumé onto a FIXED list of professional skills. You only ever return skills from the provided list — never invent, rename, or add skills outside it. You include a skill only when the résumé shows genuine evidence of it.`;

/**
 * Builds the messages for the model's skill inference. The allowed list is
 * embedded so the model is constrained to the controlled vocabulary.
 */
export function buildSkillMessages(
  resume_text: string,
): Array<{ role: "system" | "user"; content: string }> {
  const user_prompt = [
    "Allowed skills (choose only from these, exact spelling):",
    skills.join(", "),
    "",
    "Résumé text:",
    `"""${resume_text.slice(0, 12000)}"""`,
    "",
    "Return ONLY minified JSON with this exact shape:",
    `{"skills":string[]}`,
    "- Each skill must be copied verbatim from the allowed list.",
    "- Include a skill only when the résumé shows clear evidence of it.",
  ].join("\n");

  return [
    { role: "system", content: skill_system_prompt },
    { role: "user", content: user_prompt },
  ];
}

/**
 * Parses the model's skill response and forces it through the taxonomy, so any
 * hallucinated or off-list skill is silently dropped.
 */
export function parseSkillResponse(raw_response: string): string[] {
  const json_text = extractFirstJsonObject(raw_response);
  if (!json_text) throw new Error("Model response contained no JSON object.");
  const parsed = JSON.parse(json_text) as { skills?: unknown };
  const list = Array.isArray(parsed.skills)
    ? parsed.skills.filter((s): s is string => typeof s === "string")
    : [];
  return filterValidSkills(list);
}
