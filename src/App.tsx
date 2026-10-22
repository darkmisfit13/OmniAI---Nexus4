import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Keyboard as KeyboardIcon, 
  Eye, 
  Sparkles, 
  Smartphone, 
  Wifi, 
  Battery, 
  Maximize2, 
  FolderOpen, 
  Code,
  Activity,
  Layers,
  Cpu,
  Laptop,
  Zap,
  Volume2,
  VolumeX,
  MessageSquare,
  Settings,
  FolderLock,
  Menu,
  ChevronLeft,
  Bot
} from 'lucide-react';
import { HoloOrb, OrbPhase } from './components/HoloOrb';
import { AIKeyboardBar } from './components/AIKeyboardBar';
import { SoftKeyboard } from './components/SoftKeyboard';
import { SimulatedAppView, PRESET_SCENARIOS, ScreenScenario } from './components/SimulatedAppView';
import { ScreenVisionHUD } from './components/ScreenVisionHUD';
import { OmniStudiosView, StudioId, studioMeta } from './components/OmniStudiosView';
import { OmniStudiosSidebar } from './components/OmniStudiosSidebar';
import { OmniAIChatRoom } from './components/OmniAIChatRoom';
import { OmniChatAndCouncil } from './components/OmniChatAndCouncil';
import { OmniCompanionPanel } from './components/OmniCompanionPanel';
import { useOmniChat } from './context/OmniChatContext';
import { AdminHub } from './components/AdminHub';
import { VaultAssetsDrawer, VaultAsset, initialVaultAssets } from './components/VaultAssetsDrawer';
import { MobileSetupGuide } from './components/MobileSetupGuide';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { WorkspaceHub } from './components/WorkspaceHub';
import { KeyboardExtensionBridge } from './components/KeyboardExtensionBridge';
import { DesktopSyncBridge } from './components/DesktopSyncBridge';
import { DesktopFloatingWidget } from './components/DesktopFloatingWidget';
import { JarvisTelemetryHUD } from './components/JarvisTelemetryHUD';
import { onDeviceAI, DualLaneAnalysisResult } from './lib/onDeviceAI';
import { auth, testFirestoreConnection } from './lib/firebase';
import { User } from 'firebase/auth';
import { getCurrentUser, saveVaultAsset } from './lib/supabase';
import { omniVoice } from './lib/omniVoice';
import { OmniVoidBackground } from './components/OmniVoidBackground';
import { LiveCallView, CALLER_PRESETS, LiveCallCaller } from './components/LiveCallView';
import { OmniAutoPilotSetupModal } from './components/OmniAutoPilotSetupModal';
import { MyAIIdentityView } from './components/MyAIIdentityView';

