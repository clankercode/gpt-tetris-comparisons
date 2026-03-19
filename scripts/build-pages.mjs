import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, "docs");

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: false,
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed in ${cwd} with exit code ${code ?? "unknown"}`));
    });

    child.on("error", reject);
  });
}

async function discoverSites() {
  const entries = await readdir(repoRoot, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("gpt-"))
    .map((entry) => entry.name)
    .sort();

  const sites = [];

  for (const dir of dirs) {
    const packageJsonPath = path.join(repoRoot, dir, "package.json");
    const indexHtmlPath = path.join(repoRoot, dir, "index.html");

    if (!(await exists(packageJsonPath)) || !(await exists(indexHtmlPath))) {
      continue;
    }

    const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
    sites.push({
      dir,
      title: pkg.name || dir,
    });
  }

  return sites;
}

async function ensureDependencies(siteDir) {
  const nodeModulesDir = path.join(siteDir, "node_modules");
  if (await exists(nodeModulesDir)) {
    return;
  }

  const bunLock = path.join(siteDir, "bun.lock");
  const args = ["install"];
  if (await exists(bunLock)) {
    args.push("--frozen-lockfile");
  }

  await run("bun", args, siteDir);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderLandingPage(sites) {
  const cards = sites
    .map(
      (site) => `        <a class="card" href="./${site.dir}/">
          <span class="eyebrow">${escapeHtml(site.title)}</span>
          <strong>${escapeHtml(site.dir)}</strong>
          <span>Open the ${escapeHtml(site.dir)} generation</span>
        </a>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Model Compare Tetris</title>
    <style>
      :root {
        --paper: #f6efe2;
        --ink: #181512;
        --muted: #65584b;
        --panel: rgba(255, 250, 241, 0.82);
        --line: rgba(24, 21, 18, 0.14);
        --accent: #d35b2b;
        --accent-2: #1f6c5c;
        --shadow: 0 24px 80px rgba(50, 34, 18, 0.18);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(211, 91, 43, 0.26), transparent 28%),
          radial-gradient(circle at 85% 15%, rgba(31, 108, 92, 0.22), transparent 22%),
          linear-gradient(135deg, #f8f1e4 0%, #ead8bc 100%);
        font-family: Georgia, "Times New Roman", serif;
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: 0.18;
        background-image:
          linear-gradient(rgba(24, 21, 18, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(24, 21, 18, 0.08) 1px, transparent 1px);
        background-size: 22px 22px;
        mask-image: radial-gradient(circle at center, black 40%, transparent 85%);
      }

      main {
        width: min(1100px, calc(100% - 32px));
        margin: 0 auto;
        padding: 48px 0 72px;
      }

      .hero {
        padding: 28px;
        border: 1px solid var(--line);
        background: var(--panel);
        backdrop-filter: blur(18px);
        box-shadow: var(--shadow);
      }

      .kicker {
        display: inline-block;
        margin-bottom: 16px;
        padding: 7px 12px;
        border: 1px solid var(--line);
        border-radius: 999px;
        font-size: 12px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent-2);
      }

      h1 {
        margin: 0;
        max-width: 10ch;
        font-size: clamp(3rem, 9vw, 6.4rem);
        line-height: 0.93;
        text-transform: uppercase;
      }

      .intro {
        max-width: 62ch;
        margin: 18px 0 0;
        font-size: 1.08rem;
        line-height: 1.7;
        color: var(--muted);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 18px;
        margin-top: 28px;
      }

      .card {
        display: grid;
        gap: 10px;
        min-height: 170px;
        padding: 22px;
        border: 1px solid var(--line);
        color: inherit;
        text-decoration: none;
        background: rgba(255, 252, 246, 0.78);
        box-shadow: 0 12px 30px rgba(52, 34, 17, 0.08);
        transition:
          transform 180ms ease,
          box-shadow 180ms ease,
          border-color 180ms ease;
      }

      .card:hover,
      .card:focus-visible {
        transform: translateY(-4px) rotate(-0.4deg);
        border-color: rgba(211, 91, 43, 0.45);
        box-shadow: 0 18px 32px rgba(52, 34, 17, 0.14);
        outline: none;
      }

      .eyebrow {
        font-size: 0.72rem;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: var(--accent);
      }

      strong {
        font-size: 1.55rem;
      }

      footer {
        margin-top: 18px;
        color: var(--muted);
        font-size: 0.92rem;
      }

      @media (max-width: 640px) {
        main {
          width: min(100% - 20px, 1100px);
          padding-top: 20px;
        }

        .hero {
          padding: 22px;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <span class="kicker">GitHub Pages Showcase</span>
        <h1>Model Compare Tetris</h1>
        <p class="intro">
          Each card opens a different Tetris generation built from the same prompt in a different GPT family.
          Every demo is published in its own subdirectory so the deployed URL stays aligned with the folder name in this repository.
        </p>
      </section>

      <section class="grid">
${cards}
      </section>

      <footer>
        The empty <code>gpt-53</code> folder is intentionally skipped because it does not contain a buildable site.
      </footer>
    </main>
  </body>
</html>
`;
}

async function main() {
  const sites = await discoverSites();
  if (sites.length === 0) {
    throw new Error("No buildable site folders were found.");
  }

  await rm(docsDir, { recursive: true, force: true });
  await mkdir(docsDir, { recursive: true });

  await writeFile(path.join(repoRoot, "index.html"), renderLandingPage(sites));
  await writeFile(path.join(docsDir, "index.html"), renderLandingPage(sites));
  await writeFile(path.join(docsDir, ".nojekyll"), "");

  for (const site of sites) {
    const siteDir = path.join(repoRoot, site.dir);
    await ensureDependencies(siteDir);
    await run("bun", ["run", "build"], siteDir);

    const distDir = path.join(siteDir, "dist");
    if (!(await exists(distDir))) {
      throw new Error(`Expected build output at ${distDir}`);
    }

    await cp(distDir, path.join(docsDir, site.dir), { recursive: true });
  }
}

await main();
