'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import ErrorInput from '@/components/ErrorInput';
import ToolActivity from '@/components/ToolActivity';
import Diagnosis from '@/components/Diagnosis';
import { DiagnosisResult, ToolActivity as ToolActivityType, AnalyzeApiResponse } from '@/mcp/types';
import { AlertTriangle, Server, Shield, Sparkles } from 'lucide-react';

export default function Home() {
  const [errorInput, setErrorInput] = useState('ECONNREFUSED 127.0.0.1:5432');
  const [isLoading, setIsLoading] = useState(false);
  const [activities, setActivities] = useState<ToolActivityType[]>([]);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!errorInput.trim() || isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setDiagnosis(null);
    setActivities([]);
    setIsFallback(false);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ error: errorInput }),
      });

      const data: AnalyzeApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to diagnose the technical error.');
      }

      setActivities(data.tools || []);
      setDiagnosis(data.diagnosis || null);
      setIsFallback(Boolean(data.isBedrockFallback));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during analysis.';
      setErrorMessage(msg);
      setActivities((prev) => [
        ...prev,
        {
          name: 'Amazon Bedrock',
          status: 'error',
          message: msg,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setErrorInput('');
    setDiagnosis(null);
    setActivities([]);
    setErrorMessage(null);
    setIsFallback(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Intro Hero */}
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Next.js 15+ &bull; MCP SDK &bull; Amazon Bedrock &bull; AWS Amplify</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-100">
            Intelligent Error Diagnosis
          </h2>
          <p className="text-sm text-zinc-400">
            Paste any technical exception, stack trace, or cloud error. The system orchestrates 3 Model Context Protocol tools and queries Amazon Bedrock to deliver root causes and exact debugging commands.
          </p>
        </div>

        {/* Input Form */}
        <ErrorInput
          value={errorInput}
          onChange={setErrorInput}
          onSubmit={handleAnalyze}
          onClear={handleClear}
          isLoading={isLoading}
        />

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 text-red-200 flex items-start gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Unable to generate diagnosis</p>
              <p className="text-xs text-red-400/90 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* MCP Activity Stepper */}
        {(isLoading || activities.length > 0) && (
          <ToolActivity activities={activities} isLoading={isLoading} />
        )}

        {/* Structured Diagnosis */}
        {diagnosis && (
          <Diagnosis diagnosis={diagnosis} isFallback={isFallback} />
        )}

        {/* Architecture Note */}
        <div className="pt-6 border-t border-zinc-900 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-500">
          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-850 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span>In-Process MCP Layer</span>
            </div>
            <p>
              Employs official <code className="text-zinc-400">@modelcontextprotocol/sdk</code> with InMemoryTransport to query structured error knowledge deterministically.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-850 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Amazon Bedrock LLM</span>
            </div>
            <p>
              AWS SDK v3 Bedrock Runtime calls happen server-side via Converse API. Model ID and AWS Region are fully configurable.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-900/40 border border-zinc-850 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-zinc-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>AWS Security &amp; Amplify</span>
            </div>
            <p>
              Zero database, zero container, zero client credentials. Deploys effortlessly onto AWS Amplify hosting with IAM role execution.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
        <p>
          Built for AWS Builder Center &ldquo;Deploy Your First App Weekend Challenge&rdquo; &bull; Powered by MCP &amp; Amazon Bedrock
        </p>
      </footer>
    </div>
  );
}
