'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  HelpCircle,
  ListOrdered,
  Terminal,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { DiagnosisResult, SeverityLevel, ConfidenceLevel } from '@/mcp/types';

interface DiagnosisProps {
  diagnosis: DiagnosisResult;
  isFallback?: boolean;
}

export default function Diagnosis({ diagnosis, isFallback }: DiagnosisProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (command: string, index: number) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy command:', err);
    }
  };

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
            Severity: Critical
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            Severity: High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Severity: Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Severity: Low
          </span>
        );
    }
  };

  const getConfidenceBadge = (confidence: ConfidenceLevel) => {
    switch (confidence) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Confidence: High
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
            Confidence: Medium
          </span>
        );
      case 'low':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/30">
            Confidence: Low
          </span>
        );
    }
  };

  return (
    <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-6 shadow-xl backdrop-blur-sm space-y-6">
      {/* Title & Metadata Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight">
            Developer Diagnosis
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {getSeverityBadge(diagnosis.severity)}
          {getConfidenceBadge(diagnosis.confidence)}
        </div>
      </div>

      {isFallback && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-950/20 border border-blue-800/40 text-blue-300 text-xs">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            Deterministic diagnosis generated directly from verified MCP tool knowledge base.
          </span>
        </div>
      )}

      {/* 1. Summary */}
      <div>
        <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-1.5">
          Error Summary
        </h3>
        <p className="text-sm sm:text-base text-zinc-200 font-medium leading-relaxed bg-zinc-950/60 border border-zinc-800/70 p-4 rounded-lg">
          {diagnosis.summary}
        </p>
      </div>

      {/* 2. Likely Causes */}
      {diagnosis.likelyCauses && diagnosis.likelyCauses.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            Likely Causes
          </h3>
          <ul className="space-y-2">
            {diagnosis.likelyCauses.map((cause, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-sm text-zinc-300 bg-zinc-950/40 border border-zinc-800/50 p-2.5 rounded-lg"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                <span className="leading-snug">{cause}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3. Recommended Steps */}
      {diagnosis.recommendedSteps && diagnosis.recommendedSteps.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5">
            <ListOrdered className="w-3.5 h-3.5 text-violet-400" />
            Recommended Debugging Checks
          </h3>
          <ol className="space-y-2">
            {diagnosis.recommendedSteps.map((step, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-sm text-zinc-300 bg-zinc-950/40 border border-zinc-800/50 p-3 rounded-lg"
              >
                <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 border border-zinc-700/60">
                  {idx + 1}
                </span>
                <span className="leading-snug">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* 4. Practical Commands */}
      {diagnosis.commands && diagnosis.commands.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-2.5 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            Verification &amp; Debugging Commands
          </h3>
          <div className="space-y-2">
            {diagnosis.commands.map((cmd, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-lg group hover:border-zinc-700 transition-colors"
              >
                <code className="text-xs sm:text-sm font-mono text-emerald-300 break-all pr-3 select-all">
                  {cmd}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(cmd, idx)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-mono transition-colors shrink-0"
                  title="Copy command"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
