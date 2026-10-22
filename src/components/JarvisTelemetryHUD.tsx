import React from 'react';
import { 
  Activity, 
  ShieldCheck, 
  Clock, 
  User, 
  Tag, 
  Sparkles, 
  X, 
  Database, 
  Flame, 
  Zap, 
  Layers,
  ChevronDown
} from 'lucide-react';
import { HoloOrb } from './HoloOrb';

export interface TelemetryNoteItem {
  id: string;
  category: 'Entity' | 'Topic' | 'Emotion' | 'Commitment' | 'Risk' | 'Auto-Pilot';
  label: string;
  detail: string;
  timestamp: string;
}

interface JarvisTelemetryHUDProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreenTitle: string;
  detectedSpeaker: string;
  emotionalRegister: string;
  telemetryNotes: TelemetryNoteItem[];
  latencyMs: number;
  npuAccelerator: string;
  onClearNotes?: () => void;
}

export const JarvisTelemetryHUD: React.FC<JarvisTelemetryHUDProps> = ({
  isOpen,
  onClose,
  activeScreenTitle,
  detectedSpeaker,
  emotionalRegister,
  telemetryNotes,
  latencyMs,
  npuAccelerator,
  onClearNotes,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-x-2 bottom-16 z-50 animate-in slide-in-from-bottom-6 duration-200">
      <div className="rounded-2xl border border-red-600/40 shadow-[0_0_35px_rgba(220,38,38,0.2)] bg-[#0a0a0c] p-4 text-zinc-100 relative overflow-hidden">
        {/* Top Glowing Ambient Bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-600 via-rose-600 to-red-800" />

        {/* HUD Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <HoloOrb phase="analyzing" size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-red-400">
                  OMNICORE TELEMETRY HUD
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-red-950/60 text-red-300 border border-red-800">
                  OMNICORE LIVE
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                {activeScreenTitle} • {latencyMs}ms ({npuAccelerator})
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/60 border border-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Speaker & Emotional Register Banner */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="p-2.5 rounded-xl bg-black border border-zinc-800">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400 mb-0.5">
              <User className="w-3 h-3" />
              <span>COUNTERPART DOSSIER</span>
            </div>
            <p className="text-xs font-semibold text-white truncate">
              {detectedSpeaker || 'Active Participant'}
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-black border border-zinc-800">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 mb-0.5">
              <Flame className="w-3 h-3 text-red-500" />
              <span>EMOTIONAL SUBTEXT</span>
            </div>
            <p className="text-xs font-semibold text-zinc-200 truncate">
              {emotionalRegister || 'Raw & Unflinching'}
            </p>
          </div>
        </div>

        {/* Background Extracted Notes & Facts Feed */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-red-400" />
              <span>AUTOMATIC MEMORY LEDGER ({telemetryNotes.length})</span>
            </span>
            {onClearNotes && (
              <button onClick={onClearNotes} className="hover:text-white transition">
                Clear
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto no-scrollbar space-y-1.5">
            {telemetryNotes.map((note) => {
              const badgeColors: Record<string, string> = {
                Entity: 'bg-zinc-800 text-zinc-200 border-zinc-700',
                Topic: 'bg-zinc-800 text-zinc-300 border-zinc-700',
                Emotion: 'bg-red-950/40 text-red-400 border-red-600/40',
                Commitment: 'bg-emerald-950/40 text-emerald-300 border-emerald-800',
                Risk: 'bg-red-950/60 text-red-300 border-red-700',
                'Auto-Pilot': 'bg-red-950/50 text-red-400 border-red-600/60 shadow-[0_0_8px_rgba(220,38,38,0.3)]',
              };

              return (
                <div
                  key={note.id}
                  className="flex items-start justify-between gap-2 p-2 rounded-xl bg-black border border-zinc-800/80 text-xs hover:border-red-600/30 transition"
                >
                  <div className="flex items-start gap-2 flex-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase shrink-0 border ${
                        badgeColors[note.category] || 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {note.category}
                    </span>
                    <div>
                      <span className="font-semibold text-zinc-200 block text-[11px]">
                        {note.label}
                      </span>
                      <p className="text-[10px] text-zinc-400 leading-tight">
                        {note.detail}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-500 shrink-0">
                    {note.timestamp}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-2 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-500">
          <span className="flex items-center gap-1 text-red-400/80">
            <ShieldCheck className="w-3 h-3 text-red-400" /> Shielded Dual-Lane Processing
          </span>
          <span className="text-zinc-400">DarkMisfitStudios Register</span>
        </div>
      </div>
    </div>
  );
};

export const OmniCoreTelemetryHUD = JarvisTelemetryHUD;
