/**
 * POST /api/analyze
 * 
 * Orchestrates the full analysis flow:
 * 1. Input validation (non-empty, <= 10,000 chars)
 * 2. In-process MCP tool pipeline execution (@modelcontextprotocol/sdk)
 *    - analyze_error
 *    - find_possible_causes
 *    - generate_debug_steps
 * 3. Amazon Bedrock LLM synthesis via AWS SDK JavaScript v3
 * 4. Structured JSON response with tool tracking telemetry
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeMcpPipeline } from '@/mcp/server';
import { analyzeWithBedrock } from '@/lib/bedrock';
import { AnalyzeApiResponse, ToolActivity } from '@/mcp/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_ERROR_LENGTH = 10000;

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeApiResponse>> {
  const toolsActivity: ToolActivity[] = [];

  try {
    let body: { error?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON request payload',
          tools: [],
        },
        { status: 400 }
      );
    }

    const { error: rawError } = body;

    // 1. Validation: non-empty check
    if (!rawError || typeof rawError !== 'string' || !rawError.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide an error message or stack trace to analyze.',
          tools: [],
        },
        { status: 400 }
      );
    }

    const errorText = rawError.trim();

    // 2. Validation: length check
    if (errorText.length > MAX_ERROR_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Error input exceeds the maximum allowed length of ${MAX_ERROR_LENGTH.toLocaleString()} characters.`,
          tools: [],
        },
        { status: 400 }
      );
    }

    // 3. Execute MCP Tools Pipeline
    const mcpResult = await executeMcpPipeline(errorText);
    toolsActivity.push(...mcpResult.tools);

    // 4. Amazon Bedrock Invocation
    const bedrockStart = Date.now();
    const bedrockResult = await analyzeWithBedrock({
      error: errorText,
      errorAnalysis: mcpResult.analysis,
      possibleCauses: mcpResult.causes,
      debuggingSteps: mcpResult.debugSteps,
    });

    const bedrockDuration = Date.now() - bedrockStart;

    if (bedrockResult.fallbackUsed) {
      toolsActivity.push({
        name: 'Amazon Bedrock',
        status: 'success',
        durationMs: bedrockDuration,
        message: `MCP deterministic synthesis mode (model: ${bedrockResult.modelId})`,
      });
    } else {
      toolsActivity.push({
        name: 'Amazon Bedrock',
        status: 'success',
        durationMs: bedrockDuration,
        message: `Generated AI diagnosis using ${bedrockResult.modelId}`,
      });
    }

    return NextResponse.json({
      success: true,
      diagnosis: bedrockResult.diagnosis,
      tools: toolsActivity,
      isBedrockFallback: bedrockResult.fallbackUsed,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during diagnosis';
    console.error('Error in /api/analyze route:', errorMsg);

    toolsActivity.push({
      name: 'Analysis Engine',
      status: 'error',
      message: 'Failed to complete analysis pipeline',
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
        tools: toolsActivity,
      },
      { status: 500 }
    );
  }
}
