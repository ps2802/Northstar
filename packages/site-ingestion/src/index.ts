import { JSDOM } from "jsdom";
import type { IngestionResult, WebsitePage } from "@founder-os/types";

const normalizeUrl = (url: string) => (url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`);
const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();

const fetchText = async (url: string) => fetch(url).then((response) => response.text());

const getMetaContent = (document: Document, selectors: string[]) => {
  for (const selector of selectors) {
    const value = document.querySelector(selector)?.getAttribute("content");
    if (value) {
      return cleanText(value);
    }
  }
  return "";
};

const firstMeaningfulText = (values: string[]) => values.map(cleanText).find((value) => value.length > 30) ?? "";

const extractIdentityLine = (text: string) => {
  const lines = text
    .split("\n")
    .map((line) => cleanText(line.replace(/^#+\s*/, "").replace(/[*_`>-]/g, " ")))
    .filter((line) => line && !line.startsWith("|") && line.length > 20);

  const preferred = lines.find((line) =>
    [/ is a /i, / is an /i, /operating system/i, /command center/i, /founder/i, /platform/i, /helps/i].some((pattern) => pattern.test(line))
  );

  return preferred ?? lines[0] ?? "";
};

const summarizeDocument = (document: Document) => {
  const title = cleanText(document.querySelector("title")?.textContent ?? "");
  const metaDescription = getMetaContent(document, [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]'
  ]);
  const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
    .map((item) => cleanText(item.textContent ?? ""))
    .filter(Boolean)
    .slice(0, 4);
  const paragraphs = Array.from(document.querySelectorAll("p"))
    .map((item) => cleanText(item.textContent ?? ""))
    .filter((item) => item.length > 45)
    .slice(0, 4);

  return firstMeaningfulText([metaDescription, [title, ...headings, ...paragraphs].join(" ")]);
};

const isGithubRepoUrl = (url: string) => {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  return parsed.hostname === "github.com" && parts.length >= 2;
};

const githubRepoInfo = (url: string) => {
  const parsed = new URL(url);
  const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
  return { owner, repo };
};

