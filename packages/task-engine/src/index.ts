import { nanoid } from "nanoid";
import type { IngestionResult, Task, TaskInput, TaskMovement, TaskStatus } from "@founder-os/types";

const round = (value: number) => Math.round(value * 100) / 100;
const normalizeEffort = (effort: number) => (effort <= 0 ? 1 : effort);

const deriveCompanyName = (websiteUrl: string, homepageTitle: string) => {
  const url = new URL(websiteUrl);
  if (url.hostname === "github.com") {
    const repo = url.pathname.split("/").filter(Boolean)[1] ?? homepageTitle;
    return repo.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()).replace(/\bQa\b/g, "QA");
  }

  const titleParts = homepageTitle.split(/[|–—·-]/).map((part) => part.trim()).filter(Boolean);
  return (titleParts.find((part) => part.length > 2 && part.length < 40) ?? url.hostname.replace(/^www\./, "")).replace(/\bQa\b/g, "QA");
};

const isFounderOsProduct = (text: string) => {
  const lower = text.toLowerCase();
  return (
    (lower.includes("non-technical founder") || lower.includes("founder os") || lower.includes("founder operating system")) &&
    (lower.includes("kanban") || lower.includes("board") || lower.includes("backlog") || lower.includes("approval"))
  );
};

const businessMode = (ingestion: IngestionResult) => {
  const lower = `${ingestion.company_summary} ${ingestion.guessed_icp} ${ingestion.website_url}`.toLowerCase();
  if (isFounderOsProduct(lower) || lower.includes("kanban-first operating system") || lower.includes("command center for marketing")) {
    return "founder_os_repo" as const;
  }
  if (lower.includes("agentic qa") || lower.includes("product audits") || lower.includes("playwright") || lower.includes("overnight audit")) {
    return "repo_b2b" as const;
  }
  if (lower.includes("solana") || lower.includes("wallet") || lower.includes("token") || lower.includes("nft") || lower.includes("onchain")) {
    return "crypto" as const;
  }
  if (lower.includes("f1") || lower.includes("prediction game") || lower.includes("qualifying") || lower.includes("league") || lower.includes("betting")) {
    return "consumer_sports" as const;
  }
  if (lower.includes("engineering") || lower.includes("technical") || lower.includes("developer")) {
    return "technical_b2b" as const;
  }
  return "general_b2b" as const;
};

const buildRationale = (whyExists: string, whyPriority: string, businessOutcome: string) =>
  [`Why this exists: ${whyExists}`, `Why this priority: ${whyPriority}`, `Business outcome supported: ${businessOutcome}`].join("\n");

const buildManualTaskRationale = (input: TaskInput, priorityScore: number) => {
  const priorityBand =
    priorityScore >= 90
      ? "It scored high because the expected upside is strong relative to the effort estimate."
      : priorityScore >= 45
        ? "It landed in the middle because the upside is credible, but the team should validate assumptions before spending too much time."
        : "It ranked lower because either the upside is still uncertain or the effort looks heavy for the likely payoff.";

  const outcomeMap: Record<string, string> = {
    seo_audit: "improving discoverability and the path from search to signup",
    keyword_cluster: "aligning content with real buyer intent",
    meta_rewrite: "improving first-visit clarity and click-through rates",
    blog_brief: "creating a founder-usable narrative asset",
    linkedin_post_set: "improving founder-led distribution and trust",
    x_post_set: "improving social reach and launch momentum",
    homepage_copy_suggestion: "improving conversion and visitor clarity",
    competitor_scan: "improving differentiation and positioning"
  };
  const businessOutcome = outcomeMap[input.type] ?? `improving the requested growth outcome tied to ${input.type.replaceAll("_", " ").toLowerCase()}`;

  return buildRationale(
    "The founder explicitly requested this work, so it should be evaluated on the same operating board as system-generated tasks.",
    priorityBand,
    businessOutcome
  );
};

