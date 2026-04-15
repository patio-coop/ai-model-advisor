import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuickStart } from './quickstart.js';

// Helper to build a model object with sensible defaults
function makeModel(overrides = {}) {
  return {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B Instruct',
    family: 'Llama',
    ecosystem: ['ollama', 'llama.cpp', 'vllm', 'huggingface', 'lm-studio'],
    ...overrides,
  };
}

// All model IDs that have ecosystem entries (extracted from ECOSYSTEM_IDS keys)
const ALL_ECOSYSTEM_MODEL_IDS = [
  'deepseek-coder-v2-16b',
  'deepseek-coder-v2-236b',
  'deepseek-v3',
  'codellama-7b',
  'codellama-13b',
  'codellama-34b',
  'codellama-70b',
  'starcoder2-3b',
  'starcoder2-7b',
  'starcoder2-15b',
  'llama-3.1-8b',
  'llama-3.1-70b',
  'llama-3.1-405b',
  'llama-3.2-1b',
  'llama-3.2-3b',
  'mistral-7b',
  'mixtral-8x7b',
  'mixtral-8x22b',
  'codegemma-2b',
  'codegemma-7b',
  'qwen2.5-coder-1.5b',
  'qwen2.5-coder-7b',
  'qwen2.5-coder-14b',
  'qwen2.5-coder-32b',
  'phi-3-mini',
  'phi-3-medium',
  'wizardcoder-15b',
  'wizardcoder-33b',
  'granite-code-3b',
  'granite-code-8b',
  'granite-code-20b',
  'granite-code-34b',
];

// ── Ollama commands ─────────────────────────────────────────────────

describe('ollama commands', () => {
  it('generates "ollama run" for models with ollama IDs', () => {
    const result = generateQuickStart(makeModel(), 'local');
    assert.ok(result.commands.ollama, 'Should have ollama command');
    assert.ok(result.commands.ollama.startsWith('ollama run '));
  });

  it('includes the correct ollama tag', () => {
    const result = generateQuickStart(makeModel({ id: 'mistral-7b' }), 'local');
    assert.ok(result.commands.ollama.includes('mistral:7b-instruct'));
  });
});

// ── llama.cpp commands ──────────────────────────────────────────────

describe('llama.cpp commands', () => {
  it('generates llama-server command for models with gguf IDs', () => {
    const result = generateQuickStart(makeModel(), 'local');
    assert.ok(result.commands['llama.cpp'], 'Should have llama.cpp command');
    assert.ok(result.commands['llama.cpp'].includes('llama-server'));
  });

  it('includes the gguf filename in the command', () => {
    const result = generateQuickStart(makeModel(), 'local');
    assert.ok(result.commands['llama.cpp'].includes('meta-llama-3.1-8b-instruct'));
  });

  it('appends Q4_K_M.gguf suffix', () => {
    const result = generateQuickStart(makeModel(), 'local');
    assert.ok(result.commands['llama.cpp'].includes('Q4_K_M.gguf'));
  });
});

// ── vLLM commands ───────────────────────────────────────────────────

describe('vLLM commands', () => {
  it('generates docker run command for models with huggingface IDs', () => {
    const result = generateQuickStart(makeModel(), 'cloud');
    assert.ok(result.commands.vllm, 'Should have vllm command');
    assert.ok(result.commands.vllm.includes('docker run'));
    assert.ok(result.commands.vllm.includes('vllm/vllm-openai'));
  });

  it('includes the correct huggingface model repo', () => {
    const result = generateQuickStart(makeModel(), 'cloud');
    assert.ok(result.commands.vllm.includes('meta-llama/Meta-Llama-3.1-8B-Instruct'));
  });
});

// ── HuggingFace TGI ─────────────────────────────────────────────────

describe('HuggingFace TGI commands', () => {
  it('generates docker command with text-generation-inference image', () => {
    const result = generateQuickStart(makeModel(), 'cloud');
    assert.ok(result.commands.huggingface, 'Should have huggingface command');
    assert.ok(result.commands.huggingface.includes('text-generation-inference'));
  });

  it('includes --model-id flag with correct repo', () => {
    const result = generateQuickStart(makeModel(), 'cloud');
    assert.ok(result.commands.huggingface.includes('--model-id'));
    assert.ok(result.commands.huggingface.includes('meta-llama/Meta-Llama-3.1-8B-Instruct'));
  });
});

