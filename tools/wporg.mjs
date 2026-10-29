// NIVEL: BANCO DE TRABAJO — not a test. The WordPress.org package of the theme.
//
//   node tools/wporg.mjs zip          dist/estrategia-web-<version>.zip from HEAD (what gets uploaded)
//   node tools/wporg.mjs check        the zip, then Theme Check on it in Playground; exit 1 if REQUIRED
//   node tools/wporg.mjs screenshot   regenerates screenshot.png (1200x900) from the working tree
//
// WHAT GOES IN is decided by .gitattributes (export-ignore), not here: this
// packs HEAD with `git archive`, so uncommitted changes are NOT in the zip (it
// says so). Before packing it checks that «Version:» in style.css has its
// «= <version> =» entry in readme.txt's changelog.
//
// How to maintain — on each release to WordPress.org:
//   1. Version in style.css + readme.txt changelog + README.md «Versions», one commit.
//   2. If the design changed: node tools/wporg.mjs screenshot, look at it, commit it.
//   3. node tools/wporg.mjs check → no REQUIRED (WARNING/RECOMMENDED: read them).
//   4. Upload the zip at wordpress.org/themes/upload (first time and every update:
//      themes have no SVN; a higher version replaces the previous one).
//   5. «Tested up to» in readme.txt AND style.css follows the newest WordPress tested.
//
// Pitfalls (29-10-2026):
// - The Playground CLI is PINNED here (CLI_VERSION), unlike tests/server.mjs
//   (@latest): on a release day @latest installs the new CLI mid-run. It is the
//   plugin's tests/run.mjs version; move both together.
// - Theme Check only loads its checks on its admin screen: tools/wporg/theme-check.php
//   requires checkbase.php and calls it directly, writing to a mounted /out.
// - The screenshot is taken WITHOUT the plugin: it also proves the theme works alone.
// - On Windows a killed server leaves its children alive: taskkill /T.

import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const SLUG = "estrategia-web";
const CLI_VERSION = "3.1.61";
const CLI_DIR = path.join(ROOT, "tools", ".cache", `playground-cli-${CLI_VERSION}`);
const CLI = path.join(CLI_DIR, "node_modules", "@wp-playground", "cli", "wp-playground.js");
const WP = "7.1";

const git = (...args) => {
  const r = spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
  return r.stdout;
};

function version() {
  const css = git("show", "HEAD:style.css");
  const v = (css.match(/^Version:\s*(\S+)/m) || [])[1];
  if (!v) throw new Error("no Version: in style.css (committed)");
  if (!git("show", "HEAD:readme.txt").includes(`\n= ${v} =\n`)) throw new Error(`readme.txt has no changelog entry «= ${v} =»`);
  return v;
}

