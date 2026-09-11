'use client';

import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, Wrench } from 'lucide-react';
import { ToolActivity as ToolActivityType } from '@/mcp/types';

interface ToolActivityProps {
  activities: ToolActivityType[];
  isLoading: boolean;
}

const DEFAULT_STAGES = [
  { name: 'analyze_error', desc: 'Categorize error stack and technology' },
  { name: 'find_possible_causes', desc: 'Discover root causes in knowledge base' },
  { name: 'generate_debug_steps', desc: 'Generate verification steps & CLI commands' },
  { name: 'Amazon Bedrock', desc: 'Synthesize structured AI diagnosis' },
];

export default function ToolActivity({ activities, isLoading }: ToolActivityProps) {
  if (activities.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-zinc-200">
            Model Context Protocol (MCP) Activity
          </h2>
        </div>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-xs text-amber-400 animate-pulse font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Executing tool pipeline...
          </span>
        )}
      </div>

      <div className="space-y-3">
        {DEFAULT_STAGES.map((stage) => {
          const matchingActivity = activities.find(
            (a) => a.name.toLowerCase() === stage.name.toLowerCase()
          );

          let status = matchingActivity ? matchingActivity.status : 'pending';
          if (isLoading && !matchingActivity) {
            // Check if prior activities finished
            const index = DEFAULT_STAGES.findIndex((s) => s.name === stage.name);
            const prevCompleted = index === 0 || activities.length >= index;
            if (prevCompleted && activities.length === index) {
              status = 'running';
            } else {
              status = 'pending';
            }
          }

          return (
            <div
              key={stage.name}
              className={`flex items-start justify-between p-3 rounded-lg border transition-all ${
                status === 'success'
                  ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                  : status === 'running'
                  ? 'bg-amber-950/25 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10'
                  : status === 'error'
                  ? 'bg-red-950/25 border-red-800/50 text-red-300'
                  : 'bg-zinc-950/40 border-zinc-800/50 text-zinc-500'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {status === 'running' && (
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  )}
                  {status === 'pending' && (
                    <Circle className="w-4 h-4 text-zinc-600" />
                  )}
                  {status === 'error' && (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium">
                      {stage.name}
                    </span>
                    {matchingActivity?.durationMs !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {matchingActivity.durationMs}ms
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {matchingActivity?.message || stage.desc}
                  </p>
                </div>
              </div>

              <div>
                <span
                  className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded tracking-wide ${
                    status === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : status === 'running'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                      : status === 'error'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-zinc-800/50 text-zinc-500 border border-zinc-700/30'
                  }`}
                >
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
