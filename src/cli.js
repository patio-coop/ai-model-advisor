/**
 * OSAI — CLI entry point.
 * Renders the interactive TUI with ink.
 */

import { render } from 'ink';
import React from 'react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function printHelp() {
  console.log(`
  OSAI — open-source AI compass

  Find and deploy the right open LLM for your stack.

  Usage
    $ osai
    $ osai --repo <path>

  Options
    --help, -h       Show this help message
    --version, -v    Show version number
    --repo <path>    Analyze a repository and recommend models
                     (skips interactive wizard)

  Description
    Interactive CLI that recommends the best open-source LLM based on
    your use case, hardware, and requirements. Fetches live data from
    HuggingFace, SWE-bench, and Aider leaderboards.

    Use --repo to point at a local repo and get instant recommendations
    based on auto-detected languages, frameworks, and project size.

  Examples
    $ osai
    $ osai --repo .
    $ osai --repo ~/projects/my-app
    $ npx osai --repo /path/to/repo
`);
}

function printVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'));
    console.log(pkg.version);
  } catch {
    console.log('0.1.0');
  }
}

function parseFlag(args, flag) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}

// Parse flags
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  printHelp();
  process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
  printVersion();
  process.exit(0);
}

// Check for --repo flag
const repoPath = parseFlag(args, '--repo');
let repoData = null;

if (repoPath) {
  const { analyzeRepo } = await import('./analyzer/repo.js');
  try {
    repoData = analyzeRepo(resolve(repoPath));
  } catch (err) {
    console.error(`Error analyzing repo: ${err.message}`);
    process.exit(1);
  }
}

// Launch the TUI
const App = (await import('./app.js')).default;

const { waitUntilExit } = render(React.createElement(App, { repoData }));
await waitUntilExit();
