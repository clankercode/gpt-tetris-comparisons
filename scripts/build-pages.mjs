import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const docsDir = path.join(repoRoot, "docs");
const siteDirPrefixes = ["gemini-", "glm-", "gpt-", "minimax-", "opus-", "sonnet-"];
const nestedSiteDirs = ["tetris-clone"];

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
    .filter(
      (entry) => entry.isDirectory() && siteDirPrefixes.some((prefix) => entry.name.startsWith(prefix)),
    )
    .map((entry) => entry.name)
    .sort();

  const sites = [];

  for (const dir of dirs) {
    let appDir = path.join(repoRoot, dir);
    let packageJsonPath = path.join(appDir, "package.json");
    let indexHtmlPath = path.join(appDir, "index.html");

    if (!(await exists(packageJsonPath)) || !(await exists(indexHtmlPath))) {
      for (const nestedDir of nestedSiteDirs) {
        const candidateDir = path.join(appDir, nestedDir);
        const candidatePackageJsonPath = path.join(candidateDir, "package.json");
        const candidateIndexHtmlPath = path.join(candidateDir, "index.html");

        if ((await exists(candidatePackageJsonPath)) && (await exists(candidateIndexHtmlPath))) {
          appDir = candidateDir;
          packageJsonPath = candidatePackageJsonPath;
          indexHtmlPath = candidateIndexHtmlPath;
          break;
        }
      }
    }

    if (!(await exists(packageJsonPath)) || !(await exists(indexHtmlPath))) {
      continue;
    }

    const pkg = JSON.parse(await readFile(packageJsonPath, "utf8"));
    sites.push({
      appDir,
      dir,
      title: pkg.name || dir,
    });
  }

  return sites;
}

