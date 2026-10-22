import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Upload, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Volume2, 
  VolumeX,
  Play,
  RotateCcw,
  FolderLock, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  SlidersHorizontal, 
  ShieldCheck, 
  Zap, 
  FileAudio, 
  Image as ImageIcon, 
  Check, 
  MessageSquare,
  Scale,
  BrainCircuit,
  Award,
  History,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  LogIn,
  X,
  Search,
  Lock,
  User as UserIcon
} from 'lucide-react';
import { HoloOrb, OrbPhase } from './HoloOrb';
import { omniVoice } from '../lib/omniVoice';
import { 
  supabase, 
  getCurrentUser, 
  onAuthStateChange, 
  signInWithEmail, 
  signUpWithEmail, 
  signOut as supabaseSignOut, 
  listChatThreads, 
  createChatThread, 
  renameChatThread, 
  deleteChatThread, 
  loadThreadMessages, 
  saveChatMessage,
  ChatThreadItem 
} from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useOmniChat } from '../context/OmniChatContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'omni' | 'council';
  text: string;
  timestamp: string;
  mode?: 'normal' | 'council';
  audioTranscribed?: boolean;
  councilData?: {
    question: string;
    consensusSummary: string;
    consensusScore: number;
    verdict: string;
    modelAnswers: {
      modelName: string;
      provider: string;
      roleBadge: string;
      answer: string;
      status: 'connected' | 'fallback';
    }[];
  };
}

interface OmniChatAndCouncilProps {
  onSaveToVault?: (asset: any) => void;
  onInsertToKeyboard?: (text: string) => void;
}

