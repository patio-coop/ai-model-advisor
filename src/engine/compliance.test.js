import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateComplianceReport } from './compliance.js';

// ── Helpers ─────────────────────────────────────────────────────────

function makeModel(overrides = {}) {
  return {
    id: 'deepseek-coder-v2-16b',
    name: 'DeepSeek Coder V2 Lite',
    family: 'DeepSeek Coder V2',
    params: '16B',
    contextWindow: 128_000,
    license: 'permissive',
    commercialUse: true,
    provider: 'DeepSeek',
    ...overrides,
  };
}

function makeInputs(overrides = {}) {
  return {
    role: 'webdev',
    languages: ['javascript'],
    useCases: ['codegen'],
    constraints: {
      deployment: 'cloud',
      privacy: 'moderate',
      budget: 'medium',
    },
    ...overrides,
  };
}

function riskAreas(report) {
  return report.licenseReport.risks.map(r => r.area);
}

function riskLevels(report) {
  return report.licenseReport.risks.map(r => r.level);
}

function sectionHeadings(report) {
  return report.acceptableUsePolicy.sections.map(s => s.heading);
}

function flagRegulations(report) {
  return report.regulatoryFlags.flags.map(f => f.regulation);
}

function findFlag(report, regulation) {
  return report.regulatoryFlags.flags.find(f => f.regulation === regulation);
}

function findRisk(report, area) {
  return report.licenseReport.risks.find(r => r.area === area);
}

function findSection(report, heading) {
  return report.acceptableUsePolicy.sections.find(s => s.heading === heading);
}

// ── 1. Family resolution ────────────────────────────────────────────

