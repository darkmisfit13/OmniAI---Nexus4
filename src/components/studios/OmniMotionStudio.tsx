import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Scissors, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Sliders, 
  Download, 
  Layers, 
  Type, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Check, 
  Maximize2, 
  Minimize2,
  Wand2, 
  FastForward, 
  Rewind,
  Music, 
  Film, 
  ZoomIn, 
  ZoomOut,
  Clock,
  Radio,
  Folder,
  FolderOpen,
  Clipboard,
  Eraser,
  Tv,
  CheckCircle2,
  RefreshCw,
  Copy,
  SlidersHorizontal,
  Bot,
  Zap,
  Mic,
  Activity,
  X,
  Sticker,
  Search,
  ChevronDown,
  Crop,
  Layers as LayersIcon,
  Smile,
  UserCheck,
  FileText,
  Video,
  CornerDownLeft,
  ChevronLeft,
  Flame,
  Gauge,
  Magnet
} from 'lucide-react';
import { HoloOrb, OrbPhase } from '../HoloOrb';
import { omniVoice } from '../../lib/omniVoice';
import { CapCutTimeline } from './CapCutTimeline';

export interface VideoClip {
  id: string;
  name: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  color: string;
  type: 'video' | 'audio' | 'text' | 'fx';
  thumbnailUrl?: string;
  speed: number;
  volume: number;
  text?: string;
  filter?: string;
}

// 10 Cinematic LUT Presets
export const CINEMATIC_LUTS = [
  { id: 'normal', name: 'Original Raw', css: 'none', tag: 'Standard' },
  { id: 'cyber_neon', name: 'Cyber Neon', css: 'saturate(180%) contrast(135%) hue-rotate(185deg)', tag: 'Nocturnal' },
  { id: 'teal_orange', name: 'Teal & Orange', css: 'contrast(125%) saturate(140%) sepia(20%) hue-rotate(170deg)', tag: 'Hollywood' },
  { id: 'film_noir', name: 'Film Noir', css: 'grayscale(100%) contrast(175%) brightness(90%)', tag: 'Classic' },
  { id: 'vintage_70s', name: 'Vintage 70s', css: 'sepia(55%) contrast(115%) brightness(95%) saturate(125%)', tag: 'Retro' },
  { id: 'glitch_90s', name: 'Glitch 90s', css: 'contrast(160%) hue-rotate(90deg) saturate(170%)', tag: 'Vapor' },
  { id: 'vhs_tape', name: 'VHS Analog', css: 'contrast(110%) brightness(105%) saturate(130%) sepia(15%)', tag: 'Tape' },
  { id: 'matrix_green', name: 'Matrix Code', css: 'hue-rotate(85deg) contrast(140%) saturate(150%)', tag: 'Sci-Fi' },
  { id: 'warm_sunset', name: 'Warm Amber', css: 'sepia(30%) saturate(150%) brightness(105%)', tag: 'Golden Hour' },
  { id: 'duotone', name: 'Duotone Cyber', css: 'contrast(150%) saturate(160%) hue-rotate(270deg)', tag: 'Stylized' },
];

// Preset B-Roll Snippets for Quick-Insert
export const BROLL_SNIPPETS = [
  { id: 'broll-1', title: 'Cyber City Tokyo Drive', duration: 4.5, thumb: '/assets/filmstrip/thumb_01.jpg', type: 'video' as const, color: 'from-cyan-600 to-blue-700' },
  { id: 'broll-2', title: 'Neon Rain Reflections', duration: 3.8, thumb: '/assets/filmstrip/thumb_03.jpg', type: 'video' as const, color: 'from-purple-600 to-indigo-800' },
  { id: 'broll-3', title: 'Quantum Core Hologram', duration: 5.0, thumb: '/assets/filmstrip/thumb_05.jpg', type: 'video' as const, color: 'from-fuchsia-600 to-pink-800' },
  { id: 'sfx-1', title: 'Phonk 808 Bass Drop (freebeat.ai)', duration: 4.0, type: 'audio' as const, color: 'from-emerald-600 to-teal-800' },
  { id: 'sfx-2', title: 'Cinematic Sub Whoosh & Impact', duration: 2.2, type: 'audio' as const, color: 'from-amber-600 to-orange-800' },
];

// CapCut Transition Presets
export const CAPCUT_TRANSITIONS = [
  { id: 'dissolve', name: 'Dissolve', icon: '✨' },
  { id: 'white_flash', name: 'White Flash', icon: '⚡' },
  { id: 'black_fade', name: 'Fade to Black', icon: '🌑' },
  { id: 'glitch', name: 'VHS Glitch', icon: '👾' },
  { id: 'zoom_in', name: 'Zoom In 3D', icon: '🔍' },
  { id: 'whip_pan', name: 'Whip Pan Right', icon: '💨' },
];

interface OmniMotionStudioProps {
  onSaveToVault?: (asset: any) => void;
  onBackToHome?: () => void;
  onOpenSidebar?: () => void;
  onOpenCompanion?: () => void;
}