async function ensureDependencies(appDir) {
  const nodeModulesDir = path.join(appDir, "node_modules");
  if (await exists(nodeModulesDir)) {
    return;
  }

  const bunLock = path.join(appDir, "bun.lock");
  const args = ["install"];
  if (await exists(bunLock)) {
    args.push("--frozen-lockfile");
  }

  await run("bun", args, appDir);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const originalPrompt = [
  "Create a tetris clone with an immersive retro aesthetic.",
  "The game starts automatically at the main menu.",
  "Main menu entries are for new game options, settings, and about. The menu should show the controls somewhere.",
  "The game itself should play by classic tetris rules, with effects for clearing lines.",
  "The game should have some retro music suitable for tetris.",
  "For the tech stack, use bun, typescript, vite, and phaser.",
  "Use python to generate a random port number for the vite dev server.",
];

function getProviderInfo(dirName) {
  const providers = {
    "gpt-": { provider: "OpenAI", accent: "--openai" },
    "opus-": { provider: "Anthropic", accent: "--anthropic" },
    "sonnet-": { provider: "Anthropic", accent: "--anthropic" },
    "gemini-": { provider: "Google", accent: "--google" },
    "minimax-": { provider: "MiniMax", accent: "--minimax" },
    "glm-": { provider: "Zhipu AI", accent: "--zhipu" },
  };

  const displayNames = {
    "gemini-31": "Gemini 3.1 Pro",
    "glm-5": "GLM-5",
    "gpt-52": "GPT-5.2",
    "gpt-52-codex": "GPT-5.2 Codex",
    "gpt-53-codex": "GPT-5.3 Codex",
    "gpt-53-spark": "GPT-5.3 Codex Spark",
    "gpt-54": "GPT-5.4",
    "gpt-54-mini": "GPT-5.4 Mini",
    "minimax-25": "MiniMax 2.5",
    "opus-46": "Opus 4.6",
    "sonnet-46": "Sonnet 4.6",
  };

  for (const [prefix, info] of Object.entries(providers)) {
    if (dirName.startsWith(prefix)) {
      return {
        ...info,
        displayName: displayNames[dirName] || dirName,
      };
    }
  }

  return { provider: "Unknown", accent: "--openai", displayName: dirName };
}

function renderLandingPage(sites) {
  const cards = sites
    .map((site, i) => {
      const info = getProviderInfo(site.dir);
      const accentVar = `var(${info.accent})`;
      const glowVar = `var(${info.accent}-glow)`;
      const volumeWarning =
        site.dir === "sonnet-46" ? '\n          <span class="card-note">Volume Warning</span>' : "";
      return `        <a class="card" href="./${site.dir}/" style="--card-accent:${accentVar};--card-glow:${glowVar};--i:${i}">
          <span class="card-provider">${escapeHtml(info.provider)}</span>
          <strong class="card-model">${escapeHtml(info.displayName)}</strong>
          <span class="card-project">${escapeHtml(site.title)}</span>${volumeWarning}
          <span class="card-cta">Play this version &rarr;</span>
        </a>`;
    })
    .join("\n");

  const promptLines = originalPrompt
    .map((line) => `              <span><span class="prompt-chevron">&gt;</span> ${escapeHtml(line)}</span>`)
    .join("\n");

  const tetrominoPieces = [
    { cls: "piece-t", color: "var(--piece-t)", x: "8%", dur: "7.2s", delay: "0s", blocks: [[0,0],[16,0],[32,0],[16,16]] },
    { cls: "piece-i", color: "var(--piece-i)", x: "25%", dur: "6.1s", delay: "1.2s", blocks: [[0,0],[16,0],[32,0],[48,0]] },
    { cls: "piece-o", color: "var(--piece-o)", x: "45%", dur: "8s", delay: "0.5s", blocks: [[0,0],[16,0],[0,16],[16,16]] },
    { cls: "piece-s", color: "var(--piece-s)", x: "62%", dur: "5.8s", delay: "2.1s", blocks: [[16,0],[32,0],[0,16],[16,16]] },
    { cls: "piece-l", color: "var(--piece-l)", x: "78%", dur: "7s", delay: "0.8s", blocks: [[0,0],[0,16],[0,32],[16,32]] },
    { cls: "piece-z", color: "var(--piece-z)", x: "35%", dur: "6.5s", delay: "3s", blocks: [[0,0],[16,0],[16,16],[32,16]] },
    { cls: "piece-j", color: "var(--piece-j)", x: "90%", dur: "7.8s", delay: "1.8s", blocks: [[16,0],[16,16],[16,32],[0,32]] },
  ];

  const tetrisHtml = tetrominoPieces
    .map(
      (p) =>
        `            <div class="piece ${p.cls}" style="left:${p.x};--fall-dur:${p.dur};--fall-delay:${p.delay};--piece-color:${p.color}">\n` +
        p.blocks.map(([x, y]) => `              <div class="block" style="left:${x}px;top:${y}px"></div>`).join("\n") +
        "\n            </div>",
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0a0e17" />
    <title>Model Compare Tetris</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
    <style>
      :root {
        --bg-deep: #0a0e17;
        --bg-surface: #111827;
        --bg-elevated: #1a2236;
        --border: rgba(148, 163, 184, 0.12);
        --border-hover: rgba(148, 163, 184, 0.25);
        --text-primary: #f1f5f9;
        --text-secondary: #94a3b8;
        --text-tertiary: #64748b;

        --openai: #10a37f;
        --openai-glow: rgba(16, 163, 127, 0.15);
        --anthropic: #d97757;
        --anthropic-glow: rgba(217, 119, 87, 0.15);
        --google: #4285f4;
        --google-glow: rgba(66, 133, 244, 0.15);
        --minimax: #a855f7;
        --minimax-glow: rgba(168, 85, 247, 0.15);
        --zhipu: #e5a100;
        --zhipu-glow: rgba(229, 161, 0, 0.15);

        --piece-i: #06b6d4;
        --piece-o: #eab308;
        --piece-t: #a855f7;
        --piece-s: #22c55e;
        --piece-z: #ef4444;
        --piece-l: #f97316;
        --piece-j: #3b82f6;

        --radius: 8px;
        --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.3);
        --shadow-card-hover: 0 12px 40px rgba(0, 0, 0, 0.5);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        color: var(--text-primary);
        background: var(--bg-deep);
        background-image:
          radial-gradient(ellipse at 10% 0%, rgba(16, 163, 127, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 90% 5%, rgba(66, 133, 244, 0.07) 0%, transparent 45%),
          radial-gradient(ellipse at 50% 100%, rgba(168, 85, 247, 0.06) 0%, transparent 50%);
        font-family: "Inter", system-ui, -apple-system, sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      body::before {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(148, 163, 184, 0.03) 2px,
          rgba(148, 163, 184, 0.03) 4px
        );
        z-index: 9999;
      }

      body::after {
        content: "";
        position: fixed;
        inset: 0;
        pointer-events: none;
        opacity: 0.035;
        background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        background-size: 200px 200px;
        z-index: 9998;
      }

      main {
        width: min(1140px, calc(100% - 48px));
        margin: 0 auto;
        padding: 56px 0 80px;
      }

      /* ---- Hero ---- */
      .hero {
        display: grid;
        grid-template-columns: 1fr 200px;
        gap: 24px;
        padding: 36px 40px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: var(--bg-elevated);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        overflow: hidden;
        position: relative;
      }

      .hero-content {
        min-width: 0;
      }

      .kicker {
        display: inline-block;
        margin-bottom: 18px;
        padding: 6px 14px;
        border: 1px solid var(--border);
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--text-secondary);
      }

      h1 {
        margin: 0;
        font-size: clamp(2.4rem, 6vw, 4rem);
        font-weight: 600;
        line-height: 1.05;
        letter-spacing: -0.02em;
      }

      .highlight {
        background: linear-gradient(
          90deg,
          var(--piece-i),
          var(--piece-s),
          var(--piece-o),
          var(--piece-l),
          var(--piece-z),
          var(--piece-t),
          var(--piece-j),
          var(--piece-i)
        );
        background-size: 300% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gradientShift 8s ease infinite;
      }

      @keyframes gradientShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }

      .intro {
        max-width: 58ch;
        margin: 16px 0 0;
        font-size: 1rem;
        line-height: 1.7;
        color: var(--text-secondary);
      }

      .details {
        max-width: 64ch;
        margin: 16px 0 0;
        padding: 16px 20px;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: rgba(17, 24, 39, 0.6);
      }

      .details p {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.7;
        color: var(--text-secondary);
      }

      .details p + p {
        margin-top: 8px;
      }

      /* ---- Terminal Prompt ---- */
      .prompt-card {
        position: relative;
        margin: 24px 0 0;
        border: 1px solid var(--border);
        border-radius: var(--radius);
        background: #0d1117;
        overflow: hidden;
      }

      .terminal-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 16px;
        background: rgba(30, 41, 59, 0.6);
        border-bottom: 1px solid var(--border);
      }

      .terminal-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ef4444;
        box-shadow: 20px 0 0 #eab308, 40px 0 0 #22c55e;
      }

      .terminal-title {
        margin-left: 40px;
        font-family: "JetBrains Mono", monospace;
        font-size: 12px;
        color: var(--text-tertiary);
      }

      .prompt-card blockquote {
        margin: 0;
        padding: 20px 24px;
        display: grid;
        gap: 6px;
        font-family: "JetBrains Mono", monospace;
        font-size: 0.85rem;
        line-height: 1.7;
        color: #7dd3fc;
      }

      .prompt-card blockquote span {
        display: block;
        max-width: 72ch;
      }

      .prompt-chevron {
        color: var(--text-tertiary);
        user-select: none;
      }

      /* ---- Tetris Decoration ---- */
      .tetris-decoration {
        position: relative;
        overflow: hidden;
        min-height: 320px;
      }

      .piece {
        position: absolute;
        top: 0;
        opacity: 0.22;
        animation: fall var(--fall-dur, 7s) var(--fall-delay, 0s) linear infinite;
      }

      .block {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 2px;
        background: var(--piece-color);
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.15);
      }

      @keyframes fall {
        0% {
          transform: translateY(-80px) rotate(0deg);
          opacity: 0;
        }
        8% {
          opacity: 0.22;
        }
        88% {
          opacity: 0.22;
        }
        100% {
          transform: translateY(500px) rotate(35deg);
          opacity: 0;
        }
      }

      /* ---- Section Label ---- */
      .section-label {
        display: flex;
        align-items: center;
        gap: 20px;
        margin: 44px 0 32px;
        color: var(--text-tertiary);
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .section-label::before,
      .section-label::after {
        content: "";
        flex: 1;
        height: 1px;
        background: var(--border);
      }

      /* ---- Grid ---- */
      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      /* ---- Cards ---- */
      .card {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 22px 24px;
        border: 1px solid var(--border);
        border-left: 3px solid var(--card-accent, var(--text-tertiary));
        border-radius: var(--radius);
        color: inherit;
        text-decoration: none;
        background: var(--bg-surface);
        box-shadow: var(--shadow-card);
        transition:
          transform 200ms ease,
          box-shadow 200ms ease,
          border-color 200ms ease;
        overflow: hidden;
        animation: fadeInUp 0.4s ease both;
        animation-delay: calc(var(--i, 0) * 0.05s);
      }

      .card::after {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: var(--radius);
        background: var(--card-glow, transparent);
        opacity: 0;
        transition: opacity 200ms ease;
        pointer-events: none;
      }

      .card:hover,
      .card:focus-visible {
        transform: translateY(-3px);
        box-shadow: var(--shadow-card-hover);
        border-color: var(--card-accent, var(--border-hover));
        outline: none;
      }

      .card:hover::after,
      .card:focus-visible::after {
        opacity: 1;
      }

      .card:focus-visible {
        outline: 2px solid var(--card-accent, var(--text-tertiary));
        outline-offset: 2px;
      }

      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(16px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .card-provider {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--card-accent, var(--text-tertiary));
      }

      .card-model {
        font-size: 1.35rem;
        font-weight: 600;
        letter-spacing: -0.01em;
        color: var(--text-primary);
      }

      .card-project {
        font-family: "JetBrains Mono", monospace;
        font-size: 0.78rem;
        color: var(--text-tertiary);
        margin-top: 2px;
      }

      .card-note {
        display: inline-flex;
        width: fit-content;
        padding: 4px 10px;
        border: 1px solid rgba(234, 179, 8, 0.3);
        border-radius: 4px;
        background: rgba(234, 179, 8, 0.1);
        color: #eab308;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        margin-top: 4px;
      }

      .card-cta {
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--card-accent, var(--text-secondary));
        opacity: 0;
        transform: translateY(4px);
        transition:
          opacity 200ms ease,
          transform 200ms ease;
        margin-top: auto;
        padding-top: 6px;
      }

      .card:hover .card-cta,
      .card:focus-visible .card-cta {
        opacity: 1;
        transform: translateY(0);
      }

      /* ---- Footer ---- */
      .footer {
        margin-top: 56px;
        padding-top: 24px;
        border-top: 1px solid var(--border);
        text-align: center;
      }

      .footer p {
        margin: 0;
        font-size: 0.85rem;
        color: var(--text-tertiary);
      }

      .footer a {
        color: var(--text-secondary);
        text-decoration: underline;
        text-underline-offset: 3px;
        transition: color 150ms ease;
      }

      .footer a:hover {
        color: var(--text-primary);
      }

      /* ---- Responsive ---- */
      @media (max-width: 900px) {
        .grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .tetris-decoration {
          display: none;
        }

        .hero {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 560px) {
        main {
          width: min(100% - 24px, 1140px);
          padding: 28px 0 48px;
        }

        .hero {
          padding: 24px 20px;
        }

        .grid {
          grid-template-columns: 1fr;
        }

        .prompt-card blockquote {
          padding: 16px;
          font-size: 0.78rem;
        }

        h1 {
          font-size: 2rem;
        }
      }

      /* ---- Accessibility ---- */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    </style>
  </head>
  <body>
    <main id="top">
      <section class="hero">
        <div class="hero-content">
          <span class="kicker">AI Model Comparison</span>
          <h1>Model Compare <span class="highlight">Tetris</span></h1>
          <p class="intro">
            Each card opens a different Tetris generation built from the same prompt by a different AI model.
            Every demo is published in its own subdirectory so the deployed URL stays aligned with the folder name in this repository.
          </p>
          <div class="details">
            <p>
              The prompts were run in planning mode, and when the agent asked follow-up multiple-choice questions it generally took the first or recommended option.
            </p>
            <p>
              After that, each run was allowed to continue autonomously until completion.
            </p>
          </div>
          <div class="prompt-card">
            <div class="terminal-bar">
              <span class="terminal-dot"></span>
              <span class="terminal-title">prompt.md</span>
            </div>
            <blockquote>
${promptLines}
            </blockquote>
          </div>
        </div>
        <div class="tetris-decoration" aria-hidden="true">
${tetrisHtml}
        </div>
      </section>

      <div class="section-label">
        <span>${sites.length} Models, One Prompt</span>
      </div>

      <section class="grid">
${cards}
      </section>

      <footer class="footer">
        <p>Built with one prompt and many models. <a href="https://github.com/clankercode/gpt-tetris-comparisons">View source on GitHub</a></p>
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
    await ensureDependencies(site.appDir);
    await run("bun", ["run", "build"], site.appDir);

    const distDir = path.join(site.appDir, "dist");
    if (!(await exists(distDir))) {
      throw new Error(`Expected build output at ${distDir}`);
    }

    await cp(distDir, path.join(docsDir, site.dir), { recursive: true });
  }
}

await main();
