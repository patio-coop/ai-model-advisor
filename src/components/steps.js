import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';

// ─── Patio Design System ────────────────────────────────────────────
// Accent: green (#35FF38)  |  Text: white  |  Secondary: gray
// UPPERCASE section titles  |  Green indicators throughout

// ─── Shared helpers ──────────────────────────────────────────────────

const Hint = ({ children }) => (
  <Box marginTop={1}>
    <Text color="gray" dimColor>{children}</Text>
  </Box>
);

const Label = ({ children }) => (
  <Box marginBottom={1}>
    <Text bold color="white">{children}</Text>
  </Box>
);

// Green indicator item for SelectInput
const IndicatorComponent = ({ isSelected }) => (
  <Text color="green">{isSelected ? '\u276F ' : '  '}</Text>
);

// Green-highlighted item for SelectInput
const ItemComponent = ({ isSelected, label }) => (
  <Text color={isSelected ? 'green' : 'white'} bold={isSelected}>{label}</Text>
);

// ─── Step 1: Role ────────────────────────────────────────────────────

const ROLES = [
  { label: 'Web Development    \u2014 frontend, full-stack, SSR', value: 'webdev' },
  { label: 'Backend / API      \u2014 services, data pipelines', value: 'backend' },
  { label: 'Mobile             \u2014 iOS, Android, cross-platform', value: 'mobile' },
  { label: 'Games              \u2014 engines, shaders, tooling', value: 'games' },
];

export const StepRole = ({ value, onChange }) => (
  <Box flexDirection="column">
    <Label>WHAT KIND OF DEVELOPMENT DO YOU DO?</Label>
    <SelectInput
      items={ROLES}
      initialIndex={ROLES.findIndex((r) => r.value === value) >= 0 ? ROLES.findIndex((r) => r.value === value) : 0}
      onSelect={(item) => item && onChange(item.value)}
      indicatorComponent={IndicatorComponent}
      itemComponent={ItemComponent}
    />
    <Hint>Use arrow keys to move, Enter to select</Hint>
  </Box>
);

// ─── Step 2: Tech Stack (mini-wizard) ────────────────────────────────

const RUNTIMES = [
  { label: 'Node.js', value: 'node' },
  { label: 'Python', value: 'python' },
  { label: 'Rust', value: 'rust' },
  { label: 'JVM (Java/Kotlin)', value: 'jvm' },
  { label: '.NET (C#/F#)', value: 'dotnet' },
  { label: 'Go', value: 'go' },
];

const PLATFORMS = [
  { label: 'Browser', value: 'browser' },
  { label: 'Server', value: 'server' },
  { label: 'iOS', value: 'ios' },
  { label: 'Android', value: 'android' },
  { label: 'Console / CLI', value: 'console' },
  { label: 'PC / Desktop', value: 'pc' },
];

const SUB_FIELDS = ['languages', 'frameworks', 'runtime', 'platform'];
const SUB_LABELS = {
  languages: 'LANGUAGES (comma-separated)',
  frameworks: 'FRAMEWORKS / LIBRARIES (comma-separated)',
  runtime: 'PRIMARY RUNTIME',
  platform: 'TARGET PLATFORM',
};

