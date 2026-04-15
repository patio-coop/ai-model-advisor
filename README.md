# OSAI — Open-Source AI Compass

Interactive CLI that recommends the best open-source LLM for your stack, hardware, and use case. Point it at a repo and get model recommendations with copy-paste setup commands — no API keys required.

```
  ___  ____    _    ___
 / _ \/ ___|  / \  |_ _|
| | | \___ \ / _ \  | |
| |_| |___) / ___ \ | |
 \___/|____/_/   \_\___|
```

## Quick start

```bash
# Analyze a repo and get instant recommendations
npx osai --repo .

# Or run the interactive wizard
npx osai
```

## What it does

Scores 32 open-source models across seven weighted dimensions to find the best fit for your project. Two modes:

### `--repo <path>` — Auto-detect mode

Point at any local repo. The analyzer scans your codebase and auto-detects languages, frameworks, runtime, platform, and project size — then skips straight to recommendations.

```bash
osai --repo .
osai --repo ~/projects/my-api
```

### Interactive wizard

Answer six quick questions about your development environment:

1. **Role** — web, backend, mobile, or game development
2. **Tech stack** — languages, frameworks, runtime, platform
3. **Constraints** — memory limit, budget, deployment mode, privacy
4. **Use cases** — code generation, debugging, architecture, review, docs, testing
5. **License** — permissive, copyleft, or any
6. **Context** — codebase size and whether it's an existing project

### What you get

- **Primary recommendation** with score breakdown across 7 dimensions
- **Quick start commands** — copy-paste `ollama run`, vLLM Docker, llama.cpp, HuggingFace TGI, or LM Studio setup
- **License guidance** — commercial use, fine-tuning rights, output ownership, training data provenance, and action items
- **Integration snippet** — framework-specific code to wire the model into your stack (Express, FastAPI, Gin, Axum, etc.)
- **Fallback model** from a different family
- **On-device option** for local/offline use
- **Enterprise readiness score** — managed hosting providers, SLA availability, SDK quality, community size
- Tuned inference config (temperature, top-p, max tokens)
- Starter prompt template for your use case
- Cost and latency estimates (local vs. cloud)
- RAG recommendation when your context exceeds the model's window
- Warnings about license, age, memory, and latency tradeoffs

## Install

```bash
npx osai
```

Or install globally:

```bash
npm install -g osai
osai
```

## Development

```bash
git clone https://github.com/patio-coop/osai.git
cd osai
npm install
npm run dev    # build + run
npm test       # run tests
```

## How scoring works

Models are first filtered by hard constraints (license, RAM, privacy, budget, deployment). Remaining candidates are scored across seven dimensions:

| Dimension | Weight | What it measures |
|-----------|--------|------------------|
| Capability fit | 3.0x | Strength/weakness match to your role and use cases |
| Context match | 2.0x | Context window vs. your codebase size needs |
| Benchmarks | 2.0x | HumanEval, SWE-bench, Aider polyglot scores |
| Compute footprint | 1.5x | Latency, on-device viability, budget fit |
| Ecosystem | 1.0x | Tooling support (Ollama, llama.cpp, vLLM, etc.) |
| Enterprise readiness | 0.75x | Managed hosting, SLA, VPC, SDK quality, community, docs |
| Fine-tuning | 0.5x | LoRA/adapter support, fine-tunability |

Live leaderboard data from HuggingFace, SWE-bench, and Aider is fetched in parallel to enrich results — but the tool works fully offline using its built-in model database.

## Architecture

```
src/
├── cli.js                 # Entry point, flag parsing (--repo, --help, --version)
├── app.js                 # State machine (welcome → wizard → loading → results)
├── theme.js               # OSAI design system tokens
├── analyzer/
│   └── repo.js            # Repository scanner (languages, frameworks, runtime)
├── components/
│   ├── wizard.js          # 6-step questionnaire flow
│   ├── steps.js           # Individual step components
│   ├── loading.js         # Loading screen with per-source status
│   └── results.js         # Recommendation display (12 sections)
├── engine/
│   ├── models.js          # Database of 32 open LLMs with enterprise metadata
│   ├── rules.js           # Scoring engine (7 dimensions), prompt templates, costs
│   ├── quickstart.js      # Copy-paste run commands per ecosystem tool
│   ├── licensing.js       # License guidance and risk assessment
│   └── integration.js     # Framework-specific integration code snippets
└── api/
    ├── index.js           # Parallel fetcher + fuzzy model matching
    ├── huggingface.js     # HuggingFace API client
    ├── swebench.js        # SWE-bench leaderboard scraper
    └── aider.js           # Aider leaderboard scraper
```

## Tech stack

- [Ink](https://github.com/vadimdemedes/ink) + React — terminal UI framework
- [esbuild](https://esbuild.github.io/) — bundler
- Node.js built-in `fetch` — zero HTTP dependencies

## License

MIT
