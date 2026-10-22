import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Zap, 
  Bot, 
  UserCheck, 
  Activity, 
  Check, 
  ChevronRight, 
  Radio, 
  Sliders, 
  X,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { HoloOrb } from './HoloOrb';
import { omniVoice } from '../lib/omniVoice';

export interface LiveCallCaller {
  name: string;
  role: string;
  avatar: string;
  company: string;
  badge?: string;
  initialDialogue: string[];
}

export const CALLER_PRESETS: LiveCallCaller[] = [
  {
    name: 'Alex Rivera',
    role: 'VP Engineering',
    company: 'Nexus Core',
    avatar: '👨‍💼',
    badge: 'CRITICAL ESCALATION',
    initialDialogue: [
      "Hey, I need an unvarnished status on the staging deployment.",
      "The client CEO is breathing down my neck about the auth latency.",
      "Can we ship the patch before noon without breaking backward compatibility?"
    ]
  },
  {
    name: 'Sarah Jenkins',
    role: 'CFO',
    company: 'Apex Corporation',
    avatar: '📊',
    badge: 'BILLING DISPUTE',
    initialDialogue: [
      "Hello, I'm calling regarding invoice #8819 on our corporate account.",
      "There's an unverified fee line of $240 before we approve the monthly release.",
      "Can your team verify this credit by end of business today?"
    ]
  },
  {
    name: 'Maya Lin',
    role: 'Product Lead',
    company: 'Starlight Studio',
    avatar: '✨',
    badge: 'DESIGN REVIEW',
    initialDialogue: [
      "Hey! Just looking at the 3D volumetric keyboard mockup right now.",
      "The nocturnal neon glow looks incredible, but is the haptic response snappy on Android?",
      "Let's finalize the demo script for the investor showcase."
    ]
  }
];

interface LiveCallViewProps {
  isOpen: boolean;
  onClose: () => void;
  caller?: LiveCallCaller;
  onInsertToKeyboard?: (text: string) => void;
}

