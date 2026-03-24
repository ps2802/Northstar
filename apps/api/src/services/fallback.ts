import type { IngestionResult } from "@founder-os/types";

export const createFallbackIngestion = (inputUrl: string): IngestionResult => {
  const websiteUrl = inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`;
  const hostname = new URL(websiteUrl).hostname.replace("www.", "");

  return {
    website_url: websiteUrl,
    homepage_title: `${hostname} | Founder-led growth`,
    company_summary: `${hostname} appears to position itself as a lean, internet-native business. The current opportunity is to sharpen positioning, make search intent more explicit, and turn the site into a steadier source of qualified demand.`,
    guessed_icp: "Founders and lean operators who need clearer go-to-market execution without a big internal team",
    key_pages: [websiteUrl, `${websiteUrl}/about`, `${websiteUrl}/blog`],
    opportunities: [
      "The homepage likely needs a clearer founder-centric value proposition.",
      "There is room to create a structured content engine around high-intent topics.",
      "Metadata and page hierarchy should be tightened to support SEO discoverability."
    ],
    crawled_pages: [
      {
        url: websiteUrl,
        title: `${hostname} home`,
        excerpt: `${hostname} speaks to a practical business problem, but the messaging can be more explicit about who it serves and why it wins.`
      },
      {
        url: `${websiteUrl}/about`,
        title: `${hostname} about`,
        excerpt: "Founder and company story are likely present, but positioning can be turned into stronger credibility and differentiation."
      },
      {
        url: `${websiteUrl}/blog`,
        title: `${hostname} blog`,
        excerpt: "A content surface exists or should exist; this is the natural place to start building a repeatable SEO engine."
      }
    ]
  };
};
