import { evaluateTaskForExecution, transitionTask } from "@founder-os/task-engine";
import type { Artifact, Task } from "@founder-os/types";

export interface PlannerContract {
  evaluate(task: Task): { recommended_status: Task["status"]; summary: string };
}

export interface ExecutorContract {
  run(task: Task, companySummary: string, guessedIcp: string): { nextTask: Task; artifact?: Artifact };
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
    `Create a founder-approved brief that gives ${guessedIcp} a sharper way to explain why Northstar is a board-led operating system, not another chat-first AI product.`,
    "",
    "## Company Context",
    companySummary,
    "",
    "## Core Claim",
    "Non-technical founders do not need more AI suggestions. They need one visible system that prioritizes growth work, tracks execution, and keeps approvals in the same board.",
    "",
    "## Problem To Attack",
    "Founders keep getting fragmented AI output: chat threads, disconnected docs, and random recommendations with no shared operating surface.",
    "",
    "## What The Brief Must Prove",
    "- The board is the product, not a wrapper around chat.",
    "- Website context should become visible prioritized work, not vague advice.",
    "- Founder approval is part of the operating model, not an afterthought.",
    "- Northstar should feel like a system a founder can actually run the week from.",
    "",
    "## Suggested Outline",
    "1. Open with the messy reality of growth work spread across tabs, chat threads, and half-finished ideas.",
    "2. Show why chat-first AI feels productive but fails as an operating system.",
    "3. Introduce the board-first model: website in, prioritized backlog out, approvals visible.",
    "4. Explain what changes for a non-technical founder when work is supervised in one board.",
    "5. End with a founder-level takeaway: fewer random actions, more controlled momentum.",
    "",
    "## Proof To Include",
    "- A concrete example of a task with rationale and priority.",
    "- The approval step that moves work from draft to done.",
    "- Language that makes Northstar feel operational, not inspirational.",
    "",
    "## Tone Guardrails",
    "- Sound like an operator with a strong point of view.",
    "- Avoid generic AI-marketing buzzwords.",
    "- Write for founders who want control, clarity, and visible momentum.",
    "",
    "## Approval Checklist",
    "- The argument is clearly board-first, not chat-first.",
    "- The founder problem feels real and specific.",
    "- The draft gives the founder repeatable language for demos and conversations."
  ].join("\n");
};

const buildGenericBrief = (task: Task, companySummary: string, guessedIcp: string) => {
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
    "## SEO Notes",
    "- Include one primary keyword and two supporting variations.",
    "- Keep the title specific and outcome-oriented.",
    "- Add examples or founder opinions to avoid generic content."
  ].join("\n");
};

const buildBlogBrief = (task: Task, companySummary: string, guessedIcp: string): string => {
  const lower = `${task.title} ${companySummary} ${guessedIcp}`.toLowerCase();
  if (lower.includes("non-technical founder") || lower.includes("board, not another chat thread") || lower.includes("kanban-first operating system")) {
    return buildFounderOsBrief(task, companySummary, guessedIcp);
  }

  return buildGenericBrief(task, companySummary, guessedIcp);
};

export class MockFounderExecutor implements ExecutorContract {
  run(task: Task, companySummary: string, guessedIcp: string) {
    if (task.type !== "BLOG_BRIEF") {
      return {
        nextTask: transitionTask(task, "BLOCKED", "v1 execution only supports blog brief generation.")
      };
    }

    const content = buildBlogBrief(task, companySummary, guessedIcp);
    const artifact: Artifact = {
      id: `${task.id}-artifact`,
      project_id: task.project_id,
      type: "BLOG_BRIEF",
      title: `${task.title} - Brief`,
      content,
      status: "WAITING_FOR_APPROVAL",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return {
      nextTask: {
        ...transitionTask(task, "WAITING_FOR_APPROVAL", "Generated blog brief and routed it into the approval queue."),
        artifact_id: artifact.id
      },
      artifact
    };
  }
}