/** HEAD as a tar, with the same export-ignore rules as the zip (GNU tar cannot read zips). */
function tarOfHead() {
  const r = spawnSync("git", ["-C", ROOT, "archive", "--format=tar", `--prefix=${SLUG}/`, "HEAD"], { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`git archive: ${r.stderr}`);
  return r.stdout;
}

function zip() {
  const v = version();
  const dirty = git("status", "--porcelain", "--untracked-files=no").trim();
  if (dirty) console.log(`⚠ uncommitted changes are NOT in the zip (it packs HEAD):\n${dirty}`);
  fs.mkdirSync(DIST, { recursive: true });
  const file = path.join(DIST, `${SLUG}-${v}.zip`);
  git("archive", "--format=zip", `--prefix=${SLUG}/`, "-o", file, "HEAD");
  const t = spawnSync("tar", ["-t"], { input: tarOfHead(), encoding: "utf8" });
  const entries = (t.stdout || "").split("\n").filter((e) => e && !e.endsWith("/"));
  if (t.status !== 0 || !entries.length) throw new Error(`could not list the package: ${t.stderr}`);
  const dev = entries.filter((e) => /^estrategia-web\/(tests|tools)\/|^estrategia-web\/README\.md$/.test(e));
  if (dev.length) throw new Error(`development files in the zip (missing export-ignore?):\n  ${dev.slice(0, 10).join("\n  ")}`);
  for (const must of ["style.css", "readme.txt", "theme.json", "templates/index.html", "screenshot.png"]) {
    if (!entries.includes(`${SLUG}/${must}`)) throw new Error(`${must} is missing from the zip (WordPress.org requires it)`);
  }
  console.log(`✔ ${path.relative(ROOT, file)} — ${v}, ${entries.length} files, ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
  return file;
}

function ensureCli() {
  if (fs.existsSync(CLI)) return;
  console.log(`· installing @wp-playground/cli@${CLI_VERSION} into tools/.cache (once)`);
  const r = spawnSync("npm", ["install", "--prefix", CLI_DIR, "--no-save", "--no-audit", "--no-fund", `@wp-playground/cli@${CLI_VERSION}`], { shell: true, stdio: "inherit" });
  if (r.status !== 0 || !fs.existsSync(CLI)) throw new Error("could not install the Playground CLI");
}

function check() {
  zip();
  ensureCli();
  const work = path.join(DIST, ".check");
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(path.join(work, "out"), { recursive: true });
  const t = spawnSync("tar", ["-x"], { cwd: work, input: tarOfHead(), encoding: "utf8" });
  if (t.status !== 0) throw new Error(`could not extract the package: ${t.stderr}`);
  fs.copyFileSync(path.join(ROOT, "tools", "wporg", "theme-check.php"), path.join(work, "out", "runner.php"));
  fs.writeFileSync(path.join(work, "blueprint.json"), JSON.stringify({
    preferredVersions: { php: "8.3", wp: WP },
    steps: [
      { step: "installPlugin", pluginData: { resource: "wordpress.org/plugins", slug: "theme-check" } },
      { step: "runPHP", code: "<?php require '/out/runner.php';" },
    ],
  }, null, 2));
  console.log(`· Theme Check on WordPress ${WP} in Playground…`);
  const r = spawnSync(process.execPath, [CLI, "run-blueprint", `--wp=${WP}`, `--blueprint=${path.join(work, "blueprint.json")}`,
    "--mount-dir", path.join(work, SLUG), `/wordpress/wp-content/themes/${SLUG}`,
    "--mount-dir", path.join(work, "out"), "/out"], { encoding: "utf8", timeout: 600_000 });
  const resultFile = path.join(work, "out", "result.json");
  if (r.status !== 0 || !fs.existsSync(resultFile)) throw new Error(`Playground failed:\n${(r.stdout || "") + (r.stderr || "")}`);
  const res = JSON.parse(fs.readFileSync(resultFile, "utf8"));
  if (res.exception) throw new Error(`Theme Check threw: ${res.exception} (${res.at})`);
  for (const m of res) console.log(`- ${m.msg.replace(/\s+/g, " ")}`);
  const required = res.filter((m) => /^REQUIRED/.test(m.msg)).length;
  console.log(`\n${res.length} messages, ${required} REQUIRED`);
  process.exit(required ? 1 : 0);
}

async function screenshot() {
  ensureCli();
  const { chromium } = createRequire("E:/Repositories/portal-hs/package.json")("playwright");
  const work = path.join(DIST, ".shot");
  fs.mkdirSync(work, { recursive: true });
  const bp = path.join(work, "blueprint.json");
  fs.writeFileSync(bp, JSON.stringify({ preferredVersions: { php: "8.3", wp: WP }, steps: [{ step: "runPHP", code: "<?php require '/shot/demo.php';" }] }));
  const PORT = 9561;
  const srv = spawn(process.execPath, [CLI, "server", `--port=${PORT}`, `--wp=${WP}`, `--blueprint=${bp}`,
    "--mount-dir", ROOT, `/wordpress/wp-content/themes/${SLUG}`,
    "--mount-dir", path.join(ROOT, "tools", "wporg"), "/shot", "--login"], { stdio: ["ignore", "pipe", "pipe"] });
  const kill = () => (process.platform === "win32" ? spawnSync("taskkill", ["/pid", String(srv.pid), "/T", "/F"], { stdio: "ignore" }) : srv.kill());
  let log = "";
  try {
    await new Promise((ok, ko) => {
      const timer = setTimeout(() => ko(new Error(`no «Ready!» in 300 s\n${log}`)), 300_000);
      const on = (d) => { log += d; if (/Ready!/.test(log)) { clearTimeout(timer); ok(); } };
      srv.stdout.on("data", on);
      srv.stderr.on("data", on);
      srv.on("exit", (c) => ko(new Error(`server exited ${c}\n${log}`)));
    });
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "networkidle" });
    // The admin bar is from --login, not from the theme.
    await page.evaluate(() => { document.getElementById("wpadminbar")?.remove(); document.documentElement.style.marginTop = "0"; });
    await page.screenshot({ path: path.join(ROOT, "screenshot.png") });
    await browser.close();
    if (errors.length) throw new Error(`page errors: ${errors.join(" | ")}`);
    console.log("✔ screenshot.png (1200x900): look at it before committing");
  } finally {
    kill();
  }
}

const cmd = process.argv[2];
try {
  if (cmd === "zip") zip();
  else if (cmd === "check") check();
  else if (cmd === "screenshot") await screenshot();
  else {
    console.log("node tools/wporg.mjs zip | check | screenshot");
    process.exit(1);
  }
} catch (e) {
  console.error(`✖ ${e.message}`);
  process.exit(1);
}
