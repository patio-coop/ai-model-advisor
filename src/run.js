/**
 * osaikit run local — recommend a model, install via ollama, and verify it's serving.
 *
 * Flow:
 *   1. Analyze repo (--repo) or use provided model (--model)
 *   2. Run recommendation engine → pick best model
 *   3. Ensure ollama is installed
 *   4. Pull the model
 *   5. Verify the API is responding
 */

import { execSync, spawn } from 'node:child_process';
import { resolve } from 'node:path';

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

function log(msg) { console.log(`  ${msg}`); }
function step(n, msg) { console.log(`\n  ${GREEN}[${n}]${RESET} ${BOLD}${msg}${RESET}`); }
function dim(msg) { return `${DIM}${msg}${RESET}`; }

// ── Ollama detection ────────────────────────────────────────────────

function ollamaInstalled() {
  try {
    execSync('which ollama', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function ollamaRunning() {
  try {
    execSync('curl -sf http://localhost:11434/api/tags > /dev/null 2>&1', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function startOllama() {
  // Start ollama serve in background, detached
  const child = spawn('ollama', ['serve'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

async function waitForOllama(maxWaitMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    if (ollamaRunning()) return true;
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

function ollamaModelExists(tag) {
  try {
    const out = execSync('ollama list', { encoding: 'utf-8' });
    // ollama list output: NAME  ID  SIZE  MODIFIED
    return out.toLowerCase().includes(tag.split(':')[0]);
  } catch {
    return false;
  }
}

function pullModel(tag) {
  execSync(`ollama pull ${tag}`, { stdio: 'inherit' });
}

// ── API verification ────────────────────────────────────────────────

async function verifyApi(tag) {
  try {
    const resp = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: tag,
        messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
        max_tokens: 10,
      }),
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.choices && data.choices.length > 0;
  } catch {
    return false;
  }
}

// ── Main ────────────────────────────────────────────────────────────

export async function runLocal(args) {
  const { analyzeRepo } = await import('./analyzer/repo.js');
  const { recommend } = await import('./engine/rules.js');
  const { ECOSYSTEM_IDS } = await import('./engine/quickstart.js');

  console.log(`\n  ${GREEN}${BOLD}OSAI${RESET} ${DIM}— run local${RESET}\n`);

  // ── Step 1: Get recommendation ──────────────────────────────────

  const repoPath = args.repo;
  const explicitModel = args.model;
  let modelName, ollamaTag;

  if (explicitModel) {
    // User specified a model directly
    const ids = ECOSYSTEM_IDS[explicitModel];
    if (!ids || !ids.ollama) {
      console.error(`  ${RED}Error:${RESET} Model "${explicitModel}" not found or has no ollama support.`);
      console.error(`  ${DIM}Available models with ollama support:${RESET}`);
      for (const [id, mapping] of Object.entries(ECOSYSTEM_IDS)) {
        if (mapping.ollama) console.error(`    ${id} → ${mapping.ollama}`);
      }
      process.exit(1);
    }
    modelName = explicitModel;
    ollamaTag = ids.ollama;
    step(1, 'Model selected');
    log(`${modelName} → ${GREEN}${ollamaTag}${RESET}`);
  } else {
    step(1, 'Analyzing project');

    let inputs;
    if (repoPath) {
      const { inputs: repoInputs, analysis } = analyzeRepo(resolve(repoPath));
      inputs = repoInputs;
      // Force local deployment constraints
      inputs.constraints = { ...inputs.constraints, deployment: 'local' };
      log(`${dim('Path:')} ${resolve(repoPath)}`);
      log(`${dim('Languages:')} ${analysis.languages.map(l => l.name).join(', ')}`);
      log(`${dim('Frameworks:')} ${analysis.frameworks.join(', ') || 'none detected'}`);
      log(`${dim('Role:')} ${analysis.role}  ${dim('Platform:')} ${analysis.platform}`);
    } else {
      // Default: general-purpose local setup
      inputs = {
        role: 'backend',
        languages: ['javascript', 'python'],
        frameworks: [],
        runtime: 'node',
        platform: 'server',
        useCases: ['codegen', 'debug'],
        license: 'any',
        contextNeeds: 'medium',
        existingProject: true,
        constraints: { maxMemory: 'unlimited', budget: 'free', deployment: 'local', privacy: 'relaxed' },
      };
      log(`${dim('No --repo specified, using general-purpose defaults')}`);
    }

    const result = recommend(inputs);
    if (!result.primary) {
      console.error(`  ${RED}Error:${RESET} No matching model found for your constraints.`);
      process.exit(1);
    }

    const model = result.primary.model;
    const ids = ECOSYSTEM_IDS[model.id];
    if (!ids || !ids.ollama) {
      // Fallback: try on-device model
      const fallback = result.onDevice?.model;
      const fallbackIds = fallback ? ECOSYSTEM_IDS[fallback.id] : null;
      if (fallbackIds?.ollama) {
        modelName = fallback.name;
        ollamaTag = fallbackIds.ollama;
      } else {
        console.error(`  ${RED}Error:${RESET} Recommended model "${model.name}" has no ollama support.`);
        console.error(`  ${DIM}Try: osaikit run local --model <id>${RESET}`);
        process.exit(1);
      }
    } else {
      modelName = model.name;
      ollamaTag = ids.ollama;
    }

    log(`\n  ${dim('Recommended:')} ${BOLD}${modelName}${RESET}`);
    log(`${dim('Score:')} ${(result.primary.scoreBreakdown.finalScore * 100).toFixed(0)}%`);
    log(`${dim('Ollama tag:')} ${GREEN}${ollamaTag}${RESET}`);
  }

  // ── Step 2: Ensure ollama is installed ──────────────────────────

  step(2, 'Checking ollama');

  if (!ollamaInstalled()) {
    console.error(`  ${RED}Ollama is not installed.${RESET}\n`);
    console.error(`  Install it:`);
    console.error(`    ${BOLD}curl -fsSL https://ollama.com/install.sh | sh${RESET}   ${dim('(Linux)')}`);
    console.error(`    ${BOLD}brew install ollama${RESET}                              ${dim('(macOS)')}`);
    console.error(`    ${DIM}Or download from https://ollama.com/download${RESET}\n`);
    console.error(`  Then re-run: ${GREEN}osaikit run local${repoPath ? ` --repo ${repoPath}` : ''}${RESET}`);
    process.exit(1);
  }

  log(`${GREEN}✓${RESET} ollama installed`);

  // ── Step 3: Ensure ollama is running ────────────────────────────

  if (!ollamaRunning()) {
    log(`${dim('Starting ollama serve...')}`);
    startOllama();
    const ready = await waitForOllama();
    if (!ready) {
      console.error(`  ${RED}Failed to start ollama.${RESET} Try running ${BOLD}ollama serve${RESET} manually.`);
      process.exit(1);
    }
  }

  log(`${GREEN}✓${RESET} ollama running at ${dim('http://localhost:11434')}`);

  // ── Step 4: Pull the model ──────────────────────────────────────

  step(3, `Pulling ${ollamaTag}`);

  if (ollamaModelExists(ollamaTag)) {
    log(`${GREEN}✓${RESET} already downloaded`);
  } else {
    log(`${dim('This may take a few minutes on first run...')}`);
    try {
      pullModel(ollamaTag);
      log(`${GREEN}✓${RESET} downloaded`);
    } catch {
      console.error(`  ${RED}Failed to pull ${ollamaTag}.${RESET} Check your connection and try again.`);
      process.exit(1);
    }
  }

  // ── Step 5: Verify API ──────────────────────────────────────────

  step(4, 'Verifying API');

  const ok = await verifyApi(ollamaTag);
  if (ok) {
    log(`${GREEN}✓${RESET} model responding`);
  } else {
    log(`${YELLOW}⚠${RESET} could not verify response ${dim('(model may still be loading)')}`);
  }

  // ── Done ────────────────────────────────────────────────────────

  console.log(`\n  ${GREEN}${BOLD}Ready!${RESET}\n`);
  console.log(`  ${dim('Model:')}    ${BOLD}${modelName}${RESET} ${dim(`(${ollamaTag})`)}`);
  console.log(`  ${dim('API:')}      ${GREEN}http://localhost:11434/v1${RESET}`);
  console.log(`  ${dim('Chat:')}     ${BOLD}ollama run ${ollamaTag}${RESET}`);
  console.log(`  ${dim('Test it:')}`);
  console.log(`    curl http://localhost:11434/v1/chat/completions \\`);
  console.log(`      -H "Content-Type: application/json" \\`);
  console.log(`      -d '{"model":"${ollamaTag}","messages":[{"role":"user","content":"Hello"}]}'`);
  console.log();
}