export const StepStack = ({ value, onChange }) => {
  const data = value || { languages: '', frameworks: '', runtime: '', platform: '' };
  const [fieldIdx, setFieldIdx] = useState(0);
  const field = SUB_FIELDS[fieldIdx];

  const update = (key, val) => onChange({ ...data, [key]: val });

  const advanceField = () => {
    if (fieldIdx < SUB_FIELDS.length - 1) {
      setFieldIdx(fieldIdx + 1);
    }
  };

  // Handle Enter in text inputs to advance to next sub-field
  const handleTextSubmit = () => advanceField();

  // Handle select inputs — advance and also act as final submit if last
  const handleSelectSubmit = (item) => {
    update(field, item.value);
    if (fieldIdx < SUB_FIELDS.length - 1) {
      setFieldIdx(fieldIdx + 1);
    }
    // If last field, the parent wizard handles "done" via the onChange + Enter
  };

  useInput((input, key) => {
    if (key.shift && key.tab) {
      if (fieldIdx > 0) setFieldIdx(fieldIdx - 1);
    } else if (key.tab && !key.shift) {
      advanceField();
    }
  });

  const renderSubIndicator = () => (
    <Box marginBottom={1} gap={1}>
      {SUB_FIELDS.map((f, i) => (
        <Text key={f} color={i <= fieldIdx ? 'green' : 'gray'} bold={i === fieldIdx}>
          {i < fieldIdx ? '\u2713' : i === fieldIdx ? '\u25B6' : '\u25CB'}{' '}
          {SUB_LABELS[f].split(' ')[0]}
        </Text>
      ))}
    </Box>
  );

  const renderField = () => {
    switch (field) {
      case 'languages':
      case 'frameworks':
        return (
          <Box flexDirection="column">
            <Label>{SUB_LABELS[field]}</Label>
            <Box>
              <Text color="green">&gt; </Text>
              <TextInput
                value={data[field] || ''}
                onChange={(val) => update(field, val)}
                onSubmit={handleTextSubmit}
                placeholder={field === 'languages' ? 'e.g. TypeScript, Python, Rust' : 'e.g. React, FastAPI, Axum'}
              />
            </Box>
          </Box>
        );
      case 'runtime':
        return (
          <Box flexDirection="column">
            <Label>{SUB_LABELS[field]}</Label>
            <SelectInput
              items={RUNTIMES}
              initialIndex={Math.max(0, RUNTIMES.findIndex((r) => r.value === data.runtime))}
              onSelect={(item) => item && handleSelectSubmit(item)}
              indicatorComponent={IndicatorComponent}
              itemComponent={ItemComponent}
            />
          </Box>
        );
      case 'platform':
        return (
          <Box flexDirection="column">
            <Label>{SUB_LABELS[field]}</Label>
            <SelectInput
              items={PLATFORMS}
              initialIndex={Math.max(0, PLATFORMS.findIndex((p) => p.value === data.platform))}
              onSelect={(item) => item && handleSelectSubmit(item)}
              indicatorComponent={IndicatorComponent}
              itemComponent={ItemComponent}
            />
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Box flexDirection="column">
      {renderSubIndicator()}
      {renderField()}
      <Hint>
        {field === 'languages' || field === 'frameworks'
          ? 'Type values, press Enter to continue \u2022 Tab / Shift+Tab to jump between fields'
          : 'Arrow keys + Enter to select \u2022 Tab / Shift+Tab to jump between fields'}
      </Hint>
    </Box>
  );
};

// ─── Step 3: Constraints ─────────────────────────────────────────────

const MEMORY_OPTS = [
  { label: '8 GB', value: '8GB' },
  { label: '16 GB', value: '16GB' },
  { label: '32 GB', value: '32GB' },
  { label: '64 GB', value: '64GB' },
  { label: 'Unlimited', value: 'unlimited' },
];

const BUDGET_OPTS = [
  { label: 'Free / open-source only', value: 'free' },
  { label: 'Low  ($0 \u2013 $20/mo)', value: 'low' },
  { label: 'Medium ($20 \u2013 $100/mo)', value: 'medium' },
  { label: 'High ($100+/mo)', value: 'high' },
];

const DEPLOY_OPTS = [
  { label: 'Local only', value: 'local' },
  { label: 'Cloud', value: 'cloud' },
  { label: 'Hybrid (local + cloud)', value: 'hybrid' },
];

const PRIVACY_OPTS = [
  { label: 'Strict \u2014 no data leaves my machine', value: 'strict' },
  { label: 'Moderate \u2014 anonymized telemetry OK', value: 'moderate' },
  { label: 'Relaxed \u2014 cloud APIs are fine', value: 'relaxed' },
];

const CONSTRAINT_FIELDS = ['maxMemory', 'budget', 'deployment', 'privacy'];
const CONSTRAINT_LABELS = {
  maxMemory: 'MAXIMUM RAM AVAILABLE',
  budget: 'MONTHLY BUDGET',
  deployment: 'DEPLOYMENT TARGET',
  privacy: 'DATA PRIVACY REQUIREMENTS',
};
const CONSTRAINT_OPTIONS = {
  maxMemory: MEMORY_OPTS,
  budget: BUDGET_OPTS,
  deployment: DEPLOY_OPTS,
  privacy: PRIVACY_OPTS,
};

export const StepConstraints = ({ value, onChange }) => {
  const data = value || { maxMemory: '', budget: '', deployment: '', privacy: '' };
  const [fieldIdx, setFieldIdx] = useState(0);
  const field = CONSTRAINT_FIELDS[fieldIdx];

  const handleSelect = (item) => {
    if (!item) return;
    const updated = { ...data, [field]: item.value };
    onChange(updated);
    if (fieldIdx < CONSTRAINT_FIELDS.length - 1) {
      setFieldIdx(fieldIdx + 1);
    }
  };

  useInput((input, key) => {
    if (key.shift && key.tab) {
      if (fieldIdx > 0) setFieldIdx(fieldIdx - 1);
    } else if (key.tab && !key.shift) {
      if (fieldIdx < CONSTRAINT_FIELDS.length - 1) setFieldIdx(fieldIdx + 1);
    }
  });

  const options = CONSTRAINT_OPTIONS[field] || [];

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} gap={1}>
        {CONSTRAINT_FIELDS.map((f, i) => (
          <Text key={f} color={i <= fieldIdx ? 'green' : 'gray'} bold={i === fieldIdx}>
            {i < fieldIdx ? '\u2713' : i === fieldIdx ? '\u25B6' : '\u25CB'}{' '}
            {CONSTRAINT_LABELS[f].split(' ')[0]}
          </Text>
        ))}
      </Box>
      <Label>{CONSTRAINT_LABELS[field]}</Label>
      <SelectInput
        items={options}
        initialIndex={Math.max(0, options.findIndex((o) => o.value === data[field]))}
        onSelect={handleSelect}
        indicatorComponent={IndicatorComponent}
        itemComponent={ItemComponent}
      />
      <Hint>Arrow keys + Enter to select \u2022 Tab / Shift+Tab to jump between fields</Hint>
    </Box>
  );
};