const readGithubReadme = async (url: string) => {
  const { owner, repo } = githubRepoInfo(url);
  const candidates = [
    `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`,
    `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`
  ];

  for (const candidate of candidates) {
    try {
      const text = await fetchText(candidate);
      if (text && !text.startsWith("404:")) {
        return text;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return "";
};

const summarizeGithubReadme = (readme: string) => {
  const lines = readme
    .split("\n")
    .map((line) => cleanText(line.replace(/^#+\s*/, "")))
    .filter((line) => line && !line.startsWith("|") && line.length > 20);

  const identity = extractIdentityLine(readme);
  const supporting = lines.filter((line) => line !== identity).slice(0, 4);
  return [identity, ...supporting].filter(Boolean).join(" ").slice(0, 700);
};

const deriveCompanyName = (websiteUrl: string, homepageTitle: string) => {
  if (isGithubRepoUrl(websiteUrl)) {
    return githubRepoInfo(websiteUrl).repo.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()).replace(/\bQa\b/g, "QA");
  }

  const titleParts = homepageTitle.split(/[|–—·-]/).map((part) => cleanText(part)).filter(Boolean);
  const preferred = titleParts.find((part) => part.length > 2 && part.length < 40 && !/trade all|predict the grid|join the world's/i.test(part));
  return (preferred || new URL(websiteUrl).hostname.replace(/^www\./, "")).replace(/\bQa\b/g, "QA");
};

const isFounderOsProduct = (text: string) => {
  const lower = text.toLowerCase();
  return (
    (lower.includes("non-technical founder") || lower.includes("founder os") || lower.includes("founder operating system")) &&
    (lower.includes("kanban") || lower.includes("board") || lower.includes("backlog") || lower.includes("approval"))
  );
};

const detectBusinessMode = (summary: string, pages: WebsitePage[], websiteUrl: string) => {
  const lower = summary.toLowerCase();
  const urls = pages.map((page) => page.url.toLowerCase()).join(" ");

  if (isFounderOsProduct(summary)) {
    return "founder_os" as const;
  }
  if (lower.includes("solana") || lower.includes("wallet") || lower.includes("defi") || lower.includes("token") || lower.includes("nft")) {
    return "crypto" as const;
  }
  if (lower.includes("f1") || lower.includes("prediction game") || lower.includes("qualifying") || lower.includes("league") || lower.includes("betting")) {
    return "consumer_sports" as const;
  }
  if (lower.includes("github-first") || lower.includes("playwright") || lower.includes("agentic qa") || lower.includes("product audits") || lower.includes("overnight audits")) {
    return "repo_b2b" as const;
  }
  if (lower.includes("qa") || lower.includes("testing") || lower.includes("developer") || lower.includes("engineering") || urls.includes("github.com")) {
    return "technical_b2b" as const;
  }
  return "general_b2b" as const;
};

const guessICP = (summary: string, pages: WebsitePage[], websiteUrl: string) => {
  const mode = detectBusinessMode(summary, pages, websiteUrl);

  if (mode === "founder_os") {
    return "Non-technical founders and lean startup operators who need a visible system to prioritize, supervise, and approve growth work without hiring a full marketing team";
  }
  if (mode === "crypto") {
    return "Solana traders, onchain power users, and developers who want faster wallet onboarding and execution";
  }
  if (mode === "consumer_sports") {
    return "Formula 1 fans who follow qualifying closely and want a more skill-driven prediction game than casual pick-em products";
  }
  if (mode === "repo_b2b") {
    return "Product, growth, and engineering teams who want overnight QA audits with evidence and a GitHub-native workflow";
  }
  if (mode === "technical_b2b") {
    return "Technical buyers evaluating tools that promise faster product delivery, QA, or operational leverage";
  }
  return "Founder-led teams that need clearer positioning, stronger discoverability, and more reliable growth execution";
};

const detectOpportunities = (pages: WebsitePage[], summary: string, websiteUrl: string) => {
  const mode = detectBusinessMode(summary, pages, websiteUrl);
  const opportunities: string[] = [];
  const lower = summary.toLowerCase();

  if (mode === "founder_os") {
    opportunities.push("The product promise is strong, but the first-time story should explain faster why a founder should trust a board-led operating system over a chat-first assistant.");
    opportunities.push("The repo shows execution credibility, but Northstar still needs sharper public proof that the board creates prioritized, founder-usable growth work rather than generic task lists.");
    opportunities.push("The best growth angle is likely dogfooding and operator education, but that point of view needs clearer landing-page and content framing.");
    return opportunities;
  }

  if (mode === "repo_b2b") {
    opportunities.push("The product is being explained through a GitHub repo, which is strong for credibility but weak as a primary conversion surface for non-technical buyers.");
    opportunities.push("The offer and pricing are present in the README, but the top-level positioning still needs a sharper landing-page style narrative for buyers skimming quickly.");
    opportunities.push("The GitHub-first workflow is distinctive and should be turned into clearer SEO and thought-leadership hooks around QA audits, product friction, and overnight delivery.");
    return opportunities;
  }

  if (mode === "crypto") {
    opportunities.push("The value proposition is fast and bold, but it still under-explains trust, wallet onboarding, and why this is better than existing Solana trading flows.");
    opportunities.push("The site speaks fluently to crypto-native users, but it leaves room to explain product mechanics and credibility for less degen, high-value users or integration partners.");
    opportunities.push("There is no obvious educational or ecosystem content surface yet, which limits SEO and narrative control in a crowded Solana market.");
    return opportunities;
  }

  if (mode === "consumer_sports") {
    opportunities.push("The core hook is clear, but the site should do more to explain the season loop, retention mechanics, and why this game is more skill-based than generic prediction products.");
    opportunities.push("The product can likely benefit from social and launch-style content that rides qualifying weekends, race weekends, and season moments.");
    opportunities.push("There is little visible search surface beyond the homepage, so discoverability and acquisition content may be underbuilt.");
    return opportunities;
  }

  if (!pages.some((page) => page.url.includes("blog") || page.url.includes("insights") || page.url.includes("resources"))) {
    opportunities.push("There is no obvious content hub yet, which makes it harder to compound SEO and thought-leadership gains.");
  }
  if (!pages.some((page) => page.url.includes("pricing") || page.url.includes("contact") || page.url.includes("demo"))) {
    opportunities.push("The first crawl does not reveal a clear conversion path such as pricing, demo, or contact, so buyer intent may be leaking.");
  }
  if (!lower.includes("why") && !lower.includes("benefit") && !lower.includes("outcome")) {
    opportunities.push("The messaging explains the product, but it does not consistently foreground the business outcome for the buyer.");
  }
  if (!lower.includes("seo") && !lower.includes("search") && !lower.includes("discover")) {
    opportunities.push("Search intent is not explicit in the visible messaging, so the acquisition story may be underdeveloped.");
  }
  if (pages.length < 3) {
    opportunities.push("Only a small set of crawlable pages was discovered, which usually means the site has limited surface area for search and conversion.");
  }

  return opportunities;
};

const buildCompanySummary = (websiteUrl: string, homepageTitle: string, pages: WebsitePage[]) => {
  const companyName = deriveCompanyName(websiteUrl, homepageTitle);
  const combined = cleanText(pages.map((page) => page.excerpt).join(" ").slice(0, 620));
  const mode = detectBusinessMode(combined, pages, websiteUrl);

  if (mode === "founder_os") {
    return `${companyName} appears to be a Kanban-first operating system for non-technical founders. The core promise is that a founder can connect a website, generate a prioritized growth backlog, and manage execution and approvals from one board instead of juggling disconnected marketing work.`;
  }

  if (mode === "repo_b2b") {
    return `${companyName} appears to be a GitHub-first agentic QA product focused on overnight product audits. The core promise is that teams can submit a flow in the evening and wake up to a friction-ranked report, evidence bundle, and GitHub-ready backlog by morning.`;
  }
  if (mode === "crypto") {
    return `${companyName} appears to be a Solana wallet and trading product focused on making onchain activity faster and simpler. The current positioning emphasizes one-click access to the Solana ecosystem, fast trading flows, and a crypto-native user experience.`;
  }
  if (mode === "consumer_sports") {
    return `${companyName} appears to be a Formula 1 prediction game built for fans who care about qualifying, grid outcomes, and outperforming consensus. The positioning leans into skill, competition, and season-long participation rather than a generic casual sports game.`;
  }
  if (combined.length > 80) {
    return `${companyName} appears to position itself around ${combined.charAt(0).toLowerCase() + combined.slice(1)}`
      .replace(/\s+\./g, ".")
      .replace(/\.\.+/g, ".");
  }
  return `${companyName} appears to be a business with a credible offer, but the current website still needs sharper positioning, clearer acquisition paths, and more explicit buyer-oriented messaging.`;
};

export const ingestWebsite = async (inputUrl: string): Promise<IngestionResult> => {
  // TODO(v2): Respect robots.txt, canonical URLs, and retry/backoff policies before expanding the crawl depth.
  const websiteUrl = normalizeUrl(inputUrl);

  if (isGithubRepoUrl(websiteUrl)) {
    const { repo } = githubRepoInfo(websiteUrl);
    const readme = await readGithubReadme(websiteUrl);
    const readmeSummary = summarizeGithubReadme(readme);
    const homepageTitle = deriveCompanyName(websiteUrl, repo);
    const crawledPages: WebsitePage[] = [
      {
        url: websiteUrl,
        title: homepageTitle,
        excerpt: readmeSummary || `${homepageTitle} is currently represented through its GitHub repository.`
      }
    ];

    return {
      website_url: websiteUrl,
      homepage_title: deriveCompanyName(websiteUrl, homepageTitle),
      company_summary: buildCompanySummary(websiteUrl, homepageTitle, crawledPages),
      guessed_icp: guessICP(readmeSummary, crawledPages, websiteUrl),
      key_pages: [websiteUrl],
      opportunities: detectOpportunities(crawledPages, readmeSummary, websiteUrl),
      crawled_pages: crawledPages
    };
  }

  const baseUrl = new URL(websiteUrl);
  const homepageHtml = await fetchText(websiteUrl);
  const homepageDom = new JSDOM(homepageHtml, { url: websiteUrl });
  const homepageDocument = homepageDom.window.document;
  const homepageTitle = cleanText(homepageDocument.querySelector("title")?.textContent ?? baseUrl.hostname);
  const homepageSummary = summarizeDocument(homepageDocument);

  const links = Array.from(homepageDocument.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((anchor) => anchor.getAttribute("href") ?? "")
    .filter(Boolean)
    .map((href) => new URL(href, websiteUrl).toString())
    .filter((href) => href.startsWith(baseUrl.origin))
    .filter((href) => !href.includes("#"));

  const importantPages = Array.from(new Set([websiteUrl, ...links]))
    .filter((href) => {
      const pathname = new URL(href).pathname.toLowerCase();
      return ["/", "/about", "/pricing", "/services", "/product", "/blog", "/contact", "/features", "/dapps"].some(
        (segment) => pathname === segment || pathname.startsWith(`${segment}/`)
      );
    })
    .slice(0, 5);

  const crawledPages: WebsitePage[] = [];
  for (const pageUrl of importantPages) {
    try {
      const html = await fetchText(pageUrl);
      const dom = new JSDOM(html, { url: pageUrl });
      const document = dom.window.document;
      crawledPages.push({
        url: pageUrl,
        title: cleanText(document.querySelector("title")?.textContent ?? new URL(pageUrl).pathname),
        excerpt: summarizeDocument(document) || homepageSummary
      });
    } catch {
      crawledPages.push({
        url: pageUrl,
        title: new URL(pageUrl).pathname || "/",
        excerpt: homepageSummary
      });
    }
  }

  const combinedSummary = cleanText(crawledPages.map((page) => page.excerpt).join(" "));
  return {
    website_url: websiteUrl,
    homepage_title: deriveCompanyName(websiteUrl, homepageTitle),
    company_summary: buildCompanySummary(websiteUrl, homepageTitle, crawledPages),
    guessed_icp: guessICP(combinedSummary, crawledPages, websiteUrl),
    key_pages: crawledPages.map((page) => page.url),
    opportunities: detectOpportunities(crawledPages, combinedSummary, websiteUrl),
    crawled_pages: crawledPages
  };
};
