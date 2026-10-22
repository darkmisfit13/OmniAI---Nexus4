import React, { useState } from 'react';
import { HoloOrb, OrbPhase } from './HoloOrb';
import { 
  Sparkles, 
  Wand2, 
  Send, 
  Copy, 
  Check, 
  Mic, 
  RotateCcw, 
  Flame, 
  Briefcase, 
  Smile, 
  Shield, 
  Activity, 
  Database,
  Layers,
  ChevronRight,
  Info,
  Zap,
  Volume2,
  VolumeX,
  Mail,
  FileText,
  CheckCircle2,
  List,
  Maximize2,
  X,
  ChevronDown,
  Folder,
  FolderOpen,
  Clipboard,
  Search,
  Type,
  Sliders,
  HelpCircle,
  Sticker,
  Plus,
  Bold,
  Italic,
  Code,
  ListOrdered,
  FileCode,
  Lightbulb
} from 'lucide-react';
import { omniVoice } from '../lib/omniVoice';
import { onDeviceAI } from '../lib/onDeviceAI';

interface SuggestionTrio {
  witty: string;
  rawHonest: string;
  directAction: string;
}

export type PersonaTone = 'rawHonest' | 'witty' | 'directAction';

export const personaToneMeta: Record<PersonaTone, { label: string; shortLabel: string; desc: string; icon: any; color: string; badge: string }> = {
  directAction: {
    label: 'Direct Action',
    shortLabel: 'Action',
    desc: 'Clear, decisive, milestone-driven responses with zero fluff and immediate next steps.',
    icon: Zap,
    color: 'text-red-400',
    badge: 'border-red-600/40 bg-red-600/10 text-red-400',
  },
  rawHonest: {
    label: 'Raw & Honest',
    shortLabel: 'Raw',
    desc: 'Unvarnished truth and authentic transparency. Speaks reality without corporate spin.',
    icon: Flame,
    color: 'text-amber-400',
    badge: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
  },
  witty: {
    label: 'Witty & Fast',
    shortLabel: 'Witty',
    desc: 'Playful confidence, sharp nocturnal banter, and effortless magnetism.',
    icon: Smile,
    color: 'text-zinc-300',
    badge: 'border-zinc-700 bg-zinc-800 text-zinc-300',
  },
};

interface AIKeyboardBarProps {
  currentText: string;
  onChangeText: (text: string) => void;
  onSend: (text: string) => void;
  suggestedReplies: string[];
  suggestionTrio?: SuggestionTrio;
  liveAdvice: string[];
  onSelectSuggestion: (text: string) => void;
  onRewrite: (style: string) => void;
  onRequestInstantAdvice: () => void;
  isAnalyzing: boolean;
  orbPhase: OrbPhase;
  screenName: string;
  isOnDeviceMode?: boolean;
  onToggleOnDeviceMode?: () => void;
  localLatencyMs?: number;
  onOpenTelemetryHUD: () => void;
  telemetryNotesCount: number;
  isAutoMode?: boolean;
  onToggleAutoMode?: () => void;
  autoPilotTone?: 'rawHonest' | 'witty' | 'directAction';
  onChangeAutoPilotTone?: (tone: 'rawHonest' | 'witty' | 'directAction') => void;
  autoCountdown?: number | null;
  onCancelAutoDispatch?: () => void;
  onInstantAutoDispatch?: () => void;
  autoDispatchTarget?: string;
  autoDispatchPreviewText?: string;
  onQuickAction?: (actionId: string, resultText: string) => void;
  onOpenAutoPilotSetup?: () => void;
}

// Preset Clipboard Snippets
const INITIAL_SNIPPETS = [
  { id: '1', title: 'Staging Deploy ETA', text: 'Fix is verified locally; regression test passing. Pushing build #402 to staging in 15 minutes.' },
  { id: '2', title: 'Immediate Audit', text: 'Inspecting the line item immediately with our finance team. Expect clarity or full credit today.' },
  { id: '3', title: 'On It Confirmation', text: 'Received. Reviewing and addressing the milestone right now.' },
  { id: '4', title: 'Quick Call Link', text: 'Let’s jump on a 3-minute live sync to align on the deliverables.' }
];

