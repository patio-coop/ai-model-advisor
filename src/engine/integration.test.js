import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateIntegrationSnippet } from './integration.js';

// Helper to build a minimal model object
function makeModel(overrides = {}) {
  return {
    id: 'test-model-7b',
    name: 'Test Model 7B',
    ecosystem: ['ollama', 'vllm'],
    ...overrides,
  };
}

// Helper to build inputs with sensible defaults
function makeInputs(overrides = {}) {
  return {
    runtime: 'node',
    frameworks: ['express'],
    ...overrides,
  };
}

// ── Null / missing inputs ────────────────────────────────────────────

describe('generateIntegrationSnippet() — null/missing inputs', () => {
  it('returns null for null model', () => {
    assert.equal(generateIntegrationSnippet(null, makeInputs()), null);
  });

  it('returns null for undefined model', () => {
    assert.equal(generateIntegrationSnippet(undefined, makeInputs()), null);
  });

  it('returns null for null inputs', () => {
    assert.equal(generateIntegrationSnippet(makeModel(), null), null);
  });

  it('returns null for undefined inputs', () => {
    assert.equal(generateIntegrationSnippet(makeModel(), undefined), null);
  });

  it('returns null when inputs.runtime is missing', () => {
    assert.equal(generateIntegrationSnippet(makeModel(), {}), null);
  });

  it('returns null when inputs.runtime is empty string', () => {
    assert.equal(generateIntegrationSnippet(makeModel(), { runtime: '' }), null);
  });
});

// ── Unsupported runtimes ─────────────────────────────────────────────

describe('generateIntegrationSnippet() — unsupported runtimes', () => {
  for (const runtime of ['dart', 'ruby', 'swift', 'java', 'php', 'zig']) {
    it(`returns null for runtime="${runtime}"`, () => {
      assert.equal(
        generateIntegrationSnippet(makeModel(), { runtime, frameworks: [] }),
        null,
      );
    });
  }
});

// ── Return structure ─────────────────────────────────────────────────

describe('generateIntegrationSnippet() — return structure', () => {
  it('has runtime, framework, snippet, dependencies, and note', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs());
    assert.ok(result, 'expected a non-null result');
    assert.ok('runtime' in result, 'missing runtime');
    assert.ok('framework' in result, 'missing framework');
    assert.ok('snippet' in result, 'missing snippet');
    assert.ok('dependencies' in result, 'missing dependencies');
    assert.ok('note' in result, 'missing note');
  });

  it('runtime is a lowercase string', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs());
    assert.equal(typeof result.runtime, 'string');
    assert.equal(result.runtime, result.runtime.toLowerCase());
  });

  it('dependencies is an array', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs());
    assert.ok(Array.isArray(result.dependencies));
  });

  it('snippet is a non-empty string', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs());
    assert.equal(typeof result.snippet, 'string');
    assert.ok(result.snippet.length > 0);
  });
});

// ── Framework matching — Node.js ─────────────────────────────────────

describe('generateIntegrationSnippet() — Node.js framework matching', () => {
  it('Express → node-express template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['express'] }));
    assert.equal(result.framework, 'Express');
    assert.ok(result.snippet.includes('express()'), 'should include express()');
    assert.ok(result.snippet.includes('app.post'), 'should include app.post');
    assert.ok(result.dependencies.includes('express'));
  });

  it('Fastify → node-fastify template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['fastify'] }));
    assert.equal(result.framework, 'Fastify');
    assert.ok(result.snippet.includes('fastify'));
    assert.ok(result.dependencies.includes('fastify'));
  });

  it('Next.js → node-nextjs template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['next.js'] }));
    assert.equal(result.framework, 'Next.js');
    assert.ok(result.snippet.includes('NextRequest'));
    assert.ok(result.dependencies.includes('next'));
  });

  it('NextJS (no dot) → node-nextjs template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['nextjs'] }));
    assert.equal(result.framework, 'Next.js');
  });

  it('Remix → node-nextjs template (alias)', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['remix'] }));
    assert.equal(result.framework, 'Next.js');
  });
});

// ── Framework matching — Python ──────────────────────────────────────