// ─── Step 4: Use Cases (multi-select) ────────────────────────────────

const USE_CASE_ITEMS = [
  { key: 'codegen', label: 'Code generation' },
  { key: 'debug', label: 'Debugging assistance' },
  { key: 'architecture', label: 'Architecture / design' },
  { key: 'code-review', label: 'Code review' },
  { key: 'docs', label: 'Documentation writing' },
  { key: 'testing', label: 'Test generation' },
];

export const StepUseCases = ({ value, onChange }) => {
  const selected = value || [];
  const [cursor, setCursor] = useState(0);
  const [done] = useState(false);

  const toggle = (key) => {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];
    onChange(next);
  };

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : USE_CASE_ITEMS.length - 1));
    } else if (key.downArrow) {
      setCursor((c) => (c < USE_CASE_ITEMS.length - 1 ? c + 1 : 0));
    } else if (input === ' ') {
      toggle(USE_CASE_ITEMS[cursor].key);
    } else if (key.return && !done) {
      // Enter on an item toggles it; the wizard handles advancing via its own logic
      toggle(USE_CASE_ITEMS[cursor].key);
    }
  });

  return (
    <Box flexDirection="column">
      <Label>SELECT ALL THAT APPLY:</Label>
      {USE_CASE_ITEMS.map((item, i) => {
        const isSelected = selected.includes(item.key);
        const isCursor = i === cursor;
        return (
          <Box key={item.key}>
            <Text color={isCursor ? 'green' : 'white'}>
              {isCursor ? '\u276F ' : '  '}
            </Text>
            <Text color={isSelected ? 'green' : 'gray'}>
              {isSelected ? '\u2611' : '\u2610'}{' '}
            </Text>
            <Text color={isCursor ? 'white' : 'gray'} bold={isCursor}>
              {item.label}
            </Text>
          </Box>
        );
      })}
      <Hint>Space to toggle \u2022 Arrow keys to move \u2022 Press Tab when done</Hint>
    </Box>
  );
};

