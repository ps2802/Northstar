import { nanoid } from "nanoid";
import type { IngestionResult, Task, TaskInput, TaskMovement, TaskStatus } from "@founder-os/types";

const round = (value: number) => Math.round(value * 100) / 100;

const normalizeEffort = (effort: number) => (effort <= 0 ? 1 : effort);

const deriveCompanyName = (websiteUrl: string, homepageTitle: string) => {
  const titleLead = homepageTitle.split(/[|–—-]/)[0]?.trim();
  if (titleLead && titleLead.length > 2) {
    return titleLead;
  }

  return new URL(websiteUrl).hostname.replace(/^www\./, "");
};

const primaryOpportunity = (ingestion: IngestionResult) =>
  (ingestion.opportunities[0] ?? "the current site leaves obvious acquisition leverage on the table").replace(/[.]+$/, "");

const summarizeKeyPages = (ingestion: IngestionResult) =>
  ingestion.crawled_pages
    .slice(0, 3)
    .map((page) => page.title)
    .join(", ");

const buildRationale = (whyExists: string, whyPriority: string, businessOutcome: string) =>
  [`Why this exists: ${whyExists}`, `Why this priority: ${whyPriority}`, `Business outcome: ${businessOutcome}`].join("\n");

const buildManualTaskRationale = (input: TaskInput, priorityScore: number) => {
  const priorityBand =
    priorityScore >= 90
      ? "It scored high because the expected upside is strong relative to the effort estimate."
      : priorityScore >= 45
        ? "It landed in the middle because the upside is credible, but the team should validate assumptions before spending too much time."
        : "It ranked lower because either the upside is still uncertain or the effort looks heavy for the likely payoff.";

  return buildRationale(
    `The founder explicitly asked for this work, so it belongs on the operating board even before automation picks it up.`,
    priorityBand,
    `If completed well, this should move a concrete growth outcome tied to ${input.type.replaceAll("_", " ").toLowerCase()}.`
  );
};

const createSeedTemplates = (projectId: string, ingestion: IngestionResult): TaskInput[] => {
  const companyName = deriveCompanyName(ingestion.website_url, ingestion.homepage_title);
  const topOpportunity = primaryOpportunity(ingestion);
  const pageContext = summarizeKeyPages(ingestion);

  return [
    {
      title: `Audit ${companyName}'s acquisition path from homepage to conversion`,
      description: `Review the messaging, metadata, and calls-to-action across ${pageContext} to find where the current site is leaking qualified demand.`,
      type: "SEO_AUDIT",
      source: "SYSTEM",
      impact: 9,
      effort: 4,
      confidence: 8,
      goal_fit: 9,
      rationale: buildRationale(
        `The crawl suggests that ${topOpportunity.toLowerCase()}. An audit is the fastest way to turn that observation into an actionable plan.`,
        `It scores near the top because it improves multiple downstream tasks at once: positioning, SEO, and conversion fixes all depend on this baseline.`,
        `A tighter acquisition path should improve how many relevant visitors understand the offer and move toward contact, signup, or product exploration.`
      )
    },
    {
      title: `Build a keyword map for ${ingestion.guessed_icp}`,
      description: `Turn the site's current positioning into a focused keyword cluster that maps search themes to the buyer problems ${companyName} appears to solve.`,
      type: "KEYWORD_CLUSTER",
      source: "SYSTEM",
      impact: 8,
      effort: 5,
      confidence: 7,
      goal_fit: 9,
      rationale: buildRationale(
        `The current site needs a clearer bridge between what the company says and what prospects are likely searching for.`,
        `It ranks highly because it creates reusable direction for content, metadata, and homepage copy without requiring a full content engine yet.`,
        `A better keyword map supports more discoverable pages and better alignment between search intent and the product story.`
      )
    },
    {
      title: `Sharpen homepage metadata and opening copy for ${companyName}`,
      description: `Rewrite the title, meta description, and first-screen copy so the site explains who it is for, what it does, and why it is different.`,
      type: "META_REWRITE",
      source: "SYSTEM",
      impact: 7,
      effort: 3,
      confidence: 8,
      goal_fit: 8,
      rationale: buildRationale(
        `The homepage is the most important trust and conversion surface, and the crawl suggests the current message is more descriptive than outcome-led.`,
        `It keeps a strong score because the effort is relatively low compared with the potential lift in click-through rate and visitor clarity.`,
        `Clearer messaging should improve both search snippet performance and first-visit conversion confidence.`
      )
    },
    {
      title: `Draft a blog brief around the core problem ${companyName} solves`,
      description: `Create one founder-approvable blog brief that turns the site's current narrative into a high-intent content asset for ${ingestion.guessed_icp}.`,
      type: "BLOG_BRIEF",
      source: "SYSTEM",
      impact: 7,
      effort: 4,
      confidence: 7,
      goal_fit: 8,
      rationale: buildRationale(
        `The company needs a concrete content artifact that proves the workflow can produce useful founder-ready output, not just backlog ideas.`,
        `It stays high because it validates the approval flow and gives the team a reusable content angle without committing to publishing yet.`,
        `A strong brief should create a credible path toward search traffic, thought leadership, and content consistency.`
      )
    },
    {
      title: `Scan how close competitors frame the same buyer problem`,
      description: `Review likely competitors to see how they position the problem, where they sound generic, and where ${companyName} can sound more specific.`,
      type: "COMPETITOR_SCAN",
      source: "SYSTEM",
      impact: 6,
      effort: 6,
      confidence: 6,
      goal_fit: 7,
      rationale: buildRationale(
        `Positioning quality is easier to judge when the company is compared against the alternatives a founder will inevitably evaluate.`,
        `It ranks below the highest-priority tasks because it adds strategic context, but it is not the fastest path to an immediate board-visible improvement.`,
        `Sharper differentiation should improve message clarity and help future copy and content avoid sounding interchangeable.`
      )
    }
  ];
};