// Rich Emojis & Holographic Stickers
const EMOJI_CATEGORIES = [
  { label: 'Reactions', items: ['⚡', '🔥', '🚀', '✨', '👍', '💯', '🤝', '🙌'] },
  { label: 'Expressions', items: ['😎', '😏', '🤔', '👀', '💡', '🎯', '💀', '😂'] },
  { label: 'Tech & Work', items: ['💻', '📱', '🛠️', '📊', '🔒', '📦', '⏳', '📌'] }
];

const STICKERS = [
  { name: 'Omni Core Shield', symbol: '🛡️', tag: 'SECURITY 100%' },
  { name: 'Velocity Rocket', symbol: '🚀', tag: 'SHIPPED' },
  { name: 'Nocturnal Flame', symbol: '🔥', tag: 'HIGH SIGNAL' },
  { name: 'Neural Intel', symbol: '🧠', tag: 'PROCESSED' }
];

// Jargon Definitions Knowledge Base for Quick-Explain Button
const JARGON_KNOWLEDGE_BASE: Record<string, { term: string; plainMeaning: string; tacticalAdvice: string }> = {
  'staging build': {
    term: 'Staging Build #402',
    plainMeaning: 'A pre-production mirror of the app where engineers verify code before real users or client executives see it.',
    tacticalAdvice: 'Give an exact timestamp (e.g. 15 minutes). Adjectives sound like delays under scrutiny.'
  },
  'regression': {
    term: 'Regression Check',
    plainMeaning: 'Automated testing to prove that fixing one bug didn’t accidentally break other existing features.',
    tacticalAdvice: 'Emphasize that catching it in staging saved the company from a disastrous live client demo.'
  },
  'dispute': {
    term: 'Merchant Dispute / Chargeback',
    plainMeaning: 'When a client asks their credit card issuer to forcefully reverse a charge, triggering fees and financial flags.',
    tacticalAdvice: 'Acknowledge immediately, apologize for the shock, and offer same-day audit/credit before they contact their bank.'
  },
  'auth': {
    term: 'Auth Patch / Bearer Token',
    plainMeaning: 'The digital security badge that proves a user is logged in and authorized to access API data.',
    tacticalAdvice: 'Reassure that user sessions remain secure and backward compatibility is fully intact.'
  }
};