describe('generateIntegrationSnippet() — Python framework matching', () => {
  it('FastAPI → python-fastapi template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: ['fastapi'] }));
    assert.equal(result.framework, 'FastAPI');
    assert.ok(result.snippet.includes('@app.post'), 'should include @app.post');
    assert.ok(result.snippet.includes('OpenAI'), 'should include OpenAI client');
    assert.ok(result.dependencies.includes('fastapi'));
    assert.ok(result.dependencies.includes('openai'));
  });

  it('Starlette → python-fastapi template (alias)', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: ['starlette'] }));
    assert.equal(result.framework, 'FastAPI');
  });

  it('Flask → python-flask template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: ['flask'] }));
    assert.equal(result.framework, 'Flask');
    assert.ok(result.snippet.includes('Flask'));
    assert.ok(result.dependencies.includes('flask'));
    assert.ok(result.dependencies.includes('openai'));
  });
});

// ── Framework matching — Go ──────────────────────────────────────────

describe('generateIntegrationSnippet() — Go framework matching', () => {
  for (const fw of ['gin', 'echo', 'fiber', 'chi']) {
    it(`${fw} → go-gin template`, () => {
      const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'go', frameworks: [fw] }));
      assert.equal(result.framework, 'Gin');
      assert.ok(result.snippet.includes('gin'));
    });
  }
});

// ── Framework matching — Rust ────────────────────────────────────────

describe('generateIntegrationSnippet() — Rust framework matching', () => {
  for (const fw of ['axum', 'actix web', 'rocket']) {
    it(`${fw} → rust-axum template`, () => {
      const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'rust', frameworks: [fw] }));
      assert.equal(result.framework, 'Axum');
      assert.ok(result.snippet.includes('axum'));
      assert.ok(result.dependencies.includes('axum'));
    });
  }
});

// ── Runtime standalone fallbacks ─────────────────────────────────────

describe('generateIntegrationSnippet() — standalone fallbacks', () => {
  it('Node with no matching framework → node-standalone', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: [] }));
    assert.equal(result.runtime, 'node');
    assert.equal(result.framework, null);
    assert.ok(result.snippet.includes('async function chat'));
  });

  it('Node with unknown framework → node-standalone', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['koa'] }));
    assert.equal(result.framework, null);
  });

  it('Python with no matching framework → python-standalone', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: [] }));
    assert.equal(result.runtime, 'python');
    assert.equal(result.framework, null);
    assert.ok(result.snippet.includes('openai'));
    assert.ok(result.dependencies.includes('openai'));
  });

  it('Go with no matching framework → go-standalone', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'go', frameworks: [] }));
    assert.equal(result.runtime, 'go');
    assert.equal(result.framework, null);
    assert.ok(result.snippet.includes('net/http'));
  });

  it('Rust with no matching framework → rust-axum (standalone)', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'rust', frameworks: [] }));
    assert.equal(result.runtime, 'rust');
    // Rust standalone maps to rust-axum
    assert.equal(result.framework, 'Axum');
  });
});

// ── Django uses python-standalone ────────────────────────────────────

describe('generateIntegrationSnippet() — Django', () => {
  it('Django maps to python-standalone (no dedicated template)', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: ['django'] }));
    assert.ok(result, 'should return a result');
    // Django is mapped to "python-standalone" via RUNTIME_FRAMEWORK_KEY
    assert.equal(result.framework, null, 'Django should use standalone (framework=null)');
    assert.ok(result.snippet.includes('openai'), 'should use the python-standalone snippet');
  });
});

// ── Base URL resolution ──────────────────────────────────────────────

describe('generateIntegrationSnippet() — base URL resolution', () => {
  it('ollama in ecosystem → localhost:11434', () => {
    const model = makeModel({ ecosystem: ['ollama'] });
    const result = generateIntegrationSnippet(model, makeInputs());
    assert.ok(result.snippet.includes('localhost:11434'), 'should use ollama port');
    assert.ok(!result.snippet.includes('localhost:8000'), 'should not use vllm port');
  });

  it('ollama mixed-case in ecosystem → localhost:11434', () => {
    const model = makeModel({ ecosystem: ['Ollama', 'VLLM'] });
    const result = generateIntegrationSnippet(model, makeInputs());
    assert.ok(result.snippet.includes('localhost:11434'));
  });

  it('no ollama in ecosystem → localhost:8000', () => {
    const model = makeModel({ ecosystem: ['vllm'] });
    const result = generateIntegrationSnippet(model, makeInputs());
    assert.ok(result.snippet.includes('localhost:8000'), 'should use vllm port');
    assert.ok(!result.snippet.includes('localhost:11434'), 'should not use ollama port');
  });

  it('empty ecosystem → localhost:8000', () => {
    const model = makeModel({ ecosystem: [] });
    const result = generateIntegrationSnippet(model, makeInputs());
    assert.ok(result.snippet.includes('localhost:8000'));
  });
});

