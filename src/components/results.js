/**
 * Results display component — renders the full recommendation output
 * with Patio Design System branding. Styled sections for primary/fallback/
 * on-device models, config, deployment details, leaderboard context, and warnings.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, Newline, useInput, useStdout } from 'ink';
import { THEME } from '../theme.js';

const C = THEME.colors;

function useTerminalSize() {
  const { stdout } = useStdout();
  const [size, setSize] = useState({ width: stdout?.columns || 80, height: stdout?.rows || 24 });

  useEffect(() => {
    if (!stdout) return;
    const handler = () => {
      setSize({ width: stdout.columns, height: stdout.rows });
    };
    stdout.on('resize', handler);
    handler();
    return () => stdout.off('resize', handler);
  }, [stdout]);

  return size;
}

// ── Utility helpers ──────────────────────────────────────────────────

function Section({ title, borderColor = 'gray', borderStyle = 'round', children, ...rest }) {
  return (
    <Box
      flexDirection="column"
      borderStyle={borderStyle}
      borderColor={borderColor}
      paddingX={2}
      paddingY={1}
      marginBottom={1}
      {...rest}
    >
      {title ? (
        <Box marginBottom={1}>
          <Text bold color={borderColor}>{title}</Text>
        </Box>
      ) : null}
      {children}
    </Box>
  );
}

function Row({ label, value, valueColor = 'white' }) {
  return (
    <Box gap={1}>
      <Text dimColor>{label}:</Text>
      <Text color={valueColor}>{String(value ?? '—')}</Text>
    </Box>
  );
}

function ScoreBar({ score }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const filled = Math.round(pct / 5);
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(20 - filled);
  const color = pct >= 80 ? C.accent : pct >= 60 ? C.warning : C.error;
  return (
    <Box gap={1}>
      <Text dimColor>Score:</Text>
      <Text color={color}>{bar}</Text>
      <Text bold color={color}> {pct}%</Text>
    </Box>
  );
}

// ── Header ───────────────────────────────────────────────────────────

function Header({ width = 40 }) {
  return (
    <Box
      flexDirection="column"
      alignItems="center"
      paddingX={4}
      paddingY={1}
      marginBottom={1}
      borderStyle="double"
      borderColor={C.accent}
      width={width}
    >
      <Text bold color={C.accent}>OSAI RECOMMENDATION</Text>
    </Box>
  );
}

// ── Primary Model ────────────────────────────────────────────────────

function PrimaryModel({ primary }) {
  if (!primary) return null;
  const { model, reason, scoreBreakdown } = primary;
  const modelName = typeof model === 'object' ? model.name : model;
  const finalScore = scoreBreakdown?.finalScore;
  const dimensions = scoreBreakdown?.dimensions;
  return (
    <Section title="PRIMARY MODEL" borderColor={C.accent}>
      <Text bold color={C.accent}>{modelName}</Text>
      {model?.params ? <Text dimColor> ({model.params})</Text> : null}
      <Newline />
      <Text italic>{reason}</Text>
      <Newline />
      <ScoreBar score={finalScore} />
      {dimensions ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor underline>SCORE BREAKDOWN</Text>
          {Object.entries(dimensions).map(([key, dim]) => (
            <Row
              key={key}
              label={key.toUpperCase()}
              value={typeof dim === 'object' ? `${Math.round(dim.weighted * 100)}% (w:${dim.weight}x)` : `${Math.round(dim * 100)}%`}
            />
          ))}
        </Box>
      ) : null}
    </Section>
  );
}

// ── Model Config ─────────────────────────────────────────────────────

function ModelConfig({ config }) {
  if (!config) return null;
  const fields = [
    ['Temperature', config.temperature],
    ['Top P', config.topP],
    ['Max Tokens', config.maxTokens?.toLocaleString()],
    ['Context Window', config.contextWindow?.toLocaleString()],
  ];
  return (
    <Section title="MODEL CONFIGURATION" borderColor={C.blue}>
      {fields.map(([label, value]) => (
        <Row key={label} label={label} value={value} valueColor={C.blue} />
      ))}
    </Section>
  );
}

// ── Deployment & Cost ────────────────────────────────────────────────

function Deployment({ primary, costEstimate, latencyEstimate }) {
  return (
    <Section title="DEPLOYMENT" borderColor={C.accent}>
      <Row
        label="Option"
        value={primary?.deploymentOption}
        valueColor={C.accent}
      />
      {costEstimate ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor underline>COST ESTIMATE</Text>
          <Row label="Local" value={costEstimate.local} valueColor={C.success} />
          <Row label="Cloud" value={costEstimate.cloud} valueColor={C.warning} />
        </Box>
      ) : null}
      {latencyEstimate ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor underline>LATENCY ESTIMATE</Text>
          <Row label="Local" value={latencyEstimate.local} valueColor={C.success} />
          <Row label="Cloud" value={latencyEstimate.cloud} valueColor={C.warning} />
        </Box>
      ) : null}
    </Section>
  );
}

// ── Quick Start ─────────────────────────────────────────────────────

function QuickStart({ quickStart }) {
  if (!quickStart || !quickStart.commands || Object.keys(quickStart.commands).length === 0) return null;

  const TOOL_LABELS = {
    ollama: 'Ollama',
    'llama.cpp': 'llama.cpp',
    vllm: 'vLLM (Docker)',
    huggingface: 'HuggingFace TGI',
    'lm-studio': 'LM Studio',
  };

  const recommended = quickStart.recommended;
  const entries = Object.entries(quickStart.commands);

  return (
    <Section title="QUICK START" borderColor={C.accent}>
      <Text dimColor>Get running in 60 seconds:</Text>
      <Newline />
      {entries.map(([tool, cmd]) => {
        const isRec = tool === recommended;
        return (
          <Box key={tool} flexDirection="column" marginBottom={1}>
            <Box gap={1}>
              {isRec ? <Text color={C.accent} bold>{'\u2605'}</Text> : <Text dimColor> </Text>}
              <Text color={isRec ? C.accent : 'white'} bold={isRec}>
                {TOOL_LABELS[tool] || tool}
                {isRec ? ' (recommended)' : ''}
              </Text>
            </Box>
            <Box paddingLeft={3}>
              <Text color={isRec ? C.accent : 'gray'}>{cmd}</Text>
            </Box>
          </Box>
        );
      })}
    </Section>
  );
}

// ── License Guidance ────────────────────────────────────────────────

function LicenseGuidance({ guidance }) {
  if (!guidance || !guidance.details) return null;

  const riskColors = { low: C.success || C.accent, medium: C.warning, high: C.error };
  const riskColor = riskColors[guidance.riskLevel] || 'white';
  const riskIcons = { low: '\u2705', medium: '\u26A0\uFE0F', high: '\u274C' };
  const riskIcon = riskIcons[guidance.riskLevel] || '';

  const d = guidance.details;

  return (
    <Section title="LICENSE GUIDANCE" borderColor={riskColor}>
      <Box gap={1} marginBottom={1}>
        <Text>{riskIcon}</Text>
        <Text bold color={riskColor}>{guidance.summary}</Text>
      </Box>

      <Box flexDirection="column">
        <Row label="License" value={d.spdx} valueColor={riskColor} />
        <Row label="Commercial use" value={d.commercialUse.allowed ? 'Yes' : 'No'} valueColor={d.commercialUse.allowed ? C.accent : C.error} />
        <Row label="Fine-tuning" value={d.fineTuning.allowed ? 'Yes' : 'No'} valueColor={d.fineTuning.allowed ? C.accent : C.error} />
        <Row label="Output ownership" value={d.outputOwnership.status === 'user' ? 'You own outputs' : d.outputOwnership.note} valueColor="white" />
        <Row label="Training data" value={d.trainingData.note} valueColor={d.trainingData.status === 'open' ? C.accent : C.warning} />
        <Row label="Attribution" value={d.attribution.required ? 'Required' : 'Not required'} valueColor="white" />
      </Box>

      {guidance.actionItems.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor underline>ACTION ITEMS</Text>
          {guidance.actionItems.map((item, i) => (
            <Box key={i} gap={1}>
              <Text color={C.warning}>{'\u2022'}</Text>
              <Text color={C.warning} wrap="wrap">{item}</Text>
            </Box>
          ))}
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text dimColor italic>{guidance.disclaimer}</Text>
      </Box>
    </Section>
  );
}

// ── Compliance Report ──────────────────────────────────────────────

function ComplianceReport({ report }) {
  if (!report) return null;
  const lr = report.licenseReport;
  const riskColor = lr.compatible ? C.accent : C.error;

  return (
    <Section title="COMPLIANCE REPORT" borderColor={riskColor}>
      <Box marginBottom={1}>
        <Text bold color={riskColor}>{lr.summary}</Text>
      </Box>

      {lr.risks.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor underline>RISK ASSESSMENT</Text>
          {lr.risks.map((risk, i) => {
            const rc = risk.level === 'critical' || risk.level === 'high' ? C.error : risk.level === 'medium' ? C.warning : C.accent;
            return (
              <Box key={i} gap={1}>
                <Text color={rc}>[{risk.level.toUpperCase()}]</Text>
                <Text bold>{risk.area}:</Text>
                <Text wrap="wrap">{risk.detail}</Text>
              </Box>
            );
          })}
        </Box>
      ) : null}

      {report.regulatoryFlags.flags.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor underline>REGULATORY FLAGS</Text>
          {report.regulatoryFlags.flags.filter(f => f.applies).map((flag, i) => (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Box gap={1}>
                <Text color={C.warning} bold>{flag.regulation}</Text>
                <Text dimColor>— {flag.reason}</Text>
              </Box>
              <Box paddingLeft={2}>
                <Text color={C.accent}>Action: {flag.action}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}

      <Box marginTop={1}>
        <Text dimColor italic>{report.disclaimer}</Text>
      </Box>
    </Section>
  );
}

// ── Model Card ────────────────────────────────────────────────────

function ModelCardSection({ modelCard }) {
  if (!modelCard) return null;

  return (
    <Section title="MODEL CARD" borderColor="gray">
      <Box flexDirection="column" marginBottom={1}>
        <Text dimColor underline>INTENDED USE</Text>
        <Text>{modelCard.intendedUse.primary}</Text>
        <Box marginTop={1} gap={1}>
          <Text dimColor>Best for:</Text>
          <Text color={C.accent}>{modelCard.intendedUse.bestFor.join(', ')}</Text>
        </Box>
        <Box gap={1}>
          <Text dimColor>Not for:</Text>
          <Text color={C.warning}>{modelCard.intendedUse.notRecommendedFor.join(', ')}</Text>
        </Box>
      </Box>

      {modelCard.limitations.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor underline>KNOWN LIMITATIONS</Text>
          {modelCard.limitations.map((lim, i) => {
            const sc = lim.severity === 'high' ? C.error : lim.severity === 'medium' ? C.warning : C.accent;
            return (
              <Box key={i} gap={1}>
                <Text color={sc}>[{lim.severity}]</Text>
                <Text wrap="wrap">{lim.description}</Text>
              </Box>
            );
          })}
        </Box>
      ) : null}

      {modelCard.knownFailureModes.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor underline>FAILURE MODES</Text>
          {modelCard.knownFailureModes.map((mode, i) => (
            <Box key={i} gap={1}>
              <Text color={C.warning}>{'\u2022'}</Text>
              <Text wrap="wrap">{mode}</Text>
            </Box>
          ))}
        </Box>
      ) : null}

      <Text dimColor italic>{modelCard.trainingDataNotes}</Text>
    </Section>
  );
}

// ── Safety & Moderation ───────────────────────────────────────────

function SafetySection({ safety }) {
  if (!safety) return null;
  const rc = safety.riskLevel === 'high' ? C.error : safety.riskLevel === 'medium' ? C.warning : C.accent;

  return (
    <Section title="SAFETY & MODERATION" borderColor={rc}>
      <Box marginBottom={1} gap={1}>
        <Text bold color={rc}>Risk: {safety.riskLevel.toUpperCase()}</Text>
        <Text dimColor>— {safety.riskSummary}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Row label="Built-in safety" value={safety.builtInSafety.hasSafetyTraining ? 'Yes' : 'No'} valueColor={safety.builtInSafety.hasSafetyTraining ? C.accent : C.error} />
        <Text dimColor>{safety.builtInSafety.description}</Text>
      </Box>

      {safety.guardrails.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor underline>RECOMMENDED GUARDRAILS</Text>
          {safety.guardrails.slice(0, 3).map((g, i) => (
            <Box key={i} flexDirection="column" marginBottom={1}>
              <Box gap={1}>
                <Text bold color={C.accent}>{g.name}</Text>
                <Text dimColor>({g.type})</Text>
              </Box>
              <Box paddingLeft={2} flexDirection="column">
                <Text dimColor>{g.description}</Text>
                <Text color={C.accent}>{g.setup}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      ) : null}

      {safety.codeSpecificRisks.length > 0 ? (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor underline>CODE-SPECIFIC RISKS</Text>
          {safety.codeSpecificRisks.map((risk, i) => {
            const sc2 = risk.severity === 'high' ? C.error : risk.severity === 'medium' ? C.warning : C.accent;
            return (
              <Box key={i} gap={1}>
                <Text color={sc2}>[{risk.severity}]</Text>
                <Text bold>{risk.risk}:</Text>
                <Text wrap="wrap">{risk.mitigation}</Text>
              </Box>
            );
          })}
        </Box>
      ) : null}

      <Box flexDirection="column">
        <Text dimColor underline>PRODUCTION CHECKLIST</Text>
        {safety.productionChecklist.map((item, i) => (
          <Box key={i} gap={1}>
            <Text color={C.accent}>{'\u2610'}</Text>
            <Text>{item}</Text>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

// ── Integration Snippet ─────────────────────────────────────────────

function IntegrationSnippet({ snippet }) {
  if (!snippet || !snippet.framework) return null;

  return (
    <Section title={`INTEGRATION — ${snippet.framework.toUpperCase()} (${snippet.runtime})`} borderColor={C.blue || C.teal}>
      <Text dimColor>{snippet.note}</Text>
      <Newline />
      <Box borderStyle="round" borderColor="gray" paddingX={1} paddingY={0}>
        <Text color="white" wrap="wrap">{snippet.snippet}</Text>
      </Box>
      {snippet.dependencies && snippet.dependencies.length > 0 ? (
        <Box flexDirection="column" marginTop={1}>
          <Text dimColor underline>INSTALL</Text>
          {snippet.dependencies.map((dep, i) => (
            <Text key={i} color={C.accent}>{dep}</Text>
          ))}
        </Box>
      ) : null}
    </Section>
  );
}

// ── Prompt Template ──────────────────────────────────────────────────

function PromptTemplate({ template }) {
  if (!template) return null;
  const label = typeof template === 'object' ? template.label : null;
  const body = typeof template === 'object' ? template.template : template;
  return (
    <Section title={label ? `PROMPT TEMPLATE — ${label.toUpperCase()}` : 'PROMPT TEMPLATE'} borderColor="gray" borderStyle="single">
      <Box borderStyle="round" borderColor="gray" paddingX={1} paddingY={0}>
        <Text color="white" wrap="wrap">{body}</Text>
      </Box>
    </Section>
  );
}

// ── Fallback Model ───────────────────────────────────────────────────

function FallbackModel({ fallback }) {
  if (!fallback) return null;
  return (
    <Section title="FALLBACK MODEL" borderColor={C.teal}>
      <Text bold color={C.teal}>{typeof fallback.model === 'object' ? fallback.model.name : fallback.model}</Text>
      <Newline />
      <Text italic>{fallback.reason}</Text>
      <Newline />
      <ScoreBar score={fallback.scoreBreakdown?.finalScore} />
      {fallback.deploymentOption ? (
        <Row label="Deployment" value={fallback.deploymentOption} valueColor={C.teal} />
      ) : null}
    </Section>
  );
}

// ── On-Device Option ─────────────────────────────────────────────────

function OnDevice({ onDevice }) {
  if (!onDevice) return null;
  return (
    <Section title="ON-DEVICE OPTION" borderColor={C.accentDim}>
      <Text bold color={C.accentDim}>{typeof onDevice.model === 'object' ? onDevice.model.name : onDevice.model}</Text>
      <Newline />
      <Text italic>{onDevice.reason}</Text>
      <Newline />
      <ScoreBar score={onDevice.scoreBreakdown?.finalScore} />
      {onDevice.config ? (
        <Box flexDirection="column" marginTop={1}>
          {Object.entries(onDevice.config).map(([k, v]) => (
            <Row key={k} label={k} value={v} valueColor={C.accentDim} />
          ))}
        </Box>
      ) : null}
    </Section>
  );
}

// ── Leaderboard Context ──────────────────────────────────────────────

function LeaderboardContext({ leaderboards, primaryModel, fallbackModel }) {
  if (!leaderboards) return null;

  const rankings = [];

  const findRank = (list, modelName) => {
    if (!list || !Array.isArray(list)) return null;
    const idx = list.findIndex(
      (entry) =>
        (entry.modelId || entry.model || '').toLowerCase().includes(modelName.toLowerCase()),
    );
    return idx >= 0 ? idx + 1 : null;
  };

  for (const rawModel of [primaryModel, fallbackModel].filter(Boolean)) {
    const modelName2 = typeof rawModel === 'object' ? rawModel.name : rawModel;
    if (!modelName2) continue;
    const name = modelName2.replace(/[_-]/g, ' ');

    if (leaderboards.huggingface) {
      const rank = findRank(leaderboards.huggingface, name);
      if (rank) rankings.push({ model: modelName2, board: 'HuggingFace Open LLM', rank });
    }
    if (leaderboards.swebench) {
      const rank = findRank(leaderboards.swebench, name);
      if (rank) rankings.push({ model: modelName2, board: 'SWE-bench Verified', rank });
    }
    if (leaderboards.aider) {
      const rank = findRank(leaderboards.aider, name);
      if (rank) rankings.push({ model: modelName2, board: 'Aider Polyglot', rank });
    }
  }

  if (rankings.length === 0) return null;

  return (
    <Section title="LEADERBOARD RANKINGS" borderColor="white">
      {rankings.map((r, i) => (
        <Box key={i} gap={1}>
          <Text color={C.accent}>#{r.rank}</Text>
          <Text dimColor>{r.board}</Text>
          <Text bold>{r.model}</Text>
        </Box>
      ))}
      {leaderboards.fetchedAt ? (
        <Box marginTop={1}>
          <Text dimColor>Data fetched: {leaderboards.fetchedAt}</Text>
        </Box>
      ) : null}
      {leaderboards.errors?.length ? (
        <Box marginTop={1}>
          <Text color={C.warning} dimColor>
            ({leaderboards.errors.length} source(s) unavailable)
          </Text>
        </Box>
      ) : null}
    </Section>
  );
}

// ── RAG Advisory ─────────────────────────────────────────────────────

function RagAdvisory({ ragRecommended, ragReason }) {
  if (!ragRecommended) return null;
  return (
    <Box
      borderStyle="round"
      borderColor={C.warning}
      paddingX={2}
      paddingY={1}
      marginBottom={1}
    >
      <Box flexDirection="column">
        <Text bold color={C.warning}>RAG RECOMMENDED</Text>
        <Newline />
        <Text color={C.warning} wrap="wrap">
          {ragReason || 'Consider adding retrieval-augmented generation for better results with your data.'}
        </Text>
      </Box>
    </Box>
  );
}

// ── Warnings ─────────────────────────────────────────────────────────

function Warnings({ warnings }) {
  if (!warnings || warnings.length === 0) return null;
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={C.error}
      paddingX={2}
      paddingY={1}
      marginBottom={1}
    >
      <Text bold color={C.error}>WARNINGS</Text>
      <Newline />
      {warnings.map((w, i) => (
        <Box key={i} gap={1}>
          <Text color={C.error}>{'\u2022'}</Text>
          <Text color={C.error} wrap="wrap">{w}</Text>
        </Box>
      ))}
    </Box>
  );
}

// ── Tab Navigation ─────────────────────────────────────────────────────

function MainTabs({ activeTab, tabs, onChange }) {
  useInput((input, key) => {
    const num = parseInt(input, 10);
    if (!isNaN(num) && num >= 1 && num <= tabs.length) {
      onChange(tabs[num - 1].key);
    }
    if (key.left) {
      const idx = tabs.findIndex(t => t.key === activeTab);
      const newIdx = idx > 0 ? idx - 1 : tabs.length - 1;
      onChange(tabs[newIdx].key);
    }
    if (key.right) {
      const idx = tabs.findIndex(t => t.key === activeTab);
      const newIdx = idx < tabs.length - 1 ? idx + 1 : 0;
      onChange(tabs[newIdx].key);
    }
  });

  return (
    <Box flexDirection="row" gap={2} marginBottom={1}>
      {tabs.map((tab, idx) => (
        <Box key={tab.key}>
          {tab.key === activeTab ? (
            <Text bold color={C.accent}>{idx + 1}. {tab.label}</Text>
          ) : (
            <Text dimColor>  {idx + 1}. {tab.label}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

// ── Sub Tab Navigation ────────────────────────────────────────────────────

function SubTabs({ activeSubTab, onChange }) {
  const subTabs = [
    { key: 'model', label: 'Model', shortcut: 'm' },
    { key: 'info', label: 'Info', shortcut: 'i' },
    { key: 'use', label: 'Use', shortcut: 'u' },
    { key: 'prompt', label: 'Prompt', shortcut: 'p' },
    { key: 'safety', label: 'Safety', shortcut: 's' },
    { key: 'compliance', label: 'Compliance', shortcut: 'c' },
  ];

  useInput((input, key) => {
    const num = parseInt(input, 10);
    if (!isNaN(num) && num >= 1 && num <= subTabs.length) {
      onChange(subTabs[num - 1].key);
    }
    if (key.left) {
      const idx = subTabs.findIndex(t => t.key === activeSubTab);
      const newIdx = idx > 0 ? idx - 1 : subTabs.length - 1;
      onChange(subTabs[newIdx].key);
    }
    if (key.right) {
      const idx = subTabs.findIndex(t => t.key === activeSubTab);
      const newIdx = idx < subTabs.length - 1 ? idx + 1 : 0;
      onChange(subTabs[newIdx].key);
    }
    const shortcut = input.toLowerCase();
    const found = subTabs.find(t => t.shortcut === shortcut);
    if (found) {
      onChange(found.key);
    }
  });

  return (
    <Box flexDirection="row" gap={2} marginBottom={1}>
      {subTabs.map((tab, idx) => (
        <Box key={tab.key}>
          {idx > 0 && <Text dimColor>|</Text>}
          {tab.key === activeSubTab ? (
            <Text bold color={C.accent}>[{tab.shortcut}] {tab.label}</Text>
          ) : (
            <Text dimColor>  ({tab.shortcut}) {tab.label}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

function SingleModelView({ recommendation, leaderboards, repoData, terminalSize, showRepoOnly }) {
  const { width = 80, height = 24 } = terminalSize || {};
  const [activeSubTab, setActiveSubTab] = useState('model');
  const { primary, fallback, costEstimate, latencyEstimate, ragRecommended, ragReason, warnings } = recommendation;

  const maxWidth = Math.min(width - 2, 120);

  const hasRepo = !!repoData?.analysis;
  const analysis = repoData?.analysis;

  if (showRepoOnly && hasRepo) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1} width={maxWidth} height={height - 6} overflow="hidden">
        <Header width={maxWidth} />
        <Box marginBottom={1}>
          <Box flexDirection="column" borderStyle="round" borderColor={C.accent} paddingX={2} paddingY={1}>
            <Text bold color={C.accent}>REPO ANALYSIS</Text>
            <Text dimColor>{analysis.path}</Text>
            <Box gap={2}>
              <Text dimColor>Files:</Text>
              <Text>{analysis.fileCount}</Text>
              <Text dimColor>Lines:</Text>
              <Text>{analysis.totalLines.toLocaleString()}</Text>
            </Box>
            <Box gap={1}>
              <Text dimColor>Languages:</Text>
              <Text color={C.accent}>{analysis.languages.map((l) => `${l.name} (${l.files})`).join(', ')}</Text>
            </Box>
          </Box>
        </Box>
        <Box justifyContent="center" marginTop={1}>
          <Text dimColor>Powered by </Text>
          <Text bold color={C.accent}>OSAI</Text>
          <Text dimColor> — open source AI kit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} width={maxWidth} height={height - 6} overflow="hidden">
      <Header width={maxWidth} />
      <SubTabs activeSubTab={activeSubTab} onChange={setActiveSubTab} />
      
      {activeSubTab === 'model' && (
        <>
          <PrimaryModel primary={primary} />
          <ModelCardSection modelCard={primary?.modelCard} />
          <LeaderboardContext leaderboards={leaderboards} primaryModel={primary?.model} fallbackModel={fallback?.model} />
          <RagAdvisory ragRecommended={ragRecommended} ragReason={ragReason} />
        </>
      )}

      {activeSubTab === 'info' && (
        <>
          <ModelConfig config={primary?.config} />
          <Warnings warnings={warnings} />
        </>
      )}

      {activeSubTab === 'use' && (
        <>
          <Deployment primary={primary} costEstimate={costEstimate} latencyEstimate={latencyEstimate} />
          <QuickStart quickStart={primary?.quickStart} />
        </>
      )}

      {activeSubTab === 'prompt' && (
        <>
          <PromptTemplate template={primary?.promptTemplate} />
        </>
      )}

      {activeSubTab === 'safety' && (
        <>
          <SafetySection safety={primary?.safetyRecommendation} />
          <LicenseGuidance guidance={primary?.licenseGuidance} />
        </>
      )}

      {activeSubTab === 'compliance' && (
        <>
          <ComplianceReport report={primary?.complianceReport} />
          <IntegrationSnippet snippet={primary?.integrationSnippet} />
        </>
      )}
      
      <Box justifyContent="center" marginTop={1}>
        <Text dimColor>Powered by </Text>
        <Text bold color={C.accent}>OSAI</Text>
        <Text dimColor> — open source AI kit</Text>
      </Box>
    </Box>
  );
}

function FallbackOnlyView({ fallback, terminalSize }) {
  const { width = 80, height = 24 } = terminalSize || {};
  const maxWidth = Math.min(width - 2, 120);
  const [activeSubTab, setActiveSubTab] = useState('model');

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} width={maxWidth} height={height - 6} overflow="hidden">
      <Header width={maxWidth} />
      
      <FallbackModel fallback={fallback} />

      <Box justifyContent="center" marginTop={1}>
        <Text dimColor>Powered by </Text>
        <Text bold color={C.accent}>OSAI</Text>
        <Text dimColor> — open source AI kit</Text>
      </Box>
    </Box>
  );
}

function OnDeviceOnlyView({ onDevice, terminalSize }) {
  const { width = 80, height = 24 } = terminalSize || {};
  const maxWidth = Math.min(width - 2, 120);

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1} width={maxWidth} height={height - 6} overflow="hidden">
      <Header width={maxWidth} />
      
      <OnDevice onDevice={onDevice} />

      <Box justifyContent="center" marginTop={1}>
        <Text dimColor>Powered by </Text>
        <Text bold color={C.accent}>OSAI</Text>
        <Text dimColor> — open source AI kit</Text>
      </Box>
    </Box>
  );
}

export default function Results({ recommendation, leaderboards, repoData, terminalSize }) {
  const { width = 80, height = 24 } = terminalSize || {};
  const hasRepo = !!repoData?.analysis;
  const [activeTab, setActiveTab] = useState(hasRepo ? 'repo' : 'primary');

  if (!recommendation) {
    return (
      <Box padding={2}>
        <Text color={C.error}>No recommendation data available.</Text>
      </Box>
    );
  }

  const { primary, fallback, onDevice } = recommendation;
  const hasFallback = !!fallback;
  const hasOnDevice = !!onDevice;

  let tabs;
  if (hasRepo) {
    tabs = [
      { key: 'repo', label: 'Repo' },
      { key: 'primary', label: 'Primary' },
      ...(hasFallback ? [{ key: 'fallback', label: 'Fallback' }] : []),
      ...(hasOnDevice ? [{ key: 'ondevice', label: 'On-Device' }] : []),
    ];
  } else {
    tabs = [
      { key: 'primary', label: 'Primary' },
      ...(hasFallback ? [{ key: 'fallback', label: 'Fallback' }] : []),
      ...(hasOnDevice ? [{ key: 'ondevice', label: 'On-Device' }] : []),
    ];
  }

  return (
    <Box flexDirection="column" width={width} height={height}>
      <MainTabs activeTab={activeTab} tabs={tabs} onChange={setActiveTab} />
      {hasRepo && activeTab === 'repo' && <SingleModelView recommendation={recommendation} leaderboards={leaderboards} repoData={repoData} showRepoOnly={true} terminalSize={{ width, height }} />}
      {activeTab === 'primary' && <SingleModelView recommendation={recommendation} leaderboards={leaderboards} terminalSize={{ width, height }} />}
      {activeTab === 'fallback' && hasFallback && <FallbackOnlyView fallback={fallback} terminalSize={{ width, height }} />}
      {activeTab === 'ondevice' && hasOnDevice && <OnDeviceOnlyView onDevice={onDevice} terminalSize={{ width, height }} />}
    </Box>
  );
}
