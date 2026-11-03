#!/usr/bin/env node
// Publishes docs/issues/*.md as GitHub Issues. Prints the plan unless run with --apply.
// Safe to re-run: issues whose title already exists on GitHub are skipped.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(import.meta.dirname, "..", "docs", "issues");
const APPLY = process.argv.includes("--apply");

function gh(args, input) {
  return execFileSync("gh", args, { encoding: "utf8", input });
}

function parse(file) {
  const match = readFileSync(join(DIR, file), "utf8").match(/^---\n([\s\S]*?)\n---\n+([\s\S]*)$/);
  if (!match) throw new Error(`${file}: missing frontmatter`);
  const meta = Object.fromEntries(
    match[1].split("\n").map((line) => {
      const colon = line.indexOf(":");
      return [line.slice(0, colon), line.slice(colon + 1).trim()];
    }),
  );
  for (const key of ["title", "milestone", "labels", "status"]) {
    if (!meta[key]) throw new Error(`${file}: missing ${key}`);
  }
  return { file, ...meta, labels: meta.labels.split(","), body: match[2] };
}

const issues = readdirSync(DIR)
  .filter((file) => /^(M\d|L)-\d+.*\.md$/.test(file))
  .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
  .map(parse);

if (!APPLY) {
  for (const issue of issues) {
    console.log(`[${issue.status}] ${issue.milestone} · ${issue.title} (${issue.labels.join(", ")})`);
  }
  console.log(`\n${issues.length} issues. Run with --apply to publish them.`);
  process.exit(0);
}

const milestones = JSON.parse(gh(["api", "repos/{owner}/{repo}/milestones?state=all&per_page=100"])).map((m) => m.title);
for (const title of new Set(issues.map((issue) => issue.milestone))) {
  if (!milestones.includes(title)) gh(["api", "repos/{owner}/{repo}/milestones", "-f", `title=${title}`]);
}
for (const label of new Set(issues.flatMap((issue) => issue.labels))) {
  gh(["label", "create", label, "--force"]);
}

const existing = new Set(
  JSON.parse(gh(["issue", "list", "--state", "all", "--limit", "1000", "--json", "title"])).map((i) => i.title),
);
for (const issue of issues) {
  if (existing.has(issue.title)) {
    console.log(`skipped  ${issue.title}`);
    continue;
  }
  const args = ["issue", "create", "--title", issue.title, "--milestone", issue.milestone, "--body-file", "-"];
  for (const label of issue.labels) args.push("--label", label);
  const url = gh(args, issue.body).trim();
  if (issue.status === "done") gh(["issue", "close", url]);
  console.log(`created  ${url}  ${issue.title}`);
}
console.log("\nCheck the issues on GitHub, then delete docs/issues/ and update docs/agents/issue-tracker.md.");