// ── Snippet content ──────────────────────────────────────────────────

describe('generateIntegrationSnippet() — snippet content', () => {
  it('contains the model name', () => {
    const model = makeModel({ name: 'llama3.1:8b' });
    const result = generateIntegrationSnippet(model, makeInputs());
    assert.ok(result.snippet.includes('llama3.1:8b'), 'snippet should contain model name');
  });

  it('uses model.id when model.name is missing', () => {
    const model = { id: 'custom-id-7b', ecosystem: ['ollama'] };
    const result = generateIntegrationSnippet(model, makeInputs());
    assert.ok(result.snippet.includes('custom-id-7b'), 'snippet should fall back to model.id');
  });

  it('contains correct base URL for ollama model', () => {
    const model = makeModel({ ecosystem: ['ollama'] });
    const result = generateIntegrationSnippet(model, makeInputs());
    assert.ok(result.snippet.includes('http://localhost:11434/v1'));
  });

  it('Express snippet includes express() and app.post', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['express'] }));
    assert.ok(result.snippet.includes('express()'));
    assert.ok(result.snippet.includes('app.post'));
  });

  it('FastAPI snippet includes @app.post and OpenAI', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: ['fastapi'] }));
    assert.ok(result.snippet.includes('@app.post'));
    assert.ok(result.snippet.includes('OpenAI'));
  });
});

// ── Dependencies ─────────────────────────────────────────────────────

describe('generateIntegrationSnippet() — dependencies', () => {
  it('Express returns ["express"]', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['express'] }));
    assert.deepEqual(result.dependencies, ['express']);
  });

  it('Fastify returns ["fastify"]', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['fastify'] }));
    assert.deepEqual(result.dependencies, ['fastify']);
  });

  it('Next.js returns ["next"]', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['next.js'] }));
    assert.deepEqual(result.dependencies, ['next']);
  });

  it('Node standalone returns []', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: [] }));
    assert.deepEqual(result.dependencies, []);
  });

  it('FastAPI returns ["fastapi", "uvicorn", "openai"]', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: ['fastapi'] }));
    assert.deepEqual(result.dependencies, ['fastapi', 'uvicorn', 'openai']);
  });

  it('Flask returns ["flask", "openai"]', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: ['flask'] }));
    assert.deepEqual(result.dependencies, ['flask', 'openai']);
  });

  it('Python standalone returns ["openai"]', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: [] }));
    assert.deepEqual(result.dependencies, ['openai']);
  });

  it('Go Gin returns ["github.com/gin-gonic/gin"]', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'go', frameworks: ['gin'] }));
    assert.deepEqual(result.dependencies, ['github.com/gin-gonic/gin']);
  });

  it('Go standalone returns []', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'go', frameworks: [] }));
    assert.deepEqual(result.dependencies, []);
  });

  it('Rust Axum returns 5 crates', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'rust', frameworks: ['axum'] }));
    assert.deepEqual(result.dependencies, ['axum', 'reqwest', 'serde', 'serde_json', 'tokio']);
  });
});

// ── Case insensitivity ───────────────────────────────────────────────

describe('generateIntegrationSnippet() — case insensitivity', () => {
  it('EXPRESS (uppercase) matches express template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['EXPRESS'] }));
    assert.equal(result.framework, 'Express');
  });

  it('Express (title-case) matches express template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ frameworks: ['Express'] }));
    assert.equal(result.framework, 'Express');
  });

  it('FASTAPI (uppercase) matches fastapi template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'python', frameworks: ['FASTAPI'] }));
    assert.equal(result.framework, 'FastAPI');
  });

  it('GIN (uppercase) matches gin template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'go', frameworks: ['GIN'] }));
    assert.equal(result.framework, 'Gin');
  });

  it('AXUM (uppercase) matches axum template', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'rust', frameworks: ['AXUM'] }));
    assert.equal(result.framework, 'Axum');
  });

  it('Runtime is case-insensitive (NODE → node)', () => {
    const result = generateIntegrationSnippet(makeModel(), makeInputs({ runtime: 'NODE', frameworks: ['express'] }));
    assert.ok(result, 'should handle uppercase runtime');
    assert.equal(result.runtime, 'node');
  });
});
