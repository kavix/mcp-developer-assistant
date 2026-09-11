/**
 * Types and interfaces for MCP Developer Assistant
 */

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type ToolExecutionStatus = 'pending' | 'running' | 'success' | 'error';

// ----------------------------------------------------------------------------
// Knowledge Base Types
// ----------------------------------------------------------------------------

export interface ErrorKnowledgeItem {
  id: string;
  matchPatterns: (string | RegExp)[];
  category: string;
  technology: string;
  severity: SeverityLevel;
  summary: string;
  causes: string[];
  debuggingSteps: string[];
  commands: string[];
}

// ----------------------------------------------------------------------------
// MCP Tool 1: analyze_error
// ----------------------------------------------------------------------------

export interface AnalyzeErrorInput {
  error: string;
}

export interface AnalyzeErrorOutput {
  category: string;
  technology: string;
  severity: SeverityLevel;
  summary: string;
}

// ----------------------------------------------------------------------------
// MCP Tool 2: find_possible_causes
// ----------------------------------------------------------------------------

export interface FindPossibleCausesInput {
  category: string;
  technology: string;
}

export interface FindPossibleCausesOutput {
  causes: string[];
}

// ----------------------------------------------------------------------------
// MCP Tool 3: generate_debug_steps
// ----------------------------------------------------------------------------

export interface GenerateDebugStepsInput {
  category: string;
  technology: string;
}

export interface GenerateDebugStepsOutput {
  steps: string[];
  commands: string[];
}

// ----------------------------------------------------------------------------
// Tool Activity Status Tracker
// ----------------------------------------------------------------------------

export interface ToolActivity {
  name: 'analyze_error' | 'find_possible_causes' | 'generate_debug_steps' | 'Amazon Bedrock' | string;
  status: ToolExecutionStatus;
  message?: string;
  durationMs?: number;
}

// ----------------------------------------------------------------------------
// Amazon Bedrock & Final Diagnosis
// ----------------------------------------------------------------------------

export interface DiagnosisResult {
  summary: string;
  severity: SeverityLevel;
  likelyCauses: string[];
  recommendedSteps: string[];
  commands: string[];
  confidence: ConfidenceLevel;
}

export interface AnalyzeApiRequest {
  error: string;
}

export interface AnalyzeApiResponse {
  success: boolean;
  diagnosis?: DiagnosisResult;
  tools: ToolActivity[];
  error?: string;
  isBedrockFallback?: boolean;
}