export const calculatePriorityScore = (impact: number, confidence: number, goalFit: number, effort: number) =>
  round((impact * confidence * goalFit) / normalizeEffort(effort));

export const createMovement = (from: TaskStatus | null, to: TaskStatus, reason: string): TaskMovement => ({
  from,
  to,
  reason,
  at: new Date().toISOString()
});

export const scoreTaskInput = (input: TaskInput) => {
  const priorityScore = calculatePriorityScore(input.impact, input.confidence, input.goal_fit, input.effort);
  return {
    ...input,
    rationale:
      input.source === "USER" && !input.rationale.trim()
        ? buildManualTaskRationale(input, priorityScore)
        : input.rationale,
    priority_score: priorityScore
  };
};

export const createTaskFromInput = (projectId: string, input: TaskInput): Task => {
  const now = new Date().toISOString();
  const scored = scoreTaskInput(input);

  return {
    id: nanoid(),
    project_id: projectId,
    title: scored.title,
    description: scored.description,
    type: scored.type,
    source: scored.source,
    status: "INBOX",
    impact: scored.impact,
    effort: scored.effort,
    confidence: scored.confidence,
    goal_fit: scored.goal_fit,
    priority_score: scored.priority_score,
    rationale: scored.rationale,
    dependencies: scored.dependencies ?? [],
    owner_type: scored.owner_type ?? "AGENT",
    movement_history: [createMovement(null, "INBOX", "Task created and awaiting founder-agent evaluation")],
    artifact_id: null,
    created_at: now,
    updated_at: now
  };
};

export const transitionTask = (task: Task, to: TaskStatus, reason: string): Task => ({
  ...task,
  status: to,
  movement_history: [...task.movement_history, createMovement(task.status, to, reason)],
  updated_at: new Date().toISOString()
});

export const sortTasksByPriority = (tasks: Task[]) =>
  [...tasks].sort((a, b) => {
    if (b.priority_score !== a.priority_score) {
      return b.priority_score - a.priority_score;
    }

    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

export const evaluateTaskForExecution = (task: Task) => {
  if (task.status === "DONE" || task.status === "BLOCKED") {
    return {
      recommended_status: task.status,
      summary: "Task is not actionable right now."
    };
  }

  if (task.priority_score >= 95) {
    return {
      recommended_status: "PLANNED" as const,
      summary: "This is one of the strongest leverage items on the board, so it belongs in the planned lane."
    };
  }

  if (task.priority_score >= 45) {
    return {
      recommended_status: "EVALUATING" as const,
      summary: "This looks valuable, but the founder-agent should tighten assumptions before pulling it into active planning."
    };
  }

  return {
    recommended_status: "INBOX" as const,
    summary: "Keep this visible in the inbox until stronger or better-defined work is exhausted."
  };
};

export const generateSeedTasks = (projectId: string, ingestion: IngestionResult): Task[] =>
  sortTasksByPriority(createSeedTemplates(projectId, ingestion).map((template) => createTaskFromInput(projectId, template))).map((task, index) => {
    const evaluation = evaluateTaskForExecution(task);
    return index === 0
      ? transitionTask(task, "PLANNED", "Queued as the strongest initial operating-system task after onboarding.")
      : transitionTask(task, evaluation.recommended_status, evaluation.summary);
  });
