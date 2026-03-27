import { prisma } from "../apps/api/src/lib/prisma.js";
import { onboardProject } from "../apps/api/src/services/dashboard.js";

const main = async () => {
  await prisma.executionJob.deleteMany();
  await prisma.artifactRevision.deleteMany();
  await prisma.integrationConnection.deleteMany();
  await prisma.executionProviderConfig.deleteMany();
  await prisma.workspaceSession.deleteMany();
  await prisma.founderIntake.deleteMany();
  await prisma.approval.deleteMany();
  await prisma.agentRun.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.artifact.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.websiteSnapshot.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspace.deleteMany();

  await onboardProject("https://linear.app");
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
