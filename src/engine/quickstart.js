/**
 * Quick Start snippet generator — produces copy-paste commands
 * to run a recommended model with various ecosystem tools.
 */

// ── Ecosystem ID mapping ────────────────────────────────────────────
// Maps model IDs to their canonical identifiers in each ecosystem.
// Naming is inconsistent across Ollama, HuggingFace, and GGUF repos,
// so explicit mapping is the only reliable approach.

const ECOSYSTEM_IDS = {
  "deepseek-coder-v2-16b": {
    ollama: "deepseek-coder-v2:16b",
    huggingface: "deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct",
    gguf: "deepseek-coder-v2-lite-instruct",
  },
  "deepseek-coder-v2-236b": {
    huggingface: "deepseek-ai/DeepSeek-Coder-V2-Instruct",
  },
  "deepseek-v3": {
    huggingface: "deepseek-ai/DeepSeek-V3",
  },
  "codellama-7b": {
    ollama: "codellama:7b-instruct",
    huggingface: "codellama/CodeLlama-7b-Instruct-hf",
    gguf: "codellama-7b-instruct",
  },
  "codellama-13b": {
    ollama: "codellama:13b-instruct",
    huggingface: "codellama/CodeLlama-13b-Instruct-hf",
    gguf: "codellama-13b-instruct",
  },
  "codellama-34b": {
    ollama: "codellama:34b-instruct",
    huggingface: "codellama/CodeLlama-34b-Instruct-hf",
    gguf: "codellama-34b-instruct",
  },
  "codellama-70b": {
    ollama: "codellama:70b-instruct",
    huggingface: "codellama/CodeLlama-70b-Instruct-hf",
    gguf: "codellama-70b-instruct",
  },
  "starcoder2-3b": {
    ollama: "starcoder2:3b",
    huggingface: "bigcode/starcoder2-3b",
    gguf: "starcoder2-3b",
  },
  "starcoder2-7b": {
    ollama: "starcoder2:7b",
    huggingface: "bigcode/starcoder2-7b",
    gguf: "starcoder2-7b",
  },
  "starcoder2-15b": {
    ollama: "starcoder2:15b",
    huggingface: "bigcode/starcoder2-15b",
    gguf: "starcoder2-15b",
  },
  "llama-3.1-8b": {
    ollama: "llama3.1:8b",
    huggingface: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    gguf: "meta-llama-3.1-8b-instruct",
  },
  "llama-3.1-70b": {
    ollama: "llama3.1:70b",
    huggingface: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    gguf: "meta-llama-3.1-70b-instruct",
  },
  "llama-3.1-405b": {
    huggingface: "meta-llama/Meta-Llama-3.1-405B-Instruct",
  },
  "llama-3.2-1b": {
    ollama: "llama3.2:1b",
    huggingface: "meta-llama/Llama-3.2-1B-Instruct",
    gguf: "llama-3.2-1b-instruct",
  },
  "llama-3.2-3b": {
    ollama: "llama3.2:3b",
    huggingface: "meta-llama/Llama-3.2-3B-Instruct",
    gguf: "llama-3.2-3b-instruct",
  },
  "mistral-7b": {
    ollama: "mistral:7b-instruct",
    huggingface: "mistralai/Mistral-7B-Instruct-v0.3",
    gguf: "mistral-7b-instruct-v0.3",
  },
  "mixtral-8x7b": {
    ollama: "mixtral:8x7b-instruct",
    huggingface: "mistralai/Mixtral-8x7B-Instruct-v0.1",
    gguf: "mixtral-8x7b-instruct-v0.1",
  },
  "mixtral-8x22b": {
    huggingface: "mistralai/Mixtral-8x22B-Instruct-v0.1",
  },
  "codegemma-2b": {
    ollama: "codegemma:2b",
    huggingface: "google/codegemma-2b",
    gguf: "codegemma-2b",
  },
  "codegemma-7b": {
    ollama: "codegemma:7b-instruct",
    huggingface: "google/codegemma-7b-it",
    gguf: "codegemma-7b-it",
  },
  "qwen2.5-coder-1.5b": {
    ollama: "qwen2.5-coder:1.5b",
    huggingface: "Qwen/Qwen2.5-Coder-1.5B-Instruct",
    gguf: "qwen2.5-coder-1.5b-instruct",
  },
  "qwen2.5-coder-7b": {
    ollama: "qwen2.5-coder:7b",
    huggingface: "Qwen/Qwen2.5-Coder-7B-Instruct",
    gguf: "qwen2.5-coder-7b-instruct",
  },
  "qwen2.5-coder-14b": {
    ollama: "qwen2.5-coder:14b",
    huggingface: "Qwen/Qwen2.5-Coder-14B-Instruct",
    gguf: "qwen2.5-coder-14b-instruct",
  },
  "qwen2.5-coder-32b": {
    ollama: "qwen2.5-coder:32b",
    huggingface: "Qwen/Qwen2.5-Coder-32B-Instruct",
    gguf: "qwen2.5-coder-32b-instruct",
  },
  "phi-3-mini": {
    ollama: "phi3:mini",
    huggingface: "microsoft/Phi-3-mini-128k-instruct",
    gguf: "phi-3-mini-128k-instruct",
  },
  "phi-3-medium": {
    ollama: "phi3:medium",
    huggingface: "microsoft/Phi-3-medium-128k-instruct",
    gguf: "phi-3-medium-128k-instruct",
  },
  "wizardcoder-15b": {
    ollama: "wizardcoder:15b",
    huggingface: "WizardLM/WizardCoder-15B-V1.0",
    gguf: "wizardcoder-15b-v1.0",
  },
  "wizardcoder-33b": {
    ollama: "wizardcoder:33b",
    huggingface: "WizardLM/WizardCoder-33B-V1.1",
    gguf: "wizardcoder-33b-v1.1",
  },
  "granite-code-3b": {
    ollama: "granite-code:3b",
    huggingface: "ibm-granite/granite-3b-code-instruct",
    gguf: "granite-3b-code-instruct",
  },
  "granite-code-8b": {
    ollama: "granite-code:8b",
    huggingface: "ibm-granite/granite-8b-code-instruct",
    gguf: "granite-8b-code-instruct",
  },
  "granite-code-20b": {
    ollama: "granite-code:20b",
    huggingface: "ibm-granite/granite-20b-code-instruct",
    gguf: "granite-20b-code-instruct",
  },
  "granite-code-34b": {
    ollama: "granite-code:34b",
    huggingface: "ibm-granite/granite-34b-code-instruct",
    gguf: "granite-34b-code-instruct",
  },
};

