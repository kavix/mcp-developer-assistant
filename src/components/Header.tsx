'use client';

import React from 'react';
import { Terminal, Cpu, ShieldCheck, Sparkles } from 'lucide-react';

export default function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-violet-500/20 border border-amber-500/30 text-amber-400">
            <Terminal className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                MCP Developer Assistant
              </h1>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                AWS Challenge
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400">
              AI-powered error diagnosis using Model Context Protocol (MCP) + Amazon Bedrock
            </p>
          </div>
        </div>

        {/* Badges / Tech Stack */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Cpu className="w-3.5 h-3.5 text-orange-400" />
            <span>Bedrock LLM</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            <span>MCP SDK</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>AWS Amplify</span>
          </div>
        </div>
      </div>
    </header>
  );
}
