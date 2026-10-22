import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  Check, 
  SkipForward, 
  Volume2, 
  Sliders, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  Bot, 
  User, 
  MessageSquare, 
  PhoneCall, 
  Flame, 
  Info,
  CheckCircle2,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { 
  omniVoice, 
  VocalRealismSettings, 
  defaultVocalRealismSettings, 
  prepareTextForSpeech 
} from '../lib/omniVoice';

export type IdentitySubView = 'hub' | 'voice' | 'persona';

interface MyAIIdentityViewProps {
  onBack?: () => void;
  initialSubView?: IdentitySubView;
}

// 25 diverse script prompts designed to calibrate human vocal inflection, pacing, cadence, and numbers
const SCRIPT_PROMPTS: string[] = [
  "Hey, I'm heading over to the studio now. The 1st demo is ready to review.",
  "I cannot take your call right now because I'm in a high-stakes engineering review.",
  "Let's push the staging release by 15 minutes, but only if all tests pass.",
  "I don't think that's the best approach, although I understand your reasoning.",
  "The invoice comes out to exactly $250 with a 15% discount applied.",
  "Sounds great! Send over the link and I'll jump on the call right away.",
  "Are you free tomorrow around 3:30 PM to discuss the product roadmap?",
  "I'm confident we will close this sprint ahead of the 1st of next month.",
  "Honestly, I'd rather keep it minimal and ship faster instead of adding fluff.",
  "Can you verify the server credentials? We need them before 5 o'clock.",
  "Thanks for checking in! Everything is under control and moving smoothly.",
  "Let's circle back in 20 minutes... I need to verify this database query.",
  "I agree 100%. We should prioritize security and user privacy first.",
  "Please do not deploy without notifying the rest of the team in the channel.",
  "That makes sense to me, but let's confirm with the client before signing off.",
  "Got it. I'll make sure the team reviews the PR by 10 AM tomorrow.",
  "I'm on my way. Traffic is heavy on the highway, so give me 10 minutes.",
  "Could you summarize the main blockers from today's sprint retrospective?",
  "We tested the new neural speech pipeline, and latency dropped to 6 milliseconds.",
  "No worries at all! We will catch up first thing on Monday morning.",
  "I've updated the shared document with the revised quarterly projections.",
  "It's not a major bug, but we shouldn't let it slip into production.",
  "Look at that waveform! The acoustic resonance matches my real cadence.",
  "Let's wrap up this meeting so everyone can focus on execution.",
  "System calibration complete. My shadow voice clone is ready for active calls."
];

