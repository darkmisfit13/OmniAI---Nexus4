import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Scissors, 
  Sparkles, 
  Music, 
  Type, 
  Plus, 
  Zap, 
  Check, 
  Play, 
  Image as ImageIcon,
  Edit2,
  Magnet,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { VideoClip } from './OmniMotionStudio';

export interface CapCutTimelineProps {
  currentTime: number;
  totalDuration: number;
  videoTrack: VideoClip[];
  audioTrack: VideoClip[];
  textTrack: VideoClip[];
  selectedClipId: string | null;
  timelineZoom: number;
  isBeatSyncActive: boolean;
  beatMarkers: number[];
  downbeats: number[];
  magneticSnapping: boolean;
  showWaveform: boolean;
  isMuted: boolean;
  onTimeChange: (time: number) => void;
  onSelectClip: (clipId: string | null) => void;
  onSplitClip: () => void;
  onToggleMute: () => void;
  onAddAudio: () => void;
  onAddText: () => void;
  onAddVideoClip: () => void;
  onOpenTransitionPicker: (clipIndex: number) => void;
  onOpenCoverEditor: () => void;
  onOpenAiClipper: () => void;
  onSnapFeedback?: (beat: number) => void;
  onUpdateClip?: (clipId: string, updates: Partial<VideoClip>) => void;
  onToggleMagneticSnapping?: () => void;
  onZoomChange?: (zoom: number) => void;
}

