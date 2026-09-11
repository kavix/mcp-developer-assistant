import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  analyzeError,
  findPossibleCauses,
  generateDebugSteps,
  findKnowledgeItem,
  UNKNOWN_ERROR_FALLBACK,
} from '../src/mcp/tools';
import { executeMcpPipeline } from '../src/mcp/server';
import { parseAndValidateDiagnosis, createMcpFallbackDiagnosis } from '../src/lib/bedrock';

describe('MCP Tools: Knowledge Base & Matcher', () => {
  it('should analyze ECONNREFUSED for PostgreSQL correctly', () => {
    const output = analyzeError({ error: 'ECONNREFUSED 127.0.0.1:5432' });
    assert.strictEqual(output.technology, 'PostgreSQL');
    assert.strictEqual(output.category, 'database_connection');
    assert.strictEqual(output.severity, 'medium');
    assert.ok(output.summary.includes('5432'));
  });

  it('should find possible causes for PostgreSQL database_connection', () => {
    const causes = findPossibleCauses({
      category: 'database_connection',
      technology: 'PostgreSQL',
    });
    assert.ok(causes.causes.length > 0);
    assert.ok(causes.causes.some((c) => c.toLowerCase().includes('running')));
  });

  it('should generate debug steps and verification commands for PostgreSQL', () => {
    const debug = generateDebugSteps({
      category: 'database_connection',
      technology: 'PostgreSQL',
    });
    assert.ok(debug.steps.length > 0);
    assert.ok(debug.commands.length > 0);
    assert.ok(debug.commands.includes('systemctl status postgresql'));
    assert.ok(debug.commands.some((cmd) => cmd.includes('5432')));
  });

  it('should analyze ETIMEDOUT network timeout errors', () => {
    const output = analyzeError({ error: 'connect ETIMEDOUT 10.0.1.25:443' });
    assert.strictEqual(output.category, 'network_timeout');
    assert.strictEqual(output.severity, 'high');
  });

  it('should analyze ENOENT file errors', () => {
    const output = analyzeError({ error: 'Error: ENOENT: no such file or directory, open "/app/.env"' });
    assert.strictEqual(output.category, 'filesystem_error');
    assert.ok(output.technology.includes('File System'));
  });

  it('should analyze EADDRINUSE port conflict errors', () => {
    const output = analyzeError({ error: 'Error: listen EADDRINUSE: address already in use :::3000' });
    assert.strictEqual(output.category, 'port_conflict');
  });

  it('should analyze Kubernetes CrashLoopBackOff errors', () => {
    const output = analyzeError({
      error: 'CrashLoopBackOff: back-off 5m0s restarting failed container=worker pod=worker-7f4c-88',
    });
    assert.strictEqual(output.category, 'container_lifecycle_failure');
    assert.strictEqual(output.technology, 'Kubernetes Pod Lifecycle');
    assert.strictEqual(output.severity, 'critical');
  });

  it('should analyze Kubernetes ImagePullBackOff errors', () => {
    const output = analyzeError({
      error: 'ImagePullBackOff: Failed to pull image "myrepo/api:v1.2": rpc error: code = NotFound',
    });
    assert.strictEqual(output.category, 'container_image_pull_error');
    assert.ok(output.technology.includes('Kubernetes'));
  });

  it('should analyze HTTP 502 Bad Gateway errors', () => {
    const output = analyzeError({ error: 'HTTP/1.1 502 Bad Gateway from reverse proxy' });
    assert.strictEqual(output.category, 'http_gateway_error');
    assert.ok(output.technology.includes('Reverse Proxy'));
  });

  it('should analyze CORS errors', () => {
    const output = analyzeError({
      error: "Access to fetch at 'https://api.example.com' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present",
    });
    assert.strictEqual(output.category, 'browser_security_cors');
  });

  it('should handle unknown errors gracefully with structured fallback', () => {
    const unknownItem = findKnowledgeItem('Some random completely novel runtime glitch XYZ-9988');
    assert.strictEqual(unknownItem.category, UNKNOWN_ERROR_FALLBACK.category);
    assert.ok(unknownItem.causes.length > 0);
    assert.ok(unknownItem.debuggingSteps.length > 0);
  });

  it('should handle empty or whitespace error safely', () => {
    const emptyItem = findKnowledgeItem('    ');
    assert.strictEqual(emptyItem.category, UNKNOWN_ERROR_FALLBACK.category);
  });
});