// ─── Step 5: License ─────────────────────────────────────────────────

const LICENSE_OPTS = [
  { label: 'Any license is fine', value: 'any' },
  { label: 'Permissive only (MIT, Apache, BSD)', value: 'permissive' },
  { label: 'Copyleft OK (GPL, AGPL, LGPL)', value: 'copyleft' },
];

export const StepLicense = ({ value, onChange }) => (
  <Box flexDirection="column">
    <Label>LICENSE PREFERENCE FOR AI MODELS:</Label>
    <SelectInput
      items={LICENSE_OPTS}
      initialIndex={Math.max(0, LICENSE_OPTS.findIndex((o) => o.value === value))}
      onSelect={(item) => item && onChange(item.value)}
      indicatorComponent={IndicatorComponent}
      itemComponent={ItemComponent}
    />
    <Hint>Arrow keys + Enter to select</Hint>
  </Box>
);

// ─── Step 6: Context ─────────────────────────────────────────────────

const CONTEXT_SIZE_OPTS = [
  { label: 'Small   (< 4K tokens)', value: 'small' },
  { label: 'Medium  (4K \u2013 16K tokens)', value: 'medium' },
  { label: 'Large   (16K \u2013 100K tokens)', value: 'large' },
  { label: 'Huge    (100K+ tokens)', value: 'huge' },
];

const YES_NO = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const CONTEXT_FIELDS = ['contextSize', 'existingProject'];
const CONTEXT_LABELS = {
  contextSize: 'HOW MUCH CONTEXT DO YOU TYPICALLY NEED?',
  existingProject: 'IS THIS FOR AN EXISTING PROJECT?',
};

export const StepContext = ({ value, onChange }) => {
  const data = value || { contextSize: '', existingProject: null };
  const [fieldIdx, setFieldIdx] = useState(0);
  const field = CONTEXT_FIELDS[fieldIdx];

  const handleSelect = (item) => {
    if (!item) return;
    const updated = { ...data, [field]: item.value };
    onChange(updated);
    if (fieldIdx < CONTEXT_FIELDS.length - 1) {
      setFieldIdx(fieldIdx + 1);
    }
  };

  useInput((input, key) => {
    if (key.shift && key.tab) {
      if (fieldIdx > 0) setFieldIdx(fieldIdx - 1);
    } else if (key.tab && !key.shift) {
      if (fieldIdx < CONTEXT_FIELDS.length - 1) setFieldIdx(fieldIdx + 1);
    }
  });

  const options = field === 'contextSize' ? CONTEXT_SIZE_OPTS : YES_NO;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1} gap={1}>
        {CONTEXT_FIELDS.map((f, i) => (
          <Text key={f} color={i <= fieldIdx ? 'green' : 'gray'} bold={i === fieldIdx}>
            {i < fieldIdx ? '\u2713' : i === fieldIdx ? '\u25B6' : '\u25CB'}{' '}
            {f === 'contextSize' ? 'CONTEXT' : 'EXISTING?'}
          </Text>
        ))}
      </Box>
      <Label>{CONTEXT_LABELS[field]}</Label>
      <SelectInput
        items={options}
        initialIndex={Math.max(0, options.findIndex((o) => o.value === data[field]))}
        onSelect={(item) => item && handleSelect(item)}
        indicatorComponent={IndicatorComponent}
        itemComponent={ItemComponent}
      />
      <Hint>Arrow keys + Enter to select \u2022 Tab / Shift+Tab to jump between fields</Hint>
    </Box>
  );
};
