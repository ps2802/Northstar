import type { FounderIntake, Task } from "@founder-os/types";

export interface FounderIntakeInput {
  founder_name?: string;
  founder_email?: string;
  business_description?: string;
  goals?: string[];
  initiatives?: string[];
  answers?: Record<string, string>;
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "because",
  "before",
  "build",
  "company",
  "could",
  "every",
  "focus",
  "founder",
  "from",
  "have",
  "into",
  "more",
  "need",
  "northstar",
  "product",
  "should",
  "that",
  "their",
  "there",
  "these",
  "this",
  "want",
  "with",
  "your"
]);

const normalizeList = (values?: string[]) =>
  (values ?? []).map((value) => value.trim()).filter(Boolean);

const normalizeAnswers = (answers?: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(answers ?? {})
      .map(([key, value]) => [key.trim(), value.trim()])
      .filter(([key, value]) => key.length > 0 && value.length > 0)
  );

export const normalizeFounderIntakeInput = (input: FounderIntakeInput) => ({
  founder_name: input.founder_name?.trim() || undefined,
  founder_email: input.founder_email?.trim() || undefined,
  business_description: input.business_description?.trim() || undefined,
  goals: normalizeList(input.goals),
  initiatives: normalizeList(input.initiatives),
  answers: normalizeAnswers(input.answers)
});

const toFounderIntakeInput = (input: FounderIntakeInput | FounderIntake): FounderIntakeInput => ({
  founder_name: input.founder_name ?? undefined,
  founder_email: input.founder_email ?? undefined,
  business_description: input.business_description ?? undefined,
  goals: "current_goals" in input ? input.current_goals : input.goals,
  initiatives: input.initiatives,
  answers: input.answers
});

export const buildPlanningContext = (input: FounderIntakeInput | FounderIntake) => {
  const normalized = normalizeFounderIntakeInput(toFounderIntakeInput(input));
  const lines = [
    normalized.business_description ? `Business context: ${normalized.business_description}` : null,
    normalized.goals.length > 0 ? `Current goals: ${normalized.goals.join("; ")}` : null,
    normalized.initiatives.length > 0 ? `Current initiatives: ${normalized.initiatives.join("; ")}` : null,
    ...Object.entries(normalized.answers).map(([key, value]) => `${key}: ${value}`)
  ].filter((value): value is string => Boolean(value));

  return lines.join("\n");
};

const collectKeywords = (input: FounderIntakeInput | FounderIntake) => {
  const normalized = normalizeFounderIntakeInput(toFounderIntakeInput(input));
  const sourceText = [
    normalized.business_description,
    ...normalized.goals,
    ...normalized.initiatives,
    ...Object.values(normalized.answers)
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return Array.from(
    new Set(
      sourceText
        .split(/[^a-z0-9]+/g)
        .map((value) => value.trim())
        .filter((value) => value.length >= 4 && !STOP_WORDS.has(value))
    )
  ).slice(0, 16);
};

const replaceFounderContextLine = (rationale: string, line: string | null) => {
  const remaining = rationale
    .split("\n")
    .map((entry) => entry.trimEnd())
    .filter((entry) => !entry.startsWith("Founder context:"));

  if (line) {
    remaining.push(line);
  }

  return remaining.join("\n").trim();
};

export const applyFounderContextToTask = (task: Task, input?: FounderIntakeInput | FounderIntake | null): Task => {
  if (!input) {
    return {
      ...task,
      priority_score: Math.round((task.priority_score - (task.context_boost ?? 0)) * 100) / 100,
      context_boost: 0,
      rationale: replaceFounderContextLine(task.rationale, null)
    };
  }

  const keywords = collectKeywords(input);
  if (keywords.length === 0) {
    return {
      ...task,
      priority_score: Math.round((task.priority_score - (task.context_boost ?? 0)) * 100) / 100,
      context_boost: 0,
      rationale: replaceFounderContextLine(task.rationale, null)
    };
  }

  const searchable = `${task.title} ${task.description} ${task.rationale} ${task.type}`.toLowerCase();
  const matched = keywords.filter((keyword) => searchable.includes(keyword)).slice(0, 3);
  const boost = matched.length === 0 ? 0 : Math.round(matched.length * 2.5 * 100) / 100;
  const basePriority = Math.round((task.priority_score - (task.context_boost ?? 0)) * 100) / 100;

  return {
    ...task,
    priority_score: Math.round((basePriority + boost) * 100) / 100,
    context_boost: boost,
    rationale: replaceFounderContextLine(
      task.rationale,
      matched.length > 0 ? `Founder context: boosted because this work aligns with ${matched.join(", ")}.` : null
    )
  };
};