describe('MCP In-Process Client/Server Pipeline', () => {
  it('should successfully execute the 3-step pipeline via MCP SDK', async () => {
    const result = await executeMcpPipeline('ECONNREFUSED 127.0.0.1:5432');
    assert.strictEqual(result.tools.length, 3);
    assert.strictEqual(result.tools[0].name, 'analyze_error');
    assert.strictEqual(result.tools[0].status, 'success');
    assert.strictEqual(result.tools[1].name, 'find_possible_causes');
    assert.strictEqual(result.tools[1].status, 'success');
    assert.strictEqual(result.tools[2].name, 'generate_debug_steps');
    assert.strictEqual(result.tools[2].status, 'success');

    assert.strictEqual(result.analysis.technology, 'PostgreSQL');
    assert.ok(result.causes.causes.length > 0);
    assert.ok(result.debugSteps.steps.length > 0);
    assert.ok(result.debugSteps.commands.length > 0);
  });
});

describe('Bedrock Response Parsing & Fallback Resilience', () => {
  const mockInput = {
    error: 'ECONNREFUSED 127.0.0.1:5432',
    errorAnalysis: {
      category: 'database_connection',
      technology: 'PostgreSQL',
      severity: 'medium' as const,
      summary: 'Connection refused on port 5432',
    },
    possibleCauses: {
      causes: ['PostgreSQL not running', 'Wrong port'],
    },
    debuggingSteps: {
      steps: ['Check postgres status', 'Check port'],
      commands: ['systemctl status postgresql'],
    },
  };

  it('should parse valid JSON response from Bedrock', () => {
    const mockJson = JSON.stringify({
      summary: 'PostgreSQL database connection refused.',
      severity: 'medium',
      likelyCauses: ['Postgres is down', 'Port mismatch'],
      recommendedSteps: ['Run systemctl status postgresql', 'Verify port 5432'],
      commands: ['systemctl status postgresql', 'ss -lntp | grep 5432'],
      confidence: 'high',
    });

    const parsed = parseAndValidateDiagnosis(mockJson, mockInput);
    assert.strictEqual(parsed.summary, 'PostgreSQL database connection refused.');
    assert.strictEqual(parsed.severity, 'medium');
    assert.strictEqual(parsed.confidence, 'high');
    assert.strictEqual(parsed.likelyCauses.length, 2);
  });

  it('should strip markdown code fences from Bedrock response', () => {
    const fenced = '```json\n{"summary":"Test summary","severity":"high","likelyCauses":["Cause 1"],"recommendedSteps":["Step 1"],"commands":["cmd1"],"confidence":"medium"}\n```';
    const parsed = parseAndValidateDiagnosis(fenced, mockInput);
    assert.strictEqual(parsed.summary, 'Test summary');
    assert.strictEqual(parsed.severity, 'high');
    assert.strictEqual(parsed.confidence, 'medium');
  });

  it('should gracefully fallback when Bedrock output is invalid JSON or raw text', () => {
    const rawText = 'I cannot format as JSON right now but PostgreSQL seems to be down.';
    const parsed = parseAndValidateDiagnosis(rawText, mockInput);
    assert.ok(parsed.summary);
    assert.ok(parsed.likelyCauses.length > 0);
    assert.ok(parsed.commands.includes('systemctl status postgresql'));
  });

  it('should generate a robust MCP fallback diagnosis directly from tools', () => {
    const fallback = createMcpFallbackDiagnosis(mockInput);
    assert.strictEqual(fallback.summary, 'Connection refused on port 5432');
    assert.strictEqual(fallback.severity, 'medium');
    assert.strictEqual(fallback.confidence, 'high');
    assert.ok(fallback.commands.includes('systemctl status postgresql'));
  });
});
