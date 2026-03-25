import { nanoid } from "nanoid";
import { MockFounderExecutor } from "@founder-os/agent-core";
import { ingestWebsite } from "@founder-os/site-ingestion";
import { createTaskFromInput, evaluateTaskForExecution, generateSeedTasks, sortTasksByPriority, transitionTask } from "@founder-os/task-engine";
import type { TaskInput, TaskStatus } from "@founder-os/types";
import { prisma } from "../lib/prisma.js";
import { serializeArtifact, serializeDashboard, serializeTask } from "../lib/serializers.js";
import { createFallbackIngestion } from "./fallback.js";

const executor = new MockFounderExecutor();
const DEFAULT_COMMENT_AUTHOR = "founder";

const loadDashboardRecord = async (projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workspace: true,
      websiteSnapshot: true,
      companyProfile: true,
      tasks: { orderBy: { priorityScore: "desc" } },
      artifacts: { orderBy: { updatedAt: "desc" } },
      approvals: { orderBy: { createdAt: "desc" } },
      comments: { orderBy: { createdAt: "asc" } },
      agentRuns: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!project || !project.websiteSnapshot || !project.companyProfile) {
    return null;
  }

  return serializeDashboard({
    workspace: project.workspace,
    project,
    websiteSnapshot: project.websiteSnapshot,
    companyProfile: project.companyProfile,
    tasks: project.tasks,
    artifacts: project.artifacts,
    approvals: project.approvals,
    comments: project.comments,
    agentRuns: project.agentRuns
  });
};

const upsertTaskRecord = async (projectId: string, task: ReturnType<typeof serializeTask>) => {
  await prisma.task.upsert({
    where: { id: task.id },
    update: {
      title: task.title,
      description: task.description,
      type: task.type,
      source: task.source,
      status: task.status,
      impact: task.impact,
      effort: task.effort,
      confidence: task.confidence,
      goalFit: task.goal_fit,
      priorityScore: task.priority_score,
      rationale: task.rationale,
      dependencies: JSON.stringify(task.dependencies),
      ownerType: task.owner_type,
      movementLogJson: JSON.stringify(task.movement_history),
      artifactId: task.artifact_id,
      updatedAt: new Date(task.updated_at)
    },
    create: {
      id: task.id,
      projectId,
      title: task.title,
      description: task.description,
      type: task.type,
      source: task.source,
      status: task.status,
      impact: task.impact,
      effort: task.effort,
      confidence: task.confidence,
      goalFit: task.goal_fit,
      priorityScore: task.priority_score,
      rationale: task.rationale,
      dependencies: JSON.stringify(task.dependencies),
      ownerType: task.owner_type,
      movementLogJson: JSON.stringify(task.movement_history),
      artifactId: task.artifact_id,
      createdAt: new Date(task.created_at),
      updatedAt: new Date(task.updated_at)
    }
  });
};

const createCommentRecord = async (projectId: string, taskId: string, body: string, author = DEFAULT_COMMENT_AUTHOR) => (
  prisma.comment.create({
    data: {
      id: nanoid(),
      projectId,
      taskId,
      body: body.trim(),
      author: author.trim() || DEFAULT_COMMENT_AUTHOR
    }
  })
);

