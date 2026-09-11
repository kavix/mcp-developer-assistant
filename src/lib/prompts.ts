/**
 * Bedrock Prompts and Formatting for MCP Developer Assistant
 */

import {
  AnalyzeErrorOutput,
  FindPossibleCausesOutput,
  GenerateDebugStepsOutput,
} from '../mcp/types';

export const SYSTEM_PROMPT = `You are an experienced software reliability engineer.

Analyze the developer error provided to you.

Use the structured information supplied by the MCP tools.

Do not invent facts.

Clearly separate:
- confirmed information
- likely causes
- recommended checks

Give practical debugging commands when appropriate.

Keep the answer concise and useful to a developer.

Never claim that a command was executed.

Never claim that a system was inspected.

You are providing troubleshooting guidance only.

You MUST respond ONLY with valid, parseable JSON matching the following schema without any markdown wrapping or code fences if possible, or inside a single \`\`\`json block:
{
  "summary": "Clear, concise technical summary of the error and affected component",
  "severity": "low" | "medium" | "high" | "critical",
  "likelyCauses": [
    "Cause 1",
    "Cause 2"
  ],
  "recommendedSteps": [
    "Step 1: Check XYZ",
    "Step 2: Inspect ABC"
  ],
  "commands": [
    "command 1",
    "command 2"
  ],
  "confidence": "low" | "medium" | "high"
}`;

export interface FormatPromptInput {
  error: string;
  errorAnalysis: AnalyzeErrorOutput;
  possibleCauses: FindPossibleCausesOutput;
  debuggingSteps: GenerateDebugStepsOutput;
}

export function formatBedrockUserMessage(input: FormatPromptInput): string {
  return `Please analyze the following developer error using the provided MCP tool outputs.

### Raw Error:
\`\`\`text
${input.error}
\`\`\`

### MCP Tool 1 Output (analyze_error):
- Technology: ${input.errorAnalysis.technology}
- Category: ${input.errorAnalysis.category}
- Assessed Severity: ${input.errorAnalysis.severity}
- Preliminary Summary: ${input.errorAnalysis.summary}

### MCP Tool 2 Output (find_possible_causes):
${input.possibleCauses.causes.map((c, i) => `${i + 1}. ${c}`).join('\n')}

### MCP Tool 3 Output (generate_debug_steps):
Recommended steps:
${input.debuggingSteps.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Verification commands:
${input.debuggingSteps.commands.map((cmd) => `\`${cmd}\``).join('\n')}

Synthesize these MCP findings into a final developer-ready diagnosis JSON object now.`;
}
