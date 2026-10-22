import React from 'react';
import { 
  Smartphone, 
  Download, 
  Layers, 
  ShieldCheck, 
  Share2, 
  Sliders, 
  Volume2, 
  Cpu, 
  Zap,
  Activity,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface MobileSetupGuideProps {
  onTestKeyboard?: () => void;
  onOpenIdentity?: () => void;
}

export const MobileSetupGuide: React.FC<MobileSetupGuideProps> = ({ onTestKeyboard, onOpenIdentity }) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-4 text-zinc-100 bg-black font-mono">
      {/* 1. APP INSTALLATION HERO */}
      <div className="p-5 rounded-2xl bg-[#0a0a0c] border border-red-600/40 shadow-[0_0_35px_rgba(220,38,38,0.2)] space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-black border border-red-600/60 flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            <Smartphone className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-wide">OMNIAI SHADOW COMPANION DEPLOYMENT</h2>
            <p className="text-[10px] text-zinc-400">Install as standalone native mobile app (PWA)</p>
          </div>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed text-[11px]">
          Runs with zero browser headers at 60fps on mobile hardware, utilizing WebGPU and NPU acceleration for instant sub-10ms viewport perception.
        </p>

        <div className="pt-2">
          <PWAInstallButton variant="full" />
        </div>
      </div>

      {/* 2. DUAL-LANE COGNITION ARCHITECTURE */}
      <div className="p-4 rounded-2xl bg-[#121318] border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-red-400" />
          <h3 className="text-xs font-bold text-white tracking-wider">DUAL-LANE PIPELINE SPECIFICATION</h3>
        </div>

        <div className="space-y-2 text-xs text-zinc-300">
          <div className="p-2.5 rounded-xl bg-black border border-zinc-800/80 space-y-1">
            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Lane 1: Low-Latency Conversation Stream
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Computes 3 predictive response tiers directly above the keyboard layout row (Witty, Raw & Honest, Direct Action), allowing 1-tap population.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-black border border-zinc-800/80 space-y-1">
            <span className="text-[10px] font-bold text-zinc-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-red-500" /> Lane 2: Automated Background Ledger
            </span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Silently parses ongoing conversation streams for counterparty entities, dates, deadlines, and emotional subtext, accessible via the OmniCore Telemetry HUD.
            </p>
          </div>
        </div>
      </div>

      {/* 3. STEP-BY-STEP PHONE EXTENSION GUIDES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* iOS Setup */}
        <div className="p-4 rounded-2xl bg-[#121318] border border-zinc-800 space-y-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            🍎 Apple iOS Setup
          </span>
          <ol className="text-[11px] text-zinc-400 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Open this URL in <strong>Safari</strong></li>
            <li>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong></li>
            <li>Enable keyboard extension in <strong>Settings → Keyboards</strong></li>
            <li>Toggle <strong>Allow Full Access</strong> for live viewport perception</li>
          </ol>
        </div>

        {/* Android Setup */}
        <div className="p-4 rounded-2xl bg-[#121318] border border-zinc-800 space-y-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            🤖 Android Setup
          </span>
          <ol className="text-[11px] text-zinc-400 space-y-1.5 list-decimal list-inside leading-relaxed">
            <li>Open in <strong>Chrome</strong> and tap <strong>Install App</strong></li>
            <li>Activate in <strong>Settings → System → Languages & Input</strong></li>
            <li>Grant <strong>Accessibility Service</strong> for viewport awareness</li>
            <li>Supports system-wide floating window multitasking</li>
          </ol>
        </div>
      </div>

      {/* 4. PRIVACY SHIELD */}
      <div className="p-3.5 rounded-2xl bg-black border border-red-600/30 flex items-start gap-2.5 text-xs text-zinc-300">
        <Lock className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block text-[11px]">Zero Data Leakage Register</strong>
          <span className="text-[10px] text-zinc-400 leading-relaxed">
            All token transformations and PII scrubbing execute on the local Neural Processing Unit (NPU).
          </span>
        </div>
      </div>

      {/* 5. PERSONAL AI IDENTITY SHORTCUT */}
      {onOpenIdentity && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-black border border-zinc-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              My AI Identity (/settings/identity)
            </span>
            <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              Settings
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Train your personal Voice Cloning Matrix for automated phone calls and Text Persona Engine for autonomous messaging.
          </p>
          <button
            onClick={onOpenIdentity}
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-red-600 text-red-400 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow-md"
          >
            Configure Voice & Text Persona
          </button>
        </div>
      )}

      <button
        onClick={onTestKeyboard}
        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(220,38,38,0.3)] transition active:scale-98"
      >
        Launch Volumetric 3D Keyboard
      </button>
    </div>
  );
};
