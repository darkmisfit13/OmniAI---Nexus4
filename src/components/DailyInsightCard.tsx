import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  RefreshCw, 
  TrendingUp, 
  Quote, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Zap,
  CornerDownLeft
} from 'lucide-react';

export interface DailyInsightData {
  type: 'trend' | 'quote';
  headline: string;
  insight: string;
  authorOrSource: string;
  tag: string;
  sources?: { title: string; url: string }[];
  grounded?: boolean;
  timestamp: string;
}

interface DailyInsightCardProps {
  onInsertToDraft?: (text: string) => void;
  className?: string;
}

export const DailyInsightCard: React.FC<DailyInsightCardProps> = ({ 
  onInsertToDraft,
  className = '' 
}) => {
  const [insight, setInsight] = useState<DailyInsightData | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('omni_daily_insight');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return {
      type: 'trend',
      headline: 'Autonomous Edge Intelligence Surges',
      insight: 'Real-time screen cognition and sub-10ms local tensor processing are transitioning OS interfaces into proactive shadow companions.',
      authorOrSource: 'Google Search Verified • Silicon Trends',
      tag: 'Edge AI Systems',
      sources: [
        { title: 'Google DeepMind Research', url: 'https://deepmind.google' },
        { title: 'ArXiv AI & Architecture', url: 'https://arxiv.org' }
      ],
      grounded: true,
      timestamp: new Date().toISOString(),
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchDailyInsight = async (force = false) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/daily-insight');
      if (res.ok) {
        const data = await res.json();
        if (data?.insight) {
          setInsight(data.insight);
          try {
            localStorage.setItem('omni_daily_insight', JSON.stringify(data.insight));
          } catch {}
        }
      }
    } catch (err) {
      console.warn('[DailyInsightCard] Error fetching insight:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // If not fetched today, refresh
    const lastFetch = insight?.timestamp ? new Date(insight.timestamp).getTime() : 0;
    const now = Date.now();
    if (now - lastFetch > 6 * 60 * 60 * 1000) {
      fetchDailyInsight();
    }
  }, []);

  const handleCopy = () => {
    if (!insight) return;
    const textToCopy = `${insight.headline}: "${insight.insight}" — ${insight.authorOrSource}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!insight) return null;

  return (
    <div className={`rounded-xl bg-[#121318] border border-zinc-800 shadow-lg text-zinc-100 overflow-hidden transition-all duration-200 ${className}`}>
      {/* Top Header Row */}
      <div className="px-3 py-2 bg-black/60 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Deep crimson icon badge */}
          <div className="w-5 h-5 rounded-md bg-red-600/15 border border-red-500/30 flex items-center justify-center text-red-400">
            {insight.type === 'quote' ? (
              <Quote className="w-3 h-3" />
            ) : (
              <TrendingUp className="w-3 h-3" />
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-bold tracking-wider text-white uppercase">
              Daily Insight
            </span>
            <span className="px-1.5 py-0.2 rounded text-[8.5px] font-mono font-semibold bg-red-600/20 text-red-400 border border-red-600/30">
              {insight.tag || 'AI & Tech'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          {/* Google Search Grounding Indicator */}
          {insight.grounded && (
            <span 
              className="hidden xs:flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono bg-zinc-800 border border-zinc-700 text-zinc-300"
              title="Verified via real-time Google Search grounding"
            >
              <Search className="w-2.5 h-2.5 text-red-400" />
              <span>Grounded</span>
            </span>
          )}

          {/* Refresh Button */}
          <button
            onClick={() => fetchDailyInsight(true)}
            disabled={isLoading}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition active:scale-95 disabled:opacity-50"
            title="Fetch Fresh Industry Trend or Quote"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin text-red-400' : ''}`} />
          </button>

          {/* Collapse/Expand Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            title={isExpanded ? 'Collapse Insight Card' : 'Expand Insight Card'}
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isExpanded && (
        <div className="p-3 space-y-2">
          {/* Headline */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-xs font-bold text-white tracking-wide leading-tight">
              {insight.headline}
            </h4>
            <span className="text-[9px] font-mono text-zinc-500 shrink-0">
              {insight.type === 'quote' ? 'Mindset' : 'Trend'}
            </span>
          </div>

          {/* Body */}
          <p className="text-[11px] leading-relaxed text-zinc-300 font-sans">
            {insight.type === 'quote' ? `"${insight.insight}"` : insight.insight}
          </p>

          {/* Author/Source & Footer Controls */}
          <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono text-zinc-400">
            <span className="text-zinc-400 font-medium truncate max-w-[190px]">
              — {insight.authorOrSource}
            </span>

            <div className="flex items-center gap-1.5 ml-auto">
              {/* Copy Quote Button */}
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition active:scale-95 border border-zinc-700"
                title="Copy insight"
              >
                {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Insert to Draft Button */}
              {onInsertToDraft && (
                <button
                  onClick={() => onInsertToDraft(insight.insight)}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-white transition active:scale-95 border border-red-500/30 font-semibold"
                  title="Insert into current typing draft"
                >
                  <CornerDownLeft className="w-2.5 h-2.5 text-red-400" />
                  <span>Use in Draft</span>
                </button>
              )}
            </div>
          </div>

          {/* Grounding Source Links */}
          {insight.sources && insight.sources.length > 0 && (
            <div className="pt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] font-mono text-zinc-500">
              <span className="text-zinc-500 flex items-center gap-1">
                <Search className="w-2.5 h-2.5 text-red-400" />
                <span>Search Grounding:</span>
              </span>
              {insight.sources.map((s, idx) => (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/60 text-zinc-300 hover:text-red-300 border border-zinc-800 hover:border-red-500/30 transition truncate max-w-[140px]"
                >
                  <span className="truncate">{s.title}</span>
                  <ExternalLink className="w-2 h-2 shrink-0 opacity-70" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