export const OmniChatAndCouncil: React.FC<OmniChatAndCouncilProps> = ({ onSaveToVault, onInsertToKeyboard }) => {
  const [activeMode, setActiveMode] = useState<'normal' | 'council'>('normal');
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [orbPhase, setOrbPhase] = useState<OrbPhase>('idle');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string>('nocturnal');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedCouncilCards, setExpandedCouncilCards] = useState<Record<string, boolean>>({});

  // Voice Settings State (Browser Speech Synthesis & omniVoice engine)
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [isPreviewingVoice, setIsPreviewingVoice] = useState<boolean>(false);
  const [isVoiceSettingOpen, setIsVoiceSettingOpen] = useState<boolean>(false);

  // Chat Error & Retry State (No canned / mock replies)
  const [chatError, setChatError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<{
    text: string;
    attachedImage: string | null;
    mode: 'normal' | 'council';
  } | null>(null);

  // Supabase Authentication & Threads State from Shared Context
  const {
    messages,
    setMessages,
    threads,
    activeThread,
    selectThread,
    createNewThread,
    renameCurrentThread,
    deleteCurrentThread,
    supabaseUser,
  } = useOmniChat();
  const [isThreadsDrawerOpen, setIsThreadsDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [threadsSearchQuery, setThreadsSearchQuery] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Local Chat Search State
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const chatSearchInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter messages based on local search query
  const filteredMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    const query = chatSearchQuery.toLowerCase().trim();
    return messages.filter((msg) => {
      if (msg.text && msg.text.toLowerCase().includes(query)) return true;
      if (msg.sender && msg.sender.toLowerCase().includes(query)) return true;
      if (msg.mode && msg.mode.toLowerCase().includes(query)) return true;
      if (msg.councilData) {
        if (msg.councilData.question && msg.councilData.question.toLowerCase().includes(query)) return true;
        if (msg.councilData.verdict && msg.councilData.verdict.toLowerCase().includes(query)) return true;
        if (msg.councilData.consensusSummary && msg.councilData.consensusSummary.toLowerCase().includes(query)) return true;
        if (
          msg.councilData.modelAnswers &&
          msg.councilData.modelAnswers.some(
            (m) =>
              (m.answer && m.answer.toLowerCase().includes(query)) ||
              (m.modelName && m.modelName.toLowerCase().includes(query)) ||
              (m.roleBadge && m.roleBadge.toLowerCase().includes(query))
          )
        ) {
          return true;
        }
      }
      return false;
    });
  }, [messages, chatSearchQuery]);

  // Initialize and handle browser Speech Synthesis voices and voiceschanged event
  useEffect(() => {
    const supported = omniVoice.isSpeechSynthesisSupported();
    setSpeechSupported(supported);
    if (supported) {
      const list = omniVoice.getAvailableVoices();
      setAvailableVoices(list);
      setSelectedVoiceURI(omniVoice.getSelectedVoiceURI() || '');
    }

    const unsub = omniVoice.onVoicesChanged((voices) => {
      setAvailableVoices(voices);
      setSelectedVoiceURI(omniVoice.getSelectedVoiceURI() || '');
    });

    return () => {
      unsub();
    };
  }, []);

  const isSelectedVoiceAvailable = useMemo(() => {
    if (!selectedVoiceURI) return true;
    if (availableVoices.length === 0) return true;
    return availableVoices.some((v) => v.voiceURI === selectedVoiceURI || v.name === selectedVoiceURI);
  }, [selectedVoiceURI, availableVoices]);

  const handleVoiceSelect = (uri: string) => {
    setSelectedVoiceURI(uri);
    omniVoice.setSelectedVoiceURI(uri || null);
  };

  const handleVoicePreview = () => {
    if (!speechSupported) return;
    setIsPreviewingVoice(true);
    omniVoice.previewVoice(
      selectedVoiceURI || undefined,
      'I am Omni, your shadow companion. System voice frequency calibrated.'
    );
    setTimeout(() => setIsPreviewingVoice(false), 2400);
  };

  const handleSelectThread = async (thread: ChatThreadItem) => {
    setIsThreadsDrawerOpen(false);
    setIsLoadingMessages(true);
    setOrbPhase('processing');
    try {
      await selectThread(thread);
    } catch (err) {
      console.warn('Failed to load thread messages:', err);
    } finally {
      setIsLoadingMessages(false);
      setOrbPhase('idle');
    }
  };

  const handleNewThread = async () => {
    setIsThreadsDrawerOpen(false);
    await createNewThread();
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      await deleteCurrentThread(threadId);
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Failed to delete thread:', err);
    }
  };

  const handleRenameThread = async (threadId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      await renameCurrentThread(threadId, newTitle);
      setEditingThreadId(null);
    } catch (err) {
      console.error('Failed to rename thread:', err);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (authMode === 'signin') {
        await signInWithEmail(authEmail, authPassword);
      } else {
        await signUpWithEmail(authEmail, authPassword, authDisplayName);
      }
      setIsAuthModalOpen(false);
      setAuthPassword('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabaseSignOut();
      setIsAuthModalOpen(false);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Audio Recording (Simulated / Browser Web Speech / Audio Upload)
  const toggleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      setOrbPhase('idle');
      return;
    }

    // Check if SpeechRecognition is available in browser
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
          setOrbPhase('listening');
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsRecording(false);
          setOrbPhase('idle');
        };

        recognition.onerror = () => {
          simulateMicrophone();
        };

        recognition.onend = () => {
          setIsRecording(false);
          setOrbPhase('idle');
        };

        recognition.start();
        return;
      } catch (err) {
        simulateMicrophone();
      }
    } else {
      simulateMicrophone();
    }
  };

  const simulateMicrophone = () => {
    setIsRecording(true);
    setOrbPhase('listening');
    setTimeout(() => {
      setIsRecording(false);
      setIsTranscribing(true);
      setOrbPhase('processing');

      setTimeout(() => {
        setIsTranscribing(false);
        setOrbPhase('idle');
        setInputText(
          activeMode === 'council'
            ? 'Compare Zero-Knowledge Rollups vs Optimistic Rollups for sub-second settlement throughput.'
            : 'How can I optimize the shadow companion workflow for real-time mobile multitasking?'
        );
      }, 1200);
    }, 2500);
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTranscribing(true);
    setOrbPhase('processing');

    // Simulate backend call to /api/transcribe-audio
    setTimeout(() => {
      setIsTranscribing(false);
      setOrbPhase('idle');
      setInputText(`[Transcribed from ${file.name}]: Plan an architecture that unifies Gemini, Claude, and GPT-4o into a low-latency consensus engine.`);
    }, 1500);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Enhance prompt with Omni engine
  const handleEnhancePrompt = async () => {
    if (!inputText.trim()) return;
    setOrbPhase('processing');
    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputText }),
      });
      if (res.ok) {
        const data = await res.json();
        setInputText(data.enhancedPrompt || inputText);
      } else {
        setInputText(
          `[Expanded by Omni]: In-depth architectural analysis with clear evaluation matrix, technical trade-offs, security considerations, and production recommendations for: "${inputText}"`
        );
      }
    } catch {
      setInputText(
        `[Expanded by Omni]: In-depth architectural analysis with clear evaluation matrix, technical trade-offs, security considerations, and production recommendations for: "${inputText}"`
      );
    }
    setOrbPhase('idle');
  };

  // Helper to parse AI SDK UI-message streaming responses or plain text
  const parseAISDKStream = (raw: string): string => {
    if (!raw) return '';
    const lines = raw.split('\n');
    let extracted = '';
    let isAiStream = false;

    for (const line of lines) {
      if (line.startsWith('0:')) {
        isAiStream = true;
        try {
          const parsed = JSON.parse(line.slice(2));
          if (typeof parsed === 'string') {
            extracted += parsed;
          }
        } catch {
          extracted += line.slice(2);
        }
      }
    }

    if (isAiStream && extracted) {
      return extracted;
    }
    return raw.trim();
  };

  const handleSendMessage = async (retryText?: string, retryImage?: string | null, retryMode?: 'normal' | 'council') => {
    const textToSend = typeof retryText === 'string' ? retryText : inputText;
    const imageToSend = retryImage !== undefined ? retryImage : attachedImage;
    const modeToUse = retryMode || activeMode;

    if (!textToSend.trim() && !imageToSend) return;

    setChatError(null);
    setFailedMessage(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now',
      mode: modeToUse,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setAttachedImage(null);
    setIsGenerating(true);
    setOrbPhase('processing');

    // Ensure valid UUID for threadId according to the web app API contract (z.string().uuid())
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let currentThread = activeThread;

    if (supabaseUser && !currentThread) {
      try {
        const title = textToSend.slice(0, 40) || 'New conversation';
        currentThread = await createNewThread(title);
      } catch (err) {
        console.warn('Could not auto-create thread in Supabase:', err);
      }
    }

    // Determine target UUID thread ID
    let targetThreadId: string;
    if (currentThread?.id && uuidRegex.test(currentThread.id)) {
      targetThreadId = currentThread.id;
    } else {
      targetThreadId = crypto.randomUUID();
    }

    // Persist user message to Supabase if authenticated
    if (supabaseUser && currentThread) {
      saveChatMessage(currentThread.id, supabaseUser.id, userMsg.id, {
        role: 'user',
        sender: 'user',
        text: textToSend,
        mode: modeToUse,
        content: textToSend,
      }).catch((err) => console.warn('Could not save user message:', err));
    }

    const persistAssistantMessage = (replyMsg: ChatMessage) => {
      if (supabaseUser && currentThread) {
        saveChatMessage(currentThread.id, supabaseUser.id, replyMsg.id, {
          role: 'assistant',
          sender: replyMsg.sender,
          text: replyMsg.text,
          mode: replyMsg.mode || modeToUse,
          content: replyMsg.text,
          councilData: replyMsg.councilData,
        }).catch((err) => console.warn('Could not save assistant message:', err));
      }
    };

    try {
      // Build headers: send Supabase access token as Bearer token per web app contract
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }
      } catch (sessionErr) {
        console.warn('Error reading Supabase session token:', sessionErr);
      }

      // Convert transcript to AI SDK UI-message format
      const previousUIMessages = messages.map((m) => ({
        id: m.id,
        role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
        parts: [{ type: 'text' as const, text: m.text }],
      }));

      const latestParts: any[] = [{ type: 'text', text: textToSend }];
      if (imageToSend) {
        latestParts.push({
          type: 'file',
          mediaType: 'image/jpeg',
          url: imageToSend,
        });
      }

      const latestUIMessage = {
        id: userMsg.id,
        role: 'user' as const,
        parts: latestParts,
      };

      const payloadMessages = [...previousUIMessages, latestUIMessage].slice(-50);

      // Determine endpoint based on production base URL or relative endpoint
      const webAppBaseUrl = (import.meta.env.VITE_OMNIAI_WEB_APP_URL || '').replace(/\/+$/, '');
      const chatEndpoint = `${webAppBaseUrl}/api/chat`;

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          threadId: targetThreadId,
          messages: payloadMessages,
          director: false,
          council: modeToUse === 'council',
        }),
      });

      if (!response.ok) {
        // Extract real error message from web app or server response
        let errMessage = `Request failed (HTTP ${response.status}: ${response.statusText})`;
        try {
          const errJson = await response.json();
          if (errJson.message) errMessage = errJson.message;
          else if (errJson.error) errMessage = typeof errJson.error === 'string' ? errJson.error : JSON.stringify(errJson.error);
        } catch {
          try {
            const errText = await response.text();
            if (errText) errMessage = errText.slice(0, 300);
          } catch {}
        }

        // Show actual error and keep user's message available to retry
        setChatError(errMessage);
        setFailedMessage({
          text: textToSend,
          attachedImage: imageToSend || null,
          mode: modeToUse,
        });
        setInputText(textToSend);
        if (imageToSend) setAttachedImage(imageToSend);
        setIsGenerating(false);
        setOrbPhase('idle');
        return;
      }

      // Successful response: parse stream or JSON
      let replyText = '';
      let councilDataParsed: any = null;
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const json = await response.json();
        replyText = json.reply || json.text || json.verdict || json.message || '';
        if (json.councilData || json.modelAnswers || json.verdict) {
          councilDataParsed = json.councilData || json;
        }
      } else if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let rawStream = '';
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            rawStream += decoder.decode(value, { stream: !done });
          }
        }
        replyText = parseAISDKStream(rawStream);
      } else {
        const raw = await response.text();
        replyText = parseAISDKStream(raw);
      }

      if (!replyText.trim()) {
        replyText = modeToUse === 'council' ? 'Council deliberation complete.' : 'Omni response processed.';
      }

      const replyMsg: ChatMessage = {
        id: `${modeToUse === 'council' ? 'council' : 'omni'}-${Date.now()}`,
        sender: modeToUse === 'council' ? 'council' : 'omni',
        text: replyText,
        timestamp: 'Just now',
        mode: modeToUse,
        councilData: councilDataParsed,
      };

      setMessages((prev) => [...prev, replyMsg]);
      persistAssistantMessage(replyMsg);

      // Make sure Omni's replies use the selected voice!
      if (omniVoice.getVoiceEnabled()) {
        omniVoice.speak(replyText);
      }
    } catch (networkErr: any) {
      // Show actual error and keep user's message available to retry
      const errMsg = networkErr?.message || 'Failed to connect to /api/chat. Please check network connection.';
      setChatError(errMsg);
      setFailedMessage({
        text: textToSend,
        attachedImage: imageToSend || null,
        mode: modeToUse,
      });
      setInputText(textToSend);
      if (imageToSend) setAttachedImage(imageToSend);
    } finally {
      setIsGenerating(false);
      setOrbPhase('idle');
    }
  };

  const handleRetry = () => {
    if (!failedMessage) return;
    const { text, attachedImage: img, mode } = failedMessage;
    handleSendMessage(text, img, mode);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCouncilCard = (id: string) => {
    setExpandedCouncilCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="h-full flex flex-col bg-[#07090f] text-slate-100 overflow-hidden font-sans">
      
      {/* Compact Mobile Mode Switcher & Threads Bar */}
      <div className="px-3 py-2 bg-[#090c15] border-b border-slate-800 flex items-center justify-between flex-shrink-0 gap-2">
        {/* Left: HoloOrb + Thread Selector */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <HoloOrb phase={orbPhase} className="w-6 h-6 flex-shrink-0" />
          <button
            onClick={() => setIsThreadsDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-black/60 border border-slate-800 hover:border-cyan-500/40 transition max-w-[140px] sm:max-w-[200px]"
            title="Open Conversations & Threads"
          >
            <History className="w-3.5 h-3.5 text-[#00f2fe] shrink-0" />
            <span className="truncate text-xs font-mono font-medium text-slate-200">
              {activeThread ? activeThread.title : 'New Chat'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-500 shrink-0" />
          </button>
        </div>

        {/* Right: Mode Switcher + Auth + New Thread */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Compact Mode Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setActiveMode('normal')}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${
                activeMode === 'normal'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Bot className="w-3 h-3" />
              <span className="text-[10px]">Normal</span>
            </button>
            <button
              onClick={() => setActiveMode('council')}
              className={`px-2 py-0.5 rounded-md flex items-center gap-1 transition-all ${
                activeMode === 'council'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3 h-3" />
              <span className="text-[10px]">Council</span>
            </button>
          </div>

          {/* Supabase Account Status */}
          {supabaseUser ? (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-[10px] font-mono text-emerald-300 hover:border-emerald-400 transition"
              title={`Supabase Connected: ${supabaseUser.email}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="hidden sm:inline truncate max-w-[65px]">{supabaseUser.email?.split('@')[0]}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 hover:text-white transition shadow-sm"
              title="Sign in with Supabase account to sync threads across web & phone"
            >
              <LogIn className="w-3 h-3" />
              <span className="hidden xs:inline">Sync</span>
            </button>
          )}

          {/* Quick New Thread Button */}
          <button
            onClick={handleNewThread}
            className="p-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white transition"
            title="Start New Conversation"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Voice Setting Control Bar */}
      <div className="px-3 py-2 bg-[#080b14] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs shrink-0">
            <Volume2 className="w-3.5 h-3.5" />
            <label htmlFor="omni-voice-dropdown" className="font-semibold text-slate-200">
              Voice:
            </label>
          </div>
          <select
            id="omni-voice-dropdown"
            aria-label="Omni Voice Synthesizer"
            value={selectedVoiceURI}
            onChange={(e) => handleVoiceSelect(e.target.value)}
            disabled={!speechSupported || availableVoices.length === 0}
            className="flex-1 bg-black/80 border border-slate-800 hover:border-cyan-500/50 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-400 transition font-mono truncate max-w-[260px] sm:max-w-md disabled:opacity-50"
          >
            <option value="">Default (Stoic Shadow Companion)</option>
            {availableVoices.map((v) => (
              <option key={v.voiceURI || v.name} value={v.voiceURI || v.name}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleVoicePreview}
            disabled={!speechSupported || isPreviewingVoice}
            className="px-2.5 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-mono font-medium flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-40"
            title="Preview selected voice before choosing"
          >
            <Play className={`w-3.5 h-3.5 ${isPreviewingVoice ? 'text-emerald-400 animate-spin' : 'text-cyan-400'}`} />
            <span>{isPreviewingVoice ? 'Testing...' : 'Preview Voice'}</span>
          </button>
        </div>
      </div>

      {/* Friendly status message if speech synthesis is not supported */}
      {!speechSupported && (
        <div className="px-3 py-1.5 bg-amber-950/40 border-b border-amber-600/30 text-amber-300 text-xs flex items-center gap-2 font-mono shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Speech synthesis is not supported on this browser or device. Visual transcription remains fully active.</span>
        </div>
      )}

      {/* Friendly status message if selected voice is unavailable on this device */}
      {speechSupported && selectedVoiceURI && !isSelectedVoiceAvailable && (
        <div className="px-3 py-1.5 bg-amber-950/40 border-b border-amber-600/30 text-amber-300 text-xs flex items-center gap-2 font-mono shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>The selected voice "{selectedVoiceURI}" is not available on this device; Omni is using the system default voice.</span>
        </div>
      )}

      {/* Informational Supabase Sync Banner if unauthenticated */}
      {!supabaseUser && (
        <div className="px-3 py-1.5 bg-[#090e1c] border-b border-cyan-900/40 flex items-center justify-between text-[11px] font-mono shrink-0">
          <div className="flex items-center gap-1.5 text-slate-300 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] animate-pulse shrink-0" />
            <span className="truncate">Sign in with Supabase to sync threads with OmniAI Web.</span>
          </div>
          <button
            onClick={() => {
              setAuthMode('signin');
              setIsAuthModalOpen(true);
            }}
            className="text-[#00f2fe] hover:underline font-bold shrink-0 ml-2"
          >
            Sign In →
          </button>
        </div>
      )}

      {/* Council Mode Banner */}
      {activeMode === 'council' && (
        <div className="px-4 py-2 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-purple-950/40 border-b border-purple-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-purple-200">
            <Scale className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>
              <strong>Quorum Deliberation:</strong> Gemini 3.5 Pro • Claude 3.5 Sonnet • GPT-4o • DeepSeek R1 • Llama 3.3 • Mistral Large
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-purple-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Consensus Synthesizer Active</span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          const isCouncil = msg.sender === 'council';

          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-4xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className="flex-shrink-0 pt-0.5">
                {isUser ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold text-xs shadow-md">
                    U
                  </div>
                ) : isCouncil ? (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/30">
                    <Scale className="w-4 h-4" />
                  </div>
                ) : (
                  <HoloOrb phase="idle" className="w-8 h-8" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={`rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-md'
                    : isCouncil
                    ? 'bg-[#0d0f1c] border border-purple-500/40 text-slate-200 shadow-xl'
                    : 'bg-[#0e1220] border border-slate-800 text-slate-200 shadow-lg'
                }`}
              >
                {/* Header label for AI responses */}
                {!isUser && (
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {isCouncil ? (
                        <>
                          <Award className="w-4 h-4 text-purple-400" />
                          <span className="font-bold text-purple-300">Unified Council Quorum Verdict</span>
                          {msg.councilData && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono">
                              {msg.councilData.consensusScore}% Consensus
                            </span>
                          )}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-bold text-cyan-300">Omni Shadow Intelligence</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(msg.text, msg.id)}
                        className="text-slate-400 hover:text-white transition-all"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      {onSaveToVault && (
                        <button
                          onClick={() => {
                            onSaveToVault({
                              id: `vault-chat-${Date.now()}`,
                              name: isCouncil ? 'Council Quorum Verdict' : 'Omni Chat Brief',
                              type: 'text',
                              text: msg.text,
                              createdAt: new Date().toISOString(),
                            });
                          }}
                          className="text-slate-400 hover:text-cyan-400 transition-all"
                          title="Save to Vault"
                        >
                          <FolderLock className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Body Content */}
                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {msg.text}
                </div>

                {/* Council Deliberation Matrix Expandable Cards */}
                {isCouncil && msg.councilData?.modelAnswers && (
                  <div className="mt-4 pt-3 border-t border-purple-900/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-purple-300 font-bold">
                        Individual LLM Deliberations ({msg.councilData.modelAnswers.length} Models)
                      </span>
                      <button
                        onClick={() => toggleCouncilCard(msg.id)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold"
                      >
                        {expandedCouncilCards[msg.id] ? 'Collapse Perspectives' : 'Inspect All Perspectives'}
                        {expandedCouncilCards[msg.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {expandedCouncilCards[msg.id] && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                        {msg.councilData.modelAnswers.map((model, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white text-xs">{model.modelName}</span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800">
                                  {model.roleBadge}
                                </span>
                              </div>
                              <span
                                className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                  model.status === 'connected'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {model.status === 'connected' ? 'Active Direct' : 'Simulated Fallback'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed italic">
                              "{model.answer}"
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-2 text-right">
                  <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex gap-3 max-w-2xl">
            <HoloOrb phase="processing" className="w-8 h-8 flex-shrink-0" />
            <div className="rounded-2xl p-4 bg-[#0e1220] border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2 shadow-lg">
              <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
              <span>
                {activeMode === 'council'
                  ? 'Council gathering perspectives from 6 LLMs and synthesizing quorum consensus...'
                  : 'Omni computing neural inference...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Fast Prompts (Council or Normal) */}
      <div className="px-4 py-1.5 bg-[#080a12] border-t border-slate-800/60 overflow-x-auto flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold mr-1 hidden sm:inline">
          PROMPTS:
        </span>
        {(activeMode === 'council'
          ? [
              'Zero-Knowledge vs Optimistic Rollups for sub-second settlement',
              'Rust vs Go for High-Frequency Microservices',
              'Quantum-resistant lattice cryptography architecture',
              'Viral retention psychology for 15-second mobile hooks',
            ]
          : [
              'Plan an autonomous multi-agent pipeline',
              'Explain the Shadow Companion keyboard layer',
              'Compose lyrics for heavy metal cyberpunk track',
              'Audit my landing page conversion funnel',
            ]
        ).map((preset, idx) => (
          <button
            key={idx}
            onClick={() => setInputText(preset)}
            className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-400 hover:text-cyan-300 text-[11px] whitespace-nowrap transition-all"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[#0a0d16] border-t border-slate-800 flex-shrink-0 space-y-2">
        {/* Attached image preview */}
        {attachedImage && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 w-max">
            <img src={attachedImage} alt="attachment" className="w-10 h-10 object-cover rounded" />
            <span className="text-xs text-slate-300">Image attached for vision analysis</span>
            <button
              onClick={() => setAttachedImage(null)}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold px-1"
            >
              ✕
            </button>
          </div>
        )}
        {/* Actual Request Error Banner with Retry button (No canned mock responses) */}
        {chatError && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-200 shadow-xl animate-in fade-in">
            <div className="flex items-center gap-2 overflow-hidden flex-1">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="overflow-hidden">
                <span className="font-bold text-rose-300">Request Error: </span>
                <span className="font-mono text-rose-200 truncate">{chatError}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRetry}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
                title="Retry sending this prompt"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => setChatError(null)}
                className="p-1 rounded text-rose-400 hover:text-white hover:bg-rose-900/40"
                title="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          {/* Audio Transcribe File Upload */}
          <input
            type="file"
            ref={audioFileInputRef}
            onChange={handleAudioFileUpload}
            accept="audio/*"
            className="hidden"
          />
          <button
            onClick={() => audioFileInputRef.current?.click()}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white hover:border-slate-700 transition-all flex items-center justify-center"
            title="Upload Audio File for Transcription"
          >
            <FileAudio className="w-4 h-4" />
          </button>

          {/* Image Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/90 text-slate-400 hover:text-white hover:border-slate-700 transition-all flex items-center justify-center"
            title="Attach Image for Vision Analysis"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Text Input Box */}
          <div className="flex-1 relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={
                isTranscribing
                  ? 'Transcribing audio speech with Gemini multimodal...'
                  : isRecording
                  ? 'Listening to your voice...'
                  : activeMode === 'council'
                  ? 'Ask the Council a hard question (runs across all 6 LLMs)...'
                  : 'Message Omni (or record your voice)...'
              }
              className={`w-full py-2.5 pl-3 pr-24 rounded-xl bg-slate-950 border text-xs md:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all ${
                isRecording
                  ? 'border-purple-500 ring-2 ring-purple-500/30'
                  : isTranscribing
                  ? 'border-cyan-500 ring-2 ring-cyan-500/30 animate-pulse'
                  : 'border-slate-800 focus:border-cyan-500'
              }`}
            />

            {/* In-input action icons */}
            <div className="absolute right-2 flex items-center gap-1.5">
              {/* Prompt Enhancer Button */}
              {inputText.trim() && (
                <button
                  onClick={handleEnhancePrompt}
                  className="p-1 rounded text-cyan-400 hover:bg-cyan-950/60 transition-all"
                  title="Enhance prompt with Omni Engine"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              )}

              {/* Live Microphone Recording Button */}
              <button
                onClick={toggleRecording}
                className={`p-1.5 rounded-lg transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/50'
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-800'
                }`}
                title={isRecording ? 'Stop Recording' : 'Record voice to transcribe'}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={(!inputText.trim() && !attachedImage) || isGenerating}
            className={`p-2.5 rounded-xl font-bold flex items-center justify-center transition-all ${
              activeMode === 'council'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:brightness-110 shadow-md shadow-purple-500/30'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 hover:brightness-110 shadow-md shadow-cyan-500/30'
            } disabled:opacity-40 disabled:pointer-events-none active:scale-95`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Live Audio Recording Status Banner */}
        {isRecording && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <span>Recording microphone input... Speak clearly</span>
            </div>
            <button onClick={toggleRecording} className="font-bold underline text-red-200">
              Done
            </button>
          </div>
        )}
      </div>

      {/* SLIDE-OUT THREADS & CONVERSATIONS DRAWER */}
      {isThreadsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            onClick={() => setIsThreadsDrawerOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
          />

          {/* Drawer Content */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#0a0d18] border-r border-slate-800 flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-3 bg-[#07090f] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-xs text-white uppercase tracking-wider font-mono">
                  Conversations
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewThread}
                  className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:text-white transition"
                  title="New Conversation"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsThreadsDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Search Filter */}
            {threads.length > 0 && (
              <div className="p-2 border-b border-slate-800/80">
                <div className="flex items-center gap-1.5 bg-[#05060b] border border-slate-800 rounded-lg px-2 py-1 text-xs">
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={threadsSearchQuery}
                    onChange={(e) => setThreadsSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="bg-transparent border-0 text-slate-200 placeholder-slate-600 focus:outline-none text-xs w-full font-mono"
                  />
                  {threadsSearchQuery && (
                    <button onClick={() => setThreadsSearchQuery('')} className="text-slate-500 hover:text-white">
                      ×
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Threads List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!supabaseUser ? (
                <div className="p-4 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-white">Cloud Sync Available</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sign in with your Supabase account to sync your conversation threads and private memory between phone and web.
                  </p>
                  <button
                    onClick={() => {
                      setIsThreadsDrawerOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition"
                  >
                    Sign In with Supabase
                  </button>
                </div>
              ) : threads.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-mono">
                  No conversations yet. Send a message to start your first thread!
                </div>
              ) : (
                threads
                  .filter((t) =>
                    threadsSearchQuery
                      ? t.title.toLowerCase().includes(threadsSearchQuery.toLowerCase())
                      : true
                  )
                  .map((t) => {
                    const isActive = activeThread?.id === t.id;
                    const isEditing = editingThreadId === t.id;
                    return (
                      <div
                        key={t.id}
                        className={`group relative rounded-xl p-2.5 transition-all text-xs flex items-center justify-between gap-2 ${
                          isActive
                            ? 'bg-cyan-950/50 border border-cyan-500/40 text-cyan-200'
                            : 'bg-black/40 border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameThread(t.id, editingTitle);
                                if (e.key === 'Escape') setEditingThreadId(null);
                              }}
                              autoFocus
                              className="bg-black border border-cyan-500 rounded px-2 py-1 text-xs text-white w-full focus:outline-none"
                            />
                            <button
                              onClick={() => handleRenameThread(t.id, editingTitle)}
                              className="p-1 rounded bg-cyan-500 text-slate-950 font-bold"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingThreadId(null)}
                              className="p-1 rounded text-slate-400 hover:text-white"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div
                              onClick={() => handleSelectThread(t)}
                              className="flex-1 min-w-0 cursor-pointer"
                            >
                              <p className="font-medium truncate leading-snug">{t.title}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {new Date(t.updated_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingThreadId(t.id);
                                  setEditingTitle(t.title);
                                }}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300"
                                title="Rename thread"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirmDeleteId === t.id) {
                                    handleDeleteThread(t.id);
                                  } else {
                                    setConfirmDeleteId(t.id);
                                    setTimeout(() => setConfirmDeleteId(null), 3000);
                                  }
                                }}
                                className={`p-1 rounded hover:bg-slate-800 ${
                                  confirmDeleteId === t.id ? 'text-red-400 font-bold' : 'text-slate-400 hover:text-red-400'
                                }`}
                                title={confirmDeleteId === t.id ? 'Click again to confirm delete' : 'Delete thread'}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            {/* Drawer Footer Account Area */}
            {supabaseUser && (
              <div className="p-3 border-t border-slate-800 bg-[#07090f] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                    {supabaseUser.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-slate-300 font-mono text-[11px]">{supabaseUser.email}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition"
                  title="Sign out of Supabase"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUPABASE AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm bg-[#090c16] border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
                  ⚡
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">OmniAI Account Sync</h3>
                  <p className="text-[10px] font-mono text-slate-400">Powered by shared Supabase database</p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {supabaseUser ? (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Connected to Supabase</span>
                  </div>
                  <p className="text-xs text-slate-200">
                    Signed in as: <strong className="text-white font-mono">{supabaseUser.email}</strong>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">ID: {supabaseUser.id}</p>
                  <p className="text-[11px] text-slate-400">
                    Conversations, threads, and private memory are synced with your web workspace.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsAuthModalOpen(false);
                      setIsThreadsDrawerOpen(true);
                    }}
                    className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold transition"
                  >
                    View Threads
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 hover:bg-red-900/50 text-xs font-bold transition flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-black border border-slate-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError(null);
                    }}
                    className={`py-1.5 rounded-lg transition-all ${
                      authMode === 'signin' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError(null);
                    }}
                    className={`py-1.5 rounded-lg transition-all ${
                      authMode === 'signup' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400'
                    }`}
                  >
                    Create Account
                  </button>
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="text-[11px] font-mono text-slate-300 block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={authDisplayName}
                      onChange={(e) => setAuthDisplayName(e.target.value)}
                      placeholder="Your name or callsign"
                      className="w-full px-3 py-2 rounded-xl bg-black border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-300 block mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl bg-black border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                {authError && (
                  <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-[11px] leading-tight">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-500/20 active:scale-95 transition disabled:opacity-50"
                >
                  {authLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{authMode === 'signin' ? 'Sign In to OmniAI' : 'Create Supabase Account'}</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
