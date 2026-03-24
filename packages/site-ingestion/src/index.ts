import { JSDOM } from "jsdom";
import type { IngestionResult, WebsitePage } from "@founder-os/types";

const normalizeUrl = (url: string) => (url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`);

const cleanText = (value: string) => value.replace(/\s+/g, " ").trim();

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

const summarizeDocument = (document: Document) => {
  const title = cleanText(document.querySelector("title")?.textContent ?? "");
  const metaDescription = getMetaContent(document, [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[name="twitter:description"]'
  ]);
  const headings = Array.from(document.querySelectorAll("h1, h2"))
    .map((item) => cleanText(item.textContent ?? ""))
    .filter(Boolean);
  const paragraphs = Array.from(document.querySelectorAll("p"))
    .map((item) => cleanText(item.textContent ?? ""))
    .filter((item) => item.length > 45)
    .slice(0, 3);

  return firstMeaningfulText([metaDescription, [title, ...headings.slice(0, 2), ...paragraphs].join(" ")]);
};

const guessICP = (summary: string, pages: WebsitePage[]) => {
  const lower = summary.toLowerCase();
  const pageUrls = pages.map((page) => page.url.toLowerCase());

  if (lower.includes("developer") || lower.includes("api") || lower.includes("engineering")) {
    return "Product, engineering, and technical buying teams looking for faster execution";
  }

  if (lower.includes("agency") || lower.includes("marketing") || pageUrls.some((url) => url.includes("/services"))) {
    return "Founder-led teams that want clearer positioning and more efficient demand generation";
  }

  if (lower.includes("ecommerce") || lower.includes("store") || lower.includes("shop")) {
    return "Ecommerce operators trying to lift qualified traffic and conversion rate";
  }

  if (lower.includes("product") || lower.includes("software") || lower.includes("platform")) {
    return "Modern software buyers evaluating products that promise speed, clarity, or operational leverage";
  }

  return "Lean business teams that need clearer messaging, discoverability, and growth execution";
};

const detectOpportunities = (pages: WebsitePage[], summary: string) => {
  const opportunities = new Set<string>();
  const lower = summary.toLowerCase();

  if (!pages.some((page) => page.url.includes("blog") || page.url.includes("insights") || page.url.includes("resources"))) {
    opportunities.add("There is no obvious content hub yet, which makes it harder to compound SEO and thought-leadership gains.");
  }

  if (!pages.some((page) => page.url.includes("pricing") || page.url.includes("contact") || page.url.includes("demo"))) {
    opportunities.add("The first crawl does not reveal a clear conversion path such as pricing, demo, or contact, so buyer intent may be leaking.");
  }

  if (!lower.includes("why") && !lower.includes("benefit") && !lower.includes("outcome")) {
    opportunities.add("The messaging explains the product, but it does not consistently foreground the business outcome for the buyer.");
  }

  if (!lower.includes("seo") && !lower.includes("search") && !lower.includes("discover")) {
    opportunities.add("Search intent is not explicit in the visible messaging, so the acquisition story may be underdeveloped.");
  }

  if (pages.length < 3) {
    opportunities.add("Only a small set of crawlable pages was discovered, which usually means the site has limited surface area for search and conversion.");
  }

  return Array.from(opportunities);
};

const buildCompanySummary = (websiteUrl: string, homepageTitle: string, pages: WebsitePage[]) => {
  const companyName = homepageTitle.split(/[|–—-]/)[0]?.trim() || new URL(websiteUrl).hostname.replace(/^www\./, "");
  const homepage = pages[0];
  const supporting = pages.slice(1, 3).map((page) => page.excerpt).join(" ");
  const combined = cleanText(`${homepage?.excerpt ?? ""} ${supporting}`.slice(0, 520));

  if (combined.length > 80) {
    return `${companyName} appears to position itself around ${combined.charAt(0).toLowerCase() + combined.slice(1)}`
      .replace(/\.\s*$/, ".")
      .replace(/\s+\./g, ".");
  }

  return `${companyName} appears to be a business with a credible offer, but the current website still needs sharper positioning, clearer acquisition paths, and more explicit buyer-oriented messaging.`;
};

export const ingestWebsite = async (inputUrl: string): Promise<IngestionResult> => {
  // TODO(v2): Respect robots.txt, canonical URLs, and retry/backoff policies before expanding the crawl depth.
  const websiteUrl = normalizeUrl(inputUrl);
  const baseUrl = new URL(websiteUrl);

  const homepageHtml = await fetch(websiteUrl).then((response) => response.text());
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
      return ["/", "/about", "/pricing", "/services", "/product", "/blog", "/contact", "/features"].some(
        (segment) => pathname === segment || pathname.startsWith(`${segment}/`)
      );
    })
    .slice(0, 4);

  const crawledPages: WebsitePage[] = [];
  for (const pageUrl of importantPages) {
    try {
      const html = await fetch(pageUrl).then((response) => response.text());
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

  const companySummary = buildCompanySummary(websiteUrl, homepageTitle, crawledPages);
  const guessedICP = guessICP(companySummary, crawledPages);
  const opportunities = detectOpportunities(crawledPages, companySummary);

  return {
    website_url: websiteUrl,
    homepage_title: homepageTitle,
    company_summary: companySummary,
    guessed_icp: guessedICP,
    key_pages: crawledPages.map((page) => page.url),
    opportunities,
    crawled_pages: crawledPages
  };
};
