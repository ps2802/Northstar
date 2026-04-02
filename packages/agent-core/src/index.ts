import { evaluateTaskForExecution, transitionTask } from "@founder-os/task-engine";
import type { Artifact, Task } from "@founder-os/types";

export interface PlannerContract {
  evaluate(task: Task): { recommended_status: Task["status"]; summary: string };
}

export interface ExecutorContract {
  run(
    task: Task,
    companySummary: string,
    guessedIcp: string,
    options?: {
      providerLabel?: string;
      revisionNote?: string;
    }
  ): { nextTask: Task; artifact?: Artifact };
}

export interface ProviderBackedExecutionOptions {
  providerKey: "openai" | "openrouter";
  providerLabel: string;
  revisionNote?: string;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export class FounderPlanner implements PlannerContract {
  evaluate(task: Task) {
    return evaluateTaskForExecution(task);
  }
}

const buildFounderOsBrief = (task: Task, companySummary: string, guessedIcp: string) => {
  return [
    `# ${task.title}`,
    "",
    "## Goal",
    `Write a brief that helps a non-technical founder explain, in plain language, why Northstar is a board-first operating system rather than another chat tab.`,
    "",
    "## Company Context",
    companySummary,
    "",
    "## Core Claim",
    "Non-technical founders do not need more AI output. They need one visible board that prioritizes growth work, shows what is moving, and keeps approvals in the same place.",
    "",
    "## Problem To Attack",
    "Founders are buried in scattered AI output: chat threads, stray docs, and disconnected recommendations with no single place to run the week.",
    "",
    "## What The Brief Must Prove",
    "- Northstar should clearly feel like a board-first product, not chat with a kanban attached.",
    "- Website context should turn into visible, prioritized work instead of vague advice.",
    "- Founder approval should feel built into the operating model, not bolted on later.",
    "- The brief should make it obvious that a founder can actually run the week from this board.",
    "",
    "## Suggested Outline",
    "1. Open with the messy reality of growth work spread across tabs, chat threads, and half-finished ideas.",
    "2. Show why chat-first AI feels productive but fails as an operating system.",
    "3. Introduce the board-first model: website in, prioritized backlog out, approvals visible in the same system.",
    "4. Explain what changes for a non-technical founder when work is supervised in one board.",
    "5. End with a founder-level takeaway: fewer random actions, more controlled momentum.",
    "",
    "## Proof To Include",
    "- A concrete example of a task with rationale and priority.",
    "- The approval step that moves work from draft to done.",
    "- Language that makes Northstar feel like an operating system, not a motivational AI wrapper.",
    "",
    "## Tone Guardrails",
    "- Sound like an operator with a strong point of view.",
    "- Avoid generic AI-marketing buzzwords.",
    "- Write for founders who want control, clarity, and visible progress.",
    "",
    "## Approval Checklist",
    "- The argument is clearly board-first, not chat-first.",
    "- The founder problem feels real and specific.",
    "- The draft gives the founder sharp language they can reuse in demos, intros, and customer conversations."
  ].join("\n");
};

const buildGenericBrief = (task: Task, companySummary: string, guessedIcp: string, revisionNote?: string) => {
  return [
    `# ${task.title}`,
    "",
    "## Goal",
    `Create a founder-approved blog brief that turns the company's positioning into a search-led growth asset for ${guessedIcp}.`,
    "",
    "## Company Context",
    companySummary,
    "",
    "## Reader",
    guessedIcp,
    "",
    "## Recommended Angle",
    "Explain the painful before-state, clarify the business shift the product enables, and give the founder a practical point of view that feels earned.",
    "",
    "## What The Draft Must Prove",
    "- The problem is real and expensive.",
    "- The company's angle is sharper than the default alternative.",
    "- The reader should leave with one memorable argument they can repeat.",
    "",
    "## Outline",
    "1. Hook with a high-friction founder or buyer problem.",
    "2. Break down why most current approaches fail.",
    "3. Introduce the company's differentiator with concrete outcomes.",
    "4. Offer a tactical framework, checklist, or opinionated takeaway.",
    "5. End with a soft conversion path tied to the product.",
    "",
    "## Tone Guardrails",
    "- Avoid generic content-marketing filler.",
    "- Use concrete language over buzzwords.",
    "- Make the argument feel founder-usable, not SEO-only.",
    "",
    ...(revisionNote ? [
      "## Revision Guidance",
      revisionNote,
      "",
    ] : []),
    "",
    "## SEO Notes",
    "- Include one primary keyword and two supporting variations.",
    "- Keep the title specific and outcome-oriented.",
    "- Add examples or founder opinions to avoid generic content."
  ].join("\n");
};

const buildBlogBrief = (task: Task, companySummary: string, guessedIcp: string, revisionNote?: string): string => {
  const lower = `${task.title} ${companySummary} ${guessedIcp}`.toLowerCase();
  if (lower.includes("non-technical founder") || lower.includes("board, not another chat thread") || lower.includes("kanban-first operating system")) {
    return buildFounderOsBrief(task, companySummary, guessedIcp);
  }

  return buildGenericBrief(task, companySummary, guessedIcp, revisionNote);
};

const createBlogBriefPrompt = (task: Task, companySummary: string, guessedIcp: string, revisionNote?: string) => [
  "Write a founder-usable blog brief in markdown.",
  "The brief should be concrete, opinionated, and ready for founder review.",
  "Avoid generic content-marketing filler and avoid saying you are an AI.",
  "",
  "Use this planning scaffold:",
  buildBlogBrief(task, companySummary, guessedIcp, revisionNote),
].join("\n");

const readOpenAIText = (payload: unknown): string | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as {
    output_text?: string;
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
  };

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const firstChoice = record.choices?.[0]?.message?.content;
  if (typeof firstChoice === "string" && firstChoice.trim()) {
    return firstChoice.trim();
  }

