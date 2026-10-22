import React, { useState } from 'react';
import { 
  Briefcase, 
  Heart, 
  Mail, 
  Terminal, 
  Upload, 
  Sparkles, 
  Video, 
  Activity, 
  Zap, 
  Phone, 
  ShieldCheck 
} from 'lucide-react';
import { DailyInsightCard } from './DailyInsightCard';

export interface ScreenScenario {
  id: string;
  name: string;
  category: string;
  icon: any;
  appHeader: {
    title: string;
    subtitle: string;
    avatar: string;
    badge?: string;
  };
  messages: Array<{
    sender: 'them' | 'me';
    text: string;
    time: string;
    isAutoPilot?: boolean;
  }>;
  contextHint: string;
  defaultDraft: string;
}

export const PRESET_SCENARIOS: ScreenScenario[] = [
  {
    id: 'work_slack',
    name: 'Work Slack',
    category: 'Work',
    icon: Briefcase,
    appHeader: {
      title: 'Alex Rivera (VP Eng)',
      subtitle: 'Active now • #product-launch',
      avatar: '👨‍💼',
      badge: 'HIGH STAKES',
    },
    messages: [
      {
        sender: 'them',
        text: 'The client VP is asking why staging build #402 is delayed. Did you deploy the auth patch yet? Need an unvarnished ETA right now.',
        time: '10:42 AM',
      },
    ],
    contextHint: 'Alex is under intense executive scrutiny. Demands unambiguous certainty; zero filler words.',
    defaultDraft: 'Fix is verified locally; regression test passing. Pushing build #402 to staging in 15 minutes.',
  },
  {
    id: 'dating_hinge',
    name: 'Hinge Match',
    category: 'Social',
    icon: Heart,
    appHeader: {
      title: 'Maya Lin',
      subtitle: '2 miles away • Just matched',
      avatar: '✨',
      badge: 'UNFILTERED',
    },
    messages: [
      {
        sender: 'them',
        text: 'Haha okay but what’s your most controversial food opinion? And please do not say pineapple on pizza 😂',
        time: '9:15 PM',
      },
    ],
    contextHint: 'Maya is testing conversational authenticity. Avoid generic assistant clichés; be specific and magnetic.',
    defaultDraft: 'Cold takeout eaten directly out of the box in the refrigerator light at 1 AM hits different. Fight me.',
  },
  {
    id: 'client_dispute',
    name: 'Client Email',
    category: 'Finance',
    icon: Mail,
    appHeader: {
      title: 'Billing Breach: Apex Corp',
      subtitle: 'From: Sarah Jenkins (CFO)',
      avatar: '📊',
      badge: 'DISPUTE RISK',
    },
    messages: [
      {
        sender: 'them',
        text: 'We noticed an unexpected $240 charge on our corporate invoice #8819. Can someone explain this line item before we dispute it with our credit card merchant?',
        time: '11:05 AM',
      },
    ],
    contextHint: 'Sarah feels commercially breached. Validate her shock, prevent the merchant dispute, and offer same-day audit and credit.',
    defaultDraft: 'Hi Sarah, inspecting invoice #8819 immediately with our billing team. Expect clarity or full credit today.',
  },
  {
    id: 'terminal_bug',
    name: 'Terminal Crash',
    category: 'Dev',
    icon: Terminal,
    appHeader: {
      title: 'Crash Log: worker-auth',
      subtitle: 'node:v22.14 • Exit code 1',
      avatar: '⚡',
      badge: 'CRITICAL',
    },
    messages: [
      {
        sender: 'them',
        text: 'FATAL: TypeError: Cannot read properties of undefined (reading "bearerToken") at verifySession (/app/auth.js:84:22). Server down.',
        time: '3:01 PM',
      },
    ],
    contextHint: 'Missing optional chaining on auth header for healthcheck pings. Fix: req.headers?.authorization?.split(" ")[1]',
    defaultDraft: 'The auth header is undefined on unauthenticated health-pings. Adding safe optional chaining.',
  },
];

interface SimulatedAppViewProps {
  currentScenario: ScreenScenario;
  onSelectScenario: (scenario: ScreenScenario) => void;
  customScreenshot: string | null;
  onUploadScreenshot: (file: File) => void;
  onClearCustomScreenshot: () => void;
  isLiveScreenSharing: boolean;
  onToggleLiveScreenSharing: () => void;
  currentDraftText: string;
  onSimulateIncomingMessage?: () => void;
  isAutoMode?: boolean;
  onOpenLiveCall?: () => void;
  onOpenAutoPilotSetup?: () => void;
}

