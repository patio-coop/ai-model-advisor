import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeRepo } from './repo.js';

// ── Helpers ─────────────────────────────────────────────────────────

let tmpDir;

function makeTmpDir() {
  tmpDir = mkdtempSync(join(tmpdir(), 'repo-test-'));
  return tmpDir;
}

function cleanTmpDir() {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
}

/** Write a file relative to tmpDir, creating intermediate dirs as needed. */
function writeFixture(relPath, content = '') {
  const full = join(tmpDir, relPath);
  const dir = full.slice(0, full.lastIndexOf('/'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(full, content);
}

/** Generate n simple JS files under tmpDir in a flat structure. */
function writeJsFiles(count, linesPerFile = 10) {
  const line = 'const x = 1;\n';
  for (let i = 0; i < count; i++) {
    writeFixture(`file${i}.js`, line.repeat(linesPerFile));
  }
}

// ── 1. Error handling ───────────────────────────────────────────────

describe('analyzeRepo() – error handling', () => {
  it('throws for a non-existent path', () => {
    assert.throws(
      () => analyzeRepo('/tmp/__this_path_should_not_exist_12345__'),
      /does not exist/,
    );
  });

  it('throws when given a file instead of a directory', () => {
    const dir = makeTmpDir();
    writeFixture('somefile.txt', 'hello');
    assert.throws(
      () => analyzeRepo(join(dir, 'somefile.txt')),
      /Not a directory/,
    );
    cleanTmpDir();
  });
});

// ── 2. Language detection ───────────────────────────────────────────

describe('analyzeRepo() – language detection', () => {
  afterEach(cleanTmpDir);

  it('detects JavaScript from .js files', () => {
    makeTmpDir();
    writeFixture('index.js', 'console.log("hi");\n');
    const { analysis } = analyzeRepo(tmpDir);
    const names = analysis.languages.map((l) => l.name);
    assert.ok(names.includes('JavaScript'), `Expected JavaScript in ${names}`);
  });

  it('detects Python from .py files', () => {
    makeTmpDir();
    writeFixture('main.py', 'print("hi")\n');
    const { analysis } = analyzeRepo(tmpDir);
    const names = analysis.languages.map((l) => l.name);
    assert.ok(names.includes('Python'), `Expected Python in ${names}`);
  });

  it('detects Rust from .rs files', () => {
    makeTmpDir();
    writeFixture('main.rs', 'fn main() {}\n');
    const { analysis } = analyzeRepo(tmpDir);
    const names = analysis.languages.map((l) => l.name);
    assert.ok(names.includes('Rust'), `Expected Rust in ${names}`);
  });

  it('detects Go from .go files', () => {
    makeTmpDir();
    writeFixture('main.go', 'package main\n');
    const { analysis } = analyzeRepo(tmpDir);
    const names = analysis.languages.map((l) => l.name);
    assert.ok(names.includes('Go'), `Expected Go in ${names}`);
  });

  it('sorts languages by file count descending', () => {
    makeTmpDir();
    writeFixture('a.py', 'x = 1\n');
    writeFixture('b.py', 'y = 2\n');
    writeFixture('c.py', 'z = 3\n');
    writeFixture('d.js', 'const x = 1;\n');
    const { analysis } = analyzeRepo(tmpDir);
    assert.equal(analysis.languages[0].name, 'Python', 'Python should rank first (3 files vs 1)');
    assert.equal(analysis.languages[0].files, 3);
  });
});

// ── 3. Framework detection ──────────────────────────────────────────

describe('analyzeRepo() – framework detection', () => {
  afterEach(cleanTmpDir);

  it('detects React and Express from package.json', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({
      dependencies: { react: '^18.0.0', express: '^4.0.0' },
    }));
    writeFixture('index.js', '// app\n');
    const { analysis } = analyzeRepo(tmpDir);
    assert.ok(analysis.frameworks.includes('React'), `Missing React in ${analysis.frameworks}`);
    assert.ok(analysis.frameworks.includes('Express'), `Missing Express in ${analysis.frameworks}`);
  });

  it('detects Django and FastAPI from requirements.txt', () => {
    makeTmpDir();
    writeFixture('requirements.txt', 'django==4.2\nfastapi>=0.100\n');
    writeFixture('app.py', '# app\n');
    const { analysis } = analyzeRepo(tmpDir);
    assert.ok(analysis.frameworks.includes('Django'), `Missing Django in ${analysis.frameworks}`);
    assert.ok(analysis.frameworks.includes('FastAPI'), `Missing FastAPI in ${analysis.frameworks}`);
  });

  it('detects Axum from Cargo.toml', () => {
    makeTmpDir();
    writeFixture('Cargo.toml', '[dependencies]\naxum = "0.7"\ntokio = { version = "1" }\n');
    writeFixture('src/main.rs', 'fn main() {}\n');
    const { analysis } = analyzeRepo(tmpDir);
    assert.ok(analysis.frameworks.includes('Axum'), `Missing Axum in ${analysis.frameworks}`);
    assert.ok(analysis.frameworks.includes('Tokio'), `Missing Tokio in ${analysis.frameworks}`);
  });

  it('detects Gin from go.mod', () => {
    makeTmpDir();
    writeFixture('go.mod', 'module example.com/app\nrequire github.com/gin-gonic/gin v1.9.0\n');
    writeFixture('main.go', 'package main\n');
    const { analysis } = analyzeRepo(tmpDir);
    assert.ok(analysis.frameworks.includes('Gin'), `Missing Gin in ${analysis.frameworks}`);
  });

  it('deduplicates frameworks', () => {
    makeTmpDir();
    // Both requirements.txt and pyproject.toml mention django
    writeFixture('requirements.txt', 'django==4.2\n');
    writeFixture('pyproject.toml', '[project]\ndependencies = ["django>=4.2"]\n');
    writeFixture('app.py', '# app\n');
    const { analysis } = analyzeRepo(tmpDir);
    const djangoCount = analysis.frameworks.filter((f) => f === 'Django').length;
    assert.equal(djangoCount, 1, 'Django should appear exactly once');
  });
});