describe('Family resolution', () => {
  const families = [
    { family: 'DeepSeek Coder V2', expected: 'MIT' },
    { family: 'Llama 3', expected: 'Llama-3-Community' },
    { family: 'Code Llama', expected: 'Llama-2-Community' },
    { family: 'CodeLlama', expected: 'Llama-2-Community' },
    { family: 'Mistral', expected: 'Apache-2.0' },
    { family: 'Mixtral', expected: 'Apache-2.0' },
    { family: 'Qwen 2.5', expected: 'Apache-2.0' },
    { family: 'CodeGemma', expected: 'Gemma-Terms' },
    { family: 'Phi-3', expected: 'MIT' },
    { family: 'StarCoder2', expected: 'BigCode-OpenRAIL-M' },
    { family: 'WizardCoder', expected: 'BigCode-OpenRAIL-M' },
    { family: 'Granite Code', expected: 'Apache-2.0' },
  ];

  for (const { family, expected } of families) {
    it(`resolves "${family}" to spdx ${expected}`, () => {
      const model = makeModel({ family, name: family });
      const report = generateComplianceReport(model, makeInputs());
      assert.equal(report.licenseReport.summary.includes(expected), true,
        `Expected spdx "${expected}" in summary for family "${family}"`);
    });
  }

  it('resolves bare "llama" to llama3 (newer default)', () => {
    const model = makeModel({ family: 'llama', name: 'Llama' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(report.licenseReport.summary.includes('Llama-3-Community'));
  });

  it('resolves "Llama-2" to llama2', () => {
    const model = makeModel({ family: 'Llama-2', name: 'Llama 2' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(report.licenseReport.summary.includes('Llama-2-Community'));
  });

  it('resolves gemma to codegemma', () => {
    const model = makeModel({ family: 'gemma', name: 'Gemma' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(report.licenseReport.summary.includes('Gemma-Terms'));
  });

  it('resolves wizard to wizardcoder', () => {
    const model = makeModel({ family: 'wizard', name: 'Wizard' });
    const report = generateComplianceReport(model, makeInputs());
    // WizardCoder is NOT compatible
    assert.equal(report.licenseReport.compatible, false);
  });

  it('falls back to provider when family is missing', () => {
    const model = makeModel({ family: undefined, provider: 'DeepSeek', name: 'Some Model' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(report.licenseReport.summary.includes('MIT'));
  });

  it('falls back to id when family and provider are missing', () => {
    const model = makeModel({ family: undefined, provider: undefined, id: 'phi-3-mini', name: 'Phi' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(report.licenseReport.summary.includes('MIT'));
  });
});

// ── 2. License compatibility ────────────────────────────────────────

describe('License compatibility', () => {
  it('permissive Apache-2.0 model is compatible for commercial use', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    assert.equal(report.licenseReport.compatible, true);
    assert.ok(report.licenseReport.summary.includes('compatible'));
  });

  it('permissive MIT model is compatible for commercial use', () => {
    const model = makeModel({ family: 'Phi-3', name: 'Phi-3 Mini' });
    const report = generateComplianceReport(model, makeInputs());
    assert.equal(report.licenseReport.compatible, true);
  });

  it('Granite (Apache-2.0) is compatible and has IP indemnification note', () => {
    const model = makeModel({ family: 'Granite Code', name: 'Granite 8B' });
    const report = generateComplianceReport(model, makeInputs());
    assert.equal(report.licenseReport.compatible, true);
    const liability = findSection(report, 'Liability Limitations');
    assert.ok(liability.content.includes('indemnification'));
  });

  it('WizardCoder is NOT compatible (commercialOk=false)', () => {
    const model = makeModel({ family: 'WizardCoder', name: 'WizardCoder 15B' });
    const report = generateComplianceReport(model, makeInputs());
    assert.equal(report.licenseReport.compatible, false);
    assert.ok(report.licenseReport.summary.includes('NOT compatible'));
    const commercial = findRisk(report, 'Commercial use');
    assert.equal(commercial.level, 'critical');
  });

  it('Llama models flag MAU cap restriction', () => {
    const model = makeModel({ family: 'Llama 3', name: 'Llama 3 8B' });
    const report = generateComplianceReport(model, makeInputs());
    const commercial = findRisk(report, 'Commercial use');
    assert.ok(commercial);
    assert.equal(commercial.level, 'medium');
    assert.ok(commercial.detail.includes('700M'));
    assert.ok(commercial.detail.includes('monthly-active-user'));
  });

  it('Llama MAU cap not flagged when budget=free', () => {
    const model = makeModel({ family: 'Llama 3', name: 'Llama 3 8B' });
    const inputs = makeInputs({ constraints: { deployment: 'cloud', privacy: 'moderate', budget: 'free' } });
    const report = generateComplianceReport(model, inputs);
    const commercial = findRisk(report, 'Commercial use');
    // budget=free means mauCap check is skipped
    assert.equal(commercial, undefined);
  });

  it('models with distillation restriction flag it', () => {
    const model = makeModel({ family: 'Llama 3', name: 'Llama 3 8B' });
    const report = generateComplianceReport(model, makeInputs());
    const derivative = findRisk(report, 'Derivative works');
    assert.ok(derivative);
    assert.ok(derivative.detail.includes('distill'));
  });

  it('WizardCoder flags derivative open-source requirement', () => {
    const model = makeModel({ family: 'WizardCoder', name: 'WizardCoder 15B' });
    const report = generateComplianceReport(model, makeInputs());
    const derivative = findRisk(report, 'Derivative works');
    assert.ok(derivative);
    assert.equal(derivative.level, 'high');
    assert.ok(derivative.detail.includes('open-source'));
  });

  it('all reports include output liability risk', () => {
    for (const family of ['DeepSeek Coder V2', 'Mistral', 'Llama 3', 'Granite Code']) {
      const model = makeModel({ family, name: family });
      const report = generateComplianceReport(model, makeInputs());
      assert.ok(findRisk(report, 'Output liability'), `Missing output liability for ${family}`);
    }
  });
});

// ── 3. Risk levels ──────────────────────────────────────────────────

describe('Risk levels', () => {
  it('critical for non-commercial model (WizardCoder)', () => {
    const model = makeModel({ family: 'WizardCoder', name: 'WizardCoder 15B' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(riskLevels(report).includes('critical'));
  });

  it('high for data provenance issues (WizardCoder training data)', () => {
    const model = makeModel({ family: 'WizardCoder', name: 'WizardCoder 15B' });
    const report = generateComplianceReport(model, makeInputs());
    const provenance = findRisk(report, 'Training data provenance');
    assert.ok(provenance);
    assert.equal(provenance.level, 'high');
  });

  it('high for Phi synthetic training data provenance', () => {
    const model = makeModel({ family: 'Phi-3', name: 'Phi-3 Mini' });
    const report = generateComplianceReport(model, makeInputs());
    const provenance = findRisk(report, 'Training data provenance');
    assert.ok(provenance);
    assert.equal(provenance.level, 'high');
  });

  it('medium for restriction-bearing models (Llama MAU cap)', () => {
    const model = makeModel({ family: 'Llama 3', name: 'Llama 3 8B' });
    const report = generateComplianceReport(model, makeInputs());
    const commercial = findRisk(report, 'Commercial use');
    assert.equal(commercial.level, 'medium');
  });

  it('low training data provenance for models with undisclosed data', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const provenance = findRisk(report, 'Training data provenance');
    assert.ok(provenance);
    assert.equal(provenance.level, 'low');
  });

  it('clean permissive model has no critical or high risks (Granite)', () => {
    const model = makeModel({ family: 'Granite Code', name: 'Granite 8B' });
    const inputs = makeInputs({ constraints: { deployment: 'local', privacy: 'moderate', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    const levels = riskLevels(report);
    assert.ok(!levels.includes('critical'), 'Granite should have no critical risks');
    // Granite has documented enterprise-friendly data, no high risks for local deploy
    assert.ok(!levels.includes('high'), 'Granite local deploy should have no high risks');
  });

  it('high data residency risk for cloud + strict privacy', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'cloud', privacy: 'strict', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    const residency = findRisk(report, 'Data residency');
    assert.ok(residency);
    assert.equal(residency.level, 'high');
  });

  it('low data residency risk for cloud + moderate privacy', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const residency = findRisk(report, 'Data residency');
    assert.ok(residency);
    assert.equal(residency.level, 'low');
  });

  it('high regulated industry risk for strict privacy + healthcare use case', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({
      role: 'backend',
      useCases: ['health data processing'],
      constraints: { deployment: 'cloud', privacy: 'strict', budget: 'medium' },
    });
    const report = generateComplianceReport(model, inputs);
    const regulated = findRisk(report, 'Regulated industry');
    assert.ok(regulated);
    assert.equal(regulated.level, 'high');
  });

  it('medium regulated industry for strict privacy without health signals', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({
      role: 'webdev',
      useCases: ['codegen'],
      constraints: { deployment: 'cloud', privacy: 'strict', budget: 'medium' },
    });
    const report = generateComplianceReport(model, inputs);
    const regulated = findRisk(report, 'Regulated industry');
    assert.ok(regulated);
    assert.equal(regulated.level, 'medium');
  });

  it('conditionally compatible summary when high risks present', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({
      constraints: { deployment: 'cloud', privacy: 'strict', budget: 'medium' },
    });
    const report = generateComplianceReport(model, inputs);
    assert.ok(report.licenseReport.summary.includes('conditionally compatible'));
  });
});

// ── 4. Acceptable use policy generation ─────────────────────────────

describe('Acceptable use policy', () => {
  it('has all required sections', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const headings = sectionHeadings(report);
    const required = [
      'Permitted Uses',
      'Prohibited Uses',
      'Output Disclaimer',
      'Data Handling',
      'Liability Limitations',
      'Attribution Requirements',
    ];
    for (const h of required) {
      assert.ok(headings.includes(h), `Missing section: ${h}`);
    }
  });

  it('title includes model name', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(report.acceptableUsePolicy.title.includes('Mistral 7B'));
  });

  it('permitted uses lists provided use cases', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ useCases: ['codegen', 'code review'] });
    const report = generateComplianceReport(model, inputs);
    const permitted = findSection(report, 'Permitted Uses');
    assert.ok(permitted.content.includes('codegen'));
    assert.ok(permitted.content.includes('code review'));
  });

  it('permitted uses has default text when no use cases provided', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ useCases: [] });
    const report = generateComplianceReport(model, inputs);
    const permitted = findSection(report, 'Permitted Uses');
    assert.ok(permitted.content.includes('Software development assistance'));
  });

  it('prohibited uses includes distillation restriction when applicable', () => {
    const model = makeModel({ family: 'Llama 3', name: 'Llama 3 8B' });
    const report = generateComplianceReport(model, makeInputs());
    const prohibited = findSection(report, 'Prohibited Uses');
    assert.ok(prohibited.content.includes('distill'));
    assert.ok(prohibited.content.includes('foundation models'));
  });

  it('prohibited uses omits distillation text when not restricted', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const prohibited = findSection(report, 'Prohibited Uses');
    assert.ok(!prohibited.content.includes('distill'));
  });

  it('prohibited uses includes responsible-use items when applicable', () => {
    const model = makeModel({ family: 'Llama 3', name: 'Llama 3 8B' });
    const report = generateComplianceReport(model, makeInputs());
    const prohibited = findSection(report, 'Prohibited Uses');
    assert.ok(prohibited.content.includes('Surveillance'));
    assert.ok(prohibited.content.includes('Medical diagnosis'));
  });

  it('data handling for local deployment mentions on-premises', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'local', privacy: 'moderate', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    const data = findSection(report, 'Data Handling');
    assert.ok(data.content.includes('on-premises'));
    assert.ok(!data.content.includes('third-party'));
  });

  it('data handling for cloud deployment mentions DPA and encryption', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const data = findSection(report, 'Data Handling');
    assert.ok(data.content.includes('Data Processing Agreement'));
    assert.ok(data.content.includes('TLS'));
  });

  it('data handling for hybrid deployment mentions both local and cloud', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'hybrid', privacy: 'moderate', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    const data = findSection(report, 'Data Handling');
    assert.ok(data.content.includes('Hybrid'));
    assert.ok(data.content.includes('cloud'));
  });

  it('cloud + strict privacy triggers PII redaction guidance', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'cloud', privacy: 'strict', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    const data = findSection(report, 'Data Handling');
    assert.ok(data.content.includes('PII'));
    assert.ok(data.content.includes('redaction'));
    assert.ok(data.content.toLowerCase().includes('right-to-erasure'));
  });

  it('cloud + moderate privacy does NOT trigger PII guidance', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const data = findSection(report, 'Data Handling');
    assert.ok(!data.content.includes('PII'));
  });

  it('attribution section includes MAU tracking for Llama models', () => {
    const model = makeModel({ family: 'Llama 3', name: 'Llama 3 8B' });
    const report = generateComplianceReport(model, makeInputs());
    const attr = findSection(report, 'Attribution Requirements');
    assert.ok(attr.content.includes('700M'));
    assert.ok(attr.content.includes('monthly active users'));
  });

  it('attribution section for Apache model mentions derivative works', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const attr = findSection(report, 'Attribution Requirements');
    assert.ok(attr.content.includes('Apache-2.0'));
    assert.ok(attr.content.includes('derivative works'));
  });

  it('liability section mentions IP indemnification for Granite', () => {
    const model = makeModel({ family: 'Granite Code', name: 'Granite 8B' });
    const report = generateComplianceReport(model, makeInputs());
    const liability = findSection(report, 'Liability Limitations');
    assert.ok(liability.content.includes('indemnification'));
    assert.ok(liability.content.includes('IBM'));
  });

  it('liability section omits indemnification for non-indemnified models', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const liability = findSection(report, 'Liability Limitations');
    assert.ok(!liability.content.includes('indemnification'));
  });
});