// Interviewer question bank for training the persona matrix
const INTERVIEWER_QUESTIONS: string[] = [
  "How do you usually say goodbye to close friends over text?",
  "When someone asks 'How are you?', what is your default candid response?",
  "How do you handle someone showing up 20 minutes late to a scheduled meeting?",
  "What is your go-to phrase when you need to politely decline an invitation?",
  "When you receive great unexpected news, how do you express your excitement?",
  "How do you deliver constructive criticism without sounding harsh or corporate?",
  "What's your typical greeting when messaging a colleague you work with daily?",
  "When someone sends a massive paragraph, do you respond with bullets or a few words?",
  "How do you react when someone sends an obvious mistake in a team chat?",
  "What's your philosophy on using emojis or exclamation marks in everyday texts?",
  "How do you reply when you're overwhelmed with work and someone asks for a quick favor?",
  "If a client demands an unrealistic deadline, what is your exact first sentence?"
];

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export const MyAIIdentityView: React.FC<MyAIIdentityViewProps> = ({ 
  onBack,
  initialSubView = 'hub'
}) => {
  const [currentView, setCurrentView] = useState<IdentitySubView>(initialSubView);

  // Sync route / hash state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash === '#/settings/identity/voice' || hash === '#voice') {
        setCurrentView('voice');
      } else if (hash === '#/settings/identity/persona' || hash === '#persona') {
        setCurrentView('persona');
      }
    }
  }, []);

  // -------------------------------------------------------------
  // 1. VOICE CLONING MATRIX STATE
  // -------------------------------------------------------------
  const [recordingIndex, setRecordingIndex] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_voice_recording_index');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [completedRecordings, setCompletedRecordings] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_voice_completed_count');
      return saved ? parseInt(saved, 10) : 0;
    }
    return 0;
  });

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Vocal Naturalness Settings
  const [vocalSettings, setVocalSettings] = useState<VocalRealismSettings>(() => {
    return omniVoice.getVocalRealism();
  });

  // Live Call Hijack Toggle
  const [isAutoCallEnabled, setIsAutoCallEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omni_auto_call_hijack') === 'true';
    }
    return false;
  });

  // -------------------------------------------------------------
  // 2. TEXT PERSONA ENGINE STATE
  // -------------------------------------------------------------
  const [personaAnswersCount, setPersonaAnswersCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_persona_answers_count');
      return saved ? parseInt(saved, 10) : 12;
    }
    return 12; // default to 12 as requested in prompt: "Persona Matrix Depth: 12 / 50 Answers"
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_persona_chat_history');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return [
      {
        id: 'msg_1',
        sender: 'ai',
        text: "How do you usually say goodbye to close friends over text?",
        timestamp: "10:32 AM"
      },
      {
        id: 'msg_2',
        sender: 'user',
        text: "Usually just 'catch you later' or 'talk soon ✌️'. Never super formal.",
        timestamp: "10:33 AM"
      },
      {
        id: 'msg_3',
        sender: 'ai',
        text: "When someone asks 'How are you?', what is your default candid response?",
        timestamp: "10:34 AM"
      },
      {
        id: 'msg_4',
        sender: 'user',
        text: "Depending on the day, 'surviving the sprint' or 'deep in code, all good'.",
        timestamp: "10:35 AM"
      },
      {
        id: 'msg_5',
        sender: 'ai',
        text: "How do you handle someone showing up 20 minutes late to a scheduled meeting?",
        timestamp: "10:36 AM"
      }
    ];
  });

  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [isAutoTextEnabled, setIsAutoTextEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omni_auto_text_replies') !== 'false';
    }
    return true;
  });
  const [mimicConfidence, setMimicConfidence] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_mimic_confidence');
      return saved ? parseInt(saved, 10) : 85;
    }
    return 85;
  });

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat window
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, currentView]);

  // Persist chat and persona count
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omni_persona_answers_count', String(personaAnswersCount));
      localStorage.setItem('omni_persona_chat_history', JSON.stringify(chatMessages));
      localStorage.setItem('omni_auto_text_replies', String(isAutoTextEnabled));
      localStorage.setItem('omni_mimic_confidence', String(mimicConfidence));
    }
  }, [personaAnswersCount, chatMessages, isAutoTextEnabled, mimicConfidence]);

  // Persist voice settings & auto-call toggle
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omni_voice_recording_index', String(recordingIndex));
      localStorage.setItem('omni_voice_completed_count', String(completedRecordings));
      localStorage.setItem('omni_auto_call_hijack', String(isAutoCallEnabled));
    }
  }, [recordingIndex, completedRecordings, isAutoCallEnabled]);

  // -------------------------------------------------------------
  // VOICE RECORDING LOGIC
  // -------------------------------------------------------------
  const handleToggleRecord = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      clearInterval(recordIntervalRef.current);
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setLastAudioUrl(url);
          // Stop mic tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
        setIsRecording(true);
        setRecordingDuration(0);
        recordIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        // Fallback simulation if microphone permissions denied in preview iframe
        console.warn('Microphone access unavailable, starting simulated vocal capture:', err);
        setIsRecording(true);
        setRecordingDuration(0);
        recordIntervalRef.current = setInterval(() => {
          setRecordingDuration((prev) => prev + 1);
        }, 1000);

        setTimeout(() => {
          if (isRecording) {
            handleToggleRecord();
          }
        }, 4000);
      }
    }
  };

  const handlePlayback = () => {
    if (lastAudioUrl) {
      if (!audioElementRef.current) {
        audioElementRef.current = new Audio();
      }
      audioElementRef.current.src = lastAudioUrl;
      audioElementRef.current.onplay = () => setIsPlayingAudio(true);
      audioElementRef.current.onended = () => setIsPlayingAudio(false);
      audioElementRef.current.onerror = () => setIsPlayingAudio(false);
      audioElementRef.current.play().catch(() => {
        setIsPlayingAudio(false);
      });
    } else {
      // Preview with OmniVoice using current script phrase formatted with prepareTextForSpeech
      const currentPhrase = SCRIPT_PROMPTS[recordingIndex % SCRIPT_PROMPTS.length];
      setIsPlayingAudio(true);
      omniVoice.speak(currentPhrase, {
        onEnd: () => setIsPlayingAudio(false)
      });
    }
  };

  const handleSkipPhrase = () => {
    if (isRecording) {
      handleToggleRecord();
    }
    setLastAudioUrl(null);
    setRecordingIndex((prev) => (prev + 1) % SCRIPT_PROMPTS.length);
  };

  const handleSubmitAndNext = () => {
    if (isRecording) {
      handleToggleRecord();
    }
    setLastAudioUrl(null);
    setCompletedRecordings((prev) => Math.min(25, prev + 1));
    setRecordingIndex((prev) => (prev + 1) % SCRIPT_PROMPTS.length);
  };

  const handleUpdateVocalSetting = (key: keyof VocalRealismSettings, value: any) => {
    const updated = { ...vocalSettings, [key]: value };
    setVocalSettings(updated);
    omniVoice.setVocalRealism(updated);
  };

  const handleTestNaturalSpeech = () => {
    const sample = "On June 1st, I will send $75 because I don't want any delay!";
    omniVoice.speak(sample);
  };

  // -------------------------------------------------------------
  // TEXT PERSONA CHAT LOGIC
  // -------------------------------------------------------------
  const handleSendAnswer = () => {
    const trimmed = typedAnswer.trim();
    if (!trimmed) return;

    const newAnswerMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const nextCount = Math.min(50, personaAnswersCount + 1);
    setPersonaAnswersCount(nextCount);
    setTypedAnswer('');

    // Select next behavioral question
    const nextQuestion = INTERVIEWER_QUESTIONS[nextCount % INTERVIEWER_QUESTIONS.length];
    const newAiMsg: ChatMessage = {
      id: `msg_ai_${Date.now() + 1}`,
      sender: 'ai',
      text: nextQuestion,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, newAnswerMsg, newAiMsg]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  // Progress Calculations
  const voiceProgressPercent = Math.min(100, Math.round((completedRecordings / 25) * 100));
  const personaProgressPercent = Math.min(100, Math.round((personaAnswersCount / 50) * 100));

  return (
    <div className="w-full max-w-[400px] h-[850px] mx-auto overflow-hidden bg-black text-white relative flex flex-col font-mono select-none border-x border-zinc-900 shadow-2xl">
      
      {/* ========================================================= */}
      {/* MAIN TOP NAVIGATION BAR */}
      {/* ========================================================= */}
      <div className="px-4 py-3 bg-zinc-950/90 border-b border-zinc-900 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          {currentView !== 'hub' ? (
            <button
              onClick={() => setCurrentView('hub')}
              className="p-1.5 -ml-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition active:scale-95 flex items-center justify-center"
              title="Return to My AI Identity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            onBack && (
              <button
                onClick={onBack}
                className="p-1.5 -ml-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition active:scale-95 flex items-center justify-center"
                title="Go back"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-wider text-white">
                {currentView === 'hub' && 'My AI Identity'}
                {currentView === 'voice' && 'Voice Cloning Studio'}
                {currentView === 'persona' && 'Text Persona Studio'}
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-zinc-400">
              {currentView === 'hub' && '/settings/identity'}
              {currentView === 'voice' && 'Automated Voice Call Cloning'}
              {currentView === 'persona' && 'Mimicry & Instant Reply Engine'}
            </p>
          </div>
        </div>

        {/* Global Calibration Badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[10px]">
          <ShieldCheck className="w-3 h-3 text-cyan-400" />
          <span>NPU Secure</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. HUB VIEW: TWO CLEAN FULL-WIDTH BUTTON CARDS */}
      {/* ========================================================= */}
      {currentView === 'hub' && (
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            {/* Context Intro Header */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800/80">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-zinc-100">Neural Digital Twin Configuration</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                Train your personal AI model to mirror your vocal inflections and communication cadence. Once calibrated, Omni can auto-reply to messages and answer calls in your exact tone.
              </p>
            </div>

            {/* CARD 1: VOICE CLONING MATRIX */}
            <button
              onClick={() => setCurrentView('voice')}
              className="w-full text-left p-4 rounded-xl bg-zinc-950 hover:bg-zinc-900/90 border border-zinc-800 hover:border-red-500/50 transition-all duration-200 group active:scale-[0.98] shadow-lg flex flex-col space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/40 flex items-center justify-center text-red-400 group-hover:scale-105 transition shadow-[0_0_12px_rgba(239,68,68,0.25)]">
                    <Mic className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white group-hover:text-red-300 transition">
                      Voice Cloning Matrix
                    </h2>
                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                      Train your AI voice profile for automated phone calls
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-red-400 transition transform group-hover:translate-x-1" />
              </div>

              {/* Progress metric footer */}
              <div className="pt-2 border-t border-zinc-900/80 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Recordings: {completedRecordings} / 25</span>
                <span className={`font-semibold ${completedRecordings >= 25 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {voiceProgressPercent}% Trained
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-500"
                  style={{ width: `${voiceProgressPercent}%` }}
                />
              </div>
            </button>

            {/* CARD 2: TEXT PERSONA ENGINE */}
            <button
              onClick={() => setCurrentView('persona')}
              className="w-full text-left p-4 rounded-xl bg-zinc-950 hover:bg-zinc-900/90 border border-zinc-800 hover:border-cyan-500/50 transition-all duration-200 group active:scale-[0.98] shadow-lg flex flex-col space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition shadow-[0_0_12px_rgba(0,242,254,0.25)]">
                    <MessageSquare className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                      Text Persona Engine
                    </h2>
                    <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                      Train your text style for automated message replies
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-cyan-400 transition transform group-hover:translate-x-1" />
              </div>

              {/* Progress metric footer */}
              <div className="pt-2 border-t border-zinc-900/80 flex items-center justify-between text-[11px]">
                <span className="text-zinc-500">Persona Matrix Depth: {personaAnswersCount} / 50</span>
                <span className={`font-semibold ${personaAnswersCount >= 50 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {personaProgressPercent}% Depth
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500"
                  style={{ width: `${personaProgressPercent}%` }}
                />
              </div>
            </button>
          </div>

          {/* Bottom Active Status Summary */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-900 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-zinc-500" />
                Live Call Hijack:
              </span>
              <span className={isAutoCallEnabled ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                {isAutoCallEnabled ? "Armed & Intercepting" : "Disabled"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-zinc-500" />
                Auto-Reply Engine:
              </span>
              <span className={isAutoTextEnabled ? "text-cyan-400 font-bold" : "text-zinc-500"}>
                {isAutoTextEnabled ? `Active (${mimicConfidence}% match)` : "Disabled"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-VIEW 1: VOICE CLONING STUDIO & TRAINING WIZARD */}
      {/* ========================================================= */}
      {currentView === 'voice' && (
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-between">
          {/* Top Progress Tracker */}
          <div className="shrink-0 text-zinc-400 text-xs p-4 border-b border-zinc-900 bg-zinc-950/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-200">
                Recordings: {completedRecordings} / 25
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 text-[10px] font-bold">
                {voiceProgressPercent}% Calibrated
              </span>
            </div>
            {/* Step progress bar */}
            <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-red-600 via-rose-500 to-emerald-400 transition-all duration-300"
                style={{ width: `${voiceProgressPercent}%` }}
              />
            </div>
          </div>

          {/* Center Area: Prominent Script Card */}
          <div className="p-4 flex-1 flex flex-col justify-center min-h-[170px]">
            <div className="p-6 bg-zinc-950 rounded-xl border border-zinc-800 shadow-xl flex flex-col items-center justify-center space-y-3 relative group">
              <span className="text-[10px] font-bold tracking-wider text-red-400 uppercase bg-red-950/50 px-2 py-0.5 rounded border border-red-500/20">
                Phrase {recordingIndex + 1} of {SCRIPT_PROMPTS.length}
              </span>

              <p className="text-base text-zinc-100 text-center leading-relaxed font-sans font-medium">
                "{SCRIPT_PROMPTS[recordingIndex % SCRIPT_PROMPTS.length]}"
              </p>

              <p className="text-[10px] text-zinc-500 font-sans italic text-center">
                Speak clearly at your normal conversational cadence.
              </p>
            </div>
          </div>

          {/* Recording Controls: Glowing Crimson Circular Record Button & Secondary Row */}
          <div className="shrink-0 px-4 pt-1 pb-3 flex flex-col items-center space-y-3">
            {/* Record Status / Waveform Feedback */}
            <div className="h-5 flex items-center justify-center text-[11px]">
              {isRecording ? (
                <div className="flex items-center gap-2 text-red-400 font-bold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Recording Audio... 00:0{recordingDuration}s
                </div>
              ) : isPlayingAudio ? (
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Volume2 className="w-3.5 h-3.5 animate-bounce" />
                  Playing Back Sample...
                </div>
              ) : (
                <span className="text-zinc-500 text-[10px]">
                  Tap microphone to capture phrase
                </span>
              )}
            </div>

            {/* Prominent Glowing Circular Microphone Button */}
            <button
              onClick={handleToggleRecord}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 ${
                isRecording 
                  ? 'bg-red-700 ring-4 ring-red-500/50 scale-105 shadow-[0_0_35px_rgba(239,68,68,0.7)] animate-pulse' 
                  : 'bg-red-600 hover:bg-red-500 shadow-[0_0_25px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)]'
              }`}
              title={isRecording ? "Stop Recording" : "Record Phrase"}
            >
              {isRecording ? (
                <Square className="w-6 h-6 text-white fill-white" />
              ) : (
                <Mic className="w-7 h-7 text-white" />
              )}
            </button>

            {/* Three tight secondary controls in a row: [Skip Phrase], [Play Back], [Submit & Next] */}
            <div className="w-full grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={handleSkipPhrase}
                className="py-2 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
              >
                <SkipForward className="w-3 h-3 text-zinc-400" />
                Skip Phrase
              </button>

              <button
                onClick={handlePlayback}
                disabled={isPlayingAudio}
                className={`py-2 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95 ${
                  isPlayingAudio ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Play className="w-3 h-3 text-cyan-400" />
                Play Back
              </button>

              <button
                onClick={handleSubmitAndNext}
                className="py-2 px-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 text-[11px] font-bold flex items-center justify-center gap-1 transition active:scale-95"
              >
                <Check className="w-3.5 h-3.5 text-red-400" />
                Submit & Next
              </button>
            </div>
          </div>

          {/* Vocal Naturalness Settings Section (4 sliders) */}
          <div className="shrink-0 p-4 border-t border-zinc-900 bg-zinc-950/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-red-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Vocal Naturalness Settings
                </h3>
              </div>
              <button
                onClick={handleTestNaturalSpeech}
                className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-cyan-300 text-[9.5px] flex items-center gap-1 active:scale-95 transition"
                title="Synthesize test sentence using middleware"
              >
                <Volume2 className="w-3 h-3 text-cyan-400" />
                Test Natural Speech
              </button>
            </div>

            <div className="space-y-2.5 text-[11px]">
              {/* 1. Stability */}
              <div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span>Stability (Inflection Drift)</span>
                  <span className="font-bold text-red-400">{vocalSettings.stability.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.00"
                  step="0.05"
                  value={vocalSettings.stability}
                  onChange={(e) => handleUpdateVocalSetting('stability', parseFloat(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <span className="text-[9.5px] text-zinc-500 block">Lower introduces natural vocal inflection and human drift.</span>
              </div>

              {/* 2. Similarity Boost */}
              <div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span>Similarity Boost (Speaker Match)</span>
                  <span className="font-bold text-red-400">{vocalSettings.similarity_boost.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.00"
                  step="0.05"
                  value={vocalSettings.similarity_boost}
                  onChange={(e) => handleUpdateVocalSetting('similarity_boost', parseFloat(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <span className="text-[9.5px] text-zinc-500 block">Maintains clear speaker identity and vocal timbre.</span>
              </div>

              {/* 3. Style Exaggeration */}
              <div>
                <div className="flex items-center justify-between text-zinc-300">
                  <span>Style Exaggeration (Conversational Energy)</span>
                  <span className="font-bold text-red-400">{vocalSettings.style_exaggeration.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="1.00"
                  step="0.05"
                  value={vocalSettings.style_exaggeration}
                  onChange={(e) => handleUpdateVocalSetting('style_exaggeration', parseFloat(e.target.value))}
                  className="w-full accent-red-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                />
                <span className="text-[9.5px] text-zinc-500 block">Forces dramatic conversational energy variance.</span>
              </div>

              {/* 4. Speaker Boost Toggle */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <span className="text-zinc-300 block">Speaker Boost</span>
                  <span className="text-[9.5px] text-zinc-500">Enhanced projection and microphone presence.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateVocalSetting('speaker_boost', !vocalSettings.speaker_boost)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    vocalSettings.speaker_boost ? 'bg-red-600' : 'bg-zinc-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      vocalSettings.speaker_boost ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* The 'Auto-Call' Toggle: Live Call Hijack Section */}
          <div className="shrink-0 p-4 border-t border-zinc-900 bg-zinc-950 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                  Live Call Hijack
                </h4>
                <p className="text-[10px] text-zinc-400">Enable Auto-Answering Engine</p>
              </div>

              {/* iOS/Android style toggle switch */}
              <button
                type="button"
                onClick={() => setIsAutoCallEnabled(!isAutoCallEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isAutoCallEnabled ? 'bg-red-600 shadow-[0_0_12px_rgba(239,68,68,0.5)]' : 'bg-zinc-800'
                }`}
                title="Toggle Auto-Intercept Phone Calls"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isAutoCallEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Small warning badge when turned on */}
            {isAutoCallEnabled && (
              <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-[10px] flex items-start gap-2 animate-fadeIn font-sans">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>
                  ⚠️ AI will intercept and simulate your voice on active incoming voice calls when Auto is toggled.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUB-VIEW 2: TEXT PERSONA ENGINE & SIMULATOR */}
      {/* ========================================================= */}
      {currentView === 'persona' && (
        <div className="flex-1 min-h-0 flex flex-col justify-between">
          {/* Training Chat Window (Top 50-60%) */}
          <div 
            ref={chatScrollRef}
            className="h-[350px] overflow-y-auto bg-[#0c0d12] border-b border-zinc-900 p-4 space-y-3"
          >
            <div className="text-center pb-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-900/80 px-2.5 py-1 rounded-full border border-zinc-800">
                Behavioral Style Interviewer
              </span>
            </div>

            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {msg.sender === 'ai' ? (
                    <>
                      <Bot className="w-3 h-3 text-zinc-400" />
                      <span className="text-[10px] text-zinc-400 font-bold">Interviewer</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] text-cyan-400 font-bold">You</span>
                      <User className="w-3 h-3 text-cyan-400" />
                    </>
                  )}
                  <span className="text-[9px] text-zinc-600">{msg.timestamp}</span>
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-sans shadow-md ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-zinc-800 text-zinc-200 rounded-tl-none border border-zinc-700/60'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>

          {/* Center Area: Typing Field with Matrix Depth Tracker */}
          <div className="p-3 bg-zinc-950 border-b border-zinc-900 space-y-2 shrink-0">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400 font-medium">
                Persona Matrix Depth: <strong className="text-cyan-400">{personaAnswersCount} / 50 Answers</strong>
              </span>
              <span className="text-[10px] text-zinc-500">
                {personaProgressPercent}% Learned
              </span>
            </div>

            {/* Depth Progress Bar */}
            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
                style={{ width: `${personaProgressPercent}%` }}
              />
            </div>

            {/* Text Input Row */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={typedAnswer}
                onChange={(e) => setTypedAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type how you would naturally reply..."
                className="flex-1 bg-zinc-900 border border-zinc-800 text-sm text-white rounded-lg p-2.5 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition font-sans placeholder:text-zinc-600"
              />
              <button
                onClick={handleSendAnswer}
                disabled={!typedAnswer.trim()}
                className={`p-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold transition active:scale-95 flex items-center justify-center shrink-0 ${
                  !typedAnswer.trim() ? 'opacity-40 cursor-not-allowed' : 'shadow-[0_0_15px_rgba(0,242,254,0.3)]'
                }`}
                title="Submit Answer"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            </div>
          </div>

          {/* Bottom Area: Auto-Text Config Card & AI Mimic Confidence Threshold Slider */}
          <div className="p-4 bg-zinc-950 space-y-3 shrink-0">
            {/* Toggle Row */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  Enable Auto-Text Responses
                </h4>
                <span className="text-[10px] text-zinc-500">Auto-Reply System Active</span>
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => setIsAutoTextEnabled(!isAutoTextEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  isAutoTextEnabled ? 'bg-cyan-500 shadow-[0_0_12px_rgba(0,242,254,0.5)]' : 'bg-zinc-800'
                }`}
                title="Toggle Auto-Text Responses"
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white transition-transform ${
                    isAutoTextEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Sub-label */}
            <p className="text-[10.5px] text-zinc-400 leading-relaxed font-sans">
              Allows the system to automatically analyze context and instantly reply to incoming SMS/chats using your exact vocabulary and punctuation style when Auto mode is enabled on the home dashboard.
            </p>

            {/* AI Mimic Confidence Threshold Slider */}
            <div className="pt-1 border-t border-zinc-900/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300">AI Mimic Confidence Threshold</span>
                <span className="font-bold text-cyan-400">{mimicConfidence}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="99"
                step="1"
                value={mimicConfidence}
                onChange={(e) => setMimicConfidence(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-zinc-500">
                <span>50% (Permissive)</span>
                <span>85% (Optimal)</span>
                <span>99% (Strict Clone)</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