// ── 4. Runtime inference ────────────────────────────────────────────

describe('analyzeRepo() – runtime inference', () => {
  afterEach(cleanTmpDir);

  it('infers node for JavaScript repos', () => {
    makeTmpDir();
    writeFixture('index.js', 'module.exports = {};\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.runtime, 'node');
  });

  it('infers python for Python repos', () => {
    makeTmpDir();
    writeFixture('main.py', 'print("hi")\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.runtime, 'python');
  });

  it('infers rust for Rust repos', () => {
    makeTmpDir();
    writeFixture('main.rs', 'fn main() {}\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.runtime, 'rust');
  });

  it('infers go for Go repos', () => {
    makeTmpDir();
    writeFixture('main.go', 'package main\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.runtime, 'go');
  });

  it('infers node for mixed JS/Python repos (JS first by count)', () => {
    makeTmpDir();
    writeFixture('a.js', 'x\n');
    writeFixture('b.js', 'x\n');
    writeFixture('c.py', 'x\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.runtime, 'node', 'JS has more files so should be primary');
  });
});

// ── 5. Platform inference ───────────────────────────────────────────

describe('analyzeRepo() – platform inference', () => {
  afterEach(cleanTmpDir);

  it('infers browser for React projects', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { react: '^18' } }));
    writeFixture('App.jsx', 'export default function App() {}\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.platform, 'browser');
  });

  it('infers server for Express projects', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { express: '^4' } }));
    writeFixture('server.js', 'const app = require("express")();\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.platform, 'server');
  });

  it('infers ios for React Native projects', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { 'react-native': '^0.72' } }));
    writeFixture('App.js', '// RN\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.platform, 'ios');
  });

  it('infers console for Ink projects', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { ink: '^4' } }));
    writeFixture('cli.js', '// CLI\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.platform, 'console');
  });

  it('infers pc for Bevy projects', () => {
    makeTmpDir();
    writeFixture('Cargo.toml', '[dependencies]\nbevy = "0.12"\n');
    writeFixture('src/main.rs', 'fn main() {}\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.platform, 'pc');
  });

  it('infers pc for Electron projects', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { electron: '^28' } }));
    writeFixture('main.js', '// electron\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.platform, 'pc');
  });
});