export default function App() {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'chat' | 'vision' | 'workspace' | 'extension' | 'studios' | 'sync' | 'setup' | 'admin' | 'identity'>('keyboard');
  const [isDesktopOverlayActive, setIsDesktopOverlayActive] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(omniVoice.getVoiceEnabled());
  const [isLiveCallOpen, setIsLiveCallOpen] = useState(false);
  const [liveCallCaller, setLiveCallCaller] = useState<LiveCallCaller>(CALLER_PRESETS[0]);
  const [isAutoPilotSetupOpen, setIsAutoPilotSetupOpen] = useState(false);
  const typingTimerRef = useRef<any>(null);

  // Shared OmniChat Context for Companion Panel & Dedicated Chat Page
  const { isCompanionOpen, setIsCompanionOpen, setActiveStudioContext } = useOmniChat();

  // 3D Keyboard Haptic Feedback State
  const [hapticFeedback, setHapticFeedback] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('omni_haptic_enabled') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    const handleHapticChange = (e: any) => {
      if (e?.detail?.enabled !== undefined) {
        setHapticFeedback(Boolean(e.detail.enabled));
      } else if (typeof window !== 'undefined') {
        setHapticFeedback(localStorage.getItem('omni_haptic_enabled') !== 'false');
      }
    };
    window.addEventListener('omni_haptic_changed', handleHapticChange);
    return () => window.removeEventListener('omni_haptic_changed', handleHapticChange);
  }, []);

  // Studios Sidebar & Vault Drawer & Admin Modals
  const [isStudiosSidebarOpen, setIsStudiosSidebarOpen] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState<StudioId>('motion');

  // Global Vault Assets State synced across Workspace, Studios & Drawer
  const [vaultAssets, setVaultAssets] = useState<VaultAsset[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_vault_assets');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return initialVaultAssets;
  });

  const handleSaveToVault = useCallback((asset: any) => {
    const newAsset = { ...asset, id: asset.id || `vault-${Date.now()}` };
    setVaultAssets((prev) => [newAsset, ...prev.filter((a) => a.id !== newAsset.id)]);
    if (typeof window !== 'undefined') {
      try {
        const existing = JSON.parse(localStorage.getItem('omni_vault_assets') || '[]');
        localStorage.setItem(
          'omni_vault_assets',
          JSON.stringify([newAsset, ...existing.filter((a: any) => a.id !== newAsset.id)])
        );
      } catch {}
    }
    // Sync to Supabase under authenticated user's ID (RLS protected)
    getCurrentUser().then((user) => {
      if (user) {
        saveVaultAsset(user.id, newAsset).catch((err) => {
          console.warn('[App] Supabase Vault asset save:', err);
        });
      }
    });
  }, []);

  useEffect(() => {
    const handleVaultUpdate = (e: any) => {
      if (e?.detail?.asset) {
        const incoming = e.detail.asset;
        setVaultAssets((prev) => [incoming, ...prev.filter((a) => a.id !== incoming.id)]);
      }
    };
    window.addEventListener('omni_vault_updated', handleVaultUpdate);
    return () => window.removeEventListener('omni_vault_updated', handleVaultUpdate);
  }, []);

  // Sync studio context with OmniChatContext whenever studio or tab changes
  useEffect(() => {
    if (activeTab === 'studios' && selectedStudio) {
      const meta = studioMeta[selectedStudio];
      if (meta) {
        setActiveStudioContext({
          id: selectedStudio,
          name: meta.name,
          tag: meta.tag,
        });
      }
    } else {
      setActiveStudioContext(null);
    }
  }, [activeTab, selectedStudio, setActiveStudioContext]);

  // Autonomous Auto Mode State
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoPilotTone, setAutoPilotTone] = useState<'rawHonest' | 'witty' | 'directAction'>('directAction');
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [autoDispatchTarget, setAutoDispatchTarget] = useState<string>('');
  const [autoDispatchPreviewText, setAutoDispatchPreviewText] = useState<string>('');
  const autoCountdownTimerRef = useRef<any>(null);

  // Active typing text
  const [currentDraftText, setCurrentDraftText] = useState<string>(PRESET_SCENARIOS[0].defaultDraft);

  // Active screen scenario
  const [currentScenario, setCurrentScenario] = useState<ScreenScenario>(PRESET_SCENARIOS[0]);
  const [customScreenshot, setCustomScreenshot] = useState<string | null>(null);

  // Live Screen Sharing stream
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  // Keyboard collapsed state
  const [isKeyboardCollapsed, setIsKeyboardCollapsed] = useState(false);

  // Phone frame simulation toggle for desktop screens
  const [phoneFrameMode, setPhoneFrameMode] = useState(true);

  // On-Device AI Mode vs Cloud Mode
  const [isOnDeviceMode, setIsOnDeviceMode] = useState(true);
  const [localLatencyMs, setLocalLatencyMs] = useState(6.4);

  // Jarvis Telemetry HUD state
  const [isTelemetryHUDOpen, setIsTelemetryHUDOpen] = useState(false);

  // Current Firebase Auth User
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);

  // Dual-Lane AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [orbPhase, setOrbPhase] = useState<OrbPhase>('idle');
  const [analysisData, setAnalysisData] = useState<DualLaneAnalysisResult>({
    summary: 'Alex Rivera (VP Eng) is demanding an unvarnished ETA on the staging build #402 deployment.',
    counterpartDossier: 'Alex Rivera • VP Engineering • #product-launch',
    emotionalRegister: 'High-Stakes Pressure & Zero-Fluff Accountability',
    urgency: 'High',
    suggestionTrio: {
      witty: 'Code is compiling—unless the server catches fire, staging is live at 11:00 AM.',
      rawHonest: 'The delay was on our auth regression check. We caught the flaw before client demo, pushing in 15m.',
      directAction: 'Fix is verified locally; regression test passing. Pushing build #402 to staging in 15 minutes.',
    },
    suggestedReplies: [
      'Code is compiling—unless the server catches fire, staging is live at 11:00 AM.',
      'The delay was on our auth regression check. We caught the flaw before client demo, pushing in 15m.',
      'Fix is verified locally; regression test passing. Pushing build #402 to staging in 15 minutes.',
    ],
    tacticalAdvice: [
      'Lead with the exact timestamp. Under extreme pressure, adjectives look like excuses.',
      'Acknowledge the client visibility risk without getting defensive.',
      'Commit to immediate channel confirmation the second artifacts hit staging.'
    ],
    telemetryNotes: [
      {
        id: 'init_note_1',
        category: 'Commitment',
        label: 'Build #402 Staging Target',
        detail: 'Commitment to deliver staging deploy within 15 minutes (11:00 AM hard cutoff).',
        timestamp: '10:42 AM',
      },
      {
        id: 'init_note_2',
        category: 'Risk',
        label: 'Client Executive Escalation',
        detail: 'VP of client operations is actively pinging engineering leadership.',
        timestamp: '10:42 AM',
      },
      {
        id: 'init_note_3',
        category: 'Emotion',
        label: 'Executive Urgency',
        detail: 'Uncompromising tone; demands unambiguous milestone certainty.',
        timestamp: '10:42 AM',
      }
    ],
    telemetry: {
      latencyMs: 6.4,
      memoryMb: 19.2,
      accelerator: 'WebGPU (NPU/GPU)',
      privacyStatus: 'Shielded (Zero Network Data)',
      modelName: 'OmniWave-DualLane-v4',
    }
  });

  // Clock in status bar
  const [currentTime, setCurrentTime] = useState('9:41');
  useEffect(() => {
    testFirestoreConnection();
    const unsub = auth.onAuthStateChanged((u) => setCurrentUser(u));

    const updateTime = () => {
      const d = new Date();
      const hours = d.getHours();
      const mins = d.getMinutes();
      const formattedMins = mins < 10 ? `0${mins}` : mins;
      const formattedHours = hours % 12 || 12;
      setCurrentTime(`${formattedHours}:${formattedMins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, []);

  // Sync OmniVoice with HoloOrb kinetic phases
  useEffect(() => {
    const unsubVoice = omniVoice.subscribe((state) => {
      if (state === 'speaking') {
        setOrbPhase('talking');
      } else if (state === 'idle') {
        setOrbPhase((prev) => (prev === 'talking' ? 'idle' : prev));
      }
    });
    return unsubVoice;
  }, []);

  const triggerTypingState = useCallback(() => {
    setOrbPhase('texting');
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      setOrbPhase('idle');
    }, 1400);
  }, []);

  // Trigger Dual-Lane Viewport Cognition
  const analyzeActiveScreen = useCallback(async () => {
    setIsAnalyzing(true);
    setOrbPhase('analyzing');

    const screenContextText = `${currentScenario.name} - ${currentScenario.category} (${currentScenario.messages.map(m => m.text).join(' ')})`;
    const speaker = currentScenario.appHeader.title;

    try {
      const result = await onDeviceAI.processViewportCognition(
        screenContextText,
        currentDraftText,
        speaker
      );
      setAnalysisData(result);
      setLocalLatencyMs(result.telemetry.latencyMs);
      setOrbPhase('suggesting');
      return result;
    } catch (err) {
      console.error('Cognition failed:', err);
      setOrbPhase('idle');
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentScenario, currentDraftText]);

  // Handle switching scenario
  const handleSelectScenario = (scenario: ScreenScenario) => {
    setCurrentScenario(scenario);
    setCurrentDraftText(scenario.defaultDraft);
    setOrbPhase('observing');
    setTimeout(() => {
      analyzeActiveScreen();
    }, 180);
  };

  // Handle uploading custom screenshot
  const handleUploadScreenshot = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setCustomScreenshot(result);
      setOrbPhase('observing');
      setTimeout(() => {
        analyzeActiveScreen();
      }, 250);
    };
    reader.readAsDataURL(file);
  };

  // Toggle real screen sharing with getDisplayMedia
  const handleToggleLiveScreenSharing = async () => {
    if (isStreaming) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setStream(null);
      setIsStreaming(false);
      setOrbPhase('idle');
    } else {
      try {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          alert('Screen capture API is not supported on this browser/platform. You can still upload screenshots.');
          return;
        }

        const newStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });

        setStream(newStream);
        setIsStreaming(true);
        setOrbPhase('observing');

        newStream.getVideoTracks()[0].onended = () => {
          setIsStreaming(false);
          setStream(null);
          setOrbPhase('idle');
        };

        setTimeout(() => {
          analyzeActiveScreen();
        }, 900);
      } catch (err) {
        console.warn('Screen share canceled or denied:', err);
        setIsStreaming(false);
      }
    }
  };

  // Rewrite current text with target tone
  const handleRewrite = async (style: string) => {
    if (!currentDraftText.trim()) return;
    setIsAnalyzing(true);
    setOrbPhase('typing');

    try {
      const { rewritten, telemetry } = await onDeviceAI.rewriteLocally(
        currentDraftText,
        style as any
      );
      setCurrentDraftText(rewritten);
      setLocalLatencyMs(telemetry.latencyMs);
      setOrbPhase('suggesting');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Keyboard soft touch interactions
  const handleKeyPress = (char: string) => {
    setCurrentDraftText((prev) => prev + char);
    triggerTypingState();
  };

  const handleBackspace = () => {
    setCurrentDraftText((prev) => prev.slice(0, -1));
    triggerTypingState();
  };

  const handleSpace = () => {
    setCurrentDraftText((prev) => prev + ' ');
    triggerTypingState();
  };

  const isAutoModeRef = useRef(isAutoMode);
  isAutoModeRef.current = isAutoMode;

  const autoPilotToneRef = useRef(autoPilotTone);
  autoPilotToneRef.current = autoPilotTone;

  const lastAnsweredMsgIndexRef = useRef<number>(-1);

  const handleEnter = useCallback((text?: string, isAutoPilot = false) => {
    const final = text || currentDraftText;
    if (!final.trim()) return;

    setCurrentScenario((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          sender: 'me',
          text: final,
          time: 'Just now',
          isAutoPilot,
        },
      ],
    }));
    setCurrentDraftText('');
    setOrbPhase('suggesting');

    setTimeout(() => {
      analyzeActiveScreen();
    }, 450);
  }, [currentDraftText, analyzeActiveScreen]);

  // Trigger autonomous auto-dispatch with countdown
  const triggerAutoPilotDispatch = useCallback(
    (target: string, incomingContext: string, customReply?: string) => {
      const chosenReply =
        customReply ||
        analysisData.suggestionTrio[autoPilotToneRef.current] ||
        analysisData.suggestedReplies[0] ||
        'Locking in execution immediately.';

      setAutoDispatchTarget(target);
      setAutoDispatchPreviewText(chosenReply);
      setOrbPhase('auto');

      if (autoCountdownTimerRef.current) {
        clearInterval(autoCountdownTimerRef.current);
      }

      let count = 3;
      setAutoCountdown(count);

      autoCountdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setAutoCountdown(count);
        } else {
          clearInterval(autoCountdownTimerRef.current);
          setAutoCountdown(null);
          handleEnter(chosenReply, true);

          if (omniVoice.getVoiceEnabled()) {
            omniVoice.speak(chosenReply);
          }

          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setAnalysisData((prev) => ({
            ...prev,
            telemetryNotes: [
              {
                id: `auto_${Date.now()}`,
                category: 'Auto-Pilot',
                label: `Auto-Answered: ${target}`,
                detail: `Autonomous dispatch (${autoPilotToneRef.current.toUpperCase()}): "${chosenReply}"`,
                timestamp: nowStr,
              },
              ...prev.telemetryNotes,
            ],
          }));
        }
      }, 1000);
    },
    [analysisData, handleEnter]
  );

  const handleCancelAutoDispatch = useCallback(() => {
    if (autoCountdownTimerRef.current) {
      clearInterval(autoCountdownTimerRef.current);
    }
    setAutoCountdown(null);
    setOrbPhase('idle');
  }, []);

  const handleInstantAutoDispatch = useCallback(() => {
    if (autoCountdownTimerRef.current) {
      clearInterval(autoCountdownTimerRef.current);
    }
    const replyToSend =
      autoDispatchPreviewText ||
      analysisData.suggestionTrio[autoPilotTone] ||
      analysisData.suggestedReplies[0];
    setAutoCountdown(null);
    handleEnter(replyToSend, true);

    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAnalysisData((prev) => ({
      ...prev,
      telemetryNotes: [
        {
          id: `auto_${Date.now()}`,
          category: 'Auto-Pilot',
          label: `Instant Auto-Answer: ${autoDispatchTarget || 'Counterpart'}`,
          detail: `Manual override dispatch (${autoPilotTone.toUpperCase()}): "${replyToSend}"`,
          timestamp: nowStr,
        },
        ...prev.telemetryNotes,
      ],
    }));
  }, [autoDispatchPreviewText, analysisData, autoPilotTone, autoDispatchTarget, handleEnter]);

  // Toggle Auto Mode
  const handleToggleAutoMode = useCallback(() => {
    setIsAutoMode((prev) => {
      const next = !prev;
      if (next) {
        setOrbPhase('auto');
        // Reset answered index to trigger on any unhandled incoming message immediately
        lastAnsweredMsgIndexRef.current = -1;
      } else {
        if (autoCountdownTimerRef.current) {
          clearInterval(autoCountdownTimerRef.current);
        }
        setAutoCountdown(null);
        setOrbPhase('idle');
      }
      return next;
    });
  }, []);

  // Continuous Auto-Pilot Watcher: Automatically answers subsequent incoming messages without manual toggling
  useEffect(() => {
    if (!isAutoMode) return;
    const msgs = currentScenario.messages;
    const lastIdx = msgs.length - 1;
    if (lastIdx < 0) return;
    const lastMsg = msgs[lastIdx];

    if (lastMsg && lastMsg.sender === 'them' && lastAnsweredMsgIndexRef.current !== lastIdx) {
      lastAnsweredMsgIndexRef.current = lastIdx;

      const timer = setTimeout(async () => {
        const res = await analyzeActiveScreen();
        const toneKey = autoPilotToneRef.current;
        const candidate = res?.suggestionTrio?.[toneKey] || res?.suggestedReplies?.[0] || 'Acknowledged and proceeding.';
        triggerAutoPilotDispatch(currentScenario.appHeader.title, lastMsg.text, candidate);
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [currentScenario.messages, isAutoMode, currentScenario.appHeader.title, analyzeActiveScreen, triggerAutoPilotDispatch]);

  // Simulate new incoming counterpart message for testing Auto Mode
  const handleSimulateIncomingMessage = useCallback(() => {
    const counterpartReplies: Record<string, string[]> = {
      work_slack: [
        'Client VP is pinging me again. What is our fallback plan if staging isn’t stable by 11:00?',
        'Can you confirm when the database migration script completes on staging?',
        'Team lead asked if the health check endpoints are logging 200 OK?',
        'Understood. How soon can we notify the client that everything is live?',
      ],
      dating_hinge: [
        'Haha deal! Next question: what is your go-to midnight creative playlist when you are locked in the lab?',
        'Are you more of an impulsive road trip person or meticulous planner?',
        'What is your favorite late-night spot in the city when you need inspiration?',
      ],
      client_dispute: [
        'Can you confirm in writing that our payment gateway won’t incur any recurring penalty for this charge?',
        'Thank you for looking into this. Please send the adjusted invoice as soon as finance approves.',
        'Is there any other line item we should review before signing off on the audit?',
      ],
      terminal_bug: [
        'Crash monitor ping: port 8080 reporting high connection drop rate. Check auth middleware overhead.',
        'Core dump written to /var/log/crash.log. Session validation taking >400ms.',
        'High memory watermark hit on pod 3. Should we trigger automated pod restart?',
      ],
    };

    const options = counterpartReplies[currentScenario.id] || [
      'Hey, got a quick second to sync on our next steps?',
      'Just following up on your last update, let me know when ready.',
      'Could you confirm the next milestone timing?',
    ];
    const randomReply = options[Math.floor(Math.random() * options.length)];

    setCurrentScenario((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          sender: 'them',
          text: randomReply,
          time: 'Just now',
        },
      ],
    }));

    setOrbPhase('observing');
  }, [currentScenario.id]);

  const handleLoadIntoScreenSimulator = (title: string, body: string, sender: string) => {
    const customScenario: ScreenScenario = {
      id: `screen_${Date.now()}`,
      name: title,
      category: 'Workspace',
      icon: FolderOpen,
      appHeader: {
        title: sender,
        subtitle: title,
        avatar: '✉️',
        badge: 'WORKSPACE',
      },
      messages: [
        {
          sender: 'them',
          text: body,
          time: 'Just now',
        },
      ],
      contextHint: `Real-time context from ${title}. Inspecting live dialogue.`,
      defaultDraft: '',
    };
    setCurrentScenario(customScenario);
    setActiveTab('keyboard');
    setOrbPhase('observing');
    setTimeout(() => {
      analyzeActiveScreen();
    }, 250);
  };

  const activeScreenName = isStreaming
    ? 'Live Screen Broadcast'
    : customScreenshot
    ? 'Uploaded Screen Image'
    : currentScenario.name;

  return (
    <div className="min-h-screen bg-[#000000] text-slate-100 flex flex-col items-center justify-center p-0 sm:p-4 select-none">
      <OfflineIndicator />

      {/* TOP DESKTOP CONTROLS BAR (Desktop only) */}
      <div className={`w-full transition-all duration-300 ${phoneFrameMode ? 'max-w-[430px]' : 'max-w-6xl'} hidden sm:flex items-center justify-between mb-2 px-2 text-xs font-mono text-slate-400`}>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#00f2fe] animate-pulse shadow-[0_0_8px_#00f2fe]" />
            <span className="font-bold text-white tracking-wider text-xs">Omni AI</span>
            <span className="px-1.5 py-0.5 rounded text-[8px] bg-[#00f2fe]/10 border border-[#00f2fe]/30 text-[#00f2fe]">
              PC Sync (⌘⇧K)
            </span>
          </div>
          <span className="text-[8.5px] font-mono text-slate-400 tracking-wider">
            Dark Misfit Studios
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDesktopOverlayActive(!isDesktopOverlayActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono transition ${
              isDesktopOverlayActive
                ? 'bg-[#00f2fe] text-black border-[#00f2fe] font-bold shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                : 'bg-[#0B0B0C] border-white/10 hover:border-[#00f2fe]/40 text-slate-300 hover:text-white'
            }`}
            title="Launch Floating Desktop Companion Overlay (⌘+Shift+K)"
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>{isDesktopOverlayActive ? 'Dock Active' : 'PC Overlay'}</span>
          </button>
          <button
            onClick={() => setPhoneFrameMode(!phoneFrameMode)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0B0B0C] border border-white/10 hover:border-[#00f2fe]/40 text-slate-300 hover:text-white transition"
            title="Toggle between phone bezel and full view"
          >
            {phoneFrameMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
            <span>{phoneFrameMode ? 'Full View' : 'Phone Bezel'}</span>
          </button>
          <PWAInstallButton variant="compact" />
        </div>
      </div>

      {/* MAIN PHONE CONTAINER - Pure Matte Black (#000000) Foundation */}
      <div
        className={`w-full flex flex-col bg-[#000000] overflow-hidden transition-all duration-300 ${
          phoneFrameMode
            ? 'sm:max-w-[430px] sm:h-[min(860px,calc(100dvh-44px))] sm:rounded-[44px] sm:border-[8px] sm:border-[#0B0B0C] sm:shadow-[0_0_80px_rgba(0,242,254,0.18),0_0_120px_rgba(127,0,255,0.15)] sm:ring-1 sm:ring-[#00f2fe]/40'
            : 'max-w-6xl w-full h-[100dvh] rounded-none sm:rounded-2xl border-0 sm:border sm:border-white/10'
        } relative h-[100dvh]`}
      >
        {/* 3D Gyro-Responsive UI Overlay Canvas */}
        <OmniVoidBackground />

        {/* 1. NATIVE MOBILE STATUS BAR & HARDWARE NOTCH */}
        <div className={`px-4 sm:px-6 flex items-center justify-between bg-[#000000] font-mono font-semibold text-slate-400 shrink-0 z-30 transition-all ${
          activeTab === 'studios' && selectedStudio === 'motion' ? 'pt-1 pb-0.5 text-[10px]' : 'pt-2 pb-1 text-[11px]'
        }`}>
          <span>{currentTime}</span>

          {/* Dynamic Island / Hardware Notch */}
          <div className="w-24 h-4 bg-[#0B0B0C] rounded-full flex items-center justify-center gap-2 border border-white/10 shadow-inner px-2">
            <div className="w-2 h-2 rounded-full bg-black border border-slate-700" />
            <div className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-[#00f2fe] animate-pulse' : 'bg-[#7f00ff]'}`} />
          </div>

          <div className="flex items-center gap-1.5 text-slate-400">
            <Wifi className="w-3 h-3 text-[#00f2fe]" />
            <Battery className="w-3.5 h-3.5 text-slate-300" />
          </div>
        </div>

        {/* 2. APP HEADER: PERMANENT TOP-LEFT STUDIOS TOGGLE & 3D HOLO ORB & DARK MISFIT STUDIOS BRANDING */}
        {!(activeTab === 'studios' && selectedStudio === 'motion') && (
        <header className="px-3 py-2 bg-[#0B0B0C] border-b border-white/10 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2">
            {/* Permanent top-left studio toggle button */}
            <button
              onClick={() => setIsStudiosSidebarOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-gradient-to-r from-cyan-950/70 to-indigo-950/70 border border-cyan-500/40 text-cyan-300 hover:border-cyan-400 hover:text-white transition shadow-sm active:scale-95"
              title="Open Studios Drawer (14 Creative Engines)"
            >
              <Menu className="w-4 h-4 text-[#00f2fe]" />
              <span className="text-[10px] font-mono font-bold tracking-wider hidden xs:inline">Studios</span>
            </button>

            {/* Authentic Three.js 3D HoloOrb */}
            <div className="flex items-center gap-2 pl-0.5">
              <HoloOrb phase={orbPhase} size="sm" onClick={() => analyzeActiveScreen()} />
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5 leading-none">
                  <h1 className="text-xs font-bold tracking-wider font-mono text-white">
                    Omni <span className="text-[#00f2fe]">AI</span>
                  </h1>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f2fe] animate-ping" />
                </div>
                <span className="text-[8.5px] font-mono tracking-wider text-slate-400 mt-0.5">
                  Dark Misfit Studios
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Action Cockpit */}
          <div className="flex items-center gap-1">
            {/* Quick OmniAI Companion Toggle Button */}
            <button
              onClick={() => setIsCompanionOpen(!isCompanionOpen)}
              className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[9.5px] font-mono font-bold transition ${
                isCompanionOpen
                  ? 'bg-cyan-500/25 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                  : 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 hover:text-white'
              }`}
              title="Toggle OmniAI Companion Panel (Available throughout phone app)"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xs:inline">OMNI</span>
            </button>

            {/* Quick Voice Toggle */}
            <button
              onClick={() => {
                const next = omniVoice.toggleVoice();
                setIsVoiceEnabled(next);
                if (next) {
                  omniVoice.speak('Omni voice link active.');
                }
              }}
              className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[9.5px] font-mono font-bold transition ${
                isVoiceEnabled
                  ? 'bg-[#00f2fe]/15 border border-[#00f2fe]/40 text-[#00f2fe] shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                  : 'bg-[#0B0B0C] border border-white/10 text-slate-500 hover:text-white'
              }`}
              title={isVoiceEnabled ? 'OmniVoice Active (Click to mute)' : 'OmniVoice Muted (Click to enable)'}
            >
              {isVoiceEnabled ? <Volume2 className="w-3 h-3 text-[#00f2fe] animate-pulse" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
              <span className="hidden xs:inline">{isVoiceEnabled ? 'VOICE' : 'MUTE'}</span>
            </button>

            {/* Live Real-Time Phone Call Button */}
            <button
              onClick={() => setIsLiveCallOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9.5px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition shadow-[0_0_10px_rgba(16,185,129,0.25)]"
              title="Launch Live Phone Call Mode with Voice Cloning Takeover"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>CALL</span>
            </button>

            {/* Quick Auto Mode Toggle */}
            <button
              onClick={handleToggleAutoMode}
              className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[9.5px] font-mono font-bold transition ${
                isAutoMode
                  ? 'bg-gradient-to-r from-[#00f2fe]/20 to-[#7f00ff]/30 border border-[#00f2fe] text-[#00f2fe] shadow-[0_0_12px_rgba(0,242,254,0.4)] animate-pulse'
                  : 'bg-[#0B0B0C] border border-white/10 text-slate-400 hover:text-white'
              }`}
              title="Toggle Autonomous Auto-Pilot Mode (Omni answers for you)"
            >
              <Zap className={`w-3 h-3 ${isAutoMode ? 'text-[#00f2fe] animate-bounce' : 'text-slate-500'}`} />
              <span className="hidden xs:inline">{isAutoMode ? 'AUTO: ON' : 'AUTO'}</span>
            </button>

            {/* Train Like Me Persona Calibration Button */}
            <button
              onClick={() => setIsAutoPilotSetupOpen(true)}
              className="px-1.5 py-1 rounded-lg text-[9.5px] font-mono font-bold bg-[#6c63ff]/15 border border-[#6c63ff]/40 text-[#a594fd] hover:bg-[#6c63ff]/25 transition"
              title="Train Like Me: Persona Calibration & Voice Cloning"
            >
              <span>TRAIN</span>
            </button>

            {/* OmniCore HUD Button */}
            <button
              onClick={() => setIsTelemetryHUDOpen(!isTelemetryHUDOpen)}
              className="p-1.5 rounded-lg text-[10px] font-mono font-bold bg-[#00f2fe]/10 border border-[#00f2fe]/40 text-[#00f2fe] shadow-[0_0_10px_rgba(0,242,254,0.2)] hover:bg-[#00f2fe]/20 transition"
              title="OmniCore Telemetry"
              aria-label="OmniCore Telemetry"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>

            {/* Global Vault Drawer Button */}
            <button
              onClick={() => setIsVaultOpen(true)}
              className="p-1.5 rounded-lg text-[10px] font-mono font-bold bg-purple-500/10 border border-purple-500/40 text-purple-300 hover:bg-purple-500/20 transition"
              title="Open Global Vault Media Library"
            >
              <FolderLock className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>
        )}

        {/* 3. MAIN TAB CONTENT AREA */}
        <main className="flex-1 overflow-hidden relative flex flex-col bg-[#000000]">
          {/* SLIDE-UP JARVIS TELEMETRY HUD CARD */}
          <JarvisTelemetryHUD
            isOpen={isTelemetryHUDOpen}
            onClose={() => setIsTelemetryHUDOpen(false)}
            activeScreenTitle={activeScreenName}
            detectedSpeaker={analysisData.counterpartDossier}
            emotionalRegister={analysisData.emotionalRegister}
            telemetryNotes={analysisData.telemetryNotes}
            latencyMs={localLatencyMs}
            npuAccelerator={analysisData.telemetry.accelerator}
            onClearNotes={() => setAnalysisData(prev => ({ ...prev, telemetryNotes: [] }))}
          />

          {/* TAB 1: THE AUTHENTIC KEYBOARD COMMAND STATION */}
          {activeTab === 'keyboard' && (
            <div className="flex flex-col h-full justify-between overflow-hidden">
              {/* Host viewport display where AI watches screen live */}
              <div className="flex-1 overflow-hidden p-2">
                <SimulatedAppView
                  currentScenario={currentScenario}
                  onSelectScenario={handleSelectScenario}
                  customScreenshot={customScreenshot}
                  onUploadScreenshot={handleUploadScreenshot}
                  onClearCustomScreenshot={() => setCustomScreenshot(null)}
                  isLiveScreenSharing={isStreaming}
                  onToggleLiveScreenSharing={handleToggleLiveScreenSharing}
                  currentDraftText={currentDraftText}
                  onSimulateIncomingMessage={handleSimulateIncomingMessage}
                  isAutoMode={isAutoMode}
                  onOpenLiveCall={() => setIsLiveCallOpen(true)}
                  onOpenAutoPilotSetup={() => setIsAutoPilotSetupOpen(true)}
                />
              </div>

              {/* Keyboard AI Bar + Volumetric 3D Soft Keyboard */}
              <div className="shrink-0 flex flex-col">
                <AIKeyboardBar
                  currentText={currentDraftText}
                  onChangeText={setCurrentDraftText}
                  onSend={handleEnter}
                  suggestedReplies={analysisData.suggestedReplies}
                  suggestionTrio={analysisData.suggestionTrio}
                  liveAdvice={analysisData.tacticalAdvice}
                  onSelectSuggestion={(reply) => setCurrentDraftText(reply)}
                  onRewrite={handleRewrite}
                  onRequestInstantAdvice={() => analyzeActiveScreen()}
                  isAnalyzing={isAnalyzing}
                  orbPhase={orbPhase}
                  screenName={activeScreenName}
                  isOnDeviceMode={isOnDeviceMode}
                  onToggleOnDeviceMode={() => setIsOnDeviceMode(!isOnDeviceMode)}
                  localLatencyMs={localLatencyMs}
                  onOpenTelemetryHUD={() => setIsTelemetryHUDOpen(!isTelemetryHUDOpen)}
                  telemetryNotesCount={analysisData.telemetryNotes.length}
                  isAutoMode={isAutoMode}
                  onToggleAutoMode={handleToggleAutoMode}
                  autoPilotTone={autoPilotTone}
                  onChangeAutoPilotTone={setAutoPilotTone}
                  autoCountdown={autoCountdown}
                  onCancelAutoDispatch={handleCancelAutoDispatch}
                  onInstantAutoDispatch={handleInstantAutoDispatch}
                  autoDispatchTarget={autoDispatchTarget}
                  autoDispatchPreviewText={autoDispatchPreviewText}
                  onQuickAction={(actionId) => {
                    setOrbPhase('typing');
                    setTimeout(() => setOrbPhase('suggesting'), 800);
                  }}
                  onOpenAutoPilotSetup={() => setIsAutoPilotSetupOpen(true)}
                />

                <SoftKeyboard
                  onKeyPress={handleKeyPress}
                  onBackspace={handleBackspace}
                  onEnter={() => handleEnter()}
                  onSpace={handleSpace}
                  isCollapsed={isKeyboardCollapsed}
                  onToggleCollapse={() => setIsKeyboardCollapsed(!isKeyboardCollapsed)}
                />
              </div>
            </div>
          )}

          {/* TAB 2: GEMINI CHATBOT & MULTI-LLM COUNCIL MODE */}
          {activeTab === 'chat' && (
            <div className="h-full overflow-hidden flex flex-col">
              <OmniChatAndCouncil
                onInsertToKeyboard={(text) => {
                  setCurrentDraftText(text);
                  setActiveTab('keyboard');
                }}
              />
            </div>
          )}

          {/* TAB 3: OMNI STUDIOS (14 CREATIVE ENGINES) */}
          {activeTab === 'studios' && (
            <OmniStudiosView
              selectedStudio={selectedStudio}
              onSelectStudio={(id) => setSelectedStudio(id)}
              onBackToHome={() => setActiveTab('keyboard')}
              onOpenSidebar={() => setIsStudiosSidebarOpen(true)}
              onOpenCompanion={() => setIsCompanionOpen(true)}
              onInsertToKeyboard={(text) => {
                setCurrentDraftText(text);
                setActiveTab('keyboard');
              }}
              currentScreenName={activeScreenName}
            />
          )}

          {/* TAB 4: SCREEN VISION HUD */}
          {activeTab === 'vision' && (
            <ScreenVisionHUD
              stream={stream}
              isStreaming={isStreaming}
              onStartStreaming={handleToggleLiveScreenSharing}
              onStopStreaming={handleToggleLiveScreenSharing}
              onManualScan={() => analyzeActiveScreen()}
              isAnalyzing={isAnalyzing}
              analysisData={analysisData}
              onApplyReply={(reply) => {
                setCurrentDraftText(reply);
                setActiveTab('keyboard');
              }}
              activeScreenName={activeScreenName}
            />
          )}

          {/* TAB 5: WORKSPACE HUB */}
          {activeTab === 'workspace' && (
            <WorkspaceHub
              onInsertToKeyboard={(text) => {
                setCurrentDraftText(text);
                setActiveTab('keyboard');
              }}
              onLoadIntoScreenSimulator={handleLoadIntoScreenSimulator}
              onSaveToVault={handleSaveToVault}
            />
          )}

          {/* TAB 6: EXTENSION BRIDGE */}
          {activeTab === 'extension' && (
            <KeyboardExtensionBridge />
          )}

          {/* TAB 7: PC SYNC BRIDGE */}
          {activeTab === 'sync' && (
            <DesktopSyncBridge
              onInsertToKeyboard={(text) => {
                setCurrentDraftText(text);
                setActiveTab('keyboard');
              }}
              onToggleDesktopOverlay={() => setIsDesktopOverlayActive(!isDesktopOverlayActive)}
              isDesktopOverlayActive={isDesktopOverlayActive}
            />
          )}

          {/* TAB 8: MOBILE SETUP GUIDE */}
          {activeTab === 'setup' && (
            <MobileSetupGuide
              onTestKeyboard={() => setActiveTab('keyboard')}
            />
          )}

          {/* TAB 9: ADMIN CONSOLE */}
          {activeTab === 'admin' && (
            <div className="h-full overflow-y-auto">
              <AdminHub />
            </div>
          )}
        </main>

        {/* 4. MOBILE BOTTOM TAB NAVIGATION BAR (Hidden during OmniMotion studio editing for authentic CapCut full-height experience) */}
        {!(activeTab === 'studios' && selectedStudio === 'motion') && (
        <nav className="h-14 bg-[#0B0B0C] border-t border-white/10 flex items-center justify-around px-2 shrink-0 z-30 pb-[env(safe-area-inset-bottom)]">
          {/* Enhanced Keys Button: Toggles Keyboard Show/Hide */}
          <button
            onClick={() => {
              if (activeTab !== 'keyboard') {
                setActiveTab('keyboard');
                setIsKeyboardCollapsed(false);
              } else {
                setIsKeyboardCollapsed((prev) => !prev);
              }
            }}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
              activeTab === 'keyboard' && !isKeyboardCollapsed
                ? 'text-[#00f2fe] font-bold drop-shadow-[0_0_8px_rgba(0,242,254,0.5)]'
                : activeTab === 'keyboard' && isKeyboardCollapsed
                ? 'text-cyan-400/60 font-semibold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title={
              activeTab === 'keyboard'
                ? isKeyboardCollapsed
                  ? 'Show Keyboard'
                  : 'Hide Keyboard'
                : 'Open Keyboard'
            }
          >
            <KeyboardIcon className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-mono">
              {activeTab === 'keyboard' && isKeyboardCollapsed ? 'Keys: Off' : 'Keys'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('vision')}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all relative ${
              activeTab === 'vision'
                ? 'text-[#00f2fe] font-bold drop-shadow-[0_0_8px_rgba(0,242,254,0.5)]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Screen Vision Cognition"
          >
            <Eye className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-mono">Vision</span>
            {isStreaming && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-[#00f2fe] animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('workspace')}
            className={`flex flex-col items-center justify-center w-14 py-1 rounded-xl transition-all ${
              activeTab === 'workspace'
                ? 'text-[#00f2fe] font-bold drop-shadow-[0_0_8px_rgba(0,242,254,0.5)]'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Google Workspace (Drive, Gmail, Keep)"
          >
            <FolderOpen className="w-4 h-4 mb-0.5" />
            <span className="text-[9px] font-mono">Workspace</span>
          </button>
        </nav>
        )}

        {/* 4.5. PERSISTENT OMNIAI COMPANION TRIGGER (Available throughout phone app, including inside all 14 studios) */}
        {activeTab !== 'chat' && !(activeTab === 'studios' && selectedStudio === 'motion') && (
          <button
            type="button"
            onClick={() => setIsCompanionOpen(true)}
            className="absolute right-3.5 bottom-16 sm:bottom-18 z-40 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-950/90 via-slate-900/90 to-indigo-950/90 border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.35)] active:scale-95 transition-all group backdrop-blur-md"
            title="Open OmniAI Slide-Out Companion"
          >
            <div className="w-4 h-4 rounded-full bg-black/90 flex items-center justify-center shrink-0 border border-cyan-500/40">
              <Sparkles className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
            </div>
            <span className="text-[10px] font-mono font-bold tracking-wider text-white group-hover:text-cyan-300">
              OmniAI
            </span>
            {activeTab === 'studios' && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            )}
          </button>
        )}

        {/* Slide-out Persistent OmniAI Companion Panel */}
        <OmniCompanionPanel
          isOpen={isCompanionOpen}
          onClose={() => setIsCompanionOpen(false)}
          onOpenFullChat={() => {
            setIsCompanionOpen(false);
            setActiveTab('chat');
          }}
          currentStudioName={activeTab === 'studios' ? (studioMeta[selectedStudio]?.name || 'Studio') : undefined}
          currentStudioTag={activeTab === 'studios' ? (studioMeta[selectedStudio]?.tag || '') : undefined}
        />

        {/* 5. NATIVE MOBILE HOME INDICATOR BAR */}
        <div className={`w-full flex justify-center shrink-0 ${
          activeTab === 'studios' && selectedStudio === 'motion' ? 'pb-0.5 pt-0.5 bg-[#0B0B0C]' : 'pb-1 pt-0.5 bg-[#0B0B0C]'
        }`}>
          <div className="w-28 h-1 rounded-full bg-slate-800" />
        </div>
      </div>

      {/* 6. SYSTEM-WIDE FLOATING COMPANION WIDGET (OMNI KEY • DARK MISFIT STUDIOS) */}
      <DesktopFloatingWidget
        isOpen={isDesktopOverlayActive}
        onToggle={() => setIsDesktopOverlayActive(!isDesktopOverlayActive)}
        phoneDraftText={currentDraftText}
        onSendToPhone={(text) => setCurrentDraftText(text)}
        onSelectSuggestion={(text) => setCurrentDraftText(text)}
        activeScreenName={activeScreenName}
        isAutoMode={isAutoMode}
        onToggleAutoMode={handleToggleAutoMode}
        autoPilotTone={autoPilotTone}
      />

      {/* 7. PERMANENT STUDIOS SIDEBAR DRAWER (Accessible anytime from top-left toggle) */}
      <OmniStudiosSidebar
        isOpen={isStudiosSidebarOpen}
        onClose={() => setIsStudiosSidebarOpen(false)}
        selectedStudio={selectedStudio}
        onSelectStudio={(id) => {
          setSelectedStudio(id);
          setActiveTab('studios');
          setIsStudiosSidebarOpen(false);
        }}
        onOpenOmniAIChat={() => {
          setActiveTab('chat');
          setIsStudiosSidebarOpen(false);
        }}
        onOpenSettings={() => {
          setIsAdminModalOpen(true);
          setIsStudiosSidebarOpen(false);
        }}
        onOpenVault={() => {
          setIsVaultOpen(true);
          setIsStudiosSidebarOpen(false);
        }}
      />

      {/* 8. GLOBAL VAULT ASSETS DRAWER */}
      <VaultAssetsDrawer
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        assets={vaultAssets}
        onAddCustomAsset={handleSaveToVault}
        onInsertToKeyboard={(text) => {
          setCurrentDraftText(text);
          setActiveTab('keyboard');
          setIsVaultOpen(false);
        }}
      />

      {/* 9. SETTINGS & ADMIN CONSOLE MODAL */}
      {isAdminModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6 animate-in fade-in">
          <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#090b14] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 bg-[#07090f] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-sm text-white">Omni Settings & Admin Hub</span>
                <span className="text-[10px] font-mono text-slate-400">• Dark Misfit Studios</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !hapticFeedback;
                    setHapticFeedback(next);
                    localStorage.setItem('omni_haptic_enabled', String(next));
                    if (next && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                      try { navigator.vibrate(14); } catch {}
                    }
                    window.dispatchEvent(new CustomEvent('omni_haptic_changed', { detail: { enabled: next } }));
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition ${
                    hapticFeedback
                      ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-[0_0_8px_rgba(0,242,254,0.2)]'
                      : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
                  }`}
                  title={hapticFeedback ? 'Disable 3D Keyboard Vibration' : 'Enable 3D Keyboard Vibration'}
                >
                  <Zap className={`w-3.5 h-3.5 ${hapticFeedback ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className="hidden xs:inline">3D Haptics:</span>
                  <span className="font-bold">{hapticFeedback ? 'ON' : 'OFF'}</span>
                </button>
                <button
                  onClick={() => setIsAdminModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  title="Close Settings"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AdminHub />
            </div>
          </div>
        </div>
      )}

      {/* 10. REAL-TIME PHONE CALL INTEGRATION VIEW */}
      <LiveCallView
        isOpen={isLiveCallOpen}
        onClose={() => setIsLiveCallOpen(false)}
        caller={liveCallCaller}
        onInsertToKeyboard={(text) => setCurrentDraftText(text)}
      />

      {/* 11. TRAIN LIKE ME & VOICE CLONING ONBOARDING MODAL */}
      <OmniAutoPilotSetupModal
        isOpen={isAutoPilotSetupOpen}
        onClose={() => setIsAutoPilotSetupOpen(false)}
        onSaveProfile={(profile) => {
          if (profile?.voiceSettings) {
            console.log('[OmniAutoPilot] Saved Voice Profile:', profile.voiceSettings);
          }
        }}
      />
    </div>
  );
}