export const SimulatedAppView: React.FC<SimulatedAppViewProps> = ({
  currentScenario,
  onSelectScenario,
  customScreenshot,
  onUploadScreenshot,
  onClearCustomScreenshot,
  isLiveScreenSharing,
  onToggleLiveScreenSharing,
  currentDraftText,
  onSimulateIncomingMessage,
  isAutoMode = false,
  onOpenLiveCall,
  onOpenAutoPilotSetup,
}) => {
  const [isLiveWatching, setIsLiveWatching] = useState<boolean>(true);
  const [showCognitionDetail, setShowCognitionDetail] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadScreenshot(file);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-zinc-100 rounded-2xl overflow-hidden border border-zinc-800 shadow-[0_0_30px_rgba(0,0,0,0.95)]">
      
      {/* 1. LIVE SCREEN-WATCHING CONTEXT STREAM HEADER */}
      <div className="px-3 py-1.5 bg-[#0a0a0c] border-b border-zinc-800 flex items-center justify-between text-xs font-mono shrink-0">
        <div className="flex items-center gap-2">
          {/* Toggleable Live Watching Pill */}
          <button
            onClick={() => setIsLiveWatching(!isLiveWatching)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold transition shadow-md ${
              isLiveWatching
                ? 'bg-red-950/40 border border-red-500/50 text-red-300 shadow-[0_0_12px_rgba(220,38,38,0.25)]'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
            }`}
            title="Click to toggle real-time live screen cognition stream"
          >
            <span className={`w-2 h-2 rounded-full ${isLiveWatching ? 'bg-red-500 animate-ping' : 'bg-zinc-600'}`} />
            <span>{isLiveWatching ? 'OmniAI Cognition Active' : 'Watching Paused'}</span>
          </button>

          {/* Cognitive Intent Stream Tag */}
          <div 
            onClick={() => setShowCognitionDetail(!showCognitionDetail)}
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 hover:border-red-500/40 cursor-pointer truncate max-w-[210px]"
            title="Click for live cognition dossier"
          >
            <Activity className="w-3 h-3 text-red-400 shrink-0" />
            <span className="truncate text-zinc-300">{currentScenario.contextHint.slice(0, 36)}...</span>
          </div>
        </div>

        {/* Live Call Trigger & Auto Persona Quick Access */}
        <div className="flex items-center gap-1.5">
          {onOpenLiveCall && (
            <button
              onClick={onOpenLiveCall}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-600/20 text-red-300 border border-red-500/50 hover:bg-red-600/30 text-[10px] font-bold transition shadow-[0_0_10px_rgba(220,38,38,0.3)] animate-pulse"
              title="Launch Live Real-Time Phone Call Mode with Voice Cloning Takeover"
            >
              <Phone className="w-3 h-3 text-red-400" />
              <span>Live Call</span>
            </button>
          )}

          {onOpenAutoPilotSetup && (
            <button
              onClick={onOpenAutoPilotSetup}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800 hover:border-red-500/40 hover:text-white text-[10px] font-bold transition"
              title="Configure Train Like Me & Voice Cloning"
            >
              <Zap className="w-3 h-3 text-red-400" />
              <span className="hidden xs:inline">Persona</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Cognition Dossier Dropdown */}
      {showCognitionDetail && (
        <div className="p-3 bg-[#121318] border-b border-zinc-800 text-xs font-mono space-y-2 animate-in slide-in-from-top-1">
          <div className="flex items-center justify-between text-red-400 font-bold">
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Context Stream Cognition Dossier:</span>
            <button onClick={() => setShowCognitionDetail(false)} className="text-zinc-400 hover:text-white">✕</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-300">
            <div className="p-2 rounded bg-black border border-zinc-800">
              <span className="text-zinc-500 block text-[9px] uppercase font-bold">Detected Speaker:</span>
              <strong className="text-white">{currentScenario.appHeader.title}</strong>
            </div>
            <div className="p-2 rounded bg-black border border-zinc-800">
              <span className="text-zinc-500 block text-[9px] uppercase font-bold">Tactical Strategy:</span>
              <span className="text-zinc-300">{currentScenario.contextHint}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top scenario selector ribbon */}
      <div className="flex items-center gap-1.5 p-2 bg-[#0a0a0c] border-b border-zinc-800 overflow-x-auto no-scrollbar">
        <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-red-400 px-2 shrink-0">
          HOST VIEWPORT:
        </span>

        {PRESET_SCENARIOS.map((scenario) => {
          const isSelected = !customScreenshot && !isLiveScreenSharing && currentScenario.id === scenario.id;
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.id}
              onClick={() => {
                if (customScreenshot) onClearCustomScreenshot();
                onSelectScenario(scenario);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-red-600/20 text-red-300 border border-red-500/50 shadow-[0_0_12px_rgba(220,38,38,0.25)] font-bold'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{scenario.name}</span>
            </button>
          );
        })}

        {/* Test incoming message trigger for Auto-Mode testing */}
        {onSimulateIncomingMessage && (
          <button
            onClick={onSimulateIncomingMessage}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold whitespace-nowrap bg-red-600/15 text-red-300 border border-red-500/40 hover:bg-red-600/25 transition shadow-[0_0_12px_rgba(220,38,38,0.2)]"
            title="Trigger an incoming message from the counterpart to see Omni Key calculate and answer for you"
          >
            <Zap className="w-3 h-3 text-red-400 animate-pulse" />
            <span>+ Incoming Msg</span>
          </button>
        )}

        {/* Live screen share toggle button */}
        <button
          onClick={onToggleLiveScreenSharing}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
            isLiveScreenSharing
              ? 'bg-red-600/30 text-red-300 border border-red-500 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.4)] font-bold'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
          title="Share active device screen with system-wide vision"
        >
          <Video className="w-3 h-3 text-red-400" />
          <span>{isLiveScreenSharing ? 'Screen Live ●' : 'Live Screen'}</span>
        </button>

        {/* Upload custom phone screenshot button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all ${
            customScreenshot
              ? 'bg-red-950/40 text-red-300 border border-red-500/40'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
          title="Upload screenshot of any mobile app"
        >
          <Upload className="w-3 h-3 text-red-400" />
          <span>{customScreenshot ? 'Image ✓' : 'Upload'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Screen display container */}
      <div className="flex-1 relative overflow-y-auto p-3 flex flex-col justify-between min-h-[200px] bg-black space-y-3">
        {/* NEW REQUIREMENT: DAILY INSIGHT CARD GROUNDED IN GOOGLE SEARCH */}
        <DailyInsightCard />

        {customScreenshot ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative max-h-[220px] rounded-xl overflow-hidden border border-zinc-800 shadow-xl group">
              <img
                src={customScreenshot}
                alt="Uploaded mobile screen"
                className="max-h-[220px] object-contain rounded-xl"
              />
              <div className="absolute top-2 right-2">
                <button
                  onClick={onClearCustomScreenshot}
                  className="px-2 py-1 rounded-md bg-black/90 text-zinc-200 text-[10px] font-mono hover:bg-zinc-900 transition backdrop-blur-sm border border-zinc-800"
                >
                  Clear Screen
                </button>
              </div>
            </div>
            <p className="text-[10px] font-mono text-red-400 mt-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Omni Cognition actively parsing uploaded viewport
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Simulated App Header */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#121318] border border-zinc-800 flex items-center justify-center text-sm shadow-inner">
                  {currentScenario.appHeader.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">
                      {currentScenario.appHeader.title}
                    </span>
                    {currentScenario.appHeader.badge && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-red-600/15 text-red-400 border border-red-600/30">
                        {currentScenario.appHeader.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono block leading-tight">
                    {currentScenario.appHeader.subtitle}
                  </span>
                </div>
              </div>

              {/* Viewport Perception Badge */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-[9px] font-mono text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>Viewport Feed</span>
              </div>
            </div>

            {/* Simulated Messages / Host Viewport Stream */}
            <div className="space-y-2 py-1">
              {currentScenario.messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.sender === 'them' ? 'items-start' : 'items-end'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-lg ${
                      msg.sender === 'them'
                        ? 'bg-[#121318] text-zinc-100 border border-zinc-800 rounded-tl-sm'
                        : msg.isAutoPilot
                        ? 'bg-gradient-to-r from-red-600/30 to-zinc-900 text-white border border-red-500/40 rounded-tr-sm shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                        : 'bg-red-600 text-white font-medium rounded-tr-sm border border-red-500/50'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5 px-1">
                    {msg.time} {msg.isAutoPilot && '• ⚡ Auto-Pilot'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live typing draft mirror */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <span className="truncate pr-2">
            Drafting: <span className="text-white font-medium">{currentDraftText || '(typing buffer empty)'}</span>
          </span>
          <span className="text-[9px] text-red-400 shrink-0 font-bold">
            Live Link Active
          </span>
        </div>
      </div>
    </div>
  );
};