// ── 5. Regulatory flags ─────────────────────────────────────────────

describe('Regulatory flags', () => {
  it('includes all expected regulations', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const regs = flagRegulations(report);
    for (const r of ['GDPR', 'SOC 2', 'HIPAA', 'EU AI Act', 'CCPA', 'Export Controls (EAR/OFAC)']) {
      assert.ok(regs.includes(r), `Missing regulation: ${r}`);
    }
  });

  it('GDPR applies for cloud deployments', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const gdpr = findFlag(report, 'GDPR');
    assert.equal(gdpr.applies, true);
    assert.ok(gdpr.reason.includes('Cloud'));
  });

  it('GDPR applies for hybrid deployments', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'hybrid', privacy: 'moderate', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'GDPR').applies, true);
  });

  it('GDPR applies for local + non-strict privacy', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'local', privacy: 'moderate', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'GDPR').applies, true);
  });

  it('GDPR does not apply for local + strict privacy', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'local', privacy: 'strict', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'GDPR').applies, false);
  });

  it('SOC 2 applies for cloud + medium budget', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    assert.equal(findFlag(report, 'SOC 2').applies, true);
  });

  it('SOC 2 applies for hybrid + high budget', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'hybrid', privacy: 'moderate', budget: 'high' } });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'SOC 2').applies, true);
  });

  it('SOC 2 does not apply for local deployment', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'local', privacy: 'moderate', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'SOC 2').applies, false);
  });

  it('SOC 2 does not apply for cloud + free budget', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'cloud', privacy: 'moderate', budget: 'free' } });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'SOC 2').applies, false);
  });

  it('HIPAA applies for strict privacy + health keywords in use cases', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({
      role: 'backend',
      useCases: ['patient data analysis'],
      constraints: { deployment: 'cloud', privacy: 'strict', budget: 'medium' },
    });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'HIPAA').applies, true);
  });

  it('HIPAA applies for strict privacy + health keyword in role', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({
      role: 'medical software developer',
      useCases: ['codegen'],
      constraints: { deployment: 'cloud', privacy: 'strict', budget: 'medium' },
    });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'HIPAA').applies, true);
  });

  it('HIPAA does not apply without strict privacy', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({
      useCases: ['health data processing'],
      constraints: { deployment: 'cloud', privacy: 'moderate', budget: 'medium' },
    });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'HIPAA').applies, false);
  });

  it('HIPAA does not apply without health keywords', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({
      useCases: ['codegen'],
      constraints: { deployment: 'cloud', privacy: 'strict', budget: 'medium' },
    });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'HIPAA').applies, false);
  });

  it('EU AI Act always applies', () => {
    for (const deployment of ['local', 'cloud', 'hybrid']) {
      const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
      const inputs = makeInputs({ constraints: { deployment, privacy: 'moderate', budget: 'medium' } });
      const report = generateComplianceReport(model, inputs);
      assert.equal(findFlag(report, 'EU AI Act').applies, true, `EU AI Act should apply for ${deployment}`);
    }
  });

  it('export controls flag for DeepSeek (China origin)', () => {
    const model = makeModel({ family: 'DeepSeek Coder V2', name: 'DeepSeek Coder V2' });
    const report = generateComplianceReport(model, makeInputs());
    const exportFlag = findFlag(report, 'Export Controls (EAR/OFAC)');
    assert.equal(exportFlag.applies, true);
    assert.ok(exportFlag.reason.includes('China'));
  });

  it('export controls flag for Qwen (China origin)', () => {
    const model = makeModel({ family: 'Qwen 2.5', name: 'Qwen 2.5 Coder' });
    const report = generateComplianceReport(model, makeInputs());
    const exportFlag = findFlag(report, 'Export Controls (EAR/OFAC)');
    assert.equal(exportFlag.applies, true);
    assert.ok(exportFlag.reason.includes('China'));
  });

  it('no export control flag for non-China models', () => {
    for (const family of ['Mistral', 'Llama 3', 'Phi-3', 'Granite Code']) {
      const model = makeModel({ family, name: family });
      const report = generateComplianceReport(model, makeInputs());
      const exportFlag = findFlag(report, 'Export Controls (EAR/OFAC)');
      assert.equal(exportFlag.applies, false, `Export controls should not apply for ${family}`);
    }
  });

  it('CCPA applies for cloud deployments', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    assert.equal(findFlag(report, 'CCPA').applies, true);
  });

  it('CCPA does not apply for local deployments', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ constraints: { deployment: 'local', privacy: 'moderate', budget: 'medium' } });
    const report = generateComplianceReport(model, inputs);
    assert.equal(findFlag(report, 'CCPA').applies, false);
  });
});