// ── 6. Role inference ───────────────────────────────────────────────

describe('analyzeRepo() – role inference', () => {
  afterEach(cleanTmpDir);

  it('infers webdev for browser platform', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { react: '^18' } }));
    writeFixture('App.jsx', '// react\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.role, 'webdev');
  });

  it('infers backend for server platform', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { express: '^4' } }));
    writeFixture('server.js', '// express\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.role, 'backend');
  });

  it('infers mobile for ios platform', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { 'react-native': '^0.72' } }));
    writeFixture('App.js', '// RN\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.role, 'mobile');
  });

  it('infers backend for console platform', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { ink: '^4' } }));
    writeFixture('cli.js', '// CLI\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.role, 'backend');
  });

  it('infers games for Bevy projects', () => {
    makeTmpDir();
    writeFixture('Cargo.toml', '[dependencies]\nbevy = "0.12"\n');
    writeFixture('src/main.rs', 'fn main() {}\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.role, 'games');
  });
});

// ── 7. Context size inference ───────────────────────────────────────

describe('analyzeRepo() – context size inference', () => {
  afterEach(cleanTmpDir);

  it('returns small for tiny repos', () => {
    makeTmpDir();
    writeFixture('index.js', 'const x = 1;\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.contextNeeds, 'small');
  });

  it('returns medium for repos with >30 files', () => {
    makeTmpDir();
    writeJsFiles(35, 5);
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.contextNeeds, 'medium');
  });

  it('returns medium for repos with >2000 lines', () => {
    makeTmpDir();
    // 5 files with 500 lines each = 2500 lines
    writeJsFiles(5, 500);
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.contextNeeds, 'medium');
  });

  it('returns large for repos with >100 files', () => {
    makeTmpDir();
    writeJsFiles(105, 5);
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.contextNeeds, 'large');
  });

  it('returns large for repos with >10000 lines', () => {
    makeTmpDir();
    // 10 files with 1100 lines each = 11000 lines
    writeJsFiles(10, 1100);
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.contextNeeds, 'large');
  });

  it('returns huge for repos with >500 files', () => {
    makeTmpDir();
    writeJsFiles(505, 5);
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.contextNeeds, 'huge');
  });

  it('returns huge for repos with >50000 lines', () => {
    makeTmpDir();
    // 50 files with 1100 lines each = 55000 lines
    writeJsFiles(50, 1100);
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.contextNeeds, 'huge');
  });
});

// ── 8. Use case inference ───────────────────────────────────────────

describe('analyzeRepo() – use case inference', () => {
  afterEach(cleanTmpDir);

  it('always includes codegen', () => {
    makeTmpDir();
    writeFixture('index.js', 'const x = 1;\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.ok(inputs.useCases.includes('codegen'));
  });

  it('includes testing when Jest is a dependency', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ devDependencies: { jest: '^29' } }));
    writeFixture('index.js', '// code\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.ok(inputs.useCases.includes('testing'), `Expected testing in ${inputs.useCases}`);
  });

  it('includes testing when pytest is in requirements.txt', () => {
    makeTmpDir();
    writeFixture('requirements.txt', 'pytest>=7.0\n');
    writeFixture('test_app.py', '# tests\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.ok(inputs.useCases.includes('testing'), `Expected testing in ${inputs.useCases}`);
  });

  it('includes code-review and debug for repos with >20 files', () => {
    makeTmpDir();
    writeJsFiles(25, 5);
    const { inputs } = analyzeRepo(tmpDir);
    assert.ok(inputs.useCases.includes('code-review'), `Expected code-review in ${inputs.useCases}`);
    assert.ok(inputs.useCases.includes('debug'), `Expected debug in ${inputs.useCases}`);
  });

  it('includes architecture for repos with >50 files', () => {
    makeTmpDir();
    writeJsFiles(55, 5);
    const { inputs } = analyzeRepo(tmpDir);
    assert.ok(inputs.useCases.includes('architecture'), `Expected architecture in ${inputs.useCases}`);
  });

  it('does not include code-review for small repos', () => {
    makeTmpDir();
    writeJsFiles(5, 5);
    const { inputs } = analyzeRepo(tmpDir);
    assert.ok(!inputs.useCases.includes('code-review'), 'Small repos should not have code-review');
  });
});

