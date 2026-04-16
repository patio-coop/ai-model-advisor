/**
 * Main app component — orchestrates the full TUI flow:
 *   welcome  ->  wizard  ->  loading  ->  results
 *
 * OSAI Design System branding applied throughout.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Text, Newline, useStdout } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import Wizard from './components/wizard.js';
import Results from './components/results.js';
import Loading from './components/loading.js';
import { recommend } from './engine/rules.js';
import { fetchAllLeaderboards, enrichModelWithLeaderboardData } from './api/index.js';
import { THEME } from './theme.js';

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

// ── OSAI Header — reused across wizard/loading screens ───────────────

function OsaiHeader({ compact = false }) {
  if (compact) {
    return (
      <Box marginBottom={1} gap={1}>
        <Text bold color={THEME.colors.accent}>OSAI</Text>
        <Text dimColor>|</Text>
        <Text color={THEME.colors.textSecondary}>{THEME.brand.tagline}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box gap={1}>
        <Text bold color={THEME.colors.accent}>OSAI</Text>
        <Text color={THEME.colors.textSecondary}>— {THEME.brand.tagline}</Text>
      </Box>
    </Box>
  );
}

// ── Repo Analysis Summary ────────────────────────────────────────────

function RepoSummary({ analysis }) {
  if (!analysis) return null;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={THEME.colors.accent} paddingX={2} paddingY={1} marginBottom={1}>
      <Box marginBottom={1}>
        <Text bold color={THEME.colors.accent}>REPO ANALYSIS</Text>
        <Text dimColor>  {analysis.path}</Text>
      </Box>

      <Box gap={2}>
        <Text dimColor>Files:</Text>
        <Text>{analysis.fileCount}</Text>
        <Text dimColor>Lines:</Text>
        <Text>{analysis.totalLines.toLocaleString()}</Text>
        <Text dimColor>Context:</Text>
        <Text>{analysis.contextNeeds}</Text>
      </Box>

      <Box marginTop={1} gap={1}>
        <Text dimColor>Languages:</Text>
        <Text color={THEME.colors.accent}>
          {analysis.languages.map((l) => `${l.name} (${l.files})`).join(', ')}
        </Text>
      </Box>

      {analysis.frameworks.length > 0 ? (
        <Box gap={1}>
          <Text dimColor>Frameworks:</Text>
          <Text>{analysis.frameworks.join(', ')}</Text>
        </Box>
      ) : null}

      <Box gap={2}>
        <Box gap={1}>
          <Text dimColor>Role:</Text>
          <Text>{analysis.role}</Text>
        </Box>
        <Box gap={1}>
          <Text dimColor>Runtime:</Text>
          <Text>{analysis.runtime}</Text>
        </Box>
        <Box gap={1}>
          <Text dimColor>Platform:</Text>
          <Text>{analysis.platform}</Text>
        </Box>
      </Box>

      <Box gap={1}>
        <Text dimColor>Use cases:</Text>
        <Text>{analysis.useCases.join(', ')}</Text>
      </Box>
    </Box>
  );
}

// ── Main App ─────────────────────────────────────────────────────────

export default function App({ repoData }) {
  const { width, height } = useTerminalSize();
  const hasRepo = repoData != null;
  const [stage, setStage] = useState(hasRepo ? 'loading' : 'welcome');
  const [answers, setAnswers] = useState(hasRepo ? repoData.inputs : null);
  const [recommendation, setRecommendation] = useState(null);
  const [leaderboards, setLeaderboards] = useState(null);
  const [sourceStatus, setSourceStatus] = useState({
    huggingface: 'pending',
    swebench: 'pending',
    aider: 'pending',
    livecodebench: 'pending',
    bigcodebench: 'pending',
  });

  // Auto-advance from welcome after a brief pause
  useEffect(() => {
    if (stage !== 'welcome') return;
    const timer = setTimeout(() => setStage('wizard'), 1500);
    return () => clearTimeout(timer);
  }, [stage]);

  // Handle wizard completion
  const onWizardComplete = useCallback((wizardAnswers) => {
    setAnswers(wizardAnswers);
    setStage('loading');
  }, []);

  // Fetch leaderboards & run engine once we enter loading stage
  useEffect(() => {
    if (stage !== 'loading' || !answers) return;

    let cancelled = false;

    async function run() {
      // Show loading for at least 1 second when repo is provided
      if (hasRepo) {
        await new Promise(r => setTimeout(r, 1000));
        if (cancelled) return;
      }

      // Fetch leaderboards with per-source status tracking
      let leaderboardData = null;
      try {
        leaderboardData = await fetchAllLeaderboards({
          onSourceComplete: (source, status) => {
            if (!cancelled) {
              setSourceStatus((prev) => ({ ...prev, [source]: status }));
            }
          },
        });
      } catch {
        // Leaderboards are optional — continue without them
      }

      if (cancelled) return;
      setLeaderboards(leaderboardData);

      // Run the recommendation engine
      let result;
      try {
        result = recommend(answers, leaderboardData);

        // Enrich with leaderboard data if available
        if (leaderboardData && result) {
          result = enrichModelWithLeaderboardData(result, leaderboardData);
        }
      } catch (err) {
        result = {
          primary: {
            model: 'Error',
            reason: `Engine error: ${err.message}`,
            config: {},
            deploymentOption: '—',
            promptTemplate: null,
            score: 0,
            scoreBreakdown: {},
          },
          fallback: null,
          onDevice: null,
          costEstimate: null,
          latencyEstimate: null,
          ragRecommended: false,
          ragReason: null,
          warnings: [`Recommendation engine encountered an error: ${err.message}`],
        };
      }

      if (!cancelled) {
        setRecommendation(result);
        setStage('results');
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [stage, answers, hasRepo]);

  // ── Welcome screen ───────────────────────────────────────────────

  if (stage === 'welcome') {
    return (
      <Box flexDirection="column" alignItems="center" paddingY={1}>
        {/* Globe decoration */}
        <Box marginBottom={1}>
          <Text color={THEME.colors.accent} dimColor>{THEME.logo}</Text>
        </Box>

        {/* OSAI BigText with green gradient */}
        <Gradient name="mind">
          <BigText text="OSAI" font="chrome" />
        </Gradient>

        {/* Subtitle */}
        <Text bold color={THEME.colors.accent}>{THEME.brand.tagline}</Text>
        <Newline />

        {/* Tagline */}
        <Text color={THEME.colors.textSecondary}>{THEME.brand.subtitle}</Text>

        {/* Loading hint */}
        <Box marginTop={1}>
          <Text dimColor>Starting wizard...</Text>
        </Box>
      </Box>
    );
  }

  // ── Wizard screen ────────────────────────────────────────────────

  if (stage === 'wizard') {
    return (
      <Box flexDirection="column" paddingX={1}>
        <OsaiHeader />
        <Wizard onComplete={onWizardComplete} />
      </Box>
    );
  }

  // ── Loading screen ───────────────────────────────────────────────

  if (stage === 'loading') {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <OsaiHeader />
        {hasRepo ? <RepoSummary analysis={repoData.analysis} /> : null}
        <Loading sourceStatus={sourceStatus} />
      </Box>
    );
  }

  // ── Results screen ───────────────────────────────────────────────

  if (stage === 'results') {
    return (
      <Box flexDirection="column" width={width} height={height}>
        <Results recommendation={recommendation} leaderboards={leaderboards} repoData={hasRepo ? repoData : null} terminalSize={{ width, height }} />
      </Box>
    );
  }

  return null;
}
