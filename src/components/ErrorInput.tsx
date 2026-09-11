'use client';

import React from 'react';
import { Play, RotateCcw, AlertCircle, Sparkles } from 'lucide-react';

interface ErrorInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  isLoading: boolean;
  maxLength?: number;
}

const EXAMPLES = [
  {
    label: 'PostgreSQL',
    tag: 'Database',
    error: 'ECONNREFUSED 127.0.0.1:5432',
  },
  {
    label: 'Node.js',
    tag: 'Runtime',
    error: "Error: Cannot find module 'express'\nRequire stack:\n- /app/dist/server.js",
  },
  {
    label: 'Kubernetes',
    tag: 'Cloud',
    error: 'CrashLoopBackOff: back-off 5m0s restarting failed container=api-service pod=api-service-789bf-xk209',
  },
  {
    label: 'HTTP 502',
    tag: 'Gateway',
    error: 'HTTP/1.1 502 Bad Gateway - upstream connect error or disconnect/reset before headers',
  },
  {
    label: 'Python',
    tag: 'System',
    error: "PermissionError: [Errno 13] Permission denied: '/var/log/application.log'",
  },
];

export default function ErrorInput({
  value,
  onChange,
  onSubmit,
  onClear,
  isLoading,
  maxLength = 10000,
}: ErrorInputProps) {
  const charCount = value.length;
  const isOverLimit = charCount > maxLength;
  const isDisabled = isLoading || charCount === 0 || isOverLimit;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to quickly submit
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isDisabled) {
        onSubmit();
      }
    }
  };

  return (
    <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <label
          htmlFor="error-input"
          className="text-sm font-semibold text-zinc-200 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 text-amber-400" />
          Paste Your Technical Error or Stack Trace
        </label>
        <span
          className={`text-xs font-mono ${
            isOverLimit ? 'text-red-400 font-bold' : 'text-zinc-500'
          }`}
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()} chars
        </span>
      </div>

      <div className="relative">
        <textarea
          id="error-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. ECONNREFUSED 127.0.0.1:5432 or paste full container crash logs, stack trace, or HTTP gateway error..."
          rows={6}
          disabled={isLoading}
          className="w-full bg-zinc-950/90 border border-zinc-800 rounded-lg p-3.5 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all resize-y disabled:opacity-50"
        />
      </div>

      {/* Example Prompts */}
      <div className="mt-3 flex items-center flex-wrap gap-2">
        <span className="text-xs text-zinc-400 font-medium flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> Try an example:
        </span>
        {EXAMPLES.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onChange(item.error)}
            disabled={isLoading}
            className="text-xs font-mono px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-zinc-100 border border-zinc-700/60 transition-colors disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-5 flex items-center justify-between pt-3 border-t border-zinc-800/80">
        <span className="text-xs text-zinc-500 hidden sm:inline">
          Pro-tip: Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono text-[10px]">⌘+Enter</kbd> to analyze
        </span>
        <div className="flex items-center gap-2.5 ml-auto">
          {value && (
            <button
              type="button"
              onClick={onClear}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={isDisabled}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-1 h-4 w-4 text-zinc-950"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Analyzing Error...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Analyze Error</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