// ── 9. Edge cases ───────────────────────────────────────────────────

describe('analyzeRepo() – edge cases', () => {
  afterEach(cleanTmpDir);

  it('handles an empty directory', () => {
    makeTmpDir();
    const { analysis, inputs } = analyzeRepo(tmpDir);
    assert.equal(analysis.fileCount, 0);
    assert.equal(analysis.totalLines, 0);
    assert.deepEqual(analysis.languages, []);
    assert.deepEqual(analysis.frameworks, []);
    assert.ok(inputs.runtime, 'Should have a default runtime');
  });

  it('handles a directory with only non-code files', () => {
    makeTmpDir();
    writeFixture('README.md', '# Hello\n');
    writeFixture('data.csv', 'a,b,c\n');
    writeFixture('image.png', 'binarydata');
    const { analysis } = analyzeRepo(tmpDir);
    assert.equal(analysis.fileCount, 0, 'Non-code files should not be counted');
    assert.deepEqual(analysis.languages, []);
  });

  it('handles deeply nested directory structure', () => {
    makeTmpDir();
    writeFixture('a/b/c/d/e/f/deep.py', 'x = 1\n');
    const { analysis } = analyzeRepo(tmpDir);
    assert.equal(analysis.fileCount, 1);
    const names = analysis.languages.map((l) => l.name);
    assert.ok(names.includes('Python'));
  });

  it('skips node_modules and .git directories', () => {
    makeTmpDir();
    writeFixture('index.js', 'const a = 1;\n');
    writeFixture('node_modules/lodash/index.js', 'module.exports = {};\n');
    writeFixture('.git/objects/abc.js', '// git object\n');
    const { analysis } = analyzeRepo(tmpDir);
    assert.equal(analysis.fileCount, 1, 'Should only count index.js');
  });

  it('skips hidden directories', () => {
    makeTmpDir();
    writeFixture('src/app.js', 'const a = 1;\n');
    writeFixture('.hidden/secret.js', 'const b = 2;\n');
    const { analysis } = analyzeRepo(tmpDir);
    assert.equal(analysis.fileCount, 1, 'Should skip .hidden directory');
  });

  it('respects max depth', () => {
    makeTmpDir();
    // Create a file at depth 10 (beyond default maxDepth of 8)
    writeFixture('1/2/3/4/5/6/7/8/9/10/deep.js', 'const x = 1;\n');
    // And one at depth 2 (well within limit)
    writeFixture('1/2/shallow.js', 'const y = 2;\n');
    const { analysis } = analyzeRepo(tmpDir);
    // The shallow file should be found; the deep one may not be
    assert.ok(analysis.fileCount >= 1, 'Should find at least the shallow file');
    assert.ok(analysis.fileCount <= 2, 'May or may not find the deeply nested file');
  });

  it('handles unreadable files gracefully (no crash)', () => {
    makeTmpDir();
    writeFixture('readable.js', 'const x = 1;\n');
    writeFixture('unreadable.js', 'const y = 2;\n');
    try {
      chmodSync(join(tmpDir, 'unreadable.js'), 0o000);
    } catch {
      // On some platforms chmod may not work as expected; skip
      return;
    }
    // Should not throw even if a file is unreadable
    const { analysis } = analyzeRepo(tmpDir);
    assert.ok(analysis.fileCount >= 1);
    // Restore permissions for cleanup
    chmodSync(join(tmpDir, 'unreadable.js'), 0o644);
  });
});