  if (Array.isArray(firstChoice)) {
    const text = firstChoice
      .map((entry) => entry?.text?.trim())
      .filter(Boolean)
      .join("\n\n")
      .trim();
    return text || null;
  }

  return null;
};

const normalizeChatCompletionsUrl = (baseUrl?: string) => {
  const normalizedBaseUrl = (baseUrl ?? "https://api.openai.com").replace(/\/+$/, "");
  if (normalizedBaseUrl.endsWith("/chat/completions")) {
    return normalizedBaseUrl;
  }

  if (normalizedBaseUrl.endsWith("/v1") || normalizedBaseUrl.endsWith("/api/v1")) {
    return `${normalizedBaseUrl}/chat/completions`;
  }

  return `${normalizedBaseUrl}/v1/chat/completions`;
};

export interface OpenAiCompatibleTextOptions {
  providerKey: "openai" | "openrouter";
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

const buildProviderHeaders = (options: OpenAiCompatibleTextOptions, requestUrl: string) => {
  const isOpenRouter = options.providerKey === "openrouter" || requestUrl.includes("openrouter.ai");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${options.apiKey}`,
    ...(isOpenRouter
      ? {
          "HTTP-Referer": process.env.NORTHSTAR_APP_URL ?? "https://northstar.local",
          "X-OpenRouter-Title": "Northstar",
        }
      : {}),
  };
};

export const requestOpenAiCompatibleText = async (options: OpenAiCompatibleTextOptions): Promise<string> => {
  const requestUrl = normalizeChatCompletionsUrl(options.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 45_000);
  const response = await fetch(requestUrl, {
    method: "POST",
    headers: buildProviderHeaders(options, requestUrl),
    signal: controller.signal,
    body: JSON.stringify({
      model: options.model,
      temperature: options.temperature ?? 0.4,
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      messages: [
        {
          role: "system",
          content: options.systemPrompt
        },
        {
          role: "user",
          content: options.userPrompt
        }
      ]
    })
  }).catch((error) => {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${options.providerKey} generation timed out after ${options.timeoutMs ?? 45_000}ms.`);
    }
    throw error;
  }).finally(() => {
    clearTimeout(timeout);
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${options.providerKey} generation failed: ${response.status} ${errorText}`.slice(0, 600));
  }

  const payload = await response.json();
  const content = readOpenAIText(payload);
  if (!content) {
    throw new Error(`${options.providerKey} generation returned no usable content.`);
  }

  return content;
};

export class ProviderBackedBlogBriefExecutor {
  async run(task: Task, companySummary: string, guessedIcp: string, options: ProviderBackedExecutionOptions): Promise<{ nextTask: Task; artifact?: Artifact }> {
    if (task.type !== "BLOG_BRIEF") {
      return {
        nextTask: transitionTask(task, "BLOCKED", "Provider-backed execution only supports blog briefs in this workspace.")
      };
    }

    const content = await requestOpenAiCompatibleText({
      providerKey: options.providerKey,
      apiKey: options.apiKey,
      model: options.model ?? (options.providerKey === "openrouter" ? "openai/gpt-4.1-mini" : "gpt-4.1-mini"),
      baseUrl: options.baseUrl,
      systemPrompt: "You write sharp founder-facing blog briefs. Return only the final markdown brief.",
      userPrompt: createBlogBriefPrompt(task, companySummary, guessedIcp, options.revisionNote),
      temperature: 0.4
    });

    const artifact: Artifact = {
      id: `${task.id}-artifact`,
      project_id: task.project_id,
      type: "BLOG_BRIEF",
      title: `${task.title} - Brief`,
      content: [
        `> Generated via ${options.providerLabel}`,
        "",
        content,
      ].join("\n"),
      status: "WAITING_FOR_APPROVAL",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return {
      nextTask: {
        ...transitionTask(task, "WAITING_FOR_APPROVAL", `Generated blog brief through ${options.providerLabel} and routed it into the approval queue.`),
        artifact_id: artifact.id
      },
      artifact
    };
  }
}

const buildSocialPostSet = (task: Task, companySummary: string, guessedIcp: string): string => {
  const channel = task.type === "LINKEDIN_POST_SET" ? "LinkedIn" : "X";
  return [
    `# ${task.title}`,
    "",
    "## Channel",
    channel,
    "",
    "## Company Context",
    companySummary,
    "",
    "## Audience",
    guessedIcp,
    "",
    "## Core Angle",
    "Turn the company's current point of view into channel-native founder language that feels specific, useful, and sharp.",
    "",
    "## Post 1",
    "Name the painful before-state and why generic growth advice usually fails.",
    "",
    "## Post 2",
    "Explain the clearer operating model the company believes in, with one concrete example.",
    "",
    "## Post 3",
    "Close with a founder-level takeaway and a light CTA for replies or conversation.",
    "",
    "## Variants",
    "- One shorter version for faster scanning.",
    "- One more opinionated version with a stronger point of view.",
    "",
    "## Tone Guardrails",
    "- Sound founder-aware, not AI-generic.",
    "- Keep the copy tight and reuse company language where it matters.",
    "- Avoid generic social filler or empty inspiration.",
  ].join("\n");
};

