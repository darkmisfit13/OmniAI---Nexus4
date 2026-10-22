import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Maximize2, 
  MessageSquare,
  Mic, 
  MicOff,
  Layers,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HoloOrb } from './HoloOrb';
import { useOmniChat } from '../context/OmniChatContext';
import { omniVoice } from '../lib/omniVoice';

interface OmniCompanionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullChat: () => void;
  currentStudioName?: string;
  currentStudioTag?: string;
}

export const OmniCompanionPanel: React.FC<OmniCompanionPanelProps> = ({
  isOpen,
  onClose,
  onOpenFullChat,
  currentStudioName,
  currentStudioTag,
}) => {
  const { 
    messages, 
    sendMessage, 
    isGenerating, 
    chatError, 
    failedMessage, 
    retryLastMessage, 
    orbPhase,
    activeThread 
  } = useOmniChat();

  const [inputText, setInputText] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(omniVoice.getVoiceEnabled());
  const [isDictating, setIsDictating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isGenerating]);

  if (!isOpen) return null;

  const studioLabel = currentStudioName || 'Creative Studio';

  const studioChips = currentStudioName
    ? [
        `Help me create in ${currentStudioName}`,
        `What are the best settings for ${currentStudioName}?`,
        `Inspire a unique concept for this project`,
      ]
    : [
        'How can OmniAI assist my workflow?',
        'Suggest creative ideas for my project',
        'Summarize active studio capabilities',
      ];

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = inputText.trim();
    if (!textToSend || isGenerating) return;

    setInputText('');
    const contextPrompt = currentStudioName
      ? `[Studio: ${currentStudioName} (${currentStudioTag || 'Active Engine'})] ${textToSend}`
      : textToSend;

    await sendMessage(contextPrompt, {
      studioContext: currentStudioName ? `Current Studio: ${currentStudioName} (${currentStudioTag || ''})` : undefined,
    });
  };

  const handleQuickChip = async (chipText: string) => {
    if (isGenerating) return;
    await sendMessage(chipText, {
      studioContext: currentStudioName ? `Current Studio: ${currentStudioName} (${currentStudioTag || ''})` : undefined,
    });
  };

  // Web Speech recognition dictation toggle
  const handleToggleDictation = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported on this browser.');
      return;
    }

    if (isDictating) {
      setIsDictating(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      setIsDictating(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsDictating(false);
      };
      recognition.onerror = () => {
        setIsDictating(false);
      };
      recognition.onend = () => {
        setIsDictating(false);
      };
      recognition.start();
    } catch {
      setIsDictating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex flex-col justify-end font-sans">
      {/* Semi-transparent Backdrop: click outside smoothly closes the companion */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-out Companion Panel adapted specifically for phone displays */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg mx-auto bg-[#0a0d18] border-t sm:border border-cyan-500/40 rounded-t-[28px] sm:rounded-2xl shadow-[0_-10px_40px_rgba(0,242,254,0.25)] flex flex-col h-[78vh] sm:h-[680px] max-h-[85vh] z-10 overflow-hidden"
      >
        {/* Top Drag Indicator / Handle */}
        <div className="w-full flex justify-center pt-2 pb-1 bg-[#070912]">
          <div className="w-12 h-1 rounded-full bg-slate-700" />
        </div>

        {/* Panel Header */}
        <div className="px-3.5 py-2.5 bg-[#070912] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full bg-[#00f2fe] animate-pulse shadow-[0_0_8px_#00f2fe] shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white truncate">OmniAI Companion</span>
                {currentStudioName && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 font-mono truncate">
                    {currentStudioName}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {activeThread?.title || 'Live Creative Partner'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Voice Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = omniVoice.toggleVoice();
                setIsVoiceEnabled(next);
              }}
              className={`p-1.5 rounded-lg border text-xs transition ${
                isVoiceEnabled
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(0,242,254,0.3)]'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title={isVoiceEnabled ? 'Voice output enabled' : 'Voice output muted'}
            >
              {isVoiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {/* Expand to Full Dedicated Chat Page */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullChat();
              }}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-cyan-500/40 text-xs transition flex items-center gap-1"
              title="Open full dedicated chat page"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
            </button>

            {/* Close Button: returns to exact studio and screen */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Companion"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* HoloOrb Visual Section - Sized nicely to see clearly */}
        <div className="px-4 py-2 bg-gradient-to-b from-[#070912] to-[#0a0d18] border-b border-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/80 border border-cyan-500/40 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
              <HoloOrb phase={orbPhase} size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-200">HoloOrb Synchronized</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                  {orbPhase.toUpperCase()}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Observing {studioLabel}. Directing next moves with zero disruption.
              </p>
            </div>
          </div>
        </div>

        {/* Studio Quick Context Chips */}
        <div className="px-3 py-1.5 bg-[#090b16] border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[9.5px] font-mono text-cyan-400 font-bold shrink-0">Prompt:</span>
          {studioChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickChip(chip)}
              className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 text-slate-300 hover:text-white text-[10px] font-mono whitespace-nowrap transition active:scale-95 shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Scrollable Conversation History Area */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3 no-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1 mb-0.5 px-1 text-[9px] font-mono text-slate-500">
                  <span>{isUser ? 'You' : 'OmniAI'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-br-xs shadow-md shadow-cyan-950/40'
                      : 'bg-[#101424] text-slate-200 border border-slate-800 rounded-bl-xs shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })}

          {/* Generating Loading State */}
          {isGenerating && (
            <div className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-lg bg-cyan-950 border border-cyan-500/40 flex items-center justify-center shrink-0">
                <HoloOrb phase="processing" size="xs" />
              </div>
              <div className="px-3 py-2 rounded-2xl bg-[#101424] border border-cyan-500/30 text-cyan-300 text-xs font-mono flex items-center gap-2 animate-pulse">
                <span>OmniAI is thinking...</span>
              </div>
            </div>
          )}

          {/* Error Banner with Retry */}
          {chatError && (
            <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-300 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>Error communicating with OmniAI:</span>
              </div>
              <p className="text-[11px] font-mono leading-relaxed">{chatError}</p>
              {failedMessage && (
                <button
                  type="button"
                  onClick={retryLastMessage}
                  className="px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-200 text-xs font-mono font-bold flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Message</span>
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Compact Bottom Message Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-2.5 bg-[#070912] border-t border-slate-800 flex items-center gap-2 shrink-0 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
        >
          {/* Dictate Button */}
          <button
            type="button"
            onClick={handleToggleDictation}
            className={`p-2 rounded-xl border transition ${
              isDictating
                ? 'bg-rose-500/20 text-rose-400 border-rose-500 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Voice dictation"
          >
            {isDictating ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Ask OmniAI about ${studioLabel}...`}
            className="flex-1 bg-slate-900/90 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/40 transition font-sans"
            disabled={isGenerating}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md shadow-cyan-500/20 active:scale-95 transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Send</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