export const onboardProject = async (websiteUrl: string) => {
  // TODO(v2): Reuse or version project snapshots instead of creating a new workspace for every onboarding run.
  const ingestion = await ingestWebsite(websiteUrl).catch(() => createFallbackIngestion(websiteUrl));
  const workspaceId = nanoid();
  const projectId = nanoid();
  const snapshotId = nanoid();
  const profileId = nanoid();

  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: `${new URL(ingestion.website_url).hostname} workspace`,
      description: "Founder operating system demo workspace",
      projects: {
        create: {
          id: projectId,
          websiteUrl: ingestion.website_url,
          name: ingestion.homepage_title,
          websiteSnapshot: {
            create: {
              id: snapshotId,
              websiteUrl: ingestion.website_url,
              homepageTitle: ingestion.homepage_title,
              crawledPagesJson: JSON.stringify(ingestion.crawled_pages),
              summary: ingestion.company_summary
            }
          },
          companyProfile: {
            create: {
              id: profileId,
              companySummary: ingestion.company_summary,
              guessedICP: ingestion.guessed_icp,
              keyPagesJson: JSON.stringify(ingestion.key_pages),
              opportunitiesJson: JSON.stringify(ingestion.opportunities)
            }
          }
        }
      }
    }
  });

  const seedTasks = generateSeedTasks(projectId, ingestion);
  for (const task of seedTasks) {
    await upsertTaskRecord(projectId, task);
  }

  const blogBriefTask = seedTasks.find((task) => task.type === "BLOG_BRIEF");
  if (blogBriefTask) {
    const execution = executor.run(blogBriefTask, ingestion.company_summary, ingestion.guessed_icp);
    const artifact = execution.artifact?.type === "BLOG_BRIEF" ? execution.artifact : null;
    if (artifact) {
      await prisma.artifact.create({
        data: {
          id: artifact.id,
          projectId,
          type: artifact.type,
          title: artifact.title,
          content: artifact.content,
          status: artifact.status
        }
      });

      await prisma.approval.create({
        data: {
          id: nanoid(),
          projectId,
          artifactId: artifact.id,
          status: "PENDING",
          requestedBy: "founder-agent"
        }
      });
    }

    await upsertTaskRecord(projectId, execution.nextTask);
  }

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      runType: "site_ingestion",
      status: "completed",
      summary: "Crawled the site, summarized the company, and generated the first backlog.",
      outputJson: JSON.stringify({ key_pages: ingestion.key_pages, opportunities: ingestion.opportunities })
    }
  });

  return loadDashboardRecord(projectId);
};

export const getDashboard = async (projectId: string) => {
  return loadDashboardRecord(projectId);
};

export const listProjects = async () => {
  return prisma.project.findMany({ orderBy: { createdAt: "desc" } });
};

export const createManualTask = async (projectId: string, input: TaskInput) => {
  const task = createTaskFromInput(projectId, {
    ...input,
    description: input.description ?? "",
    rationale: input.rationale ?? "",
    source: "USER",
    owner_type: input.owner_type ?? "USER"
  });
  const evaluation = evaluateTaskForExecution(task);
  const evaluatedTask = transitionTask(task, evaluation.recommended_status, `Founder-agent evaluation: ${evaluation.summary}`);
  await upsertTaskRecord(projectId, evaluatedTask);

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      taskId: evaluatedTask.id,
      runType: "task_evaluation",
      status: "completed",
      summary: `Evaluated manual task and assigned status ${evaluatedTask.status}.`,
      outputJson: JSON.stringify({ priority_score: evaluatedTask.priority_score, rationale: evaluatedTask.rationale })
    }
  });

  return serializeTask((await prisma.task.findUniqueOrThrow({ where: { id: evaluatedTask.id } })));
};

export const createTaskComment = async (projectId: string, taskId: string, body: string, author = DEFAULT_COMMENT_AUTHOR) => {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task || task.projectId !== projectId) {
    return null;
  }

  await createCommentRecord(projectId, taskId, body, author);

  return loadDashboardRecord(projectId);
};

export const reprioritizeProjectTasks = async (projectId: string) => {
  const records = await prisma.task.findMany({ where: { projectId } });
  const serialized = sortTasksByPriority(records.map(serializeTask));

  for (const [index, task] of serialized.entries()) {
    const nextStatus = index === 0 && task.status === "INBOX"
      ? transitionTask(task, "EVALUATING", "Promoted during reprioritization because it is the highest-leverage inbox task.")
      : task;
    await upsertTaskRecord(projectId, nextStatus);
  }

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      runType: "reprioritize",
      status: "completed",
      summary: "Re-ranked the task board based on updated priority scores.",
      outputJson: JSON.stringify({ task_count: serialized.length })
    }
  });

  return loadDashboardRecord(projectId);
};

