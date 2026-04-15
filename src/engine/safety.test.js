import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSafetyRecommendation } from './safety.js';

// Helper to build a model object with sensible defaults
function makeModel(overrides = {}) {
  return {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B',
    family: 'Llama',
    provider: 'Meta',
    ecosystem: ['ollama', 'llama.cpp', 'vllm', 'huggingface', 'lm-studio'],
    params: '8B',
    ...overrides,
  };
}

// Helper to build inputs with sensible defaults
function makeInputs(overrides = {}) {
  const { constraints: cOverrides, ...rest } = overrides;
  return {
    constraints: {
      deployment: 'local',
      privacy: 'moderate',
      maxMemory: '16GB',
      budget: 'free',
      ...cOverrides,
    },
    useCases: ['codegen'],
    ...rest,
  };
}

// ── Safety profiles ──────────────────────────────────────────────────

describe('safety profiles', () => {
  it('recognises models with safety training (Llama)', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'Llama' }),
      makeInputs(),
    );
    assert.equal(result.builtInSafety.hasSafetyTraining, true);
  });

  it('recognises models with safety training (Mistral)', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'Mistral' }),
      makeInputs(),
    );
    assert.equal(result.builtInSafety.hasSafetyTraining, true);
  });

  it('recognises models without safety training (StarCoder)', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'StarCoder' }),
      makeInputs(),
    );
    assert.equal(result.builtInSafety.hasSafetyTraining, false);
  });

  it('recognises models without safety training (WizardCoder)', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'WizardCoder' }),
      makeInputs(),
    );
    assert.equal(result.builtInSafety.hasSafetyTraining, false);
  });
});

// ── Risk levels ──────────────────────────────────────────────────────

describe('risk levels', () => {
  it('returns "high" when model has no safety training', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'StarCoder' }),
      makeInputs(),
    );
    assert.equal(result.riskLevel, 'high');
  });

  it('returns "high" for cloud deployment with relaxed privacy', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'Llama' }),
      makeInputs({ constraints: { deployment: 'cloud', privacy: 'relaxed' } }),
    );
    assert.equal(result.riskLevel, 'high');
  });

  it('returns "low" for local + strict privacy + safety-trained', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'Llama' }),
      makeInputs({ constraints: { deployment: 'local', privacy: 'strict' } }),
    );
    assert.equal(result.riskLevel, 'low');
  });

  it('returns "medium" for everything else', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'Llama' }),
      makeInputs({ constraints: { deployment: 'local', privacy: 'moderate' } }),
    );
    assert.equal(result.riskLevel, 'medium');
  });

  it('returns "medium" for cloud + strict privacy + safety-trained', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'Mistral' }),
      makeInputs({ constraints: { deployment: 'cloud', privacy: 'strict' } }),
    );
    assert.equal(result.riskLevel, 'medium');
  });
});

// ── Guardrails ──────────────────────────────────────────────────────

describe('guardrails', () => {
  it('always returns exactly 5 guardrails', () => {
    const result = generateSafetyRecommendation(makeModel(), makeInputs());
    assert.equal(result.guardrails.length, 5);
  });

  it('includes the expected guardrail names', () => {
    const result = generateSafetyRecommendation(makeModel(), makeInputs());
    const names = result.guardrails.map((g) => g.name);
    assert.ok(names.includes('Llama Guard 3'));
    assert.ok(names.includes('NeMo Guardrails'));
    assert.ok(names.includes('Guardrails AI'));
    assert.ok(names.includes('CodeShield'));
    assert.ok(names.includes('Semgrep'));
  });
});

// ── Code-specific risks ─────────────────────────────────────────────

describe('code-specific risks', () => {
  it('sets code injection severity "high" for codegen use case', () => {
    const result = generateSafetyRecommendation(
      makeModel(),
      makeInputs({ useCases: ['codegen'] }),
    );
    const injection = result.codeSpecificRisks.find((r) => r.risk === 'Code injection');
    assert.equal(injection.severity, 'high');
  });

  it('sets code injection severity "low" for code-review use case', () => {
    const result = generateSafetyRecommendation(
      makeModel(),
      makeInputs({ useCases: ['code-review'] }),
    );
    const injection = result.codeSpecificRisks.find((r) => r.risk === 'Code injection');
    assert.equal(injection.severity, 'low');
  });

  it('adds hallucinated APIs risk for architecture use case', () => {
    const result = generateSafetyRecommendation(
      makeModel(),
      makeInputs({ useCases: ['architecture'] }),
    );
    const hallucinated = result.codeSpecificRisks.find(
      (r) => r.risk === 'Hallucinated APIs or patterns',
    );
    assert.ok(hallucinated, 'Should include hallucinated APIs risk');
    assert.equal(hallucinated.severity, 'high');
  });

  it('does not include hallucinated APIs risk when architecture is absent', () => {
    const result = generateSafetyRecommendation(
      makeModel(),
      makeInputs({ useCases: ['codegen'] }),
    );
    const hallucinated = result.codeSpecificRisks.find(
      (r) => r.risk === 'Hallucinated APIs or patterns',
    );
    assert.equal(hallucinated, undefined);
  });
});