const createSeedTemplates = (projectId: string, ingestion: IngestionResult): TaskInput[] => {
  const companyName = deriveCompanyName(ingestion.website_url, ingestion.homepage_title);
  const mode = businessMode(ingestion);
  const firstOpportunity = ingestion.opportunities[0] ?? "the business has room to sharpen how it explains and distributes its value";

  if (mode === "founder_os_repo") {
    return [
      {
        title: `Make ${companyName}'s board-first value obvious to a non-technical founder in one screen`,
        description: `Rewrite the opening narrative so a founder understands in seconds that ${companyName} turns website context into a prioritized growth board with approvals, not another AI chat pane.`,
        type: "HOMEPAGE_COPY_SUGGESTION",
        source: "SYSTEM",
        impact: 9,
        effort: 3,
        confidence: 8,
        goal_fit: 9,
        rationale: buildRationale(
          `The current repo proves the workflow, but it still makes the founder infer too much about why the board is the actual product.`,
          `This ranks first because if the first screen does not land the board-first promise, the rest of the backlog reads like implementation detail instead of leverage.`,
          `A sharper first-screen narrative should improve demo conversion, founder trust, and willingness to explore the generated board.`
        )
      },
      {
        title: `Build a keyword map around founder operating systems and board-led growth execution`,
        description: `Map the search themes a founder would use when looking for a command center for marketing, SEO, social posting, approvals, and visible execution.`,
        type: "KEYWORD_CLUSTER",
        source: "SYSTEM",
        impact: 8,
        effort: 5,
        confidence: 8,
        goal_fit: 9,
        rationale: buildRationale(
          `Northstar needs to own the language around founder operating systems instead of letting repo or QA language define the category.`,
          `It ranks high because it supplies the vocabulary for pages, blog briefs, and demo copy without adding new surface area.`,
          `Owning this language should improve discoverability and attract founders who want an operating system, not just a chatbot.`
        )
      },
      {
        title: `Draft a blog brief on why non-technical founders need a board, not another chat thread`,
        description: `Create a founder-approvable brief that turns Northstar's point of view into repeatable language a founder can use in demos, onboarding, and category positioning.`,
        type: "BLOG_BRIEF",
        source: "SYSTEM",
        impact: 8,
        effort: 4,
        confidence: 8,
        goal_fit: 9,
        rationale: buildRationale(
          `Northstar has a clear structural point of view, but it still needs sharper language that founders can repeat without sounding like generic AI tooling.`,
          `It stays near the top because it validates the approval flow while creating a reusable founder-facing asset for demos, content, and sales conversations.`,
          `A stronger brief should make Northstar easier to explain, easier to trust, and easier for founders to repeat to other founders.`
        )
      },
      {
        title: `Scan adjacent founder tools that compete with Northstar's board-first promise`,
        description: `Review close alternatives so Northstar can explain why a kanban-first founder OS is meaningfully different from generic productivity tools and chat-first assistants.`,
        type: "COMPETITOR_SCAN",
        source: "SYSTEM",
        impact: 7,
        effort: 5,
        confidence: 7,
        goal_fit: 8,
        rationale: buildRationale(
          `The category is easy to flatten into generic productivity language unless the alternatives are explicitly compared.`,
          `It sits below the homepage and content work because differentiation is most useful after the product thesis is clear.`,
          `Sharper differentiation should help Northstar sound like a founder operating system instead of another task app.`
        )
      },
      {
        title: `Create a proof-led founder signal set from ${companyName}'s own dogfood results`,
        description: `Generate a small set of proof-led founder distribution hooks that show the board producing useful, prioritized growth work for itself.`,
        type: "LINKEDIN_POST_SET",
        source: "SYSTEM",
        impact: 6,
        effort: 3,
        confidence: 7,
        goal_fit: 8,
        rationale: buildRationale(
          `Northstar's strongest marketing asset is its own dogfood proof, not generic founder posting.`,
          `It ranks lower than core positioning tasks because proof matters most after the product story is correct.`,
          `Sharper proof signals should improve founder trust in demos and make future distribution more credible.`
        )
      }
    ];
  }

  if (mode === "crypto") {
    return [
      {
        title: `Clarify why ${companyName} is the fastest path into Solana trading`,
        description: `Audit the homepage and trading CTA flow so Moongate explains trust, speed, and differentiation more clearly to Solana traders and wallet users.`,
        type: "HOMEPAGE_COPY_SUGGESTION",
        source: "SYSTEM",
        impact: 9,
        effort: 3,
        confidence: 8,
        goal_fit: 9,
        rationale: buildRationale(
          `The current site is strong on vibe and speed, but it leaves too much implied around wallet trust, onboarding, and why this is better than other Solana trading flows.`,
          `This ranks near the top because clearer homepage framing can improve conversion immediately without waiting for a broader content engine.`,
          `A stronger trust-and-speed narrative should increase trader conversion and make the product easier to recommend or integrate.`
        )
      },
      {
        title: `Build a search and content map for Solana wallet and trading intent`,
        description: `Map the most relevant search themes around Solana wallet onboarding, embedded wallets, fast trading, and ecosystem discovery so ${companyName} can own more category language.`,
        type: "KEYWORD_CLUSTER",
        source: "SYSTEM",
        impact: 8,
        effort: 5,
        confidence: 7,
        goal_fit: 8,
        rationale: buildRationale(
          `The product sits in a crowded crypto category, so it needs stronger control over how users discover and understand it beyond social buzz.`,
          `It ranks highly because it sets up better SEO, ecosystem content, and landing-page copy all at once.`,
          `Owning more search intent should help bring in higher-intent users and reduce reliance on hype-only discovery.`
        )
      },
      {
        title: `Create an ecosystem credibility scan for ${companyName}`,
        description: `Review how competitors and adjacent Solana products talk about safety, speed, and usability so ${companyName} can sharpen its category positioning.`,
        type: "COMPETITOR_SCAN",
        source: "SYSTEM",
        impact: 7,
        effort: 5,
        confidence: 7,
        goal_fit: 8,
        rationale: buildRationale(
          `Crypto users compare products quickly, so vague differentiation creates trust and conversion drag.`,
          `This sits in the upper-middle of the board because it informs the copy and SEO work without blocking it.`,
          `Sharper category positioning should help the product sound more credible and more distinct in a noisy Solana market.`
        )
      },
      {
        title: `Draft a blog brief on Solana trading onboarding friction`,
        description: `Create a founder-approvable blog brief about the friction in discovering and trading assets on Solana, tied back to ${companyName}'s product angle.`,
        type: "BLOG_BRIEF",
        source: "SYSTEM",
        impact: 7,
        effort: 4,
        confidence: 7,
        goal_fit: 8,
        rationale: buildRationale(
          `The product needs content that explains the problem space, not just product hype, if it wants durable growth beyond social channels.`,
          `It ranks highly because it validates the artifact workflow and gives the team a reusable narrative asset quickly.`,
          `A strong brief can support organic search, founder-led education, and ecosystem trust building.`
        )
      },
      {
        title: `Design an X post set for crypto-native launch momentum`,
        description: `Generate a small set of crypto-native X post concepts around speed, token discovery, and Solana trading advantage.`,
        type: "X_POST_SET",
        source: "SYSTEM",
        impact: 6,
        effort: 3,
        confidence: 8,
        goal_fit: 7,
        rationale: buildRationale(
          `The audience appears highly social and likely spends meaningful time on X, especially in crypto discovery loops.`,
          `It ranks below core copy and search work because social momentum matters, but the homepage still needs clearer conversion framing first.`,
          `Better social hooks should improve launch momentum and help the brand sound native to the Solana community.`
        )
      }
    ];
  }

  if (mode === "consumer_sports") {
    return [
      {
        title: `Sharpen the homepage story for serious F1 fans joining ${companyName}`,
        description: `Rewrite the opening messaging so the site makes the season loop, skill-based angle, and competitive payoff obvious to Formula 1 fans.`,
        type: "HOMEPAGE_COPY_SUGGESTION",
        source: "SYSTEM",
        impact: 9,
        effort: 3,
        confidence: 8,
        goal_fit: 9,
        rationale: buildRationale(
          `The product hook is strong, but the homepage can do more to explain why this is for real F1 fans and not a generic prediction game.`,
          `This is high priority because small copy improvements can make the game easier to understand and more compelling right at signup.`,
          `Clearer positioning should improve fan conversion and make the product more sticky during the racing season.`
        )
      },
      {
        title: `Plan a race-weekend content cluster for ${companyName}`,
        description: `Build a keyword and content map around qualifying predictions, F1 fantasy alternatives, and season-long prediction gameplay.`,
        type: "KEYWORD_CLUSTER",
        source: "SYSTEM",
        impact: 8,
        effort: 5,
        confidence: 7,
        goal_fit: 8,
        rationale: buildRationale(
          `The product will likely win through recurring season moments, so content and search should mirror the cadence of qualifying and race weekends.`,
          `It ranks highly because it creates structure for acquisition without changing the product itself.`,
          `A race-weekend content strategy should create more qualified acquisition and repeat engagement during the season.`
        )
      },
      {
        title: `Create an X post set for qualifying-day engagement`,
        description: `Generate a social post set around prediction confidence, grid surprises, and crowd-vs-skill framing timed to F1 qualifying.`,
        type: "X_POST_SET",
        source: "SYSTEM",
        impact: 8,
        effort: 3,
        confidence: 8,
        goal_fit: 8,
        rationale: buildRationale(
          `This audience is likely to respond to timely, lightweight, high-frequency social moments more than long-form founder content.`,
          `It ranks above some SEO work because seasonal consumer products often win on social energy and event cadence first.`,
          `Better qualifying-day social hooks should improve awareness, activation, and return visits around each round.`
        )
      },
      {
        title: `Draft a blog brief on why F1 predictions should reward skill over consensus`,
        description: `Create a founder-approvable content brief that explains the product philosophy behind ${companyName} and attracts serious F1 fans.`,
        type: "BLOG_BRIEF",
        source: "SYSTEM",
        impact: 7,
        effort: 4,
        confidence: 7,
        goal_fit: 7,
        rationale: buildRationale(
          `The product has a clear point of view, and that point of view should be turned into a searchable, ownable content asset.`,
          `It remains high enough to matter because it proves the content workflow and gives the brand a more durable narrative than launch copy alone.`,
          `A stronger editorial angle should help attract more serious players and make the brand feel sharper than generic F1 games.`
        )
      },
      {
        title: `Scan adjacent F1 fantasy and prediction products`,
        description: `Review similar products to understand how ${companyName} can stand out on skill, competition, and season structure.`,
        type: "COMPETITOR_SCAN",
        source: "SYSTEM",
        impact: 6,
        effort: 5,
        confidence: 7,
        goal_fit: 7,
        rationale: buildRationale(
          `Sports products are easy to confuse with each other, so differentiation matters early.`,
          `This ranks below the core homepage and social work because it is more strategic context than immediate conversion leverage.`,
          `Sharper differentiation should make the product easier to pitch and easier for fans to remember.`
        )
      }
    ];
  }

  if (mode === "repo_b2b" || mode === "technical_b2b") {
    return [
      {
        title: `Turn ${companyName}'s GitHub-first angle into a buyer-facing homepage narrative`,
        description: `Audit the current explanation of the product so technical credibility stays intact while the buyer value becomes easier to understand quickly.`,
        type: "HOMEPAGE_COPY_SUGGESTION",
        source: "SYSTEM",
        impact: 9,
        effort: 4,
        confidence: 8,
        goal_fit: 9,
        rationale: buildRationale(
          `The product has a distinctive workflow, but the current explanation still reads more like a repo or operating manual than a crisp buyer-facing story.`,
          `This ranks highest because clearer positioning should improve both conversion and the quality of every downstream marketing asset.`,
          `A better narrative should help technical and semi-technical buyers understand the offer faster and trust the product sooner.`
        )
      },
      {
        title: `Build a keyword cluster around ${companyName}'s core QA buying problem`,
        description: `Map search themes around QA audits, friction reports, GitHub-native workflows, overnight delivery, and evidence-backed testing so ${companyName} can own a clearer category.`,
        type: "KEYWORD_CLUSTER",
        source: "SYSTEM",
        impact: 8,
        effort: 5,
        confidence: 8,
        goal_fit: 8,
        rationale: buildRationale(
          `The product sits in an emerging category, so owning the language around it matters just as much as shipping the workflow itself.`,
          `It ranks highly because it gives the team a strategic map for landing pages, blog briefs, and GTM messaging.`,
          `Owning category language should improve discoverability and make the product easier to position against broader QA tools.`
        )
      },
      {
        title: `Draft a blog brief on overnight AI+human QA as an operating model`,
        description: `Create a founder-approvable blog brief explaining why overnight audits and GitHub-native evidence are a better QA buying experience.`,
        type: "BLOG_BRIEF",
        source: "SYSTEM",
        impact: 8,
        effort: 4,
        confidence: 8,
        goal_fit: 8,
        rationale: buildRationale(
          `The business already has a strong point of view, and that should be turned into a durable narrative asset rather than living only in repo copy.`,
          `It stays near the top because it proves Northstar's execution model while amplifying a sharp category position.`,
          `A strong brief should support SEO, founder-led distribution, and clearer trust-building with prospective buyers.`
        )
      },
      {
        title: `Review how competing QA products frame speed, evidence, and trust`,
        description: `Run a competitor scan focused on onboarding promise, proof surfaces, and trust claims so ${companyName} can sound more specific than generic testing platforms.`,
        type: "COMPETITOR_SCAN",
        source: "SYSTEM",
        impact: 7,
        effort: 5,
        confidence: 7,
        goal_fit: 8,
        rationale: buildRationale(
          `Technical buyers compare products quickly, and generic wording makes differentiated delivery models easy to miss.`,
          `This ranks in the upper-middle because it sharpens the copy work and category strategy, even if it is not the first conversion lever.`,
          `Sharper competitive framing should make the offer easier to trust and easier to explain to buyers.`
        )
      },
      {
        title: `Create a proof-led founder post set around overnight QA outcomes`,
        description: `Generate a small proof-led post set around product friction, overnight audits, and GitHub-native evidence so the distribution angle matches the product's trust model.`,
        type: "LINKEDIN_POST_SET",
        source: "SYSTEM",
        impact: 6,
        effort: 3,
        confidence: 8,
        goal_fit: 7,
        rationale: buildRationale(
          `The business likely sells through trust and point of view, so founder/operator content can reinforce positioning.`,
          `It ranks below core positioning work because distribution matters, but the offer still needs stronger primary-market framing first.`,
          `Better founder-led distribution should increase awareness and trust among product, growth, and engineering buyers.`
        )
      }
    ];
  }

  return [
    {
      title: `Audit ${companyName}'s acquisition path from homepage to conversion`,
      description: `Review the messaging, metadata, and calls-to-action across the current site to find where qualified demand may be leaking.`,
      type: "SEO_AUDIT",
      source: "SYSTEM",
      impact: 9,
      effort: 4,
      confidence: 8,
      goal_fit: 9,
      rationale: buildRationale(
        `The onboarding pass suggests that ${firstOpportunity.charAt(0).toLowerCase() + firstOpportunity.slice(1)}`,
        `It scores near the top because it improves multiple downstream tasks at once: positioning, SEO, and conversion fixes all depend on this baseline.`,
        `A tighter acquisition path should improve how many relevant visitors understand the offer and move toward a meaningful next step.`
      )
    },
    {
      title: `Build a keyword map for ${ingestion.guessed_icp}`,
      description: `Turn the site's current positioning into a focused set of search themes that map buyer problems to acquisition content and landing pages.`,
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
        `The homepage is the most important trust and conversion surface, and the current message still leaves too much implied for a first-time visitor.`,
        `It keeps a strong score because the effort is relatively low compared with the potential lift in click-through rate and visitor clarity.`,
        `Clearer messaging should improve both search snippet performance and first-visit conversion confidence.`
      )
    },
    {
      title: `Draft a blog brief around the core problem ${companyName} solves`,
      description: `Create one founder-approvable blog brief that turns the site's current narrative into a high-intent content asset.`,
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
      description: `Review likely competitors to see where ${companyName} can sound more specific and more differentiated.`,
      type: "COMPETITOR_SCAN",
      source: "SYSTEM",
      impact: 6,
      effort: 6,
      confidence: 6,
      goal_fit: 7,
      rationale: buildRationale(
        `Positioning quality is easier to judge when the company is compared against the alternatives a buyer will evaluate.`,
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
    rationale: input.source === "USER" && !input.rationale.trim() ? buildManualTaskRationale(input, priorityScore) : input.rationale,
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
  [...tasks].sort((a, b) => (b.priority_score !== a.priority_score ? b.priority_score - a.priority_score : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));

export const evaluateTaskForExecution = (task: Task) => {
  if (task.status === "DONE" || task.status === "BLOCKED") {
    return { recommended_status: task.status, summary: "Task is not actionable right now." };
  }
  if (task.priority_score >= 95) {
    return { recommended_status: "PLANNED" as const, summary: "This is one of the strongest leverage items on the board, so it belongs in the planned lane." };
  }
  if (task.priority_score >= 45) {
    return { recommended_status: "EVALUATING" as const, summary: "This looks valuable, but the founder-agent should tighten assumptions before pulling it into active planning." };
  }
  return { recommended_status: "INBOX" as const, summary: "Keep this visible in the inbox until stronger or better-defined work is exhausted." };
};

export const generateSeedTasks = (projectId: string, ingestion: IngestionResult): Task[] =>
  sortTasksByPriority(createSeedTemplates(projectId, ingestion).map((template) => createTaskFromInput(projectId, template))).map((task, index) => {
    const evaluation = evaluateTaskForExecution(task);
    return index === 0
      ? transitionTask(task, "PLANNED", "Queued as the strongest initial operating-system task after onboarding.")
      : transitionTask(task, evaluation.recommended_status, evaluation.summary);
  });