export const CapCutTimeline: React.FC<CapCutTimelineProps> = ({
  currentTime,
  totalDuration,
  videoTrack,
  audioTrack,
  textTrack,
  selectedClipId,
  timelineZoom,
  isBeatSyncActive,
  beatMarkers,
  downbeats,
  magneticSnapping,
  showWaveform,
  isMuted,
  onTimeChange,
  onSelectClip,
  onSplitClip,
  onToggleMute,
  onAddAudio,
  onAddText,
  onAddVideoClip,
  onOpenTransitionPicker,
  onOpenCoverEditor,
  onOpenAiClipper,
  onSnapFeedback,
  onUpdateClip,
  onToggleMagneticSnapping,
  onZoomChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const isDraggingPlayheadRef = useRef<boolean>(false);
  const trimDragRef = useRef<{
    clipId: string;
    handle: 'left' | 'right' | 'body';
    startX: number;
    initialStartTime: number;
    initialDuration: number;
  } | null>(null);

  const lastSnapBeatRef = useRef<number | null>(null);
  const [isSnapping, setIsSnapping] = useState<boolean>(false);
  const [activeSnapBeat, setActiveSnapBeat] = useState<number | null>(null);
  const [activeSnapLabel, setActiveSnapLabel] = useState<string>('');
  const [trimPreview, setTrimPreview] = useState<{ clipId: string; duration: number; startTime: number } | null>(null);
  const [showZoomSlider, setShowZoomSlider] = useState<boolean>(false);

  // Pinch-to-zoom multi-touch tracking refs
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(timelineZoom);

  // Dynamic pixels per second calculation based on zoom level
  const BASE_PIXELS_PER_SEC = 52;
  const pixelsPerSecond = BASE_PIXELS_PER_SEC * timelineZoom;
  const totalTimelineWidth = Math.max(700, totalDuration * pixelsPerSecond);

  // Filmstrip images from extracted assets
  const filmstripImages = [
    '/assets/filmstrip/thumb_01.jpg',
    '/assets/filmstrip/thumb_02.jpg',
    '/assets/filmstrip/thumb_03.jpg',
    '/assets/filmstrip/thumb_04.jpg',
    '/assets/filmstrip/thumb_05.jpg',
    '/assets/filmstrip/thumb_06.jpg',
  ];

  // Synthesized tactile click audio feedback on snap
  const playSnapAudioFeedback = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {
      // AudioContext may be blocked before first user gesture
    }
  }, []);

  // Magnetic beat snapping calculation
  const getSnappedTime = useCallback((rawTime: number): { time: number; snapped: boolean; beat: number | null; isDownbeat: boolean } => {
    if (!magneticSnapping || !isBeatSyncActive || beatMarkers.length === 0) {
      return { time: Math.max(0, Math.min(totalDuration, rawTime)), snapped: false, beat: null, isDownbeat: false };
    }

    const SNAP_THRESHOLD = 0.16; // 160ms snap magnetic attraction window
    for (const beat of beatMarkers) {
      if (Math.abs(rawTime - beat) <= SNAP_THRESHOLD) {
        const isDownbeat = downbeats.includes(beat);
        return { time: beat, snapped: true, beat, isDownbeat };
      }
    }
    return { time: Math.max(0, Math.min(totalDuration, rawTime)), snapped: false, beat: null, isDownbeat: false };
  }, [magneticSnapping, isBeatSyncActive, beatMarkers, downbeats, totalDuration]);

  // Center playhead syncing: keep playhead smoothly visible without breaking user drag
  useEffect(() => {
    if (!scrollAreaRef.current || isDraggingPlayheadRef.current || trimDragRef.current) return;
    const scrollContainer = scrollAreaRef.current;
    const playheadPx = currentTime * pixelsPerSecond;
    const containerWidth = scrollContainer.clientWidth;
    const targetScrollLeft = playheadPx - containerWidth / 2;

    scrollContainer.scrollLeft = Math.max(0, targetScrollLeft);
  }, [currentTime, pixelsPerSecond]);

  // Convert client coordinate into timeline seconds with magnetic beat snap
  const updateTimeFromPointer = useCallback((clientX: number) => {
    if (!scrollAreaRef.current) return;
    const rect = scrollAreaRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left + scrollAreaRef.current.scrollLeft - 40; // 40px left offset
    const rawTime = Math.max(0, relativeX / pixelsPerSecond);

    const { time, snapped, beat, isDownbeat } = getSnappedTime(rawTime);
    onTimeChange(Number(time.toFixed(2)));

    if (snapped && beat !== null && beat !== lastSnapBeatRef.current) {
      lastSnapBeatRef.current = beat;
      setIsSnapping(true);
      setActiveSnapBeat(beat);
      setActiveSnapLabel(isDownbeat ? '⚡ DROP DOWNBEAT' : '⚡ 140BPM BEAT');

      // Tactile haptic vibration on mobile devices
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        navigator.vibrate(15);
      }
      playSnapAudioFeedback();
      onSnapFeedback?.(beat);
    } else if (!snapped) {
      lastSnapBeatRef.current = null;
      setIsSnapping(false);
      setActiveSnapBeat(null);
      setActiveSnapLabel('');
    }
  }, [getSnappedTime, onTimeChange, onSnapFeedback, pixelsPerSecond, playSnapAudioFeedback]);

  // Handle pointer down on the timeline workspace for scrubbing playhead
  const handlePointerDownTimeline = (e: React.PointerEvent<HTMLDivElement>) => {
    // If clicking a trim handle, ignore main scrubber
    if ((e.target as HTMLElement).closest('[data-trim-handle]')) return;
    if (!scrollAreaRef.current) return;

    isDraggingPlayheadRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    updateTimeFromPointer(e.clientX);
  };

  const handlePointerMoveTimeline = (e: React.PointerEvent<HTMLDivElement>) => {
    if (trimDragRef.current) {
      handleTrimPointerMove(e);
      return;
    }
    if (!isDraggingPlayheadRef.current) return;
    updateTimeFromPointer(e.clientX);
  };

  const handlePointerUpTimeline = (e: React.PointerEvent<HTMLDivElement>) => {
    if (trimDragRef.current) {
      handleTrimPointerUp();
    }
    if (!isDraggingPlayheadRef.current) return;
    isDraggingPlayheadRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}

    setTimeout(() => {
      setIsSnapping(false);
      setActiveSnapBeat(null);
      setActiveSnapLabel('');
    }, 450);
  };

  // Pinch-to-zoom multi-touch gesture handlers
  const handleTimelineTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = timelineZoom;
    }
  };

  const handleTimelineTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const ratio = currentDist / pinchStartDistRef.current;
      const targetZoom = Math.min(3.5, Math.max(0.5, Number((pinchStartZoomRef.current * ratio).toFixed(1))));
      if (onZoomChange && Math.abs(targetZoom - timelineZoom) >= 0.08) {
        onZoomChange(targetZoom);
      }
    }
  };

  const handleTimelineTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
  };

  // Wheel zoom (e.g. Ctrl + Wheel or Alt + Wheel on desktop/trackpad)
  const handleTimelineWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.altKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      const newZoom = Math.min(3.5, Math.max(0.5, Number((timelineZoom + delta).toFixed(1))));
      onZoomChange?.(newZoom);
    }
  };

  // --- INTERACTIVE CLIP TRIM HANDLERS WITH BEAT SNAPPING ---
  const handleTrimPointerDown = (
    e: React.PointerEvent,
    clip: VideoClip,
    handle: 'left' | 'right' | 'body'
  ) => {
    e.stopPropagation();
    trimDragRef.current = {
      clipId: clip.id,
      handle,
      startX: e.clientX,
      initialStartTime: clip.startTime,
      initialDuration: clip.duration,
    };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handleTrimPointerMove = (e: React.PointerEvent) => {
    if (!trimDragRef.current) return;
    const { clipId, handle, startX, initialStartTime, initialDuration } = trimDragRef.current;
    const deltaPx = e.clientX - startX;
    const deltaSeconds = deltaPx / pixelsPerSecond;

    if (handle === 'right') {
      const rawEnd = initialStartTime + initialDuration + deltaSeconds;
      const { time: snappedEnd, snapped, beat, isDownbeat } = getSnappedTime(rawEnd);
      const newDuration = Math.max(0.5, Number((snappedEnd - initialStartTime).toFixed(2)));

      setTrimPreview({ clipId, startTime: initialStartTime, duration: newDuration });

      if (snapped && beat !== null && beat !== lastSnapBeatRef.current) {
        lastSnapBeatRef.current = beat;
        setIsSnapping(true);
        setActiveSnapBeat(beat);
        setActiveSnapLabel(isDownbeat ? '⚡ CUT TO DOWNBEAT' : '⚡ CUT TO BEAT');
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
          navigator.vibrate(15);
        }
        playSnapAudioFeedback();
        onSnapFeedback?.(beat);
      } else if (!snapped) {
        setIsSnapping(false);
        setActiveSnapBeat(null);
      }
    } else if (handle === 'left') {
      const rawStart = initialStartTime + deltaSeconds;
      const { time: snappedStart, snapped, beat, isDownbeat } = getSnappedTime(rawStart);
      const endBoundary = initialStartTime + initialDuration;
      const validStart = Math.min(endBoundary - 0.5, Math.max(0, snappedStart));
      const newDuration = Math.max(0.5, Number((endBoundary - validStart).toFixed(2)));

      setTrimPreview({ clipId, startTime: Number(validStart.toFixed(2)), duration: newDuration });

      if (snapped && beat !== null && beat !== lastSnapBeatRef.current) {
        lastSnapBeatRef.current = beat;
        setIsSnapping(true);
        setActiveSnapBeat(beat);
        setActiveSnapLabel(isDownbeat ? '⚡ ALIGN TO DOWNBEAT' : '⚡ ALIGN TO BEAT');
        if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
          navigator.vibrate(15);
        }
        playSnapAudioFeedback();
        onSnapFeedback?.(beat);
      }
    }
  };

  const handleTrimPointerUp = () => {
    if (trimDragRef.current && trimPreview && onUpdateClip) {
      onUpdateClip(trimPreview.clipId, {
        duration: trimPreview.duration,
        startTime: trimPreview.startTime,
      });
    }
    trimDragRef.current = null;
    setTrimPreview(null);
    setTimeout(() => {
      setIsSnapping(false);
      setActiveSnapBeat(null);
      setActiveSnapLabel('');
    }, 450);
  };

  // Generate dynamic background grid lines across entire timeline
  const renderDynamicGrid = () => {
    const gridLines = [];
    const step = 0.5; // Every 0.5s sub-grid
    const totalSteps = Math.ceil(totalDuration / step);

    for (let i = 0; i <= totalSteps; i++) {
      const s = i * step;
      const leftPx = s * pixelsPerSecond;
      const isSecond = Number.isInteger(s);

      gridLines.push(
        <div
          key={`grid-line-${s}`}
          className={`absolute top-0 bottom-0 pointer-events-none transition-opacity ${
            isSecond ? 'w-[1px] bg-white/[0.08]' : 'w-[1px] bg-white/[0.03]'
          }`}
          style={{ left: `${leftPx}px` }}
        />
      );
    }
    return gridLines;
  };

  // Generate ruler tick marks with clickable beat flags
  const renderRulerTicks = () => {
    const ticks = [];
    const step = 1; // 1 second steps
    for (let s = 0; s <= totalDuration; s += step) {
      const leftPx = s * pixelsPerSecond;
      const mins = Math.floor(s / 60);
      const secs = s % 60;
      const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      ticks.push(
        <div 
          key={`tick-${s}`} 
          className="absolute top-0 bottom-0 pointer-events-none flex flex-col justify-end"
          style={{ left: `${leftPx}px` }}
        >
          <span className="text-[8.5px] font-mono font-medium text-slate-400 absolute top-0 -left-2.5 select-none">
            {timeStr}
          </span>
          <div className="w-[1px] h-2 bg-white/30" />
        </div>
      );

      // Half-second sub-tick
      if (s + 0.5 <= totalDuration) {
        ticks.push(
          <div 
            key={`subtick-${s}.5`}
            className="absolute bottom-0 w-[1px] h-1 bg-white/10 pointer-events-none"
            style={{ left: `${(s + 0.5) * pixelsPerSecond}px` }}
          />
        );
      }
    }
    return ticks;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-34 sm:h-38 md:h-42 bg-[#0a0912] border-t border-white/10 flex select-none relative overflow-hidden shrink-0"
    >
      {/* 1. FIXED LEFT SIDEBAR (Authentic CapCut Track Controller) */}
      <div className="w-18 sm:w-22 bg-[#100e1b] border-r border-white/10 flex flex-col shrink-0 z-30 shadow-2xl">
        
        {/* Top Spacer matching Ruler with Zoom Controls & Slider Popover */}
        <div className="h-5 sm:h-6 border-b border-white/5 flex items-center justify-between px-1 shrink-0 bg-[#0d0b17] relative">
          <span className="text-[8px] font-mono text-slate-400 font-bold uppercase tracking-wider">Tracks</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onZoomChange?.(Math.max(0.5, Number((timelineZoom - 0.2).toFixed(1))))}
              className="w-3.5 h-3.5 rounded bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition"
              title="Zoom out"
            >
              <ZoomOut className="w-2 h-2" />
            </button>
            <button
              onClick={() => setShowZoomSlider(!showZoomSlider)}
              className="text-[7.5px] font-mono text-cyan-400 font-bold px-1 py-0.5 rounded hover:bg-white/10 transition"
              title="Toggle timeline zoom slider"
            >
              {timelineZoom.toFixed(1)}x
            </button>
            <button
              onClick={() => onZoomChange?.(Math.min(3.5, Number((timelineZoom + 0.2).toFixed(1))))}
              className="w-3.5 h-3.5 rounded bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white flex items-center justify-center transition"
              title="Zoom in"
            >
              <ZoomIn className="w-2 h-2" />
            </button>
          </div>

          {/* Quick Zoom Slider Popover for Mobile Thumb Editing */}
          {showZoomSlider && (
            <div className="absolute top-6 left-0 w-44 bg-[#141224] border border-cyan-500/30 rounded-lg p-2 shadow-2xl z-50 flex flex-col gap-1.5 text-white">
              <div className="flex items-center justify-between text-[8px] font-mono">
                <span className="text-slate-400 font-bold">TIMELINE ZOOM</span>
                <span className="text-cyan-400 font-bold">{timelineZoom.toFixed(1)}x ({Math.round(pixelsPerSecond)}px/s)</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.5"
                step="0.1"
                value={timelineZoom}
                onChange={(e) => onZoomChange?.(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex items-center justify-between gap-1">
                {[0.5, 1.0, 2.0, 3.5].map((z) => (
                  <button
                    key={z}
                    onClick={() => onZoomChange?.(z)}
                    className={`flex-1 py-0.5 rounded text-[7px] font-mono font-bold transition ${
                      Math.abs(timelineZoom - z) < 0.1
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'bg-white/5 hover:bg-white/15 text-slate-300'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
              <span className="text-[6.5px] text-slate-400 text-center">Pinch with 2 fingers to zoom anytime</span>
            </div>
          )}
        </div>

        {/* Video Track Control: Mute & AI Clipper & Cover */}
        <div className="h-11 sm:h-13 border-b border-white/5 p-0.5 flex items-center justify-around gap-0.5 bg-[#131120] shrink-0">
          {/* Mute clip audio */}
          <button
            onClick={onToggleMute}
            className={`flex flex-col items-center justify-center p-0.5 rounded-lg text-[7.5px] font-medium transition ${
              isMuted ? 'text-rose-400 bg-rose-950/40' : 'text-slate-400 hover:text-white'
            }`}
            title="Mute original clips audio"
          >
            {isMuted ? <VolumeX className="w-3 h-3 text-rose-400 mb-0.5" /> : <Volume2 className="w-3 h-3 text-slate-300 mb-0.5" />}
            <span className="leading-none text-center truncate">{isMuted ? 'Muted' : 'Mute'}</span>
          </button>

          {/* AI Clipper */}
          <button
            onClick={onOpenAiClipper}
            className="flex flex-col items-center justify-center p-0.5 rounded-lg text-[7.5px] font-medium text-slate-400 hover:text-cyan-300 relative group transition"
            title="AI Clipper: Auto-Trim & Dynamic Highlight"
          >
            <span className="absolute -top-1 -right-0.5 px-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[6px] font-black rounded-full shadow">
              AI
            </span>
            <Scissors className="w-3 h-3 text-cyan-400 mb-0.5 group-hover:scale-110 transition-transform" />
            <span className="leading-none">Auto</span>
          </button>

          {/* Cover editor */}
          <button
            onClick={onOpenCoverEditor}
            className="flex flex-col items-center justify-center p-0.5 rounded-lg text-[7.5px] font-medium text-slate-400 hover:text-white group transition"
            title="Choose Cover Thumbnail"
          >
            <div className="w-4 h-4 rounded overflow-hidden border border-white/20 relative mb-0.5">
              <img 
                src={filmstripImages[0]} 
                alt="Cover" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Edit2 className="w-2 h-2 text-white" />
              </div>
            </div>
            <span className="leading-none">Cover</span>
          </button>
        </div>

        {/* Audio Track Header: + Add Audio */}
        <div className="h-7 sm:h-8 border-b border-white/5 px-1 flex items-center justify-between bg-[#0e0c18] shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Music className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
            </div>
            <span className="text-[7.5px] sm:text-[8.5px] font-mono text-emerald-400 truncate font-semibold">Audio</span>
          </div>
          <button
            onClick={onAddAudio}
            className="p-0.5 rounded hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition"
            title="Add Music or Sound FX"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Text Track Header: + Add Text */}
        <div className="h-6 sm:h-7 border-b border-white/5 px-1 flex items-center justify-between bg-[#0e0c18] shrink-0">
          <div className="flex items-center gap-1 min-w-0">
            <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
              <Type className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
            </div>
            <span className="text-[7.5px] sm:text-[8.5px] font-mono text-pink-400 truncate font-semibold">Text</span>
          </div>
          <button
            onClick={onAddText}
            className="p-0.5 rounded hover:bg-pink-500/20 text-pink-400 hover:text-pink-300 transition"
            title="Add Subtitles or Text Overlay"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Bottom Beat-Sync Magnetic Snapping Switch */}
        <button
          onClick={onToggleMagneticSnapping}
          className={`flex-1 px-1 py-0.5 flex items-center justify-between text-[7.5px] font-mono transition ${
            magneticSnapping 
              ? 'bg-amber-950/40 text-amber-300 border-t border-amber-500/30' 
              : 'bg-[#0b0a14] text-slate-500 border-t border-white/5'
          }`}
          title="Toggle Magnetic Beat Snap"
        >
          <div className="flex items-center gap-0.5 truncate">
            <Magnet className={`w-2.5 h-2.5 shrink-0 ${magneticSnapping ? 'text-amber-400 fill-current animate-pulse' : 'text-slate-600'}`} />
            <span className="truncate font-bold">{magneticSnapping ? 'SNAP ON' : 'SNAP OFF'}</span>
          </div>
          {isSnapping && (
            <span className="px-1 py-0.2 bg-amber-400 text-slate-950 font-black text-[6.5px] rounded animate-ping">
              ⚡
            </span>
          )}
        </button>
      </div>

      {/* 2. SCROLLABLE TIMELINE WORKSPACE (Touch & Mouse Drag with Dynamic Grid & Pinch-to-Zoom) */}
      <div 
        ref={scrollAreaRef}
        onPointerDown={handlePointerDownTimeline}
        onPointerMove={handlePointerMoveTimeline}
        onPointerUp={handlePointerUpTimeline}
        onPointerCancel={handlePointerUpTimeline}
        onTouchStart={handleTimelineTouchStart}
        onTouchMove={handleTimelineTouchMove}
        onTouchEnd={handleTimelineTouchEnd}
        onWheel={handleTimelineWheel}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#07060d] cursor-ew-resize touch-pan-x no-scrollbar"
        style={{ touchAction: 'pan-x', overscrollBehaviorX: 'contain' }}
      >
        <div 
          className="relative h-full select-none"
          style={{ width: `${totalTimelineWidth + 400}px`, paddingLeft: '40px', paddingRight: '400px' }}
        >
          
          {/* A. DYNAMIC BACKGROUND GRID (Subdivisions & Beat Guides) */}
          <div className="absolute inset-0 pointer-events-none z-0 left-[40px]" style={{ width: `${totalTimelineWidth}px` }}>
            {renderDynamicGrid()}
          </div>

          {/* B. TOP RULER TRACK */}
          <div className="h-5 sm:h-6 relative border-b border-white/10 overflow-hidden shrink-0 z-10">
            {renderRulerTicks()}

            {/* Beat Ticks in Ruler */}
            {isBeatSyncActive && beatMarkers.map((beat, bIdx) => {
              const isDownbeat = downbeats.includes(beat);
              const leftPx = beat * pixelsPerSecond;
              return (
                <div
                  key={`ruler-beat-${bIdx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTimeChange(beat);
                    onSnapFeedback?.(beat);
                  }}
                  style={{ left: `${leftPx}px` }}
                  className="absolute top-0 bottom-0 pointer-events-auto cursor-pointer flex flex-col items-center group -translate-x-1/2"
                  title={`Jump to Beat at ${beat}s`}
                >
                  <div className={`w-2 h-2 rotate-45 transition-all mt-0.5 ${
                    isDownbeat 
                      ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)] group-hover:scale-125' 
                      : 'bg-yellow-500/70 group-hover:bg-yellow-400'
                  }`} />
                </div>
              );
            })}
          </div>

          {/* C. BEAT-SYNC RHYTHM MARKER GUIDES (freebeat.ai Yellow Beat Nodes Across Full Height) */}
          {isBeatSyncActive && (
            <div className="absolute top-5 sm:top-6 bottom-0 left-[40px] pointer-events-none z-10" style={{ width: `${totalTimelineWidth}px` }}>
              {beatMarkers.map((marker, idx) => {
                const isDownbeat = downbeats.includes(marker);
                const leftPx = marker * pixelsPerSecond;
                const isCurrentSnap = activeSnapBeat === marker;

                return (
                  <div 
                    key={`beat-line-${idx}`} 
                    className="absolute top-0 bottom-0 pointer-events-none flex flex-col items-center -translate-x-1/2"
                    style={{ left: `${leftPx}px` }}
                  >
                    {/* Vertical guideline */}
                    <div 
                      className={`w-[1px] h-full transition-all duration-150 ${
                        isCurrentSnap
                          ? 'w-[2px] bg-gradient-to-b from-amber-300 via-amber-400 to-amber-500 shadow-[0_0_16px_rgba(251,191,36,1)] scale-x-150'
                          : isDownbeat
                          ? 'bg-amber-400/40 border-l border-dashed border-amber-400/60'
                          : 'bg-amber-500/20'
                      }`} 
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* D. TRACK 1: VIDEO FILMSTRIP TRACK */}
          <div className="h-11 sm:h-13 mt-0.5 relative flex items-center shrink-0 z-20">
            <div className="relative flex items-center h-full">
              {videoTrack.map((clip, idx) => {
                const isSelected = selectedClipId === clip.id;
                const activeDuration = trimPreview?.clipId === clip.id ? trimPreview.duration : clip.duration;
                const activeStartTime = trimPreview?.clipId === clip.id ? trimPreview.startTime : clip.startTime;
                const clipWidthPx = activeDuration * pixelsPerSecond;

                return (
                  <React.Fragment key={clip.id}>
                    {/* Video Clip Card */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClip(clip.id);
                      }}
                      style={{ width: `${clipWidthPx}px` }}
                      className={`h-10 sm:h-12 relative rounded-xl overflow-hidden cursor-pointer transition-all shrink-0 flex items-center group select-none shadow-lg ${
                        isSelected 
                          ? 'border-2 border-white ring-2 ring-white/60 shadow-[0_0_16px_rgba(255,255,255,0.4)] z-20' 
                          : 'border border-white/15 hover:border-white/40 z-10'
                      }`}
                    >
                      {/* Filmstrip Frame Backgrounds */}
                      <div className="absolute inset-0 flex overflow-hidden pointer-events-none opacity-90">
                        {Array.from({ length: Math.ceil(clipWidthPx / 44) }).map((_, frameIdx) => {
                          const thumbUrl = filmstripImages[(frameIdx + idx) % filmstripImages.length];
                          return (
                            <img
                              key={frameIdx}
                              src={thumbUrl}
                              alt="Film frame"
                              className="w-11 h-full object-cover shrink-0 pointer-events-none border-r border-black/30"
                            />
                          );
                        })}
                      </div>

                      {/* Dark tint gradient for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/60 pointer-events-none" />

                      {/* Clip duration and name badge */}
                      <div className="absolute top-0.5 left-1.5 flex items-center gap-1 pointer-events-none z-10">
                        <span className="px-1 py-0.2 rounded bg-black/80 text-white font-mono font-bold text-[8px] border border-white/10 shadow">
                          {activeDuration}s
                        </span>
                        <span className="text-[9px] font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] truncate max-w-[100px]">
                          {clip.name}
                        </span>
                      </div>

                      {/* Selected CapCut Pill Handles [ | ... | ] (Interactive Drag Handles) */}
                      {isSelected && (
                        <>
                          {/* Left Trim Handle */}
                          <div 
                            data-trim-handle="left"
                            onPointerDown={(e) => handleTrimPointerDown(e, clip, 'left')}
                            className="absolute left-0 top-0 bottom-0 w-3.5 bg-white rounded-l-lg flex items-center justify-center shadow-lg cursor-ew-resize z-30 touch-none active:scale-105 active:bg-cyan-200 transition-colors"
                            title="Drag to trim clip start (Snaps to beat markers)"
                          >
                            <div className="w-0.5 h-3.5 bg-slate-900 rounded-full" />
                          </div>
                          {/* Right Trim Handle */}
                          <div 
                            data-trim-handle="right"
                            onPointerDown={(e) => handleTrimPointerDown(e, clip, 'right')}
                            className="absolute right-0 top-0 bottom-0 w-3.5 bg-white rounded-r-lg flex items-center justify-center shadow-lg cursor-ew-resize z-30 touch-none active:scale-105 active:bg-cyan-200 transition-colors"
                            title="Drag to trim clip end (Snaps to beat markers)"
                          >
                            <div className="w-0.5 h-3.5 bg-slate-900 rounded-full" />
                          </div>
                        </>
                      )}
                    </div>

                    {/* TRANSITION CONNECTOR BUTTON: CapCut [ | ▶ ] Marker between clips */}
                    {idx < videoTrack.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTransitionPicker(idx);
                        }}
                        className="w-4 h-4 sm:w-4.5 sm:h-4.5 mx-0.5 rounded-md bg-black/90 hover:bg-[#1f1b33] border border-white/30 text-white flex items-center justify-center text-[7.5px] font-bold z-20 shadow-md hover:scale-110 active:scale-95 transition group"
                        title="CapCut Transition: Dissolve, Glitch, Zoom, Whip"
                      >
                        <span className="text-[8px] leading-none text-cyan-300">|▶</span>
                      </button>
                    )}
                  </React.Fragment>
                );
              })}

              {/* End `[ + ]` Add Clip Button (Authentic CapCut White Rounded Button) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddVideoClip();
                }}
                className="w-9 sm:w-11 h-10 sm:h-12 ml-1.5 rounded-xl bg-white/10 hover:bg-white/20 border-2 border-dashed border-white/40 text-white flex flex-col items-center justify-center gap-0.5 cursor-pointer transition active:scale-95 shrink-0 group"
                title="Add new video or photo clip"
              >
                <Plus className="w-3.5 h-3.5 text-white group-hover:scale-125 transition-transform" />
                <span className="text-[6.5px] font-mono uppercase font-bold text-slate-300">Add</span>
              </button>
            </div>
          </div>

          {/* E. TRACK 2: AUDIO WAVEFORM TRACK WITH YELLOW BEAT DOTS */}
          <div className="h-7 sm:h-8 mt-0.5 relative flex items-center shrink-0 z-20">
            {audioTrack.map((audio) => {
              const audioWidthPx = audio.duration * pixelsPerSecond;

              return (
                <div
                  key={audio.id}
                  style={{ width: `${audioWidthPx}px` }}
                  className="h-6 sm:h-7 rounded-xl bg-gradient-to-r from-emerald-950/80 to-teal-950/80 border border-emerald-500/40 relative overflow-hidden flex items-center px-2 select-none shadow-md shrink-0"
                >
                  {/* Waveform graphic bars */}
                  {showWaveform && (
                    <div className="absolute inset-0 flex items-center gap-0.5 px-2 opacity-50 pointer-events-none">
                      {Array.from({ length: Math.ceil(audioWidthPx / 4) }).map((_, barIdx) => {
                        const heights = [4, 10, 16, 7, 13, 18, 9, 14, 5, 12];
                        const h = heights[barIdx % heights.length];
                        return (
                          <div 
                            key={barIdx} 
                            className="w-0.5 bg-emerald-400 rounded-full" 
                            style={{ height: `${h}px` }} 
                          />
                        );
                      })}
                    </div>
                  )}

                  {/* Audio Title */}
                  <span className="text-[8px] sm:text-[9px] font-mono font-bold text-emerald-200 truncate z-10 drop-shadow">
                    {audio.name}
                  </span>

                  {/* YELLOW BEAT NODES (CapCut style dots along audio track) */}
                  {isBeatSyncActive && (
                    <div className="absolute inset-0 pointer-events-none z-20">
                      {beatMarkers.map((marker, mIdx) => {
                        const isDownbeat = downbeats.includes(marker);
                        const markerLeftPx = marker * pixelsPerSecond;
                        const isNear = Math.abs(currentTime - marker) < 0.18;

                        return (
                          <div
                            key={`beat-node-${mIdx}`}
                            style={{ left: `${markerLeftPx}px` }}
                            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none"
                          >
                            <div 
                              className={`rounded-full transition-all duration-150 ${
                                isNear
                                  ? 'w-2.5 h-2.5 sm:w-3 sm:h-3 bg-cyan-300 ring-4 ring-cyan-400/50 shadow-[0_0_12px_rgba(0,242,254,1)] scale-125'
                                  : isDownbeat
                                  ? 'w-2 h-2 bg-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                                  : 'w-1.5 h-1.5 bg-yellow-400/80 shadow-[0_0_4px_rgba(250,204,21,0.8)]'
                              }`} 
                            />
                            {isDownbeat && (
                              <span className="absolute -top-2.5 text-[6px] font-mono text-amber-300 font-bold">⚡</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* F. TRACK 3: TEXT & CAPTIONS TRACK */}
          <div className="h-6 sm:h-7 mt-0.5 relative flex items-center shrink-0 z-20">
            {textTrack.map((txt) => {
              const txtWidthPx = txt.duration * pixelsPerSecond;
              const txtLeftPx = txt.startTime * pixelsPerSecond;

              return (
                <div
                  key={txt.id}
                  style={{
                    left: `${txtLeftPx}px`,
                    width: `${txtWidthPx}px`,
                  }}
                  className="absolute h-5 sm:h-5.5 rounded-lg bg-pink-900/60 border border-pink-500/50 px-1.5 flex items-center text-[7.5px] sm:text-[8px] font-mono font-bold text-pink-200 truncate select-none shadow"
                >
                  <Type className="w-2.5 h-2.5 mr-1 shrink-0 text-pink-300" />
                  <span className="truncate">{txt.text || txt.name}</span>
                </div>
              );
            })}
          </div>

          {/* G. CENTRAL DRAGGABLE PLAYHEAD NEEDLE WITH VISUAL SNAP INDICATORS */}
          <div 
            className="absolute top-0 bottom-0 pointer-events-none z-40 flex flex-col items-center -translate-x-1/2"
            style={{ 
              left: `${40 + currentTime * pixelsPerSecond}px`,
              transition: isDraggingPlayheadRef.current || trimDragRef.current ? 'none' : 'left 0.04s linear'
            }}
          >
            {/* Dynamic Snap Floating Label Badge */}
            {isSnapping && activeSnapLabel && (
              <div className="absolute -top-6 whitespace-nowrap px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 font-black text-[8px] tracking-wider shadow-[0_0_14px_rgba(251,191,36,0.9)] animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1">
                <span>{activeSnapLabel}</span>
              </div>
            )}

            {/* Top Playhead Notch (Authentic CapCut Diamond / Inverted Pill) */}
            <div className={`w-3.5 h-4 -mt-0.5 rounded-b-md flex items-center justify-center transition-all ${
              isSnapping 
                ? 'bg-amber-400 shadow-[0_0_16px_rgba(251,191,36,1)] scale-125' 
                : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]'
            }`}>
              <div className="w-1 h-2 bg-slate-900 rounded-full" />
            </div>

            {/* Vertical Guide Line */}
            <div className={`w-[2px] h-full transition-all ${
              isSnapping 
                ? 'w-[2.5px] bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,1)]' 
                : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
            }`} />
          </div>

        </div>
      </div>
    </div>
  );
};