// ── 6. Unknown model fallback ───────────────────────────────────────

describe('Unknown model fallback', () => {
  it('returns incompatible report for unrecognized family', () => {
    const model = makeModel({ family: 'totally-unknown', name: 'Mystery Model', provider: 'Nobody' });
    const report = generateComplianceReport(model, makeInputs());
    assert.equal(report.licenseReport.compatible, false);
    assert.ok(report.licenseReport.summary.includes('not recognized'));
  });

  it('fallback has high-level unknown license risk', () => {
    const model = makeModel({ family: 'totally-unknown', name: 'Mystery Model' });
    const report = generateComplianceReport(model, makeInputs());
    const unknownRisk = findRisk(report, 'Unknown license');
    assert.ok(unknownRisk);
    assert.equal(unknownRisk.level, 'high');
  });

  it('fallback has output liability risk', () => {
    const model = makeModel({ family: 'totally-unknown', name: 'Mystery Model' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(findRisk(report, 'Output liability'));
  });

  it('fallback acceptable use policy has a Notice section', () => {
    const model = makeModel({ family: 'totally-unknown', name: 'Mystery Model' });
    const report = generateComplianceReport(model, makeInputs());
    const headings = sectionHeadings(report);
    assert.ok(headings.includes('Notice'));
  });

  it('fallback still produces regulatory flags', () => {
    const model = makeModel({ family: 'totally-unknown', name: 'Mystery Model', provider: 'Nobody' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(report.regulatoryFlags.flags.length > 0);
    assert.ok(findFlag(report, 'EU AI Act').applies);
  });

  it('fallback includes disclaimer', () => {
    const model = makeModel({ family: 'totally-unknown', name: 'Mystery Model' });
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(report.disclaimer.includes('informational purposes'));
  });
});

// ── 7. Edge cases ───────────────────────────────────────────────────

describe('Edge cases', () => {
  it('handles missing constraints gracefully (defaults to cloud/moderate/medium)', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = { role: 'webdev', useCases: ['codegen'] };
    const report = generateComplianceReport(model, inputs);
    assert.ok(report.licenseReport);
    assert.ok(report.acceptableUsePolicy);
    assert.ok(report.regulatoryFlags);
  });

  it('handles empty constraints object', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = { role: 'webdev', useCases: ['codegen'], constraints: {} };
    const report = generateComplianceReport(model, inputs);
    assert.ok(report.licenseReport);
    assert.equal(report.licenseReport.compatible, true);
  });

  it('handles empty useCases array', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ useCases: [] });
    const report = generateComplianceReport(model, inputs);
    const permitted = findSection(report, 'Permitted Uses');
    assert.ok(permitted.content.includes('Software development assistance'));
  });

  it('handles missing role', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const inputs = makeInputs({ role: undefined });
    const report = generateComplianceReport(model, inputs);
    assert.ok(report.licenseReport);
  });

  it('handles empty inputs object', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, {});
    assert.ok(report.licenseReport);
    assert.ok(report.acceptableUsePolicy);
    assert.ok(report.regulatoryFlags);
  });

  it('every report includes a disclaimer', () => {
    const families = ['DeepSeek Coder V2', 'Llama 3', 'Mistral', 'WizardCoder', 'Granite Code', 'totally-unknown'];
    for (const family of families) {
      const model = makeModel({ family, name: family });
      const report = generateComplianceReport(model, makeInputs());
      assert.ok(report.disclaimer, `Missing disclaimer for ${family}`);
      assert.ok(report.disclaimer.includes('legal counsel'), `Disclaimer missing legal counsel mention for ${family}`);
    }
  });

  it('model with only id (no family or provider) still resolves if id matches', () => {
    const model = { id: 'deepseek-v3', name: 'DeepSeek V3' };
    const report = generateComplianceReport(model, makeInputs());
    assert.ok(report.licenseReport.summary.includes('MIT'));
  });

  it('model with no matching identifiers falls back to unknown', () => {
    const model = { id: 'xyz-123', name: 'XYZ Model' };
    const report = generateComplianceReport(model, makeInputs());
    assert.equal(report.licenseReport.compatible, false);
    assert.ok(report.licenseReport.summary.includes('not recognized'));
  });

  it('attribution level is medium for models with MAU cap', () => {
    const model = makeModel({ family: 'Llama 3', name: 'Llama 3 8B' });
    const report = generateComplianceReport(model, makeInputs());
    const attr = findRisk(report, 'Attribution');
    assert.ok(attr);
    assert.equal(attr.level, 'medium');
  });

  it('attribution level is low for permissive models without MAU cap', () => {
    const model = makeModel({ family: 'Mistral', name: 'Mistral 7B' });
    const report = generateComplianceReport(model, makeInputs());
    const attr = findRisk(report, 'Attribution');
    assert.ok(attr);
    assert.equal(attr.level, 'low');
  });

  it('export controls risk in license report for China-origin models', () => {
    const model = makeModel({ family: 'DeepSeek Coder V2', name: 'DeepSeek Coder V2' });
    const report = generateComplianceReport(model, makeInputs());
    const exportRisk = findRisk(report, 'Export controls');
    assert.ok(exportRisk);
    assert.equal(exportRisk.level, 'medium');
  });
});