// ── Recommended stack ───────────────────────────────────────────────

describe('recommended stack', () => {
  it('returns Llama Guard for local deployment input filter', () => {
    const result = generateSafetyRecommendation(
      makeModel(),
      makeInputs({ constraints: { deployment: 'local' } }),
    );
    assert.ok(result.recommendedStack.inputFilter.name.includes('Llama Guard'));
  });

  it('returns NeMo Guardrails for cloud deployment input filter', () => {
    const result = generateSafetyRecommendation(
      makeModel(),
      makeInputs({ constraints: { deployment: 'cloud' } }),
    );
    assert.equal(result.recommendedStack.inputFilter.name, 'NeMo Guardrails');
  });

  it('returns NeMo Guardrails for hybrid deployment input filter', () => {
    const result = generateSafetyRecommendation(
      makeModel(),
      makeInputs({ constraints: { deployment: 'hybrid' } }),
    );
    assert.equal(result.recommendedStack.inputFilter.name, 'NeMo Guardrails');
  });

  it('returns E2B Code Interpreter sandbox for cloud', () => {
    const result = generateSafetyRecommendation(
      makeModel(),
      makeInputs({ constraints: { deployment: 'cloud' } }),
    );
    assert.ok(result.recommendedStack.codeSandbox.name.includes('E2B'));
  });

  it('returns Docker Sandbox for local deployment', () => {
    const result = generateSafetyRecommendation(
      makeModel(),
      makeInputs({ constraints: { deployment: 'local' } }),
    );
    assert.ok(result.recommendedStack.codeSandbox.name.includes('Docker'));
  });

  it('each stack entry has name and setup', () => {
    const result = generateSafetyRecommendation(makeModel(), makeInputs());
    for (const [key, entry] of Object.entries(result.recommendedStack)) {
      assert.ok(typeof entry.name === 'string', `${key} missing name`);
      assert.ok(typeof entry.setup === 'string', `${key} missing setup`);
    }
  });
});

// ── Production checklist ────────────────────────────────────────────

describe('production checklist', () => {
  it('always returns exactly 6 items', () => {
    const result = generateSafetyRecommendation(makeModel(), makeInputs());
    assert.equal(result.productionChecklist.length, 6);
  });

  it('checklist items are non-empty strings', () => {
    const result = generateSafetyRecommendation(makeModel(), makeInputs());
    for (const item of result.productionChecklist) {
      assert.ok(typeof item === 'string' && item.length > 0);
    }
  });
});

// ── Unknown model family ────────────────────────────────────────────

describe('unknown model family', () => {
  it('falls back to no-safety-training for unknown family', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'TotallyMadeUpModel' }),
      makeInputs(),
    );
    assert.equal(result.builtInSafety.hasSafetyTraining, false);
    assert.equal(result.riskLevel, 'high');
  });

  it('still returns full guardrails and checklist for unknown family', () => {
    const result = generateSafetyRecommendation(
      makeModel({ family: 'UnknownXYZ' }),
      makeInputs(),
    );
    assert.equal(result.guardrails.length, 5);
    assert.equal(result.productionChecklist.length, 6);
  });
});

// ── Llama Guard compatibility ───────────────────────────────────────

describe('Llama Guard compatibility', () => {
  it('reports "high" compatibility for Llama-family models', () => {
    const result = generateSafetyRecommendation(makeModel({ family: 'Llama' }), makeInputs());
    const llamaGuard = result.guardrails.find((g) => g.name === 'Llama Guard 3');
    assert.equal(llamaGuard.compatibility, 'high');
  });

  it('reports "high" compatibility for CodeLlama-family models', () => {
    const result = generateSafetyRecommendation(makeModel({ family: 'CodeLlama' }), makeInputs());
    const llamaGuard = result.guardrails.find((g) => g.name === 'Llama Guard 3');
    assert.equal(llamaGuard.compatibility, 'high');
  });

  it('reports "medium" compatibility for non-Llama models', () => {
    const result = generateSafetyRecommendation(makeModel({ family: 'Mistral' }), makeInputs());
    const llamaGuard = result.guardrails.find((g) => g.name === 'Llama Guard 3');
    assert.equal(llamaGuard.compatibility, 'medium');
  });

  it('uses ollama setup command when model supports ollama', () => {
    const result = generateSafetyRecommendation(
      makeModel({ ecosystem: ['ollama'] }),
      makeInputs(),
    );
    const llamaGuard = result.guardrails.find((g) => g.name === 'Llama Guard 3');
    assert.ok(llamaGuard.setup.includes('ollama run'));
  });

  it('uses pip setup command when model lacks ollama', () => {
    const result = generateSafetyRecommendation(
      makeModel({ ecosystem: ['vllm'] }),
      makeInputs(),
    );
    const llamaGuard = result.guardrails.find((g) => g.name === 'Llama Guard 3');
    assert.ok(llamaGuard.setup.includes('pip install'));
  });
});
