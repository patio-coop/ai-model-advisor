import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateLicenseGuidance } from './licensing.js';

// Helper to build a model object with just an id
function model(id) {
  return { id };
}

// All model IDs from MODEL_LICENSE_MAP for exhaustive testing
const ALL_MODEL_IDS = [
  'deepseek-coder-v2-16b', 'deepseek-coder-v2-236b', 'deepseek-v3',
  'codellama-7b', 'codellama-13b', 'codellama-34b', 'codellama-70b',
  'starcoder2-3b', 'starcoder2-7b', 'starcoder2-15b',
  'llama-3.1-8b', 'llama-3.1-70b', 'llama-3.1-405b', 'llama-3.2-1b', 'llama-3.2-3b',
  'mistral-7b', 'mixtral-8x7b', 'mixtral-8x22b',
  'codegemma-2b', 'codegemma-7b',
  'qwen2.5-coder-1.5b', 'qwen2.5-coder-7b', 'qwen2.5-coder-14b', 'qwen2.5-coder-32b',
  'phi-3-mini', 'phi-3-medium',
  'wizardcoder-15b', 'wizardcoder-33b',
  'granite-code-3b', 'granite-code-8b', 'granite-code-20b', 'granite-code-34b',
];

describe('generateLicenseGuidance()', () => {
  // ── 1. Permissive licenses ───────────────────────────────────────────

  describe('permissive licenses (Apache/MIT)', () => {
    const permissiveModels = [
      { id: 'mistral-7b', label: 'Mistral (Apache)' },
      { id: 'qwen2.5-coder-7b', label: 'Qwen (Apache)' },
      { id: 'deepseek-v3', label: 'DeepSeek (MIT)' },
      { id: 'granite-code-8b', label: 'Granite (Apache)' },
    ];

    for (const { id, label } of permissiveModels) {
      it(`${label} allows commercial use`, () => {
        const result = generateLicenseGuidance(model(id));
        assert.equal(result.details.commercialUse.allowed, true);
      });

      it(`${label} allows fine-tuning`, () => {
        const result = generateLicenseGuidance(model(id));
        assert.equal(result.details.fineTuning.allowed, true);
      });

      it(`${label} gives output ownership to user`, () => {
        const result = generateLicenseGuidance(model(id));
        assert.equal(result.details.outputOwnership.status, 'user');
      });
    }

    it('Granite (open data) has low risk', () => {
      const result = generateLicenseGuidance(model('granite-code-8b'));
      assert.equal(result.riskLevel, 'low');
    });

    it('Mistral (undisclosed data) has medium risk despite permissive license', () => {
      const result = generateLicenseGuidance(model('mistral-7b'));
      assert.equal(result.riskLevel, 'medium');
    });
  });

  // ── 2. Restricted licenses ──────────────────────────────────────────

  describe('restricted licenses (WizardCoder)', () => {
    it('disallows commercial use', () => {
      const result = generateLicenseGuidance(model('wizardcoder-15b'));
      assert.equal(result.details.commercialUse.allowed, false);
    });

    it('has high risk level', () => {
      const result = generateLicenseGuidance(model('wizardcoder-15b'));
      assert.equal(result.riskLevel, 'high');
    });

    it('action items include commercial prohibition', () => {
      const result = generateLicenseGuidance(model('wizardcoder-33b'));
      const hasProhibition = result.actionItems.some(
        item => item.includes('Do NOT use in commercial products')
      );
      assert.ok(hasProhibition, `Expected commercial prohibition in: ${result.actionItems}`);
    });

    it('summary mentions restriction', () => {
      const result = generateLicenseGuidance(model('wizardcoder-15b'));
      assert.ok(result.summary.toLowerCase().includes('restricted'),
        `Expected "restricted" in summary: ${result.summary}`);
    });
  });

  // ── 3. Conditional licenses ──────────────────────────────────────────

  describe('conditional licenses (Llama 3, CodeGemma)', () => {
    it('Llama 3 allows commercial use', () => {
      const result = generateLicenseGuidance(model('llama-3.1-70b'));
      assert.equal(result.details.commercialUse.allowed, true);
    });

    it('Llama 3 has medium risk due to restrictions', () => {
      const result = generateLicenseGuidance(model('llama-3.1-8b'));
      assert.equal(result.riskLevel, 'medium');
    });

    it('Llama 3 action items include 700M MAU restriction', () => {
      const result = generateLicenseGuidance(model('llama-3.1-405b'));
      const has700M = result.actionItems.some(item => item.includes('700M'));
      assert.ok(has700M, `Expected 700M MAU restriction in: ${result.actionItems}`);
    });

    it('Llama 3 action items include "Built with Llama" requirement', () => {
      const result = generateLicenseGuidance(model('llama-3.2-1b'));
      const hasBuiltWith = result.actionItems.some(item => item.includes('Built with Llama'));
      assert.ok(hasBuiltWith, `Expected "Built with Llama" in: ${result.actionItems}`);
    });

    it('CodeGemma allows commercial use', () => {
      const result = generateLicenseGuidance(model('codegemma-7b'));
      assert.equal(result.details.commercialUse.allowed, true);
    });

    it('CodeGemma has medium risk due to distillation restriction', () => {
      const result = generateLicenseGuidance(model('codegemma-2b'));
      assert.equal(result.riskLevel, 'medium');
    });

    it('CodeGemma action items mention distillation restriction', () => {
      const result = generateLicenseGuidance(model('codegemma-7b'));
      const hasDistillation = result.actionItems.some(
        item => item.toLowerCase().includes('distillation')
      );
      assert.ok(hasDistillation, `Expected distillation restriction in: ${result.actionItems}`);
    });

    it('StarCoder has medium risk due to responsible-use restrictions', () => {
      const result = generateLicenseGuidance(model('starcoder2-15b'));
      assert.equal(result.riskLevel, 'medium');
    });
  });

  // ── 4. Training data provenance ──────────────────────────────────────

  describe('training data provenance', () => {
    it('"open" (StarCoder) — documented and auditable', () => {
      const result = generateLicenseGuidance(model('starcoder2-7b'));
      assert.equal(result.details.trainingData.status, 'open');
      assert.ok(result.details.trainingData.note.includes('documented'),
        `Expected "documented" in note: ${result.details.trainingData.note}`);
    });

    it('"open" (Granite) — documented and auditable', () => {
      const result = generateLicenseGuidance(model('granite-code-20b'));
      assert.equal(result.details.trainingData.status, 'open');
      assert.ok(result.details.trainingData.note.includes('auditable'));
    });

    it('"undisclosed" (DeepSeek) — provenance warning in action items', () => {
      const result = generateLicenseGuidance(model('deepseek-v3'));
      assert.equal(result.details.trainingData.status, 'undisclosed');
      const hasWarning = result.actionItems.some(item => item.includes('provenance'));
      assert.ok(hasWarning, `Expected provenance warning in: ${result.actionItems}`);
    });

    it('"undisclosed" (Llama) — provenance warning in action items', () => {
      const result = generateLicenseGuidance(model('llama-3.1-8b'));
      assert.equal(result.details.trainingData.status, 'undisclosed');
      const hasWarning = result.actionItems.some(item => item.includes('provenance'));
      assert.ok(hasWarning, `Expected provenance warning in: ${result.actionItems}`);
    });

    it('"mixed" (Phi) — mixed sources warning in action items', () => {
      const result = generateLicenseGuidance(model('phi-3-mini'));
      assert.equal(result.details.trainingData.status, 'mixed');
      const hasWarning = result.actionItems.some(item => item.includes('mixed sources'));
      assert.ok(hasWarning, `Expected mixed sources warning in: ${result.actionItems}`);
    });

    it('"mixed" (WizardCoder) — mixed sources warning in action items', () => {
      const result = generateLicenseGuidance(model('wizardcoder-15b'));
      assert.equal(result.details.trainingData.status, 'mixed');
      const hasWarning = result.actionItems.some(item => item.includes('mixed sources'));
      assert.ok(hasWarning, `Expected mixed sources warning in: ${result.actionItems}`);
    });
  });

  // ── 5. Unknown model fallback ────────────────────────────────────────

  describe('unknown model fallback', () => {
    it('returns "unavailable" summary for unknown model', () => {
      const result = generateLicenseGuidance(model('totally-unknown-42b'));
      assert.ok(result.summary.toLowerCase().includes('unavailable'),
        `Expected "unavailable" in summary: ${result.summary}`);
    });

    it('returns medium risk for unknown model', () => {
      const result = generateLicenseGuidance(model('not-a-real-model'));
      assert.equal(result.riskLevel, 'medium');
    });

    it('details is null for unknown model', () => {
      const result = generateLicenseGuidance(model('mystery-model'));
      assert.equal(result.details, null);
    });

    it('action items contain verification advice', () => {
      const result = generateLicenseGuidance(model('unknown-7b'));
      const hasVerify = result.actionItems.some(
        item => item.toLowerCase().includes('verify')
      );
      assert.ok(hasVerify, `Expected verification advice in: ${result.actionItems}`);
    });

    it('disclaimer is still present', () => {
      const result = generateLicenseGuidance(model('unknown-7b'));
      assert.ok(result.disclaimer);
      assert.ok(result.disclaimer.length > 0);
    });
  });

  // ── 6. Risk assessment logic ─────────────────────────────────────────

  describe('risk assessment logic', () => {
    it('no commercial use → high risk', () => {
      const result = generateLicenseGuidance(model('wizardcoder-15b'));
      assert.equal(result.riskLevel, 'high');
    });

    it('has notable restrictions → medium risk', () => {
      // Llama 3 has restrictions but allows commercial use
      const result = generateLicenseGuidance(model('llama-3.1-8b'));
      assert.equal(result.riskLevel, 'medium');
    });

    it('undisclosed training data (no restrictions) → medium risk', () => {
      // Mistral: Apache, no restrictions, but undisclosed training data
      const result = generateLicenseGuidance(model('mistral-7b'));
      assert.equal(result.riskLevel, 'medium');
    });

    it('mixed training data (no restrictions) → medium risk', () => {
      // Phi: MIT, no restrictions, but mixed training data
      const result = generateLicenseGuidance(model('phi-3-medium'));
      assert.equal(result.riskLevel, 'medium');
    });

    it('clean permissive (open data, no restrictions) → low risk', () => {
      // Granite: Apache, open data, no restrictions
      const result = generateLicenseGuidance(model('granite-code-3b'));
      assert.equal(result.riskLevel, 'low');
    });

    it('risk priority: no commercial > restrictions > data provenance', () => {
      // WizardCoder has both no-commercial AND mixed data — should be high (not medium)
      const result = generateLicenseGuidance(model('wizardcoder-33b'));
      assert.equal(result.riskLevel, 'high',
        'No commercial use should take priority over other risk factors');
    });
  });

  // ── 7. Every model ID produces a valid result ────────────────────────

  describe('exhaustive model coverage', () => {
    for (const id of ALL_MODEL_IDS) {
      it(`${id} produces a valid result without crashing`, () => {
        const result = generateLicenseGuidance(model(id));
        assert.ok(result, `No result for ${id}`);
        assert.ok(typeof result.summary === 'string', `Bad summary for ${id}`);
        assert.ok(['low', 'medium', 'high'].includes(result.riskLevel),
          `Invalid riskLevel "${result.riskLevel}" for ${id}`);
        assert.ok(result.details !== null, `Details should not be null for known model ${id}`);
        assert.ok(Array.isArray(result.actionItems), `actionItems not an array for ${id}`);
        assert.ok(typeof result.disclaimer === 'string', `Bad disclaimer for ${id}`);
      });
    }
  });

  // ── 8. Disclaimer always present ─────────────────────────────────────

  describe('disclaimer', () => {
    it('is present for a known model', () => {
      const result = generateLicenseGuidance(model('mistral-7b'));
      assert.ok(result.disclaimer);
      assert.ok(result.disclaimer.includes('not legal advice'));
    });

    it('is present for an unknown model', () => {
      const result = generateLicenseGuidance(model('fake-model'));
      assert.ok(result.disclaimer);
      assert.ok(result.disclaimer.includes('not legal advice'));
    });
  });

  // ── Structural validation ────────────────────────────────────────────

  describe('result structure', () => {
    it('known model has all top-level fields', () => {
      const result = generateLicenseGuidance(model('granite-code-8b'));
      assert.ok('summary' in result);
      assert.ok('riskLevel' in result);
      assert.ok('details' in result);
      assert.ok('actionItems' in result);
      assert.ok('disclaimer' in result);
    });

    it('details has all expected sub-fields', () => {
      const result = generateLicenseGuidance(model('granite-code-8b'));
      const d = result.details;
      assert.ok(d.spdx, 'missing spdx');
      assert.ok('allowed' in d.commercialUse, 'missing commercialUse.allowed');
      assert.ok('note' in d.commercialUse, 'missing commercialUse.note');
      assert.ok('allowed' in d.fineTuning, 'missing fineTuning.allowed');
      assert.ok('status' in d.outputOwnership, 'missing outputOwnership.status');
      assert.ok('status' in d.trainingData, 'missing trainingData.status');
      assert.ok('required' in d.attribution, 'missing attribution.required');
    });

    it('attribution required is boolean', () => {
      const result = generateLicenseGuidance(model('codegemma-7b'));
      assert.equal(typeof result.details.attribution.required, 'boolean');
    });

    it('CodeGemma does not require attribution', () => {
      const result = generateLicenseGuidance(model('codegemma-7b'));
      assert.equal(result.details.attribution.required, false);
    });

    it('Granite requires attribution', () => {
      const result = generateLicenseGuidance(model('granite-code-8b'));
      assert.equal(result.details.attribution.required, true);
    });
  });
});
