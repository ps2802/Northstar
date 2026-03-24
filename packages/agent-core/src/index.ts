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

const buildBlogBrief = (task: Task, companySummary: string, guessedIcp: string): string => {
  return [
    `# ${task.title}`,
    "",
    "## Goal",
    `Create a founder-approved blog brief that turns the company's positioning into a search-led growth asset for ${guessedIcp}.`,
    "",
    "## Company Context",
    companySummary,
    "",
    "## Target Reader",
    guessedIcp,
    "",
    "## Recommended Angle",
    "Explain the painful before-state, clarify the business shift the product enables, and give the founder a practical point of view that feels earned.",
    "",
    "## Outline",
    "1. Hook with a high-friction founder problem.",
    "2. Break down why most current approaches fail.",
    "3. Introduce the company's differentiator with concrete outcomes.",
    "4. Offer a tactical framework or checklist.",
    "5. End with a soft conversion path tied to the product.",
    "",
    "## SEO Notes",
    "- Include one primary keyword and two supporting variations.",
    "- Keep the title specific and outcome-oriented.",
    "- Add examples or founder opinions to avoid generic content."
  ].join("\n");
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