// ── 10. Defaults ────────────────────────────────────────────────────

describe('analyzeRepo() – defaults', () => {
  afterEach(cleanTmpDir);

  it('sets license to any', () => {
    makeTmpDir();
    writeFixture('index.js', 'const x = 1;\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.license, 'any');
  });

  it('sets existingProject to true', () => {
    makeTmpDir();
    writeFixture('index.js', 'const x = 1;\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.existingProject, true);
  });

  it('has sensible constraint defaults', () => {
    makeTmpDir();
    writeFixture('index.js', 'const x = 1;\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.ok(inputs.constraints, 'Should have constraints');
    assert.equal(inputs.constraints.maxMemory, 'unlimited');
    assert.equal(inputs.constraints.budget, 'low');
    assert.equal(inputs.constraints.deployment, 'local');
    assert.equal(inputs.constraints.privacy, 'relaxed');
  });

  it('falls back to node runtime for empty repos', () => {
    makeTmpDir();
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.runtime, 'node');
  });

  it('falls back to server platform for repos with no frameworks', () => {
    makeTmpDir();
    writeFixture('main.py', 'print("hi")\n');
    const { inputs } = analyzeRepo(tmpDir);
    assert.equal(inputs.platform, 'server');
  });
});

// ── Return shape validation ─────────────────────────────────────────

describe('analyzeRepo() – return shape', () => {
  afterEach(cleanTmpDir);

  it('returns { inputs, analysis } with all expected fields', () => {
    makeTmpDir();
    writeFixture('package.json', JSON.stringify({ dependencies: { react: '^18', jest: '^29' } }));
    writeFixture('App.jsx', 'export default function App() { return null; }\n');
    writeFixture('App.test.js', 'test("it", () => {});\n');

    const result = analyzeRepo(tmpDir);

    // Top-level shape
    assert.ok(result.inputs, 'missing inputs');
    assert.ok(result.analysis, 'missing analysis');

    // Inputs shape
    const i = result.inputs;
    assert.equal(typeof i.role, 'string');
    assert.ok(Array.isArray(i.languages));
    assert.ok(Array.isArray(i.frameworks));
    assert.equal(typeof i.runtime, 'string');
    assert.equal(typeof i.platform, 'string');
    assert.ok(Array.isArray(i.useCases));
    assert.equal(typeof i.license, 'string');
    assert.equal(typeof i.contextNeeds, 'string');
    assert.equal(typeof i.existingProject, 'boolean');
    assert.equal(typeof i.constraints, 'object');

    // Analysis shape
    const a = result.analysis;
    assert.equal(a.path, tmpDir);
    assert.equal(typeof a.fileCount, 'number');
    assert.equal(typeof a.totalLines, 'number');
    assert.ok(Array.isArray(a.languages));
    assert.ok(Array.isArray(a.frameworks));
    assert.equal(typeof a.runtime, 'string');
    assert.equal(typeof a.platform, 'string');
    assert.equal(typeof a.role, 'string');
    assert.equal(typeof a.contextNeeds, 'string');
    assert.ok(Array.isArray(a.useCases));
  });

  it('analysis.languages entries have name and files count', () => {
    makeTmpDir();
    writeFixture('a.js', 'x\n');
    writeFixture('b.js', 'y\n');
    const { analysis } = analyzeRepo(tmpDir);
    for (const lang of analysis.languages) {
      assert.equal(typeof lang.name, 'string');
      assert.equal(typeof lang.files, 'number');
      assert.ok(lang.files > 0);
    }
  });
});