export const OmniMotionStudio: React.FC<OmniMotionStudioProps> = ({ 
  onSaveToVault,
  onBackToHome,
  onOpenSidebar,
  onOpenCompanion
}) => {
  // 1. Playback & Timeline State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(3.0);
  const [totalDuration, setTotalDuration] = useState(7.0);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1' | '4:5'>('9:16');
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState(1.2);
  const [showWaveform, setShowWaveform] = useState(true);
  const [selectedClipId, setSelectedClipId] = useState<string | null>('clip-1');
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 2. Cross-Platform Cloud State Persistence
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [lastDeviceSource, setLastDeviceSource] = useState('iPhone 16 Pro (Mobile Client)');
  const [handoffToast, setHandoffToast] = useState<string | null>('Original sounds of all clips unmuted');

  // 3. Modals & Drawers
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [folderTab, setFolderTab] = useState<'effects' | 'beat_sync' | 'snippets' | 'overlays' | 'voice_studio'>('beat_sync');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showResolutionPopover, setShowResolutionPopover] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<'AI UHD' | '4K' | '2K' | '1080P' | '720P'>('AI UHD');
  const [exportFps, setExportFps] = useState<30 | 60>(60);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [activeTransitionClipIndex, setActiveTransitionClipIndex] = useState<number | null>(null);
  const [showSpeedModal, setShowSpeedModal] = useState(false);
  const [clipSpeed, setClipSpeed] = useState<number>(1.0);
  const [speedCurvePreset, setSpeedCurvePreset] = useState<'normal' | 'montage' | 'hero' | 'bullet'>('normal');
  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [clipVolume, setClipVolume] = useState<number>(100);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [showAiClipperModal, setShowAiClipperModal] = useState(false);

  // 4. Advanced Effects & LUTs
  const [selectedLUT, setSelectedLUT] = useState<string>('normal');
  const [lutIntensity, setLutIntensity] = useState<number>(100);

  // 5. Next-Gen AI Removal & Enhancement Tools
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiStatusMessage, setAiStatusMessage] = useState('Omni AI Video Engine Ready');
  const [orbPhase, setOrbPhase] = useState<OrbPhase>('idle');
  const [superResActive, setSuperResActive] = useState<boolean>(true);
  const [backgroundMode, setBackgroundMode] = useState<'original' | 'alpha' | 'cyber_void' | 'studio_gradient' | 'tokyo_neon'>('original');
  const [erasedObjectBadge, setErasedObjectBadge] = useState<string | null>(null);

  // 5.5. AI-Driven Beat-Sync & Rhythm Engine (freebeat.ai integration)
  const [isBeatSyncActive, setIsBeatSyncActive] = useState<boolean>(true);
  const [beatBpm, setBeatBpm] = useState<number>(140);
  const [beatSensitivity, setBeatSensitivity] = useState<'tight' | 'balanced' | 'drops'>('balanced');
  const [beatMarkers, setBeatMarkers] = useState<number[]>([
    0.85, 1.71, 2.57, 3.43, 4.29, 5.14, 6.00, 6.86
  ]);
  const [downbeats, setDownbeats] = useState<number[]>([
    1.71, 3.43, 5.14, 6.86
  ]);
  const [magneticSnapping, setMagneticSnapping] = useState<boolean>(true);
  const [isAnalyzingBeats, setIsAnalyzingBeats] = useState<boolean>(false);
  const [beatSyncInsight, setBeatSyncInsight] = useState<string>(
    '140 BPM Phonk Rhythm Analyzed. 8 optimal beat-cut points detected with freebeat.ai sync.'
  );

  // 6. Voice-Cloning & Narration
  const [narrationScript, setNarrationScript] = useState('OmniMotion provides 100x faster editing speed without CapCut clutter.');
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);

  // 7. Text Overlays & Subtitles
  const [fontSize, setFontSize] = useState<number>(20);
  const [textAnimation, setTextAnimation] = useState<'karaoke' | 'pop' | 'glitch' | 'typewriter'>('karaoke');

  // 8. Video Tracks matching the screen recording (fairy video model)
  const [videoTrack, setVideoTrack] = useState<VideoClip[]>([
    {
      id: 'clip-1',
      name: 'Black Rose Winged Fairy - Part 1',
      startTime: 0,
      duration: 4.0,
      color: 'from-amber-600 to-rose-700',
      type: 'video',
      speed: 1.0,
      volume: 100,
      thumbnailUrl: '/assets/filmstrip/thumb_01.jpg',
      filter: 'Original Raw',
    },
    {
      id: 'clip-2',
      name: 'Black Rose Winged Fairy - Blow Kiss',
      startTime: 4.0,
      duration: 3.0,
      color: 'from-cyan-600 to-blue-700',
      type: 'video',
      speed: 1.0,
      volume: 100,
      thumbnailUrl: '/assets/filmstrip/thumb_05.jpg',
      filter: 'Original Raw',
    },
  ]);

  const [audioTrack, setAudioTrack] = useState<VideoClip[]>([
    {
      id: 'audio-1',
      name: 'Freebeat Phonk Rhythm 140BPM (freebeat.ai)',
      startTime: 0,
      duration: 7.0,
      color: 'from-emerald-600 to-teal-800',
      type: 'audio',
      speed: 1.0,
      volume: 90,
    },
  ]);

  const [textTrack, setTextTrack] = useState<VideoClip[]>([
    {
      id: 'text-1',
      name: 'CapCut Auto-Caption',
      startTime: 1.2,
      duration: 3.2,
      color: 'from-pink-600 to-rose-800',
      type: 'text',
      speed: 1.0,
      volume: 0,
      text: '✨ CAPCUT KILLER • 100X FASTER',
    },
  ]);

  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Video element reference
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Playback loop timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return Number((prev + 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Synchronize HTML5 video element with current time
  useEffect(() => {
    if (videoRef.current) {
      const v = videoRef.current;
      if (Math.abs(v.currentTime - currentTime) > 0.3) {
        v.currentTime = currentTime;
      }
      if (isPlaying && v.paused) {
        v.play().catch(() => {});
      } else if (!isPlaying && !v.paused) {
        v.pause();
      }
      v.muted = isMuted;
    }
  }, [currentTime, isPlaying, isMuted]);

  // Initial cloud state check on load
  useEffect(() => {
    const fetchCloudProject = async () => {
      try {
        const res = await fetch('/api/omnimotion/project');
        if (res.ok) {
          const data = await res.json();
          if (data.project) {
            setLastDeviceSource(data.project.lastDevice || 'iPhone 16 Pro (Mobile Client)');
          }
        }
      } catch (err) {
        console.warn('[OmniMotion] Local cache active');
      }
    };
    fetchCloudProject();
  }, []);

  // Continuous Cloud Persistence (Debounced auto-save)
  const autoSaveToCloud = useCallback(async () => {
    setCloudSyncStatus('saving');
    const projectPayload = {
      name: 'OmniMotion CapCut Project',
      lastDevice: typeof window !== 'undefined' && window.innerWidth > 768 ? 'MacBook Pro / Desktop Studio' : 'iPhone Mobile Client',
      currentTime,
      totalDuration,
      aspectRatio,
      timelineZoom,
      selectedLUT,
      lutIntensity,
      superResActive,
      backgroundMode,
      videoTrack,
      audioTrack,
      textTrack,
    };

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('omnimotion_active_project', JSON.stringify(projectPayload));
      } catch {}
    }

    try {
      await fetch('/api/omnimotion/project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectPayload),
      });
      setCloudSyncStatus('synced');
    } catch {
      setCloudSyncStatus('offline');
    }
  }, [currentTime, totalDuration, aspectRatio, timelineZoom, selectedLUT, lutIntensity, superResActive, backgroundMode, videoTrack, audioTrack, textTrack]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      autoSaveToCloud();
    }, 2500);
    return () => clearTimeout(timeout);
  }, [autoSaveToCloud]);

  // Instant Device Handoff: "Pick up right where you left off"
  const handlePerformInstantHandoff = async () => {
    setIsAiProcessing(true);
    setOrbPhase('analyzing');
    setAiStatusMessage('Connecting to Omni Cloud Handoff Stream...');

    try {
      const res = await fetch('/api/omnimotion/project');
      if (res.ok) {
        const data = await res.json();
        if (data.project) {
          const p = data.project;
          setCurrentTime(p.currentTime || 3.0);
          if (p.totalDuration) setTotalDuration(p.totalDuration);
          if (p.aspectRatio) setAspectRatio(p.aspectRatio);
          if (p.videoTrack) setVideoTrack(p.videoTrack);
          if (p.audioTrack) setAudioTrack(p.audioTrack);
          if (p.textTrack) setTextTrack(p.textTrack);
          if (p.lutEffect) setSelectedLUT(p.lutEffect.toLowerCase().replace(/\s+/g, '_'));

          setHandoffToast(`BAM! Restored timeline & assets right where you left off from ${p.lastDevice}!`);
          setTimeout(() => setHandoffToast(null), 4000);
        }
      }
    } catch {
      setCurrentTime(3.0);
      setHandoffToast('BAM! Restored timeline & playhead (00:03.0) right where you left off!');
      setTimeout(() => setHandoffToast(null), 4000);
    } finally {
      setIsAiProcessing(false);
      setOrbPhase('idle');
      setAiStatusMessage('Timeline Synced across Cloud Devices');
    }
  };

  // 1-Click "Snap Video to Music Peaks"
  const handleSnapClipsToBeats = () => {
    if (!beatMarkers.length) {
      handleAnalyzeBeats();
      return;
    }

    let currentStart = 0;
    const snappedClips: VideoClip[] = videoTrack.map((clip, index) => {
      const targetEndCandidates = beatMarkers.filter((m) => m > currentStart + 1.0);
      let targetEnd = targetEndCandidates.length > 0 
        ? targetEndCandidates[Math.min(index + 1, targetEndCandidates.length - 1)]
        : currentStart + clip.duration;
      
      if (index === videoTrack.length - 1 && targetEndCandidates.length > 0) {
        targetEnd = targetEndCandidates[targetEndCandidates.length - 1];
      }

      const newDuration = Math.max(1.5, Number((targetEnd - currentStart).toFixed(1)));
      const snapped: VideoClip = {
        ...clip,
        startTime: Number(currentStart.toFixed(1)),
        duration: newDuration,
      };
      currentStart = Number((currentStart + newDuration).toFixed(1));
      return snapped;
    });

    setVideoTrack(snappedClips);
    setHandoffToast('⚡ 1-CLICK SUCCESS: Video segments snapped to music peaks!');
    setTimeout(() => setHandoffToast(null), 3500);
  };

  // Split Clip Tool (Scissors)
  const handleSplitClip = () => {
    const clipIndex = videoTrack.findIndex((c) => c.id === selectedClipId);
    if (clipIndex === -1) {
      // If no clip selected, split the one at current playhead
      const targetIndex = videoTrack.findIndex((c) => currentTime > c.startTime && currentTime < c.startTime + c.duration);
      if (targetIndex !== -1) {
        performSplitAtIndex(targetIndex);
      }
      return;
    }
    performSplitAtIndex(clipIndex);
  };

  const performSplitAtIndex = (clipIndex: number) => {
    const clip = videoTrack[clipIndex];
    if (currentTime > clip.startTime && currentTime < clip.startTime + clip.duration) {
      const firstDuration = currentTime - clip.startTime;
      const secondDuration = clip.duration - firstDuration;

      const firstClip: VideoClip = {
        ...clip,
        duration: Number(firstDuration.toFixed(1)),
      };
      const secondClip: VideoClip = {
        ...clip,
        id: `clip-${Date.now()}`,
        name: `${clip.name} (Split)`,
        startTime: Number(currentTime.toFixed(1)),
        duration: Number(secondDuration.toFixed(1)),
      };

      const updated = [...videoTrack];
      updated.splice(clipIndex, 1, firstClip, secondClip);
      setVideoTrack(updated);
      setSelectedClipId(secondClip.id);
      setHandoffToast(`Split clip at ${formatTime(currentTime)}`);
      setTimeout(() => setHandoffToast(null), 2500);
    }
  };

  // Delete Clip
  const handleDeleteSelectedClip = () => {
    if (!selectedClipId) return;
    setVideoTrack((prev) => prev.filter((c) => c.id !== selectedClipId));
    setSelectedClipId(null);
    setHandoffToast('Clip deleted from track');
    setTimeout(() => setHandoffToast(null), 2000);
  };

  // Duplicate Clip
  const handleDuplicateClip = () => {
    const clip = videoTrack.find((c) => c.id === selectedClipId);
    if (!clip) return;
    const newClip: VideoClip = {
      ...clip,
      id: `clip-dup-${Date.now()}`,
      name: `${clip.name} (Copy)`,
      startTime: Number((clip.startTime + clip.duration).toFixed(1)),
    };
    setVideoTrack((prev) => [...prev, newClip]);
    setTotalDuration((d) => Math.max(d, newClip.startTime + newClip.duration));
    setSelectedClipId(newClip.id);
    setHandoffToast('Clip duplicated!');
    setTimeout(() => setHandoffToast(null), 2000);
  };

  // Reverse Clip
  const handleReverseClip = () => {
    setHandoffToast('Applying reverse playback render...');
    setTimeout(() => {
      setHandoffToast('Video clip reversed!');
      setTimeout(() => setHandoffToast(null), 2000);
    }, 800);
  };

  // Freeze Frame
  const handleFreezeFrame = () => {
    handleSplitClip();
    setHandoffToast('Freeze frame 3.0s inserted!');
    setTimeout(() => setHandoffToast(null), 2000);
  };

  // Update Clip (Trimming duration or adjusting startTime with magnetic beat snap)
  const handleUpdateClip = (clipId: string, updates: Partial<VideoClip>) => {
    setVideoTrack((prev) =>
      prev.map((c) => (c.id === clipId ? { ...c, ...updates } : c))
    );
    if (updates.duration) {
      setHandoffToast(`Clip trimmed to ${updates.duration}s`);
      setTimeout(() => setHandoffToast(null), 1500);
    }
  };

  // AI Rhythm Analysis via Backend API
  const handleAnalyzeBeats = async (customBpm?: number, customSensitivity?: 'tight' | 'balanced' | 'drops') => {
    setIsAnalyzingBeats(true);
    setOrbPhase('analyzing');
    const targetBpm = customBpm || beatBpm;
    const targetSens = customSensitivity || beatSensitivity;

    try {
      const res = await fetch('/api/omnimotion/beat-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioTitle: audioTrack[0]?.name || 'Dark Phonk 140BPM (freebeat.ai)',
          baseBpm: targetBpm,
          duration: totalDuration,
          sensitivity: targetSens,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.cutPoints?.length) {
          setBeatMarkers(data.cutPoints);
          if (data.downbeats?.length) setDownbeats(data.downbeats);
          if (data.aiInsight) setBeatSyncInsight(data.aiInsight);
          setHandoffToast(`Beat-Sync: Detected ${data.cutPoints.length} rhythm peaks at ${targetBpm} BPM!`);
          setTimeout(() => setHandoffToast(null), 3500);
          return;
        }
      }
    } catch (err) {
      console.warn('[BeatSync] Local fallback computation used');
    }

    const secondsPerBeat = 60 / targetBpm;
    const factor = targetSens === 'tight' ? 1 : targetSens === 'drops' ? 4 : 2;
    const interval = secondsPerBeat * factor;
    const newCuts: number[] = [];
    const newDownbeats: number[] = [];
    for (let t = Number(secondsPerBeat.toFixed(2)); t < totalDuration; t += interval) {
      newCuts.push(Number(t.toFixed(2)));
    }
    for (let t = Number(secondsPerBeat.toFixed(2)); t < totalDuration; t += secondsPerBeat * 4) {
      newDownbeats.push(Number(t.toFixed(2)));
    }
    setBeatMarkers(newCuts);
    setDownbeats(newDownbeats);
    setHandoffToast(`Beat-Sync: Calculated ${newCuts.length} rhythm peaks at ${targetBpm} BPM!`);
    setTimeout(() => setHandoffToast(null), 3500);
    setIsAnalyzingBeats(false);
    setOrbPhase('idle');
  };

  // Voice Studio Narration (Speech Synthesis using User's Cloned Voice Profile)
  const handleGenerateVoiceNarration = () => {
    if (!narrationScript.trim()) return;
    setIsGeneratingVoice(true);
    setOrbPhase('talking');

    const pitch = parseFloat(localStorage.getItem('omni_clone_pitch') || '1.0');
    const rate = parseFloat(localStorage.getItem('omni_clone_rate') || '1.05');

    const newNarrationClip: VideoClip = {
      id: `narration-${Date.now()}`,
      name: `Voice Clone: "${narrationScript.slice(0, 20)}..."`,
      startTime: currentTime,
      duration: Math.max(3.0, Number((narrationScript.length / 14).toFixed(1))),
      color: 'from-cyan-600 to-indigo-800',
      type: 'audio',
      speed: 1.0,
      volume: 100,
    };
    setAudioTrack((prev) => [...prev, newNarrationClip]);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(narrationScript);
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.onend = () => {
        setIsGeneratingVoice(false);
        setOrbPhase('idle');
      };
      utterance.onerror = () => {
        setIsGeneratingVoice(false);
        setOrbPhase('idle');
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setIsGeneratingVoice(false);
        setOrbPhase('idle');
      }, 2000);
    }

    setHandoffToast('Voice clone narration track placed onto timeline!');
    setTimeout(() => setHandoffToast(null), 3000);
  };

  // Time formatter (00:03)
  const formatTime = (timeInSec: number) => {
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Active LUT CSS filter
  const activeLUTCSS = CINEMATIC_LUTS.find((l) => l.id === selectedLUT)?.css || 'none';

  return (
    <div className="h-full w-full max-w-full overflow-hidden flex flex-col bg-[#0b0a14] text-slate-100 font-sans select-none relative">
      
      {/* 1. AUTHENTIC CAPCUT TOP NAVIGATION BAR */}
      <div className="h-10 sm:h-11 px-2.5 sm:px-3 bg-[#110f1d] border-b border-white/10 flex items-center justify-between shrink-0 z-40">
        
        {/* Left: Close (`✕`), Studio Selector (`Studios`), Search (`🔍`) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => {
              if (onBackToHome) {
                onBackToHome();
              } else {
                setCurrentTime(0);
                setSelectedClipId(null);
                setHandoffToast('Project timeline reset');
                setTimeout(() => setHandoffToast(null), 1500);
              }
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95"
            title="Exit Studio / Back to OmniAI"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/60 hover:border-cyan-400 text-cyan-300 text-[10px] font-mono transition active:scale-95 shadow-sm"
              title="Switch Studio (14 Creative Engines)"
            >
              <LayersIcon className="w-3 h-3 text-cyan-400" />
              <span className="hidden xs:inline">Studios</span>
            </button>
          )}

          <button 
            onClick={() => {
              setIsFolderOpen(true);
              setFolderTab('effects');
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition active:scale-95"
            title="Search Effects, LUTs & Audio"
          >
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Center: Resolution Dropdown (`AI UHD ▾`) & Instant Cloud Sync status */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative">
          <button
            onClick={() => setShowResolutionPopover(!showResolutionPopover)}
            className="px-2.5 sm:px-3 py-0.5 rounded-full bg-[#1b182a] hover:bg-[#25213b] border border-white/15 text-white font-mono text-[10.5px] sm:text-xs font-bold flex items-center gap-1 shadow active:scale-95 transition"
            title="Change Project Resolution & Frame Rate"
          >
            <span>{selectedResolution}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Cloud Sync badge with instant device handoff */}
          <button
            onClick={handlePerformInstantHandoff}
            className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#6c63ff]/20 text-[#a594fd] border border-[#6c63ff]/30 text-[9.5px] font-mono hover:bg-[#6c63ff]/30 transition"
            title="Instant Cloud State Sync: Pick up right where you left off"
          >
            <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
            <span className="truncate max-w-[120px]">{lastDeviceSource.split(' ')[0]} Synced</span>
          </button>

          {/* Resolution Picker Popover */}
          {showResolutionPopover && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-48 bg-[#181528] border border-white/15 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 space-y-1 font-mono text-xs">
              <span className="text-[9px] uppercase font-bold text-slate-400 px-2 block mb-1">Canvas Resolution</span>
              {(['AI UHD', '4K', '2K', '1080P', '720P'] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => {
                    setSelectedResolution(res);
                    setShowResolutionPopover(false);
                    setHandoffToast(`Video canvas resolution set to ${res}`);
                    setTimeout(() => setHandoffToast(null), 2000);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between transition ${
                    selectedResolution === res ? 'bg-[#00d2c4] text-slate-950 font-bold' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span>{res}</span>
                  {selectedResolution === res && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Companion + Vibrant Teal `Export` Button (Authentic CapCut Teal `#00d2c4`) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {onOpenCompanion && (
            <button
              onClick={onOpenCompanion}
              className="px-2 py-0.5 rounded-full bg-[#6c63ff]/20 hover:bg-[#6c63ff]/35 border border-[#6c63ff]/40 text-[#a594fd] hover:text-white text-[9.5px] font-mono font-bold flex items-center gap-1 transition"
              title="Open OmniAI Studio Companion"
            >
              <Sparkles className="w-3 h-3 text-[#00d2c4]" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>
          )}

          <button
            onClick={() => setShowExportModal(true)}
            className="px-3 sm:px-4 py-1 rounded-full bg-[#00d2c4] hover:bg-[#00f2e0] text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-[#00d2c4]/25 active:scale-95 transition"
            title="Export Master Video"
          >
            Export
          </button>
        </div>

      </div>

      {/* IN-PREVIEW CAPCUT TOAST BANNER (Matching video "Original sounds of all clips unmuted") */}
      {handoffToast && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1 rounded-full bg-black/85 text-white border border-white/20 text-[11px] font-medium flex items-center gap-2 shadow-2xl backdrop-blur-md animate-in fade-in duration-150">
          <span className="text-emerald-400">●</span>
          <span>{handoffToast}</span>
        </div>
      )}

      {/* 2. MAIN PREVIEW VIEWPORT + OVERLAY */}
      <div className={`flex-1 min-h-0 w-full flex flex-col items-center justify-center p-1 sm:p-2 bg-[#080710] relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 p-4 bg-black/95 backdrop-blur-md' : ''}`}>
        
        {/* Fullscreen Exit Button */}
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-50 px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 shadow-2xl flex items-center gap-1.5 text-xs font-mono font-bold active:scale-95 transition"
          >
            <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Exit Fullscreen</span>
          </button>
        )}

        {/* Aspect Ratio Monitor Frame */}
        <div 
          style={{ maxHeight: '100%', maxWidth: '100%' }}
          className={`relative rounded-xl overflow-hidden bg-black shadow-2xl flex items-center justify-center transition-all duration-200 max-h-full max-w-full ${
            aspectRatio === '9:16' ? 'h-full aspect-[9/16]' : 
            aspectRatio === '16:9' ? 'w-full max-h-full aspect-video' : 
            aspectRatio === '1:1' ? 'h-full aspect-square' : 
            'h-full aspect-[4/5]'
          } ${selectedClipId ? 'border-2 border-[#00d2c4] ring-2 ring-[#00d2c4]/40 shadow-[0_0_24px_rgba(0,210,196,0.3)]' : 'border border-white/15'}`}
        >
          {/* Background Replacement Layer */}
          {backgroundMode === 'cyber_void' && (
            <div className="absolute inset-0 bg-gradient-to-b from-[#0b0a14] via-[#1a0b2e] to-black opacity-90" />
          )}
          {backgroundMode === 'tokyo_neon' && (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-900 via-slate-950 to-black" />
          )}

          {/* Main Video Element with Footage from ScreenRecording */}
          <div 
            className="relative w-full h-full overflow-hidden flex items-center justify-center"
            style={{
              filter: `${activeLUTCSS} ${superResActive ? 'contrast(106%) brightness(102%)' : ''}`,
            }}
          >
            <video
              ref={videoRef}
              src="/assets/aistudio/ScreenRecording_10-22-2026_06-31-59_1_6c948d8f.mp4"
              playsInline
              loop
              className="w-full h-full object-cover select-none"
              poster="/assets/filmstrip/thumb_01.jpg"
              onClick={() => setIsPlaying(!isPlaying)}
            />

            {/* Subtitle / Caption Overlay */}
            {textTrack.map((sub) => {
              const isCurrent = currentTime >= sub.startTime && currentTime <= sub.startTime + sub.duration;
              if (!isCurrent) return null;
              return (
                <div
                  key={sub.id}
                  className="absolute bottom-10 left-3 right-3 text-center pointer-events-none z-20 animate-in zoom-in-95 duration-100"
                >
                  <span 
                    style={{ fontSize: `${fontSize}px` }}
                    className="px-2.5 py-1 rounded-xl bg-black/85 text-white font-black font-mono tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] border border-white/10 uppercase"
                  >
                    {sub.text}
                  </span>
                </div>
              );
            })}

            {/* 4K 60FPS AI Upscale Badge */}
            {superResActive && (
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-[#00d2c4]/20 text-[#00d2c4] border border-[#00d2c4]/40 text-[8.5px] font-mono font-bold flex items-center gap-1 backdrop-blur-sm">
                <Sparkles className="w-2.5 h-2.5" /> 4K 60FPS
              </div>
            )}

            {/* Social Media Safe Zones */}
            {showSafeZone && (
              <div className="absolute inset-0 pointer-events-none border border-dashed border-cyan-400/40 flex flex-col justify-between p-2">
                <span className="text-[7.5px] font-mono text-cyan-400/70">SAFE MARGIN (HEADER)</span>
                <span className="text-[7.5px] font-mono text-cyan-400/70 text-right">REELS/TIKTOK CAPTION SAFE</span>
              </div>
            )}
          </div>

          {/* AI Processing Overlay */}
          {isAiProcessing && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-[#a594fd] font-mono text-xs gap-3 z-30">
              <div className="w-8 h-8 rounded-full border-2 border-[#00d2c4] border-t-transparent animate-spin" />
              <span>{aiStatusMessage}</span>
            </div>
          )}
        </div>

      </div>

      {/* 3. CAPCUT HUD ROW (Below Preview / Above Timeline) */}
      <div className="h-8 sm:h-9 px-3 sm:px-4 bg-[#0e0c18] border-t border-white/10 flex items-center justify-between text-xs font-mono shrink-0 z-30">
        
        {/* Left: Fullscreen toggle & Timecode (`00:03 / 00:07`) */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="text-slate-400 hover:text-white transition"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <span className="text-slate-300 font-mono font-medium text-[11px] sm:text-xs">
            {formatTime(currentTime)} <span className="text-slate-600">/</span> {formatTime(totalDuration)}
          </span>
        </div>

        {/* Center: Play / Pause Button (`▶`) */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full bg-white text-slate-950 flex items-center justify-center font-bold shadow-md hover:scale-105 active:scale-95 transition"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" />}
        </button>

        {/* Right: Keyframe / Magnet Snap ON & Undo & Redo */}
        <div className="flex items-center gap-2">
          {/* Keyframe / Magnet Snap Button */}
          <button
            onClick={() => {
              setMagneticSnapping(!magneticSnapping);
              setHandoffToast(magneticSnapping ? 'Snapping OFF' : 'Magnetic Beat Snap ON');
              setTimeout(() => setHandoffToast(null), 1500);
            }}
            className={`flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded transition ${
              magneticSnapping ? 'text-cyan-300 bg-cyan-950/40 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Beat Magnetic Snapping"
          >
            <Magnet className="w-3 h-3" />
            <span className="text-[8.5px]">SNAP</span>
          </button>

          {/* Undo */}
          <button 
            onClick={() => {
              setHandoffToast('Undo action');
              setTimeout(() => setHandoffToast(null), 1200);
            }}
            className="text-slate-400 hover:text-white transition" 
            title="Undo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Redo */}
          <button 
            onClick={() => {
              setHandoffToast('Redo action');
              setTimeout(() => setHandoffToast(null), 1200);
            }}
            className="text-slate-400 hover:text-white transition" 
            title="Redo"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 4. TOUCH-FRIENDLY MULTI-TRACK TIMELINE SLIDER (CapCut style) */}
      <CapCutTimeline
        currentTime={currentTime}
        totalDuration={totalDuration}
        videoTrack={videoTrack}
        audioTrack={audioTrack}
        textTrack={textTrack}
        selectedClipId={selectedClipId}
        timelineZoom={timelineZoom}
        isBeatSyncActive={isBeatSyncActive}
        beatMarkers={beatMarkers}
        downbeats={downbeats}
        magneticSnapping={magneticSnapping}
        showWaveform={showWaveform}
        isMuted={isMuted}
        onTimeChange={(time) => setCurrentTime(time)}
        onSelectClip={(clipId) => setSelectedClipId(clipId)}
        onSplitClip={handleSplitClip}
        onToggleMute={() => {
          setIsMuted(!isMuted);
          setHandoffToast(isMuted ? 'Clips audio unmuted' : 'Original sounds of all clips muted');
          setTimeout(() => setHandoffToast(null), 2000);
        }}
        onAddAudio={() => {
          setIsFolderOpen(true);
          setFolderTab('snippets');
        }}
        onAddText={() => {
          setIsFolderOpen(true);
          setFolderTab('overlays');
        }}
        onAddVideoClip={() => {
          setIsFolderOpen(true);
          setFolderTab('snippets');
        }}
        onOpenTransitionPicker={(idx) => {
          setActiveTransitionClipIndex(idx);
          setShowTransitionModal(true);
        }}
        onOpenCoverEditor={() => setShowCoverModal(true)}
        onOpenAiClipper={() => setShowAiClipperModal(true)}
        onSnapFeedback={(beat) => {
          setHandoffToast(`⚡ Snapped on 140BPM Beat (${formatTime(beat)})`);
          setTimeout(() => setHandoffToast(null), 1500);
        }}
        onUpdateClip={handleUpdateClip}
        onToggleMagneticSnapping={() => {
          setMagneticSnapping(!magneticSnapping);
          setHandoffToast(magneticSnapping ? 'Snapping OFF' : 'Magnetic Beat Snap ON');
          setTimeout(() => setHandoffToast(null), 1500);
        }}
        onZoomChange={(zoom) => setTimelineZoom(zoom)}
      />

      {/* 5. FLOATING AI COPILOT ACTION BUTTON (Bottom-Left Teal Circle) */}
      <button
        onClick={() => {
          setIsFolderOpen(!isFolderOpen);
          setFolderTab('beat_sync');
        }}
        className="absolute bottom-14 left-2.5 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#00d2c4] to-[#6c63ff] text-slate-950 flex items-center justify-center shadow-xl shadow-[#00d2c4]/30 z-40 active:scale-90 hover:scale-105 transition border border-white/20"
        title="Open Omni AI Video Copilot"
      >
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
      </button>

      {/* 6. AUTHENTIC CAPCUT BOTTOM DOCKING TOOLBAR (DYNAMIC 2-TIER) */}
      <div className="h-12 sm:h-14 px-2 bg-[#100e1b] border-t border-white/10 flex items-center overflow-x-auto no-scrollbar shrink-0 z-30 select-none">
        
        {/* TIER 1: WHEN A CLIP IS SELECTED (Matches frames 25s & 35s!) */}
        {selectedClipId ? (
          <div className="flex items-center gap-1 sm:gap-2 min-w-max">
            {/* Back Arrow button `<` to return to main menu */}
            <button
              onClick={() => setSelectedClipId(null)}
              className="p-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white flex items-center gap-1 transition"
              title="Deselect clip"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Split */}
            <button
              onClick={handleSplitClip}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-cyan-300 transition"
            >
              <Scissors className="w-4 h-4 text-cyan-300" />
              <span className="text-[10px]">Split</span>
            </button>

            {/* Speed */}
            <button
              onClick={() => setShowSpeedModal(true)}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Gauge className="w-4 h-4 text-amber-400" />
              <span className="text-[10px]">Speed</span>
            </button>

            {/* Beats (Flag icon from CapCut!) */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('beat_sync');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-amber-400 transition"
            >
              <Zap className="w-4 h-4 text-amber-400 fill-current" />
              <span className="text-[10px]">Beats</span>
            </button>

            {/* AI Video (Eraser, Super-Res, BG Remove) */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('effects');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-cyan-400 transition"
            >
              <Wand2 className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px]">AI video</span>
            </button>

            {/* Crop */}
            <button
              onClick={() => {
                const nextRatio = aspectRatio === '9:16' ? '16:9' : aspectRatio === '16:9' ? '1:1' : '9:16';
                setAspectRatio(nextRatio);
                setHandoffToast(`Aspect ratio set to ${nextRatio}`);
                setTimeout(() => setHandoffToast(null), 1500);
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Crop className="w-4 h-4" />
              <span className="text-[10px]">Crop</span>
            </button>

            {/* Volume */}
            <button
              onClick={() => setShowVolumeModal(true)}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-[10px]">Volume</span>
            </button>

            {/* Duplicate */}
            <button
              onClick={handleDuplicateClip}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Copy className="w-4 h-4" />
              <span className="text-[10px]">Duplicate</span>
            </button>

            {/* Reverse */}
            <button
              onClick={handleReverseClip}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <FastForward className="w-4 h-4 rotate-180" />
              <span className="text-[10px]">Reverse</span>
            </button>

            {/* Freeze */}
            <button
              onClick={handleFreezeFrame}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Pause className="w-4 h-4" />
              <span className="text-[10px]">Freeze</span>
            </button>

            {/* Enhance Voice (User trained voice clone integration) */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('voice_studio');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-cyan-400 transition"
            >
              <Mic className="w-4 h-4 text-[#00d2c4]" />
              <span className="text-[10px]">Voice clone</span>
            </button>

            {/* Delete */}
            <button
              onClick={handleDeleteSelectedClip}
              className="p-1.5 px-2.5 rounded-xl hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 flex flex-col items-center gap-0.5 transition"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-[10px]">Delete</span>
            </button>
          </div>
        ) : (
          /* TIER 2: MAIN CAPCUT BOTTOM NAVIGATION (Matches frame 02s!) */
          <div className="flex items-center gap-1 sm:gap-2.5 min-w-max">
            {/* Edit (Scissors) */}
            <button
              onClick={() => setSelectedClipId('clip-1')}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Scissors className="w-4 h-4 text-cyan-300" />
              <span className="text-[10px]">Edit</span>
            </button>

            {/* Audio */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('snippets');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Music className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px]">Audio</span>
            </button>

            {/* Text */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('overlays');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Type className="w-4 h-4 text-pink-400" />
              <span className="text-[10px]">Text</span>
            </button>

            {/* Effects */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('effects');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-[10px]">Effects</span>
            </button>

            {/* Overlay */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('snippets');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <LayersIcon className="w-4 h-4" />
              <span className="text-[10px]">Overlay</span>
            </button>

            {/* Captions */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('overlays');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <FileText className="w-4 h-4 text-pink-400" />
              <span className="text-[10px]">Captions</span>
            </button>

            {/* Filters */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('effects');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px]">Filters</span>
            </button>

            {/* Adjust */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('effects');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Sliders className="w-4 h-4" />
              <span className="text-[10px]">Adjust</span>
            </button>

            {/* Stickers */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('overlays');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-white transition"
            >
              <Smile className="w-4 h-4 text-yellow-300" />
              <span className="text-[10px]">Stickers</span>
            </button>

            {/* AI Avatar */}
            <button
              onClick={() => {
                setIsFolderOpen(true);
                setFolderTab('voice_studio');
              }}
              className="p-1.5 px-2.5 rounded-xl hover:bg-white/10 flex flex-col items-center gap-0.5 text-slate-300 hover:text-[#00d2c4] transition"
            >
              <UserCheck className="w-4 h-4 text-[#00d2c4]" />
              <span className="text-[10px]">AI avatar</span>
            </button>

            {/* 1-Click Beat Snap Shortcut */}
            <button
              onClick={handleSnapClipsToBeats}
              className="p-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:text-white flex items-center gap-1 text-[11px] font-bold transition shadow"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>Snap Beats</span>
            </button>
          </div>
        )}

      </div>

      {/* 7. SLIDING COLLAPSIBLE COMMAND DRAWER (`📁`) */}
      {isFolderOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-[#12101f] border-l border-white/15 flex flex-col justify-between overflow-hidden shadow-2xl z-50 animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="p-3 bg-[#0c0a15] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#00d2c4]" />
              <span className="text-xs font-bold text-white uppercase font-mono">OmniMotion Command Drawer</span>
            </div>
            <button 
              onClick={() => setIsFolderOpen(false)}
              className="p-1 px-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono font-bold flex items-center gap-1 active:scale-95 transition"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>

          {/* Drawer Tabs */}
          <div className="p-1.5 border-b border-white/10 grid grid-cols-5 gap-1 bg-[#090812]">
            {[
              { id: 'beat_sync', label: 'Beats', icon: Music },
              { id: 'effects', label: 'LUTs/FX', icon: SlidersHorizontal },
              { id: 'snippets', label: 'B-Roll', icon: Clipboard },
              { id: 'overlays', label: 'Captions', icon: Type },
              { id: 'voice_studio', label: 'Voice', icon: Mic },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = folderTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFolderTab(tab.id as any)}
                  className={`py-2 px-1 rounded-xl text-[10px] font-mono font-bold flex flex-col items-center gap-1 transition ${
                    active
                      ? tab.id === 'beat_sync'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                        : 'bg-[#00d2c4] text-slate-950 shadow-md shadow-[#00d2c4]/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Drawer Body Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
            
            {/* TAB 1: AI BEAT-SYNC ENGINE (freebeat.ai integration) */}
            {folderTab === 'beat_sync' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/10 border border-amber-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 fill-current text-amber-400 animate-pulse" />
                      freebeat.ai Rhythm Engine
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                      {beatBpm} BPM
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-300 font-sans leading-relaxed">
                    AI analyzes background music waveform rhythm and highlights yellow beat nodes for 100% magnetic video cuts.
                  </p>
                </div>

                {/* 1-Click Snap Button */}
                <button
                  onClick={handleSnapClipsToBeats}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 active:scale-95 transition"
                >
                  <Zap className="w-4 h-4 fill-current text-slate-950" />
                  <span>1-Click Snap Video to Music Peaks</span>
                </button>

                {/* BPM Calibration Selector */}
                <div className="space-y-1.5 p-3 rounded-xl bg-black/60 border border-white/10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-bold">Rhythm Tempo (BPM):</span>
                    <span className="text-amber-400 font-bold">{beatBpm} BPM</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[120, 130, 140, 150].map((bpm) => (
                      <button
                        key={bpm}
                        onClick={() => {
                          setBeatBpm(bpm);
                          handleAnalyzeBeats(bpm, beatSensitivity);
                        }}
                        className={`py-1.5 rounded-lg border text-center font-bold text-[11px] transition ${
                          beatBpm === bpm ? 'bg-amber-400 text-black border-amber-400' : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {bpm}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Beat-Sync Sensitivity */}
                <div className="space-y-1.5 p-3 rounded-xl bg-black/60 border border-white/10">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block mb-1">Auto-Beats Mode:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'tight', label: 'Tight', desc: 'Every 2 beats' },
                      { id: 'balanced', label: 'Balanced', desc: 'Downbeats (4)' },
                      { id: 'drops', label: 'Drops Only', desc: 'Heavy drops' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setBeatSensitivity(s.id as any);
                          handleAnalyzeBeats(beatBpm, s.id as any);
                        }}
                        className={`p-2 rounded-xl border text-left flex flex-col justify-between transition ${
                          beatSensitivity === s.id
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-md shadow-amber-500/20'
                            : 'bg-black/50 text-slate-400 border-white/10 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-bold block">{s.label}</span>
                        <span className="text-[8px] opacity-70 block">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Beat manually at playhead (like CapCut `+ Add beat`) */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!beatMarkers.includes(currentTime)) {
                        const newMarkers = [...beatMarkers, currentTime].sort((a, b) => a - b);
                        setBeatMarkers(newMarkers);
                        setHandoffToast(`Added custom beat marker at ${formatTime(currentTime)}`);
                        setTimeout(() => setHandoffToast(null), 2000);
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-black/60 hover:bg-white/10 border border-white/10 text-amber-300 text-xs font-bold flex items-center justify-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Beat Here</span>
                  </button>

                  <button
                    onClick={() => {
                      const filtered = beatMarkers.filter((m) => Math.abs(m - currentTime) > 0.2);
                      setBeatMarkers(filtered);
                      setHandoffToast('Removed nearby beat node');
                      setTimeout(() => setHandoffToast(null), 1500);
                    }}
                    className="py-2 px-3 rounded-xl bg-black/60 hover:bg-rose-950/40 border border-white/10 text-slate-400 hover:text-rose-400 text-xs transition"
                    title="Delete beat marker"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Recalibrate AI Rhythm */}
                <button
                  onClick={() => handleAnalyzeBeats()}
                  disabled={isAnalyzingBeats}
                  className="w-full py-2.5 rounded-xl bg-black/80 hover:bg-[#1a172a] border border-white/15 text-slate-300 text-xs font-mono flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingBeats ? 'animate-spin text-[#00d2c4]' : ''}`} />
                  <span>{isAnalyzingBeats ? 'Recalibrating Transients...' : 'Recalibrate Audio Waves'}</span>
                </button>
              </div>
            )}

            {/* TAB 2: ADVANCED EFFECTS & CINEMATIC LUTS */}
            {folderTab === 'effects' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-bold flex items-center gap-1">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#00d2c4]" /> 10 Cinematic LUTs
                  </span>
                  <span className="text-[10px] text-cyan-400">{selectedLUT.replace('_', ' ').toUpperCase()}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {CINEMATIC_LUTS.map((lut) => (
                    <button
                      key={lut.id}
                      onClick={() => setSelectedLUT(lut.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        selectedLUT === lut.id
                          ? 'bg-[#00d2c4]/20 border-[#00d2c4] text-white shadow-[0_0_12px_rgba(0,210,196,0.3)]'
                          : 'bg-[#0b0a14] hover:bg-[#1a1729] border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold text-white mb-0.5">{lut.name}</div>
                      <div className="text-[9px] text-[#00d2c4]">{lut.tag}</div>
                    </button>
                  ))}
                </div>

                {/* AI Tools */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <span className="text-[10px] uppercase text-[#00d2c4] font-bold block">AI Video Suite:</span>
                  
                  {/* Super-Res */}
                  <button
                    onClick={() => {
                      setSuperResActive(!superResActive);
                      setHandoffToast(superResActive ? 'Super-Res 4K disabled' : 'AI Super-Res 4K 60fps Enabled!');
                      setTimeout(() => setHandoffToast(null), 2500);
                    }}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-xs font-bold transition ${
                      superResActive ? 'bg-[#00d2c4]/20 text-[#00d2c4] border-[#00d2c4]' : 'bg-black/60 border-white/10 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#00d2c4]" />
                      <span>4K 60FPS AI Upscaler</span>
                    </div>
                    <span className="text-[10px]">{superResActive ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* Watermark Eraser */}
                  <button
                    onClick={() => {
                      setIsAiProcessing(true);
                      setTimeout(() => {
                        setIsAiProcessing(false);
                        setErasedObjectBadge('Watermark Erased');
                        setHandoffToast('Watermark inpainted and erased!');
                        setTimeout(() => setHandoffToast(null), 2500);
                      }, 1200);
                    }}
                    className="w-full p-2.5 rounded-xl bg-black/60 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center gap-2 text-xs font-bold transition"
                  >
                    <Eraser className="w-4 h-4 text-cyan-400" />
                    <span>AI Object & Watermark Eraser</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: B-ROLL SNIPPETS */}
            {folderTab === 'snippets' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-bold flex items-center gap-1">
                    <Clipboard className="w-3.5 h-3.5 text-cyan-400" /> B-Roll & Audio Snippets
                  </span>
                  <span className="text-[10px] text-slate-500">Tap to Drop</span>
                </div>

                <div className="space-y-2">
                  {BROLL_SNIPPETS.map((snippet) => (
                    <div
                      key={snippet.id}
                      onClick={() => {
                        if (snippet.type === 'video') {
                          const newClip: VideoClip = {
                            id: `clip-broll-${Date.now()}`,
                            name: snippet.title,
                            startTime: currentTime,
                            duration: snippet.duration,
                            color: snippet.color,
                            type: 'video',
                            speed: 1.0,
                            volume: 100,
                            thumbnailUrl: snippet.thumb,
                          };
                          setVideoTrack((prev) => [...prev, newClip]);
                        } else {
                          const newAudio: VideoClip = {
                            id: `audio-sfx-${Date.now()}`,
                            name: snippet.title,
                            startTime: currentTime,
                            duration: snippet.duration,
                            color: snippet.color,
                            type: 'audio',
                            speed: 1.0,
                            volume: 95,
                          };
                          setAudioTrack((prev) => [...prev, newAudio]);
                        }
                        setHandoffToast(`Added "${snippet.title}" at ${formatTime(currentTime)}`);
                        setTimeout(() => setHandoffToast(null), 2000);
                      }}
                      className="p-2.5 rounded-xl bg-black/60 hover:bg-[#1a1729] border border-white/10 hover:border-[#00d2c4]/40 cursor-pointer transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {snippet.thumb ? (
                          <img src={snippet.thumb} alt={snippet.title} className="w-9 h-9 rounded-lg object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                            <Music className="w-4 h-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white group-hover:text-[#00d2c4] block truncate">
                            {snippet.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {snippet.duration}s • {snippet.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-[#00d2c4] opacity-70 group-hover:opacity-100">
                        + Drop →
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 4: TEXT OVERLAYS & CAPTIONS */}
            {folderTab === 'overlays' && (
              <div className="space-y-3.5">
                <div className="space-y-2 p-3 rounded-xl bg-black/60 border border-white/10">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold">Subtitle Font Size:</span>
                    <span className="text-[#00d2c4] font-bold">{fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="38"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                    className="w-full accent-[#00d2c4] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Subtitle Template Presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase text-slate-400 font-bold block">Caption Animation Style:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'karaoke', label: '⚡ Karaoke Glow' },
                      { id: 'pop', label: '💥 Pop-In Punch' },
                      { id: 'glitch', label: '👾 Cyber Glitch' },
                      { id: 'typewriter', label: '⌨️ Terminal Type' },
                    ].map((anim) => (
                      <button
                        key={anim.id}
                        onClick={() => setTextAnimation(anim.id as any)}
                        className={`p-2 rounded-xl border text-xs font-bold text-left ${
                          textAnimation === anim.id ? 'bg-[#00d2c4] text-slate-950 border-[#00d2c4]' : 'bg-black/60 border-white/10 text-slate-300'
                        }`}
                      >
                        {anim.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Holographic Stickers */}
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <span className="text-[10px] uppercase text-[#00d2c4] font-bold block">Viral Stickers:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: '🔥 100x FASTER', tag: 'VELOCITY' },
                      { label: '⚡ CAPCUT KILLER', tag: 'OMNI CORE' },
                      { label: '🛡️ ZERO LAG', tag: 'HARDWARE' },
                      { label: '🚀 SHIPPED', tag: 'MILESTONE' },
                    ].map((stk, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const newStickerText: VideoClip = {
                            id: `stk-${Date.now()}-${idx}`,
                            name: stk.label,
                            startTime: currentTime,
                            duration: 3.0,
                            color: 'from-purple-600 to-indigo-800',
                            type: 'text',
                            speed: 1.0,
                            volume: 0,
                            text: stk.label,
                          };
                          setTextTrack((prev) => [...prev, newStickerText]);
                          setHandoffToast(`Added sticker "${stk.label}" at ${formatTime(currentTime)}`);
                          setTimeout(() => setHandoffToast(null), 2000);
                        }}
                        className="p-2 rounded-xl bg-black/60 hover:bg-[#1f1b33] border border-white/10 text-left"
                      >
                        <div className="text-xs font-bold text-white">{stk.label}</div>
                        <div className="text-[9px] text-cyan-400">{stk.tag}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: VOICE CLONING STUDIO */}
            {folderTab === 'voice_studio' && (
              <div className="space-y-3.5">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-[#00d2c4]/20 to-[#6c63ff]/20 border border-[#00d2c4]/40 flex items-center gap-2.5">
                  <Mic className="w-5 h-5 text-[#00d2c4] shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-white block">Trained Voice-Cloning Studio</span>
                    <span className="text-[10px] text-slate-400">Auto-narrates your video in your exact personal voice</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase text-slate-400 font-bold block">Narration Script:</label>
                  <textarea
                    rows={3}
                    value={narrationScript}
                    onChange={(e) => setNarrationScript(e.target.value)}
                    placeholder="Type video voiceover script..."
                    className="w-full p-2.5 bg-black/70 border border-white/10 focus:border-[#00d2c4] rounded-xl text-xs text-white placeholder-slate-500 outline-none leading-relaxed resize-none"
                  />
                  <button
                    onClick={handleGenerateVoiceNarration}
                    disabled={isGeneratingVoice || !narrationScript.trim()}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00d2c4] to-[#6c63ff] text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition disabled:opacity-50"
                  >
                    <Volume2 className="w-4 h-4" />
                    <span>{isGeneratingVoice ? 'Synthesizing Cloned Voice...' : 'Drop Cloned Narration onto Timeline'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Drawer Footer */}
          <div className="p-3 bg-[#090812] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-500">
            <span>OmniMotion CapCut v5.2</span>
            <button onClick={() => setIsFolderOpen(false)} className="text-slate-400 hover:text-white">
              Collapse Drawer ✕
            </button>
          </div>
        </div>
      )}

      {/* 8. SPEED CURVE & RAMP MODAL */}
      {showSpeedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#151224] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" /> Clip Speed & Velocity Curve
              </span>
              <button onClick={() => setShowSpeedModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Constant Speed:</span>
                <span className="text-[#00d2c4] font-bold text-sm">{clipSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={clipSpeed}
                onChange={(e) => setClipSpeed(parseFloat(e.target.value))}
                className="w-full accent-[#00d2c4] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />

              <div className="pt-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5">Velocity Curve Ramp:</span>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'normal', label: 'Standard Flat' },
                    { id: 'montage', label: 'Montage Ramp (0.5x → 2x)' },
                    { id: 'hero', label: 'Hero Action Peak' },
                    { id: 'bullet', label: 'Bullet Time Slow-Mo' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setSpeedCurvePreset(preset.id as any)}
                      className={`p-2 rounded-xl border text-left text-[11px] font-bold transition ${
                        speedCurvePreset === preset.id ? 'bg-[#00d2c4] text-slate-950 border-[#00d2c4]' : 'bg-black/60 border-white/10 text-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => setShowSpeedModal(false)}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowSpeedModal(false);
                  setHandoffToast(`Applied ${clipSpeed}x speed curve!`);
                  setTimeout(() => setHandoffToast(null), 2000);
                }}
                className="px-4 py-1.5 rounded-xl bg-[#00d2c4] text-slate-950 font-bold"
              >
                Apply Speed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. VOLUME SLIDER MODAL */}
      {showVolumeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#151224] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Volume2 className="w-4 h-4 text-[#00d2c4]" /> Clip Audio Volume
              </span>
              <button onClick={() => setShowVolumeModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Volume Level:</span>
                <span className="text-[#00d2c4] font-bold text-sm">{clipVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                value={clipVolume}
                onChange={(e) => setClipVolume(parseInt(e.target.value, 10))}
                className="w-full accent-[#00d2c4] h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
              <button onClick={() => setShowVolumeModal(false)} className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-300">
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowVolumeModal(false);
                  setHandoffToast(`Volume adjusted to ${clipVolume}%`);
                  setTimeout(() => setHandoffToast(null), 1500);
                }}
                className="px-4 py-1.5 rounded-xl bg-[#00d2c4] text-slate-950 font-bold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. TRANSITIONS PICKER MODAL */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#151224] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                ✨ CapCut Video Transitions
              </span>
              <button onClick={() => setShowTransitionModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {CAPCUT_TRANSITIONS.map((trans) => (
                <button
                  key={trans.id}
                  onClick={() => {
                    setShowTransitionModal(false);
                    setHandoffToast(`Applied "${trans.name}" transition!`);
                    setTimeout(() => setHandoffToast(null), 2500);
                  }}
                  className="p-3 rounded-2xl bg-black/60 hover:bg-[#1f1b33] border border-white/10 hover:border-[#00d2c4] text-left transition flex items-center gap-2 group"
                >
                  <span className="text-lg">{trans.icon}</span>
                  <span className="text-xs font-bold text-white group-hover:text-[#00d2c4]">{trans.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 11. COVER EDITOR MODAL */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#151224] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white">Select Cover Thumbnail</span>
              <button onClick={() => setShowCoverModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    setShowCoverModal(false);
                    setHandoffToast(`Selected frame ${i} as video cover`);
                    setTimeout(() => setHandoffToast(null), 1500);
                  }}
                  className="aspect-[9/16] rounded-xl overflow-hidden border border-white/15 hover:border-[#00d2c4] cursor-pointer"
                >
                  <img src={`/assets/filmstrip/thumb_0${i}.jpg`} alt="Frame" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 12. AI CLIPPER MODAL */}
      {showAiClipperModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#151224] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <Scissors className="w-4 h-4 text-cyan-400" /> AI Auto-Clipper
              </span>
              <button onClick={() => setShowAiClipperModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-slate-300 text-xs font-sans leading-relaxed">
              Auto-detects high-energy visual moments, eliminates dead pauses, and snaps cuts to rhythm peaks.
            </p>
            <button
              onClick={() => {
                setShowAiClipperModal(false);
                handleSnapClipsToBeats();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs"
            >
              Run AI Auto-Clipper
            </button>
          </div>
        </div>
      )}

      {/* 13. EXPORT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="w-full max-w-md bg-[#14121f] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4 font-mono text-xs">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-[#00d2c4]" />
                <h3 className="text-sm font-bold text-white">Export Video Project</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Resolution:</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['720P', '1080P', '2K', 'AI UHD'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => setSelectedResolution(res as any)}
                      className={`p-2 rounded-xl border text-center font-bold text-[11px] ${
                        selectedResolution === res ? 'bg-[#00d2c4] text-slate-950 border-[#00d2c4]' : 'bg-black/60 border-white/10 text-slate-300'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Frame Rate:</span>
                <div className="grid grid-cols-2 gap-2">
                  {([30, 60] as const).map((fps) => (
                    <button
                      key={fps}
                      onClick={() => setExportFps(fps)}
                      className={`p-2 rounded-xl border text-center font-bold ${
                        exportFps === fps ? 'bg-[#6c63ff] text-white border-[#6c63ff]' : 'bg-black/60 border-white/10 text-slate-300'
                      }`}
                    >
                      {fps} FPS
                    </button>
                  ))}
                </div>
              </div>

              {isExporting && (
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Rendering {selectedResolution} {exportFps}fps MP4...</span>
                    <span className="text-[#00d2c4] font-bold">{exportProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-black rounded-full overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-[#00d2c4] to-[#6c63ff] transition-all duration-200" 
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                disabled={isExporting}
                onClick={() => {
                  setIsExporting(true);
                  setExportProgress(18);
                  setTimeout(() => setExportProgress(58), 500);
                  setTimeout(() => setExportProgress(92), 1100);
                  setTimeout(() => {
                    setExportProgress(100);
                    setIsExporting(false);
                    setShowExportModal(false);
                    onSaveToVault?.({
                      type: 'video',
                      title: `OmniMotion - ${selectedResolution} Master`,
                      thumbnail: '/assets/filmstrip/thumb_01.jpg',
                      tags: ['OmniMotion', selectedResolution, 'CapCut Suite', '4K 60fps'],
                      details: `Exported with OmniMotion CapCut Suite • Instant device handoff synced`
                    });
                    setHandoffToast(`Exported ${selectedResolution} 60fps and saved to Omni Vault!`);
                    setTimeout(() => setHandoffToast(null), 3500);
                  }, 1600);
                }}
                className="px-4 py-2 rounded-xl bg-[#00d2c4] hover:bg-[#00f2e0] text-slate-950 font-bold shadow-md shadow-[#00d2c4]/30 active:scale-95 transition"
              >
                {isExporting ? 'Rendering...' : 'Start Render'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
