/**
 * Amazon Bedrock Client and Inference Engine
 * 
 * Uses @aws-sdk/client-bedrock-runtime with ConverseCommand
 * Server-side ONLY. Never leaks credentials to browser.
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  ConversationRole,
} from '@aws-sdk/client-bedrock-runtime';

import {
  AnalyzeErrorOutput,
  FindPossibleCausesOutput,
  GenerateDebugStepsOutput,
  DiagnosisResult,
  SeverityLevel,
  ConfidenceLevel,
} from '../mcp/types';
import { SYSTEM_PROMPT, formatBedrockUserMessage } from './prompts';

export interface BedrockAnalysisInput {
  error: string;
  errorAnalysis: AnalyzeErrorOutput;
  possibleCauses: FindPossibleCausesOutput;
  debuggingSteps: GenerateDebugStepsOutput;
}

export interface BedrockAnalysisOutput {
  diagnosis: DiagnosisResult;
  rawResponse?: string;
  fallbackUsed: boolean;
  modelId: string;
}

// Default to Amazon Nova Micro (auto-enabled out of the box in all accounts), configurable via env
const DEFAULT_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'amazon.nova-micro-v1:0';
const DEFAULT_REGION = process.env.BEDROCK_AWS_REGION || process.env.AWS_REGION || 'us-east-1';

/**
 * Initializes the Bedrock Runtime client using the AWS SDK v3
 */
function getBedrockClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: DEFAULT_REGION,
  });
}

/**
 * Parses and validates LLM output against the expected DiagnosisResult schema
 */
export function parseAndValidateDiagnosis(
  responseText: string,
  fallbackInput: BedrockAnalysisInput
): DiagnosisResult {
  try {
    let cleanJson = responseText.trim();

    // Strip markdown code fences if present (```json ... ``` or ``` ...)
    if (cleanJson.startsWith('```')) {
      const firstNewline = cleanJson.indexOf('\n');
      const lastFences = cleanJson.lastIndexOf('```');
      if (firstNewline !== -1 && lastFences > firstNewline) {
        cleanJson = cleanJson.slice(firstNewline + 1, lastFences).trim();
      }
    }

    const parsed = JSON.parse(cleanJson);

    // Validate and sanitize fields
    const validSeverities: SeverityLevel[] = ['low', 'medium', 'high', 'critical'];
    const validConfidences: ConfidenceLevel[] = ['low', 'medium', 'high'];

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim()
        ? parsed.summary.trim()
        : fallbackInput.errorAnalysis.summary;

    const severity: SeverityLevel = validSeverities.includes(parsed.severity?.toLowerCase())
      ? (parsed.severity.toLowerCase() as SeverityLevel)
      : fallbackInput.errorAnalysis.severity;

    const confidence: ConfidenceLevel = validConfidences.includes(parsed.confidence?.toLowerCase())
      ? (parsed.confidence.toLowerCase() as ConfidenceLevel)
      : 'high';

    const likelyCauses: string[] = Array.isArray(parsed.likelyCauses) && parsed.likelyCauses.length > 0
      ? parsed.likelyCauses.map(String)
      : fallbackInput.possibleCauses.causes;

    const recommendedSteps: string[] = Array.isArray(parsed.recommendedSteps) && parsed.recommendedSteps.length > 0
      ? parsed.recommendedSteps.map(String)
      : fallbackInput.debuggingSteps.steps;

    const commands: string[] = Array.isArray(parsed.commands) && parsed.commands.length > 0
      ? parsed.commands.map(String)
      : fallbackInput.debuggingSteps.commands;

    return {
      summary,
      severity,
      likelyCauses,
      recommendedSteps,
      commands,
      confidence,
    };
  } catch {
    // If JSON parsing fails, construct a structured fallback from raw text or MCP outputs
    return createMcpFallbackDiagnosis(fallbackInput, responseText);
  }
}

/**
 * Creates a deterministic diagnosis directly from MCP tool findings
 */
export function createMcpFallbackDiagnosis(
  input: BedrockAnalysisInput,
  rawBedrockText?: string
): DiagnosisResult {
  return {
    summary: rawBedrockText && rawBedrockText.length > 10
      ? rawBedrockText.slice(0, 300)
      : input.errorAnalysis.summary,
    severity: input.errorAnalysis.severity,
    likelyCauses: input.possibleCauses.causes,
    recommendedSteps: input.debuggingSteps.steps,
    commands: input.debuggingSteps.commands,
    confidence: 'high',
  };
}

/**
 * Invokes Amazon Bedrock Converse API with MCP findings
 */
export async function analyzeWithBedrock(
  input: BedrockAnalysisInput
): Promise<BedrockAnalysisOutput> {
  const modelId = process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL_ID;

  try {
    const client = getBedrockClient();
    const prompt = formatBedrockUserMessage(input);

    const command = new ConverseCommand({
      modelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages: [
        {
          role: ConversationRole.USER,
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        maxTokens: 1024,
        temperature: 0.1,
        topP: 0.9,
      },
    });

    const response = await client.send(command);
    const responseText = response.output?.message?.content?.[0]?.text || '';

    if (!responseText) {
      throw new Error('Received empty text response from Amazon Bedrock');
    }

    const diagnosis = parseAndValidateDiagnosis(responseText, input);

    return {
      diagnosis,
      rawResponse: responseText,
      fallbackUsed: false,
      modelId,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn(`[Bedrock Warning] Invocation bypassed or failed: ${errorMessage}. Serving MCP structured synthesis.`);

    // Gracefully fallback to deterministic MCP knowledge base diagnosis
    const fallbackDiagnosis = createMcpFallbackDiagnosis(input);

    return {
      diagnosis: fallbackDiagnosis,
      rawResponse: `Bedrock note: ${errorMessage}. Falling back to MCP knowledge synthesis.`,
      fallbackUsed: true,
      modelId,
    };
  }
}