export const updateTaskStatus = async (projectId: string, taskId: string, status: TaskStatus) => {
  const record = await prisma.task.findUnique({ where: { id: taskId } });
  if (!record || record.projectId !== projectId) {
    return null;
  }

  const nextTask = transitionTask(serializeTask(record), status, `Task moved to ${status.replaceAll("_", " ").toLowerCase()} from the command center.`);
  await upsertTaskRecord(projectId, nextTask);

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      taskId,
      runType: "status_transition",
      status: "completed",
      summary: `Moved task into ${status}.`,
      outputJson: JSON.stringify({ status })
    }
  });

  return loadDashboardRecord(projectId);
};

export const runTaskExecution = async (projectId: string, taskId: string) => {
  // TODO(v2): Swap the mock executor for provider-backed agents and queue long-running work.
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { companyProfile: true }
  });
  const taskRecord = await prisma.task.findUnique({ where: { id: taskId } });

  if (!project || !project.companyProfile || !taskRecord) {
    return null;
  }

  const execution = executor.run(serializeTask(taskRecord), project.companyProfile.companySummary, project.companyProfile.guessedICP);
  const artifact = execution.artifact?.type === "BLOG_BRIEF" ? execution.artifact : null;

  if (artifact) {
    await prisma.artifact.create({
      data: {
        id: artifact.id,
        projectId,
        type: artifact.type,
        title: artifact.title,
        content: artifact.content,
        status: artifact.status
      }
    });

    await prisma.approval.create({
      data: {
        id: nanoid(),
        projectId,
        artifactId: artifact.id,
        status: "PENDING",
        requestedBy: "founder-agent"
      }
    });
  }

  await upsertTaskRecord(projectId, execution.nextTask);
  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId,
      taskId,
      runType: "execution",
      status: "completed",
      summary: artifact ? "Generated blog brief for approval." : "Execution blocked because task type is not supported in v1.",
      outputJson: artifact ? JSON.stringify(serializeArtifact(await prisma.artifact.findUniqueOrThrow({ where: { id: artifact.id } }))) : null
    }
  });

  return loadDashboardRecord(projectId);
};

export const decideApproval = async (approvalId: string, decision: "APPROVED" | "REJECTED", note?: string) => {
  const normalizedNote = note?.trim();
  const approval = await prisma.approval.update({
    where: { id: approvalId },
    data: {
      status: decision,
      decisionNote: normalizedNote,
      artifact: {
        update: {
          status: decision === "APPROVED" ? "APPROVED" : "REJECTED"
        }
      }
    },
    include: {
      project: true,
      artifact: true
    }
  });

  const linkedTask = await prisma.task.findFirst({ where: { artifactId: approval.artifactId } });
  if (linkedTask) {
    const nextTask = decision === "APPROVED"
      ? transitionTask(serializeTask(linkedTask), "DONE", "Founder approved the generated artifact.")
      : transitionTask(serializeTask(linkedTask), "BLOCKED", "Founder rejected the artifact and requested revisions.");
    await upsertTaskRecord(linkedTask.projectId, nextTask);

    if (decision === "REJECTED" && normalizedNote) {
      await createCommentRecord(linkedTask.projectId, linkedTask.id, normalizedNote);
    }
  }

  await prisma.agentRun.create({
    data: {
      id: nanoid(),
      projectId: approval.projectId,
      taskId: linkedTask?.id,
      runType: "approval_decision",
      status: "completed",
      summary: `Artifact ${decision.toLowerCase()} by the founder.`,
      outputJson: JSON.stringify({ approval_id: approvalId, decision, note: normalizedNote })
    }
  });

  return loadDashboardRecord(approval.projectId);
};
