import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  Video, 
  VideoOff, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Copy, 
  Send,
  Zap,
  Activity,
  User,
  Flame,
  Database
} from 'lucide-react';
import { HoloOrb } from './HoloOrb';

interface ScreenVisionHUDProps {
  stream: MediaStream | null;
  isStreaming: boolean;
  onStartStreaming: () => void;
  onStopStreaming: () => void;
  onManualScan: () => void;
  isAnalyzing: boolean;
  analysisData: any;
  onApplyReply: (replyText: string) => void;
  activeScreenName: string;
}

export const ScreenVisionHUD: React.FC<ScreenVisionHUDProps> = ({
  stream,
  isStreaming,
  onStartStreaming,
  onStopStreaming,
  onManualScan,
  isAnalyzing,
  analysisData,
  onApplyReply,
  activeScreenName,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handleCopyReply = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="flex flex-col h-full space-y-3.5 p-3.5 overflow-y-auto bg-black font-mono">
      {/* 1. VISION ENGINE HEADER */}
      <div className="flex items-center justify-between p-3 rounded-2xl bg-[#121318] border border-zinc-800 shadow-[0_0_25px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-2.5">
          <HoloOrb phase={isStreaming ? 'observing' : isAnalyzing ? 'analyzing' : 'idle'} size="sm" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold font-mono tracking-wider text-white">SYSTEM-WIDE COGNITION</h2>
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold flex items-center gap-1 ${
                isStreaming
                  ? 'bg-red-950/60 text-red-400 border border-red-600/60 animate-pulse'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
              }`}>
                {isStreaming ? '● VIEWPORT ACTIVE' : 'SIMULATED FEED'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">
              Active Context: <strong className="text-zinc-200">{activeScreenName}</strong>
            </p>
          </div>
        </div>

        {/* Action button */}
        <div className="flex items-center gap-1.5">
          {isStreaming ? (
            <button
              onClick={onStopStreaming}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black border border-red-600/40 text-[10px] font-mono text-red-400 hover:bg-zinc-900 transition"
            >
              <VideoOff className="w-3 h-3" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={onStartStreaming}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-[10px] font-mono font-bold text-white shadow-[0_0_12px_rgba(220,38,38,0.3)] transition active:scale-95"
            >
              <Video className="w-3 h-3" />
              <span>Share Viewport</span>
            </button>
          )}

          <button
            onClick={onManualScan}
            disabled={isAnalyzing}
            className="p-1.5 rounded-xl bg-black border border-zinc-800 text-zinc-300 hover:text-white transition disabled:opacity-40"
            title="Scan Viewport Now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-red-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. REAL SCREEN DISPLAY (if streaming) */}
      {isStreaming && (
        <div className="relative rounded-2xl overflow-hidden border border-red-600/40 shadow-2xl bg-black aspect-video flex items-center justify-center group">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-contain"
          />
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 border border-red-600/50 backdrop-blur-md text-[10px] font-mono text-red-400">
            <Activity className="w-3.5 h-3.5 animate-pulse text-red-400" />
            <span>Scanning Active Window Live</span>
          </div>
        </div>
      )}

      {/* 3. DOSSIER & EMOTIONAL SUBTEXT */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 rounded-xl bg-[#121318] border border-zinc-800">
          <span className="text-[9px] font-mono text-red-400 block mb-0.5">COUNTERPART DOSSIER</span>
          <p className="text-xs font-semibold text-white truncate">
            {analysisData?.counterpartDossier || 'Active Participant'}
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-[#121318] border border-zinc-800">
          <span className="text-[9px] font-mono text-zinc-400 block mb-0.5">PSYCHOLOGICAL REGISTER</span>
          <p className="text-xs font-semibold text-zinc-200 truncate">
            {analysisData?.emotionalRegister || 'Raw & Unflinching'}
          </p>
        </div>
      </div>

      {/* 4. TACTICAL RULES */}
      <div className="p-3.5 rounded-2xl bg-[#121318] border border-zinc-800 space-y-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
          DarkMisfit Tactical Directives
        </span>

        <div className="space-y-1.5">
          {(analysisData?.tacticalAdvice || [
            'Lead with the exact timestamp. Under pressure, words look like excuses.',
            'Acknowledge the client risk without getting defensive.',
            'Confirm the build directly into the host conversation.'
          ]).map((tip: string, idx: number) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-2 rounded-xl bg-black border border-zinc-800/80 text-xs text-zinc-200 font-mono text-[11px]"
            >
              <span className="w-4 h-4 rounded-full bg-red-950/40 text-red-400 border border-red-600/40 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 5. PREDICTIVE RESPONSE TIERS */}
      <div className="p-3.5 rounded-2xl bg-[#121318] border border-zinc-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-red-400" />
            Predictive Response Tiers
          </span>
          <span className="text-[9px] font-mono text-zinc-500">Tap to load into keyboard</span>
        </div>

        <div className="space-y-2">
          {(analysisData?.suggestedReplies || []).map((reply: string, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-zinc-800 hover:border-red-600/50 transition group"
            >
              <p className="text-xs text-zinc-200 pr-2 leading-relaxed flex-1 font-mono text-[11px]">
                {reply}
              </p>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleCopyReply(reply, idx)}
                  className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition"
                  title="Copy to clipboard"
                >
                  {copiedIdx === idx ? <Check className="w-3 h-3 text-red-400" /> : <Copy className="w-3 h-3" />}
                </button>

                <button
                  onClick={() => onApplyReply(reply)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-950/40 border border-red-600/50 text-red-400 text-xs font-mono font-bold hover:bg-red-900/40 transition active:scale-95"
                  title="Insert into active keyboard"
                >
                  <span>Use</span>
                  <Send className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