// ── Command generators per ecosystem tool ───────────────────────────

function ollamaCmd(tag) {
  return `ollama run ${tag}`;
}

function llamaCppCmd(gguf) {
  return `llama-server -m ${gguf}-Q4_K_M.gguf -c 4096 --port 8080`;
}

function vllmCmd(hfRepo) {
  return `docker run --gpus all -p 8000:8000 vllm/vllm-openai:latest --model ${hfRepo}`;
}

function huggingfaceCmd(hfRepo) {
  return `docker run --gpus all -p 8080:80 ghcr.io/huggingface/text-generation-inference:latest --model-id ${hfRepo}`;
}

function lmStudioCmd(modelName) {
  return `# Open LM Studio and search for "${modelName}" in the model browser`;
}

// ── Main generator ──────────────────────────────────────────────────

export { ECOSYSTEM_IDS };

export function generateQuickStart(model, deploymentOption) {
  const ids = ECOSYSTEM_IDS[model.id] || {};
  const commands = {};

  // Generate commands for each ecosystem tool the model supports
  for (const tool of model.ecosystem) {
    switch (tool) {
      case "ollama":
        if (ids.ollama) commands.ollama = ollamaCmd(ids.ollama);
        break;
      case "llama.cpp":
        if (ids.gguf) commands["llama.cpp"] = llamaCppCmd(ids.gguf);
        break;
      case "vllm":
        if (ids.huggingface) commands.vllm = vllmCmd(ids.huggingface);
        break;
      case "huggingface":
        if (ids.huggingface) commands.huggingface = huggingfaceCmd(ids.huggingface);
        break;
      case "lm-studio":
        commands["lm-studio"] = lmStudioCmd(model.name);
        break;
    }
  }

  // Pick recommended tool based on deployment option
  let recommended;
  if (deploymentOption === "local") {
    // Prefer ollama for local (simplest), then llama.cpp, then lm-studio
    recommended = ids.ollama ? "ollama" : ids.gguf ? "llama.cpp" : "lm-studio";
  } else if (deploymentOption === "cloud") {
    // Prefer vllm for cloud (production-grade), then huggingface TGI
    recommended = ids.huggingface ? "vllm" : "huggingface";
  } else {
    // Hybrid: ollama for dev, vllm for prod
    recommended = ids.ollama ? "ollama" : "vllm";
  }

  return { recommended, commands };
}
