const response = await fetch(`${process.env.CI_API_V4_URL}/projects/${process.env.CI_PROJECT_ID}/releases`, {
  method: "POST",
  headers: { "JOB-TOKEN": process.env.CI_JOB_TOKEN, "Content-Type": "application/json" },
  body: JSON.stringify({
    name: `Zilber Portal ${process.env.CI_COMMIT_TAG}`,
    tag_name: process.env.CI_COMMIT_TAG,
    description: `Production deployment verified at https://portal.zilber.tech\n\nCommit: ${process.env.CI_COMMIT_SHA}\nPipeline: ${process.env.CI_PIPELINE_URL}`,
    assets: { links: [{ name: "Production portal", url: "https://portal.zilber.tech" }] },
  }),
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Release creation failed: HTTP ${response.status}`);
console.log(`Published release ${process.env.CI_COMMIT_TAG}`);