export const LiveCallView: React.FC<LiveCallViewProps> = ({
  isOpen,
  onClose,
  caller = CALLER_PRESETS[0],
  onInsertToKeyboard
}) => {
  const [callActive, setCallActive] = useState(true);
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Auto-Pilot & Voice Cloning State
  const [isAutoTakeover, setIsAutoTakeover] = useState(false);
  const [clonedVoiceActive, setClonedVoiceActive] = useState(true);
  const [voiceProfileName, setVoiceProfileName] = useState('My Neural Clone (Warm/Direct)');

  // Transcript Feed
  const [transcript, setTranscript] = useState<Array<{ sender: 'caller' | 'me' | 'ai-cloned'; text: string; time: string }>>([]);
  const [dialogueIndex, setDialogueIndex] = useState(0);

  // AI Live Tactical Prompts
  const [livePrompts, setLivePrompts] = useState<string[]>([
    "Patch is tested & passing regression checks. Deploying to staging in 15 minutes.",
    "We verified the auth fix locally. Full rollout completed before noon.",
    "Let me ping the DevOps team right now and confirm the green pipeline."
  ]);

  const [aiSpeaking, setAiSpeaking] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Call Duration Timer
  useEffect(() => {
    if (!isOpen || !callActive) return;
    const interval = setInterval(() => {
      setCallSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, callActive]);

  // Initial greeting from caller
  useEffect(() => {
    if (isOpen && callActive && transcript.length === 0) {
      setTimeout(() => {
        setTranscript([
          {
            sender: 'caller',
            text: caller.initialDialogue[0] || "Hello, are you there?",
            time: 'Just now'
          }
        ]);
        setDialogueIndex(1);
      }, 800);
    }
  }, [isOpen, callActive, caller, transcript.length]);

  // Auto scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Auto-Pilot voice takeover execution
  useEffect(() => {
    if (isAutoTakeover && callActive && transcript.length > 0) {
      const last = transcript[transcript.length - 1];
      if (last.sender === 'caller') {
        // AI speaks with user's cloned voice profile
        const replyText = livePrompts[0] || "I've handled that already. We are completely on track.";
        const timer = setTimeout(() => {
          handleSpeakAsClone(replyText);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [isAutoTakeover, transcript, callActive, livePrompts]);

  const formatCallTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  // Speak using Web Speech Synthesis configured to user's cloned voice parameters
  const handleSpeakAsClone = (text: string) => {
    setAiSpeaking(true);
    setTranscript((prev) => [
      ...prev,
      {
        sender: isAutoTakeover ? 'ai-cloned' : 'me',
        text,
        time: formatCallTime(callSeconds)
      }
    ]);

    // Use speech synthesis with pitch/rate stored from training
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const pitch = parseFloat(localStorage.getItem('omni_clone_pitch') || '1.0');
      const rate = parseFloat(localStorage.getItem('omni_clone_rate') || '1.05');
      utterance.pitch = pitch;
      utterance.rate = rate;

      utterance.onend = () => {
        setAiSpeaking(false);
        // Advance caller response after 2.5s
        if (dialogueIndex < caller.initialDialogue.length) {
          setTimeout(() => {
            setTranscript((prev) => [
              ...prev,
              {
                sender: 'caller',
                text: caller.initialDialogue[dialogueIndex],
                time: formatCallTime(callSeconds + 2)
              }
            ]);
            setDialogueIndex((i) => i + 1);
            // Update suggestions
            setLivePrompts([
              "Understood. Forwarding the verification logs right now.",
              "Yes, full backward compatibility has been verified.",
              "I will ping your channel the second build artifacts deploy."
            ]);
          }, 2500);
        }
      };

      utterance.onerror = () => setAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setAiSpeaking(false), 2000);
    }
  };

  const handleSimulateCallerTurn = () => {
    if (dialogueIndex < caller.initialDialogue.length) {
      setTranscript((prev) => [
        ...prev,
        {
          sender: 'caller',
          text: caller.initialDialogue[dialogueIndex],
          time: formatCallTime(callSeconds)
        }
      ]);
      setDialogueIndex((i) => i + 1);
    } else {
      setTranscript((prev) => [
        ...prev,
        {
          sender: 'caller',
          text: "Thanks for confirming. Ping me as soon as it's deployed.",
          time: formatCallTime(callSeconds)
        }
      ]);
    }
  };

  const handleEndCall = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setCallActive(false);
    setTimeout(() => {
      onClose();
      setCallActive(true);
      setCallSeconds(0);
      setTranscript([]);
      setDialogueIndex(0);
      setIsAutoTakeover(false);
    }, 800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between font-sans select-none animate-in fade-in duration-200">
      
      {/* 1. TOP CALL STATUS & CALLER HEADER */}
      <div className="p-4 pt-6 flex flex-col items-center border-b border-zinc-800 bg-[#0a0a0c] shadow-2xl relative">
        <button
          onClick={handleEndCall}
          className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          title="Minimize Call"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Live Call Signal Pill */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-600/40 text-red-300 text-xs font-mono font-bold shadow-lg mb-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>LIVE PHONE CALL • {formatCallTime(callSeconds)}</span>
        </div>

        {/* Caller Avatar & Meta */}
        <div className="relative mb-2">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-red-600 to-red-800 p-1 shadow-2xl shadow-red-950/40">
            <div className="w-full h-full rounded-[22px] bg-[#121318] flex items-center justify-center text-3xl">
              {caller.avatar}
            </div>
          </div>
          {aiSpeaking && (
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-mono font-black animate-pulse shadow-md">
              SPEAKING
            </span>
          )}
        </div>

        <h2 className="text-xl font-bold text-white tracking-tight">{caller.name}</h2>
        <p className="text-xs text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5">
          <span>{caller.role}</span> • <span className="text-red-400">{caller.company}</span>
        </p>

        {/* Auto-Pilot Takeover Master Switch */}
        <div className="mt-3.5 flex items-center gap-3 bg-[#121318] p-1.5 px-3 rounded-2xl border border-zinc-800 shadow-lg">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${isAutoTakeover ? 'text-red-400 animate-bounce' : 'text-zinc-500'}`} />
            <div>
              <span className="text-xs font-bold text-white block leading-tight">
                AI Voice Takeover
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {isAutoTakeover ? 'Speaking in your cloned voice' : 'AI suggests, you tap to speak'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsAutoTakeover(!isAutoTakeover)}
            className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition shadow ${
              isAutoTakeover 
                ? 'bg-gradient-to-r from-red-600 to-red-700 text-white' 
                : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {isAutoTakeover ? 'AUTO: ON' : 'MANUAL'}
          </button>
        </div>
      </div>

      {/* 2. REAL-TIME CALL TRANSCRIPT & WAVEFORM FEED */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-xl mx-auto w-full">
        
        {/* Audio Waveform Simulation */}
        <div className="p-2.5 rounded-xl bg-[#121318] border border-zinc-800 flex items-center justify-between font-mono text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>Audio Stream Cognition:</span>
          </div>
          <div className="flex items-center gap-1">
            {[18, 35, 12, 45, 28, 14, 50, 22, 38, 15, 30].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-gradient-to-t from-red-600 to-red-400 rounded-full animate-pulse"
                style={{
                  height: `${h}px`,
                  animationDuration: `${0.4 + (i % 5) * 0.2}s`
                }}
              />
            ))}
          </div>
          <span className="text-red-400 font-bold">16kHz HD</span>
        </div>

        {/* Live Transcript Bubbles */}
        {transcript.map((msg, index) => {
          const isCaller = msg.sender === 'caller';
          const isAI = msg.sender === 'ai-cloned';

          return (
            <div
              key={index}
              className={`flex flex-col ${isCaller ? 'items-start' : 'items-end'} animate-in fade-in slide-in-from-bottom-2`}
            >
              <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-zinc-500">
                <span>{isCaller ? caller.name : isAI ? 'OmniAI (Your Cloned Voice)' : 'You (Spoken)'}</span>
                <span>• {msg.time}</span>
              </div>
              <div
                className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-lg ${
                  isCaller
                    ? 'bg-[#121318] text-zinc-100 border border-zinc-800 rounded-tl-sm'
                    : isAI
                    ? 'bg-gradient-to-r from-red-950/60 to-red-900/60 text-white border border-red-600/40 rounded-tr-sm shadow-[0_0_15px_rgba(220,38,38,0.2)]'
                    : 'bg-red-600 text-white font-medium rounded-tr-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={transcriptEndRef} />
      </div>

      {/* 3. OMNIAI REAL-TIME RESPONSE PROMPTER / SUGGESTIONS */}
      <div className="p-3 bg-[#0a0a0c] border-t border-zinc-800 max-w-xl mx-auto w-full space-y-2.5">
        
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-red-500" /> 
            Live Speech Prompter (Tap to Speak in Your Cloned Voice):
          </span>
          <button
            onClick={handleSimulateCallerTurn}
            className="text-[10px] text-red-400 hover:underline"
          >
            + Next Caller Query
          </button>
        </div>

        {/* 1-Tap Speaking Chips */}
        <div className="space-y-1.5">
          {livePrompts.map((promptText, i) => (
            <button
              key={i}
              onClick={() => handleSpeakAsClone(promptText)}
              disabled={aiSpeaking}
              className="w-full p-2.5 rounded-xl bg-[#121318] hover:bg-zinc-800 border border-zinc-800 hover:border-red-500/50 text-left text-xs text-zinc-200 transition flex items-center justify-between group disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-red-950/50 text-red-300 font-mono text-[10px] font-bold flex items-center justify-center shrink-0 border border-red-800/40">
                  {i + 1}
                </span>
                <span className="group-hover:text-white leading-snug">{promptText}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-red-400 shrink-0 ml-2" />
            </button>
          ))}
        </div>

        {/* 4. CALL CONTROL HARDWARE DOCK */}
        <div className="pt-2 flex items-center justify-around">
          
          {/* Mute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3.5 rounded-full border transition ${
              isMuted ? 'bg-red-950/40 text-red-400 border-red-600/40' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title="Mute Microphone"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Speaker */}
          <button
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`p-3.5 rounded-full border transition ${
              isSpeakerOn ? 'bg-red-950/40 text-red-400 border-red-600/40' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-800'
            }`}
            title="Speaker Phone"
          >
            {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCall}
            className="p-4 px-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 shadow-xl shadow-rose-600/40 transition active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs font-mono uppercase tracking-wider">End Call</span>
          </button>

        </div>

      </div>

    </div>
  );
};