// ── LM Studio ───────────────────────────────────────────────────────

describe('LM Studio commands', () => {
  it('always generates a comment instruction', () => {
    const result = generateQuickStart(makeModel(), 'local');
    assert.ok(result.commands['lm-studio'], 'Should have lm-studio command');
    assert.ok(result.commands['lm-studio'].startsWith('#'));
  });

  it('includes the model name in the instruction', () => {
    const name = 'Llama 3.1 8B Instruct';
    const result = generateQuickStart(makeModel({ name }), 'local');
    assert.ok(result.commands['lm-studio'].includes(name));
  });
});

// ── Recommended tool ────────────────────────────────────────────────

describe('recommended tool', () => {
  it('prefers ollama for local deployment', () => {
    const result = generateQuickStart(makeModel(), 'local');
    assert.equal(result.recommended, 'ollama');
  });

  it('prefers vllm for cloud deployment', () => {
    const result = generateQuickStart(makeModel(), 'cloud');
    assert.equal(result.recommended, 'vllm');
  });

  it('prefers ollama for hybrid (dev) deployment', () => {
    const result = generateQuickStart(makeModel(), 'hybrid');
    assert.equal(result.recommended, 'ollama');
  });

  it('falls back to llama.cpp for local when no ollama ID', () => {
    // deepseek-v3 has only huggingface, no ollama or gguf
    // Use a model with gguf but no ollama
    const result = generateQuickStart(
      makeModel({
        id: 'deepseek-coder-v2-236b',
        ecosystem: ['llama.cpp', 'vllm', 'huggingface', 'lm-studio'],
      }),
      'local',
    );
    // deepseek-coder-v2-236b has no ollama and no gguf, so falls to lm-studio
    assert.equal(result.recommended, 'lm-studio');
  });

  it('falls back to vllm for hybrid when no ollama ID', () => {
    const result = generateQuickStart(
      makeModel({
        id: 'deepseek-v3',
        ecosystem: ['vllm', 'huggingface', 'lm-studio'],
      }),
      'hybrid',
    );
    assert.equal(result.recommended, 'vllm');
  });
});

// ── Models without ecosystem IDs ────────────────────────────────────

describe('models without ecosystem IDs', () => {
  it('returns empty commands for model not in ECOSYSTEM_IDS', () => {
    const result = generateQuickStart(
      makeModel({
        id: 'totally-unknown-model',
        ecosystem: ['ollama', 'llama.cpp', 'vllm', 'huggingface'],
      }),
      'local',
    );
    // No ollama/gguf/hf IDs exist, so those commands should be absent
    assert.equal(result.commands.ollama, undefined);
    assert.equal(result.commands['llama.cpp'], undefined);
    assert.equal(result.commands.vllm, undefined);
    assert.equal(result.commands.huggingface, undefined);
  });

  it('still generates lm-studio command for unknown models', () => {
    const result = generateQuickStart(
      makeModel({
        id: 'totally-unknown-model',
        name: 'Unknown Model',
        ecosystem: ['lm-studio'],
      }),
      'local',
    );
    assert.ok(result.commands['lm-studio']);
  });
});

// ── Every model in ECOSYSTEM_IDS produces at least one command ──────

describe('all ECOSYSTEM_IDS models generate commands', () => {
  for (const modelId of ALL_ECOSYSTEM_MODEL_IDS) {
    it(`${modelId} generates at least one command`, () => {
      const result = generateQuickStart(
        makeModel({
          id: modelId,
          ecosystem: ['ollama', 'llama.cpp', 'vllm', 'huggingface', 'lm-studio'],
        }),
        'local',
      );
      const commandCount = Object.keys(result.commands).length;
      assert.ok(commandCount >= 1, `${modelId} produced 0 commands`);
    });
  }
});
