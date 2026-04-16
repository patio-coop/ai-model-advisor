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

function enableFullScreen() {
  process.stdout.write('\x1b[?1049h');
  process.stdout.write('\x1b[?7l');
  process.stdout.write('\x1b[2J');
  process.stdout.write('\x1b[1;1H');
}

function disableFullScreen() {
  process.stdout.write('\x1b[?1049l');
  process.stdout.write('\x1b[?7h');
  process.stdout.write('\x1b[2J');
  process.stdout.write('\x1b[1;1H');
}

function printHelp() {
  console.log(`
  OSAI - open source AI kit

  Find and deploy the right open LLM for your stack.

  Usage
    $ osaikit                          Interactive wizard
    $ osaikit --repo <path>            Auto-detect and recommend
    $ osaikit run local                Deploy locally via ollama
    $ osaikit run local --repo <path>  Analyze repo + deploy locally
    $ osaikit refresh                  Refetch all leaderboard data
    $ osaikit list                     Browse and filter models

  Options
    --help, -h       Show this help message
    --version, -v    Show version number
    --repo <path>    Analyze a repository
    --model <id>     Use a specific model (with run local)

  Commands
    run local        Recommend + install + serve via ollama
    refresh          Refetch leaderboard data and update local cache
    list             Browse and filter the model database

  List options
    --family <name>  Filter by model family (e.g., Qwen3, Llama4)
    --legacy         Include legacy/superseded models
    --on-device      Show only on-device capable models
    --json           Output as JSON

  Examples
    $ osaikit
    $ osaikit --repo .
    $ osaikit run local --repo .
    $ osaikit run local --model qwen3-8b
    $ osaikit list --on-device
    $ osaikit list --family Qwen3
    $ osaikit refresh
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

function parseFlag(args, flag, defaultValue = null) {
  const idx = args.indexOf(flag);
  if (idx === -1) return null;
  const next = args[idx + 1];
  // If next arg is missing or is another flag, use the default
  if (!next || next.startsWith('-')) return defaultValue;
  return next;
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

// ── Command router ──────────────────────────────────────────────────────

const COMMANDS = {
  run: async (args) => {
    if (args[0] === 'local') {
      const { runLocal } = await import('./run.js');
      await runLocal({
        repo: parseFlag(args, '--repo'),
        model: parseFlag(args, '--model'),
      });
    } else if (args[0] === 'production') {
      console.log('\n  run production is not yet implemented. See: osaikit --help\n');
    } else {
      console.error(`\n  Unknown run target: "${args[0]}". Try: osaikit run local\n`);
      process.exit(1);
    }
  },

  refresh: async (_args) => {
    const { runRefresh } = await import('./commands/refresh.js');
    await runRefresh();
  },

  list: async (args) => {
    const { runList } = await import('./commands/list.js');
    await runList({
      family: parseFlag(args, '--family'),
      legacy: args.includes('--legacy'),
      onDevice: args.includes('--on-device'),
      json: args.includes('--json'),
    });
  },
};

// Dispatch command
const cmd = COMMANDS[args[0]];
if (cmd) {
  await cmd(args.slice(1));
  process.exit(0);
}

// ── Default: launch TUI wizard ──────────────────────────────────────────

// Check for --repo flag
const repoPath = parseFlag(args, '--repo', '.');
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

enableFullScreen();

const { waitUntilExit } = render(React.createElement(App, { repoData }));

process.on('exit', () => {
  disableFullScreen();
});

await waitUntilExit();
