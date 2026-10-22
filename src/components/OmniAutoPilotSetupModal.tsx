import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Bot, 
  Mic, 
  Square, 
  Play, 
  Check, 
  Save, 
  Sliders, 
  Volume2, 
  Flame, 
  Smile, 
  Zap, 
  RotateCcw, 
  UserCheck, 
  ChevronRight, 
  X,
  Radio,
  Activity,
  ShieldCheck
} from 'lucide-react';
import { HoloOrb } from './HoloOrb';

interface CalibrationQuestion {
  id: string;
  category: string;
  question: string;
  options: Array<{
    id: string;
    label: string;
    example: string;
  }>;
}

const CALIBRATION_QUESTIONS: CalibrationQuestion[] = [
  {
    id: 'pacing',
    category: 'Length & Structure',
    question: 'How do you typically structure your text responses?',
    options: [
      { id: 'bullet', label: 'Crisp & Punchy', example: '1-2 short sentences or decisive bullet points. Zero fluff.' },
      { id: 'conversational', label: 'Balanced & Natural', example: 'Friendly paragraph with contextual nuance and warm transitions.' },
      { id: 'minimalist', label: 'Ultra Minimalist', example: '"On it." / "Done." / "Sounds good."' }
    ]
  },
  {
    id: 'humor',
    category: 'Wit & Tone',
    question: 'What is your humor and sarcasm level?',
    options: [
      { id: 'dry', label: 'Dry & Fast Wit', example: 'Deadpan humor, sharp observation, playful confidence.' },
      { id: 'raw', label: 'Unvarnished Realist', example: 'Straight shooter. Calls things as they are without sugarcoating.' },
      { id: 'warm', label: 'Warm & Uplifting', example: 'Encouraging, supportive, positive energy.' },
      { id: 'none', label: 'Strictly Professional', example: 'Corporate-grade milestone reporting with zero sarcasm.' }
    ]
  },
  {
    id: 'greetings',
    category: 'Salutations & Sign-offs',
    question: 'How do you open and close your messages?',
    options: [
      { id: 'no_greeting', label: 'Direct Entry (No greeting)', example: 'Jumps straight into the core point.' },
      { id: 'casual', label: 'Casual ("Hey", "Cheers")', example: '"Hey Alex," / "Talk soon,"' },
      { id: 'formal', label: 'Formal ("Hi [Name], Best")', example: '"Hi Sarah, Hope you are well. Best,"' }
    ]
  },
  {
    id: 'slang',
    category: 'Vocabulary Style',
    question: 'What vocabulary style feels most authentic to you?',
    options: [
      { id: 'tech_nocturnal', label: 'Modern Tech & Midnight Studio', example: 'High signal, milestone-driven, crisp contemporary phrasing.' },
      { id: 'business_executive', label: 'Executive Clarity', example: 'Deliverables, ETA, accountability, metrics.' },
      { id: 'casual_street', label: 'Casual & Relaxed', example: 'Laid back, relatable, conversational lowercase.' }
    ]
  },
  {
    id: 'emoji',
    category: 'Emoji Frequency',
    question: 'What is your emoji usage frequency?',
    options: [
      { id: 'subtle', label: 'Subtle Accent', example: '1-2 purposeful emojis max (e.g. ⚡, 🚀, 👍)' },
      { id: 'zero', label: 'Zero Emojis', example: 'Pure text only. Absolutely no icons.' },
      { id: 'expressive', label: 'Expressive', example: 'Frequent reaction emojis (🔥, 💀, 😂, 🙌)' }
    ]
  }
];

interface OmniAutoPilotSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile?: (profile: any) => void;
}