export const AIKeyboardBar: React.FC<AIKeyboardBarProps> = ({
  currentText,
  onChangeText,
  onSend,
  suggestedReplies,
  suggestionTrio,
  liveAdvice,
  onSelectSuggestion,
  onRewrite,
  onRequestInstantAdvice,
  isAnalyzing,
  orbPhase,
  screenName,
  isOnDeviceMode = true,
  onToggleOnDeviceMode,
  localLatencyMs = 6.8,
  onOpenTelemetryHUD,
  telemetryNotesCount = 3,
  isAutoMode = false,
  onToggleAutoMode,
  autoPilotTone = 'directAction',
  onChangeAutoPilotTone,
  autoCountdown = null,
  onCancelAutoDispatch,
  onInstantAutoDispatch,
  autoDispatchTarget = '',
  autoDispatchPreviewText = '',
  onQuickAction,
  onOpenAutoPilotSetup,
}) => {
  const [copied, setCopied] = useState(false);
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);

  // Collapsible Folder Drawer State
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [folderTab, setFolderTab] = useState<'grammar' | 'clipboard' | 'media' | 'formatting'>('grammar');

  // Clipboard & Snippets State
  const [snippets, setSnippets] = useState(INITIAL_SNIPPETS);
  const [snippetSearch, setSnippetSearch] = useState('');
  const [newSnippetAdded, setNewSnippetAdded] = useState(false);

  // Formatting & Slider State
  const [textScale, setTextScale] = useState(100); // 80% to 140%
  const [formalityLevel, setFormalityLevel] = useState<'casual' | 'crisp' | 'executive' | 'magnetic'>('crisp');

  // Jargon Quick-Explain Modal State
  const [explainedTerm, setExplainedTerm] = useState<{ term: string; plainMeaning: string; tacticalAdvice: string } | null>(null);

  const triggerHaptic = (overrideDuration?: number | number[]) => {
    try {
      if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const isEnabled = localStorage.getItem('omni_haptic_enabled') !== 'false';
        if (!isEnabled) return;
        if (overrideDuration !== undefined) {
          navigator.vibrate(overrideDuration);
          return;
        }
        navigator.vibrate(10);
      }
    } catch {}
  };

  const quickActions = [
    {
      id: 'draft-email',
      label: 'Draft',
      icon: Mail,
      desc: 'Format draft into a structured professional email',
      color: 'hover:border-cyan-400 hover:text-cyan-300 text-slate-300',
    },
    {
      id: 'summarize',
      label: 'Summarize',
      icon: FileText,
      desc: 'Distill draft into concise summary or key takeaways',
      color: 'hover:border-purple-400 hover:text-purple-300 text-slate-300',
    },
    {
      id: 'fix-grammar',
      label: 'Grammar',
      icon: CheckCircle2,
      desc: 'Auto-correct punctuation, apostrophes, and capitalization',
      color: 'hover:border-emerald-400 hover:text-emerald-300 text-slate-300',
    },
    {
      id: 'bulletize',
      label: 'Bulletize',
      icon: List,
      desc: 'Convert clauses or thoughts into clean bullet points',
      color: 'hover:border-blue-400 hover:text-blue-300 text-slate-300',
    },
    {
      id: 'expand',
      label: 'Expand',
      icon: Maximize2,
      desc: 'Elaborate draft with deeper clarity and action items',
      color: 'hover:border-amber-400 hover:text-amber-300 text-slate-300',
    },
  ];

  const handleTriggerQuickAction = async (actionId: string) => {
    triggerHaptic([15, 30, 15]);
    setActiveQuickAction(actionId);
    try {
      const { result } = await onDeviceAI.processQuickAction(actionId, currentText);
      onChangeText(result);
      onQuickAction?.(actionId, result);
      setQuickActionFeedback(actionId);
      setTimeout(() => setQuickActionFeedback(null), 1600);
    } finally {
      setActiveQuickAction(null);
    }
  };

  const handleCopy = () => {
    if (!currentText) return;
    triggerHaptic(12);
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveCurrentToSnippets = () => {
    if (!currentText.trim()) return;
    const newSnippet = {
      id: Date.now().toString(),
      title: currentText.slice(0, 24) + (currentText.length > 24 ? '...' : ''),
      text: currentText.trim()
    };
    setSnippets([newSnippet, ...snippets]);
    setNewSnippetAdded(true);
    setTimeout(() => setNewSnippetAdded(false), 2000);
  };

  // Formatting casing functions
  const handleTransformCase = (type: 'upper' | 'lower' | 'title' | 'sentence') => {
    if (!currentText) return;
    if (type === 'upper') onChangeText(currentText.toUpperCase());
    else if (type === 'lower') onChangeText(currentText.toLowerCase());
    else if (type === 'title') {
      onChangeText(
        currentText.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
      );
    } else if (type === 'sentence') {
      onChangeText(currentText.charAt(0).toUpperCase() + currentText.slice(1).toLowerCase());
    }
  };

  const handleWrapFormat = (prefix: string, suffix: string) => {
    if (!currentText) return;
    onChangeText(`${prefix}${currentText}${suffix}`);
  };

  // Find relevant jargon to explain from context or current draft
  const handleQuickExplainTerm = () => {
    const combined = `${currentText} ${liveAdvice.join(' ')} staging build #402 regression dispute auth`.toLowerCase();
    
    for (const key of Object.keys(JARGON_KNOWLEDGE_BASE)) {
      if (combined.includes(key)) {
        setExplainedTerm(JARGON_KNOWLEDGE_BASE[key]);
        return;
      }
    }
    // Default fallback breakdown
    setExplainedTerm({
      term: 'Staging Build #402',
      plainMeaning: 'A pre-production mirror of the app where engineers verify code before real users or client executives see it.',
      tacticalAdvice: 'Give an exact timestamp (e.g. 15 minutes). Adjectives sound like delays under scrutiny.'
    });
  };

  const handleMicDictate = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setIsListening(true);
      setTimeout(() => {
        onChangeText(currentText ? `${currentText} (voice thought captured)` : 'Addressing the issue right now.');
        setIsListening(false);
      }, 1400);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onChangeText(currentText ? `${currentText} ${transcript}` : transcript);
        setIsListening(false);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  return (
    <div className="flex flex-col bg-[#000000] border-t border-white/10 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] relative z-20">
      
      {/* 1. TOP INTELLIGENCE STATUS STRIP */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0a0a0c] border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          {/* OmniCore Telemetry HUD Trigger Button */}
          <button
            onClick={onOpenTelemetryHUD}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-950/40 border border-red-600/40 text-red-400 hover:bg-red-950/60 text-[10px] font-mono font-bold transition shadow-[0_0_10px_rgba(220,38,38,0.2)] shrink-0"
            title="OmniCore Telemetry"
          >
            <Activity className="w-3 h-3 text-red-500 animate-pulse" />
            <span>OmniCore ({telemetryNotesCount})</span>
          </button>

          {/* Real-time Advice Pill */}
          <div 
            onClick={onOpenTelemetryHUD}
            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black border border-zinc-800 text-[11px] text-zinc-300 hover:text-white cursor-pointer truncate transition max-w-[65%]"
            title="Click to inspect real-time notes"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <span className="truncate font-mono text-[10px]">
              {liveAdvice[0] || 'Omni watching screen... tap for live coaching.'}
            </span>
          </div>
        </div>

        {/* PRIMARY OPEN-AIR CONTROLS: Tone Selector + Auto-Pilot Toggle + Folder Button */}
        <div className="flex items-center gap-1.5 ml-1.5 shrink-0">
          
          {/* Tone Selector Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              setShowToneMenu((prev) => !prev);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all border shadow-sm ${
              showToneMenu
                ? 'bg-red-950/60 text-white border-red-500'
                : 'bg-[#121318] text-zinc-300 border-zinc-800 hover:border-red-500/40 hover:text-white'
            }`}
            title="Change Tone"
          >
            <Wand2 className="w-3 h-3 text-red-400" />
            <span className="text-[10px] font-bold text-white hidden sm:inline">
              {personaToneMeta[autoPilotTone]?.shortLabel || 'Action'}
            </span>
            <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform ${showToneMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Primary Open-Air Control: Auto-Pilot Toggle */}
          {onToggleAutoMode && (
            <button
              onClick={onToggleAutoMode}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition shadow ${
                isAutoMode 
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white font-bold shadow-[0_0_12px_rgba(220,38,38,0.4)] animate-pulse' 
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
              }`}
              title="Toggle Auto-Pilot autonomous response"
            >
              <Zap className={`w-3 h-3 ${isAutoMode ? 'text-white fill-current' : 'text-zinc-500'}`} />
              <span className="text-[10px]">{isAutoMode ? 'AUTO: ON' : 'AUTO'}</span>
            </button>
          )}

          {/* Primary Open-Air Control: Collapsible Folder Drawer Button (`📁`) */}
          <button
            onClick={() => {
              triggerHaptic(12);
              setIsFolderOpen(!isFolderOpen);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border shadow ${
              isFolderOpen
                ? 'bg-red-600 text-white border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.4)]'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-red-500/40 hover:text-white'
            }`}
            title="Expand Command Center Folder (Grammar, Clipboard, GIFs/Emojis, Text Slider)"
          >
            {isFolderOpen ? <FolderOpen className="w-3.5 h-3.5 text-white" /> : <Folder className="w-3.5 h-3.5 text-red-400" />}
            <span className="text-[10.5px]">📁</span>
          </button>
        </div>
      </div>

      {/* 2. SUGGESTION PILLS BAR + QUICK-EXPLAIN BUTTON (Directly above keyboard) */}
      <div className="px-3 py-1.5 bg-[#080710] border-b border-white/10 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        
        {/* Suggestion Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
          <span className="text-[9px] font-mono text-cyan-400 font-bold shrink-0 uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> 1-Tap:
          </span>
          {suggestedReplies.slice(0, 3).map((reply, idx) => (
            <button
              key={idx}
              onClick={() => {
                triggerHaptic(10);
                onSelectSuggestion(reply);
              }}
              className="px-2.5 py-1 rounded-full bg-[#14121f] hover:bg-[#201d33] border border-white/10 hover:border-cyan-400 text-slate-200 text-[10.5px] font-mono whitespace-nowrap truncate max-w-[200px] transition shadow-sm"
              title={reply}
            >
              {reply}
            </button>
          ))}
        </div>

        {/* Quick-Explain Jargon Buster Button */}
        <button
          onClick={handleQuickExplainTerm}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 hover:bg-amber-400/25 text-[10px] font-mono font-bold transition shrink-0 shadow-sm"
          title="Explain unfamiliar acronyms, jargon, or terms found in context"
        >
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>Explain</span>
        </button>
      </div>

      {/* QUICK-EXPLAIN JARGON BUSTER POPUP MODAL */}
      {explainedTerm && (
        <div className="p-3 bg-[#0c0a17] border-b border-amber-400/40 text-xs font-mono space-y-2 animate-in slide-in-from-top-2 relative z-30 shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <span>Omni Jargon Buster: <strong className="text-white underline">{explainedTerm.term}</strong></span>
            </div>
            <button 
              onClick={() => setExplainedTerm(null)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="p-2.5 rounded-xl bg-black border border-zinc-800 space-y-1.5 text-[11px]">
            <p className="text-zinc-200 leading-relaxed">
              <strong className="text-zinc-400">Plain English:</strong> {explainedTerm.plainMeaning}
            </p>
            <p className="text-red-300 leading-relaxed">
              <strong className="text-red-400">Strategic Move:</strong> {explainedTerm.tacticalAdvice}
            </p>
          </div>
        </div>
      )}

      {/* 3. COLLAPSIBLE FOLDER DRAWER TRAY (`📁`) */}
      {isFolderOpen && (
        <div className="bg-[#0a0a0c] border-b border-zinc-800 shadow-2xl animate-in slide-in-from-top-2 duration-150 relative z-30">
          
          {/* Folder Drawer Tabs */}
          <div className="flex items-center justify-between p-2 px-3 border-b border-zinc-800 bg-[#121318]">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'grammar', label: 'Grammar Suite', icon: CheckCircle2 },
                { id: 'clipboard', label: 'Clipboard & Snippets', icon: Clipboard },
                { id: 'media', label: 'GIFs & Emojis', icon: Sticker },
                { id: 'formatting', label: 'Text Slider & Tools', icon: Type },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = folderTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFolderTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold transition ${
                      active
                        ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsFolderOpen(false)}
              className="text-zinc-400 hover:text-white p-1"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body Container */}
          <div className="p-3.5 max-h-60 overflow-y-auto font-mono text-xs space-y-3">
            
            {/* TAB 1: GRAMMAR & ENHANCEMENT SUITE */}
            {folderTab === 'grammar' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-300 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-red-400" /> Active Grammar & Formality Suite
                  </span>
                  <button
                    onClick={() => handleTriggerQuickAction('fix-grammar')}
                    className="px-2.5 py-1 rounded-lg bg-red-950/40 text-red-300 border border-red-600/40 hover:bg-red-900/40 font-bold text-[10px]"
                  >
                    1-Click Auto-Fix Punctuation
                  </button>
                </div>

                {/* Formality Level Selector */}
                <div className="p-2.5 rounded-xl bg-black border border-zinc-800 space-y-2">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">Formality Level:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['casual', 'crisp', 'executive', 'magnetic'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => {
                          setFormalityLevel(lvl);
                          onRewrite(lvl);
                        }}
                        className={`py-1 px-2 rounded-lg text-center text-[10.5px] font-bold capitalize transition ${
                          formalityLevel === lvl
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    onClick={() => handleTriggerQuickAction('bulletize')}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left text-zinc-300 flex items-center gap-2"
                  >
                    <List className="w-3.5 h-3.5 text-red-400" />
                    <span>Bulletize Draft</span>
                  </button>
                  <button
                    onClick={() => handleTriggerQuickAction('expand')}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left text-zinc-300 flex items-center gap-2"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Expand with Context</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: CLIPBOARD HISTORY & SAVED SNIPPETS */}
            {folderTab === 'clipboard' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={snippetSearch}
                      onChange={(e) => setSnippetSearch(e.target.value)}
                      placeholder="Search snippets & clipboard..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <button
                    onClick={handleSaveCurrentToSnippets}
                    disabled={!currentText.trim()}
                    className="px-2.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-[10.5px] font-bold flex items-center gap-1 shrink-0 disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{newSnippetAdded ? 'Saved!' : 'Save Draft'}</span>
                  </button>
                </div>

                {/* Snippets List */}
                <div className="space-y-1.5">
                  {snippets
                    .filter((s) => s.title.toLowerCase().includes(snippetSearch.toLowerCase()) || s.text.toLowerCase().includes(snippetSearch.toLowerCase()))
                    .map((snippet) => (
                      <div
                        key={snippet.id}
                        onClick={() => {
                          triggerHaptic(10);
                          onChangeText(snippet.text);
                          setIsFolderOpen(false);
                        }}
                        className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/40 cursor-pointer transition flex items-center justify-between group"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="text-white font-bold text-xs group-hover:text-red-400 block truncate">
                            {snippet.title}
                          </span>
                          <span className="text-zinc-400 text-[10px] truncate block">
                            {snippet.text}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-red-400 shrink-0 opacity-60 group-hover:opacity-100">
                          Insert →
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* TAB 3: RICH MEDIA ATTACHMENTS (GIFs, Emojis, Stickers) */}
            {folderTab === 'media' && (
              <div className="space-y-3">
                {/* Emojis by category */}
                <div className="space-y-2">
                  {EMOJI_CATEGORIES.map((cat, i) => (
                    <div key={i} className="space-y-1">
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold block">{cat.label}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.map((em, j) => (
                          <button
                            key={j}
                            onClick={() => {
                              triggerHaptic(8);
                              onChangeText(currentText + em);
                            }}
                            className="w-8 h-8 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-base flex items-center justify-center transition active:scale-90"
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Holographic Stickers */}
                <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-red-400 font-bold block">Omni Holographic Stickers:</span>
                  <div className="grid grid-cols-2 gap-2">
                    {STICKERS.map((stk, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          triggerHaptic(12);
                          onChangeText(`${currentText} [${stk.symbol} ${stk.name}]`);
                        }}
                        className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/40 flex items-center gap-2 text-left transition"
                      >
                        <span className="text-xl">{stk.symbol}</span>
                        <div>
                          <div className="text-[10.5px] font-bold text-white leading-tight">{stk.name}</div>
                          <div className="text-[8px] text-zinc-400 font-mono">{stk.tag}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: TEXT SLIDER & FORMATTING TOOLS */}
            {folderTab === 'formatting' && (
              <div className="space-y-3.5">
                {/* Text Size Scale Slider */}
                <div className="p-3 rounded-xl bg-black border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Keyboard Text Size Scale:</span>
                    <span className="text-red-400 font-bold">{textScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="140"
                    step="5"
                    value={textScale}
                    onChange={(e) => setTextScale(parseInt(e.target.value, 10))}
                    className="w-full accent-red-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-500">
                    <span>Compact (80%)</span>
                    <span>Standard (100%)</span>
                    <span>Large (140%)</span>
                  </div>
                </div>

                {/* Case Converters */}
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Case Conversion:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'upper', label: 'UPPER' },
                      { id: 'lower', label: 'lower' },
                      { id: 'title', label: 'Title Case' },
                      { id: 'sentence', label: 'Sentence' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleTransformCase(c.id as any)}
                        className="py-1 px-2 rounded-lg bg-black/80 hover:bg-[#1a1729] border border-white/10 text-[10.5px] font-bold text-slate-300 hover:text-white text-center"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Markdown Formatting wrappers */}
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">Markdown Formatting:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleWrapFormat('**', '**')}
                      className="p-1.5 px-3 rounded-lg bg-black/80 border border-white/10 text-xs font-bold text-white flex items-center gap-1 hover:bg-[#1f1b33]"
                    >
                      <Bold className="w-3.5 h-3.5" /> Bold
                    </button>
                    <button
                      onClick={() => handleWrapFormat('*', '*')}
                      className="p-1.5 px-3 rounded-lg bg-black/80 border border-white/10 text-xs font-bold text-white flex items-center gap-1 hover:bg-[#1f1b33]"
                    >
                      <Italic className="w-3.5 h-3.5" /> Italic
                    </button>
                    <button
                      onClick={() => handleWrapFormat('`', '`')}
                      className="p-1.5 px-3 rounded-lg bg-black/80 border border-white/10 text-xs font-bold text-white flex items-center gap-1 hover:bg-[#1f1b33]"
                    >
                      <Code className="w-3.5 h-3.5" /> Code
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* 4. PERSISTENT PERSONA TONE SELECTION MODAL / DROPDOWN */}
      {showToneMenu && (
        <div className="p-3 bg-[#121318] border-b border-zinc-800 animate-in slide-in-from-top-2 duration-150 space-y-2.5 shadow-2xl relative z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-red-400" />
              <span className="font-bold text-xs text-white font-mono">Persona Tone Selector</span>
              <span className="text-[10px] text-zinc-400 font-mono">• Switch AI Response Style</span>
            </div>
            <div className="flex items-center gap-2">
              {onOpenAutoPilotSetup && (
                <button
                  type="button"
                  onClick={() => {
                    setShowToneMenu(false);
                    onOpenAutoPilotSetup();
                  }}
                  className="px-2 py-0.5 rounded-lg bg-red-600/20 text-red-300 border border-red-500/40 text-[10px] font-mono hover:bg-red-600/30 font-bold"
                >
                  ⚡ Calibrate Persona / Voice Clone
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowToneMenu(false)}
                className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(['directAction', 'rawHonest', 'witty'] as const).map((toneKey) => {
              const meta = personaToneMeta[toneKey];
              const Icon = meta.icon;
              const isSelected = autoPilotTone === toneKey;

              return (
                <button
                  key={toneKey}
                  type="button"
                  onClick={() => {
                    triggerHaptic([12, 24, 12]);
                    onChangeAutoPilotTone?.(toneKey);
                    setShowToneMenu(false);
                  }}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-red-950/40 border-red-500/60 shadow-[0_0_15px_rgba(220,38,38,0.25)]'
                      : 'bg-black border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                      <span className="font-bold text-xs text-white font-mono">{meta.label}</span>
                    </div>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-red-600/20 text-red-400 border border-red-600/40 font-bold">
                        <Check className="w-2.5 h-2.5" /> ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-zinc-400 leading-snug font-sans">
                    {meta.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. PRIMARY OPEN-AIR CONTROLS: QUICK ACTIONS ROW */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a0c] border-b border-zinc-800 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 text-[9.5px] font-mono text-red-400 shrink-0 font-bold uppercase tracking-wider pr-1.5 border-r border-zinc-800">
          <Sparkles className="w-3 h-3 text-red-400" />
          <span>Quick:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isProcessing = activeQuickAction === action.id;
            const isDone = quickActionFeedback === action.id;
            return (
              <button
                key={action.id}
                onClick={() => handleTriggerQuickAction(action.id)}
                disabled={isProcessing}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10.5px] font-mono font-medium transition-all shrink-0 active:scale-95 shadow-sm hover:border-red-500/40 hover:text-white ${
                  isDone ? 'border-red-500 bg-red-950/40 text-red-400 shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'text-zinc-300'
                }`}
                title={action.desc}
              >
                <Icon className={`w-3 h-3 ${isProcessing ? 'animate-spin text-red-400' : isDone ? 'text-red-400' : ''}`} />
                <span>{action.label}</span>
                {isDone && <Check className="w-2.5 h-2.5 text-red-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. ACTIVE TYPING DOCK */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0c] border-t border-zinc-800">
        <button
          onClick={handleMicDictate}
          className={`p-2 rounded-xl border transition ${
            isListening
              ? 'bg-red-600 text-white border-red-500 animate-pulse shadow-[0_0_14px_rgba(220,38,38,0.6)]'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700'
          }`}
          title="Dictate raw thoughts"
        >
          <Mic className="w-4 h-4" />
        </button>

        {/* OmniVoice Speak Button */}
        <button
          onClick={() => {
            if (currentText) {
              omniVoice.speak(currentText);
            } else {
              omniVoice.speak('OmniAI shadow companion active. Standing by for screen cognition.');
            }
          }}
          className="p-2 rounded-xl border bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-red-400 hover:border-red-600/40 transition"
          title="Listen to OmniVoice"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Input buffer with dynamic text scale */}
        <div className="relative flex-1">
          <input
            type="text"
            value={currentText}
            onChange={(e) => onChangeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onSend(currentText);
              }
            }}
            style={{ fontSize: `${(12 * textScale) / 100}px` }}
            placeholder="Type with Omni AI • Dark Misfit Studios..."
            className="w-full rounded-xl bg-black border border-zinc-800 px-3.5 py-2 text-white placeholder-zinc-600 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/40 font-mono transition pr-8 shadow-inner"
          />
          {currentText && (
            <button
              onClick={() => onChangeText('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 font-bold"
              title="Clear text"
            >
              ×
            </button>
          )}
        </div>

        {/* Copy to system clipboard */}
        <button
          onClick={handleCopy}
          disabled={!currentText}
          className={`p-2 rounded-xl border transition disabled:opacity-30 ${
            copied
              ? 'bg-red-600/20 text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(220,38,38,0.3)]'
              : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
          }`}
          title="Copy text to phone clipboard"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>

        {/* Send / Commit into input stream - High-Impact Deep Crimson Action */}
        <button
          onClick={() => onSend(currentText)}
          disabled={!currentText}
          className="p-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-bold border border-red-500/50 shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:brightness-110 active:scale-95 transition disabled:opacity-40"
          title="Send into conversation"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