const buildWebsiteCopySuggestions = (task: Task, companySummary: string, guessedIcp: string): string => {
  return [
    `# ${task.title}`,
    "",
    "## Goal",
    `Create founder-facing website copy suggestions for ${guessedIcp} that make the company's value clearer in the first few seconds.`,
    "",
    "## Company Context",
    companySummary,
    "",
    "## Suggested Hero",
    "A sharper headline that names the founder problem, the operating change, and the practical payoff.",
    "",
    "## Supporting Copy",
    "- Clarify who the company is for.",
    "- Translate the offer into visible business outcomes.",
    "- Remove vague language that forces the founder to explain the product manually.",
    "",
    "## CTA Direction",
    "Use one primary CTA tied to the next meaningful founder action.",
    "",
    "## Proof Guidance",
    "- Add one proof or evidence block near the hero.",
    "- Keep the copy specific and operational.",
    "",
    "## Tone Guardrails",
    "- Direct, specific, and founder-usable.",
    "- Avoid agency-style filler.",
    "- Make the copy feel ready to review, edit, and ship.",
  ].join("\n");
};

export class MockFounderExecutor implements ExecutorContract {
  run(task: Task, companySummary: string, guessedIcp: string, options?: { providerLabel?: string; revisionNote?: string }) {
    let content: string | null = null;
    let titleSuffix = "Draft";
    let successSummary = "Generated asset and routed it into the approval queue.";
    const providerLabel = options?.providerLabel ?? "Northstar CLI";

    if (task.type === "BLOG_BRIEF") {
      content = buildBlogBrief(task, companySummary, guessedIcp, options?.revisionNote);
      titleSuffix = "Brief";
      successSummary = "Generated blog brief and routed it into the approval queue.";
    } else if (task.type === "LINKEDIN_POST_SET" || task.type === "X_POST_SET") {
      content = buildSocialPostSet(task, companySummary, guessedIcp);
      titleSuffix = "Post Set";
      successSummary = "Generated social post set and routed it into the approval queue.";
    } else if (task.type === "HOMEPAGE_COPY_SUGGESTION") {
      content = buildWebsiteCopySuggestions(task, companySummary, guessedIcp);
      titleSuffix = "Copy Draft";
      successSummary = "Generated founder-facing copy suggestions and routed them into the approval queue.";
    }

    if (!content) {
      return {
        nextTask: transitionTask(task, "BLOCKED", "v1 execution only supports blog briefs, social post sets, and founder-facing copy suggestions.")
      };
    }

    const artifact: Artifact = {
      id: `${task.id}-artifact`,
      project_id: task.project_id,
      type: "BLOG_BRIEF",
      title: `${task.title} - ${titleSuffix}`,
      content: [
        `> Generated via ${providerLabel}`,
        "",
        content,
      ].join("\n"),
      status: "WAITING_FOR_APPROVAL",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return {
      nextTask: {
        ...transitionTask(task, "WAITING_FOR_APPROVAL", successSummary),
        artifact_id: artifact.id
      },
      artifact
    };
  }
}