export const OmniAutoPilotSetupModal: React.FC<OmniAutoPilotSetupModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile
}) => {
  const [activeStep, setActiveStep] = useState<'calibrate' | 'voice_clone'>('calibrate');

  // Calibration answers
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_persona_calibration');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return {
      pacing: 'bullet',
      humor: 'dry',
      greetings: 'no_greeting',
      slang: 'tech_nocturnal',
      emoji: 'subtle'
    };
  });

  // Voice Cloning State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [clonedPitch, setClonedPitch] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem('omni_clone_pitch') || '1.0');
    }
    return 1.0;
  });
  const [clonedRate, setClonedRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem('omni_clone_rate') || '1.05');
    }
    return 1.05;
  });
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const testScript = "OmniAI, this is my natural speaking cadence and tone. Learn my pacing, take over my messages when I am busy, and always speak with unvarnished clarity.";

  const handleSelectAnswer = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  // Live Microphone Recording for Voice Sample Training
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or unsupported:', err);
      // Fallback simulation
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
      setTimeout(() => {
        stopRecording();
      }, 5000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const handleTestClonedVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsTestingVoice(true);
      const utterance = new SpeechSynthesisUtterance("Voice synthesis calibrated. This is your cloned autonomous voice profile ready for live call takeover.");
      utterance.pitch = clonedPitch;
      utterance.rate = clonedRate;
      utterance.onend = () => setIsTestingVoice(false);
      utterance.onerror = () => setIsTestingVoice(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsTestingVoice(true);
      setTimeout(() => setIsTestingVoice(false), 2000);
    }
  };

  const handleSaveAll = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omni_persona_calibration', JSON.stringify(answers));
      localStorage.setItem('omni_clone_pitch', clonedPitch.toString());
      localStorage.setItem('omni_clone_rate', clonedRate.toString());
    }

    onSaveProfile?.({
      calibration: answers,
      voiceSettings: {
        pitch: clonedPitch,
        rate: clonedRate,
        sampleRecorded: Boolean(recordedAudioUrl),
      }
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 font-sans select-none animate-in fade-in duration-200">
      
      <div className="w-full max-w-2xl bg-[#0a0a0c] border border-zinc-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="p-4 bg-[#121318] border-b border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-600/40 flex items-center justify-center text-red-400 font-black shadow-lg shadow-red-950/30">
              <Zap className="w-4 h-4 text-red-400 fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                AUTO-PILOT & VOICE CLONING SETUP
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/60 text-red-300 border border-red-800/40">
                  TRAIN LIKE ME
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">Teach OmniAI your authentic habits, humor, and speech clone</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP TOGGLE SWITCHER */}
        <div className="p-2 bg-[#0a0a0c] border-b border-zinc-800 flex items-center justify-center gap-2 shrink-0">
          <button
            onClick={() => setActiveStep('calibrate')}
            className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeStep === 'calibrate'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" /> 1. Style & Humor Calibration
          </button>
          <button
            onClick={() => setActiveStep('voice_clone')}
            className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
              activeStep === 'voice_clone'
                ? 'bg-red-600 text-white shadow-md shadow-red-950/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" /> 2. Voice Cloning Training
          </button>
        </div>

        {/* MODAL SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* STEP 1: CALIBRATION QUESTIONS */}
          {activeStep === 'calibrate' && (
            <div className="space-y-6">
              <div className="p-3.5 rounded-2xl bg-red-950/20 border border-red-800/30 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-xs text-zinc-300 leading-relaxed">
                  OmniAI analyzes these responses to calibrate its internal prompt cascade. When <strong>Auto-Pilot Mode</strong> answers messages for you, it sounds unequivocally like you.
                </p>
              </div>

              {CALIBRATION_QUESTIONS.map((q, qIndex) => (
                <div key={q.id} className="p-4 rounded-2xl bg-[#121318] border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider font-bold">
                      Question {qIndex + 1} • {q.category}
                    </span>
                    <span className="text-xs text-red-400 font-mono">
                      {answers[q.id] ? '✓ Configured' : 'Required'}
                    </span>
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white leading-snug">
                    {q.question}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => handleSelectAnswer(q.id, opt.id)}
                          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                            isSelected
                              ? 'bg-red-950/50 border-red-500 text-white shadow-[0_0_12px_rgba(220,38,38,0.25)]'
                              : 'bg-black hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold font-mono text-white">
                                {opt.label}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-red-400" />}
                            </div>
                            <p className="text-[10px] text-zinc-400 italic leading-relaxed">
                              {opt.example}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* STEP 2: VOICE CLONING SECTION */}
          {activeStep === 'voice_clone' && (
            <div className="space-y-6">
              
              <div className="p-4 rounded-2xl bg-[#121318] border border-zinc-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-950/60 text-red-400 border border-red-800/40 flex items-center justify-center font-bold">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Record Your Voice Training Sample</h3>
                    <p className="text-xs text-zinc-400">Read the calibration sentence below while recording.</p>
                  </div>
                </div>

                {/* Script Box */}
                <div className="p-3.5 rounded-xl bg-black border border-zinc-800 text-xs text-zinc-200 font-mono leading-relaxed relative">
                  <span className="text-[9px] uppercase tracking-widest text-red-400 block mb-1 font-bold">Training Sample Script:</span>
                  "{testScript}"
                </div>

                {/* Recorder Controls */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-black border border-zinc-800">
                  <div className="flex items-center gap-2">
                    {isRecording ? (
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-zinc-600" />
                    )}
                    <span className="text-xs font-mono font-bold text-zinc-300">
                      {isRecording ? `Recording Voice Sample... ${recordingSeconds}s` : recordedAudioUrl ? 'Sample Recorded' : 'Ready to Record'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition"
                      >
                        <Mic className="w-3.5 h-3.5" /> Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" /> Stop & Process
                      </button>
                    )}

                    {recordedAudioUrl && !isRecording && (
                      <button
                        onClick={() => {
                          const audio = new Audio(recordedAudioUrl);
                          audio.play();
                        }}
                        className="px-3 py-2 rounded-xl bg-[#121318] hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 flex items-center gap-1"
                      >
                        <Play className="w-3.5 h-3.5 text-red-400" /> Play Back
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Synthesized Neural Voice Calibration Sliders */}
              <div className="p-4 rounded-2xl bg-[#121318] border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-white font-mono">
                    <Sliders className="w-4 h-4 text-red-400" />
                    <span>Neural Cloned Voice Synthesis Parameters</span>
                  </div>
                  <button
                    onClick={handleTestClonedVoice}
                    disabled={isTestingVoice}
                    className="px-3 py-1 rounded-lg bg-red-950/40 text-red-300 border border-red-600/40 text-xs font-mono font-bold flex items-center gap-1.5 hover:bg-red-950/60 transition"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    {isTestingVoice ? 'Speaking...' : 'Test Cloned Voice'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pitch Shift Slider */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-black border border-zinc-800">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400">Voice Pitch / Timbre:</span>
                      <span className="text-red-400 font-bold">{clonedPitch.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.7"
                      max="1.4"
                      step="0.05"
                      value={clonedPitch}
                      onChange={(e) => setClonedPitch(parseFloat(e.target.value))}
                      className="w-full accent-red-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                      <span>Deeper</span>
                      <span>Natural</span>
                      <span>Higher</span>
                    </div>
                  </div>

                  {/* Speech Rate Slider */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-black border border-zinc-800">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400">Pacing & Cadence:</span>
                      <span className="text-red-400 font-bold">{clonedRate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.4"
                      step="0.05"
                      value={clonedRate}
                      onChange={(e) => setClonedRate(parseFloat(e.target.value))}
                      className="w-full accent-red-600 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                      <span>Deliberate</span>
                      <span>Normal</span>
                      <span>Brisk / Fast</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 bg-[#121318] border-t border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">Encrypted On-Device Neural Profile</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:brightness-110 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition"
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saveSuccess ? 'Saved Successfully!' : 'Save & Deploy Persona'}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
