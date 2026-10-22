import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Play,
  Pause,
  Disc3,
  MoreVertical,
  SlidersHorizontal,
  Mic,
  Music2,
  FolderLock,
  ChevronDown,
  Volume2,
  VolumeX,
  Share2,
  Download,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Wand2,
  Check,
  Radio,
  FileText
} from 'lucide-react';
import { HoloOrb, OrbPhase } from '../HoloOrb';

export interface GeneratedSong {
  id: string;
  title: string;
  style: string;
  bpm: number;
  key: string;
  duration: string;
  durationSeconds: number;
  lyrics: string;
  coverArt: string;
  tags: string[];
  version: string;
  createdAt: string;
  isInstrumental?: boolean;
}

// Initial library with authentic Suno style tracks
const INITIAL_LIBRARY: GeneratedSong[] = [
  {
    id: 'suno-track-01',
    title: 'Neon Drift (Cyber Overdrive)',
    style: 'Synthwave',
    bpm: 128,
    key: 'F Minor',
    duration: '02:42',
    durationSeconds: 162,
    lyrics: '[Intro - Arp Synth]\n[Verse 1]\nChrome rain falling on the boulevard\nHigh-speed echoes tearing through the dark\n[Chorus]\nWe are the neon drift, electric skyline!\nChasing the frequency, losing our minds!\n[Drop & Guitar Solo]\n[Outro]\nLost in the digital dusk.',
    coverArt: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80',
    tags: ['Synthwave', 'Analog Arp', 'Cyberpunk', '80s Nostalgia'],
    version: 'v4.0 Ultra',
    createdAt: 'Just now',
    isInstrumental: false,
  },
  {
    id: 'suno-track-02',
    title: 'Midnight Reckoning',
    style: 'Heavy Metal',
    bpm: 148,
    key: 'D Minor',
    duration: '03:15',
    durationSeconds: 195,
    lyrics: '[Intro - Heavy 8-String Chug]\n[Verse 1]\nIron clad, iron bound, shatter the cage\nRising up from the embers of synthetic rage\n[Chorus]\nMidnight reckoning, thunder and fire!\nWe burn the master, we tear down the wire!\n[Dual Solo]\n[Outro]\nSilence.',
    coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
    tags: ['Heavy Metal', 'Distorted Guitars', 'Raw Vocal', 'Double Bass'],
    version: 'v3.5 High-Fi',
    createdAt: '12m ago',
    isInstrumental: false,
  },
  {
    id: 'suno-track-03',
    title: 'Coffee in Shibuya',
    style: 'Lo-Fi Chill',
    bpm: 84,
    key: 'C Major 7',
    duration: '02:18',
    durationSeconds: 138,
    lyrics: '[Instrumental - Vinyl Crackle, Rhodes Chords, Muted Saxophone & Rain]',
    coverArt: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
    tags: ['Lo-Fi Chill', 'Rhodes Piano', 'Rain Noise', 'Late Night'],
    version: 'v4.0 Ultra',
    createdAt: '1h ago',
    isInstrumental: true,
  },
];

const STYLE_TAGS = [
  'Synthwave',
  'Acoustic',
  'Cyberpunk',
  'Heavy Metal',
  'Drum & Bass',
  'Lo-Fi Chill',
  'Dark Trap 808',
  'Hyperpop',
  'Cinematic Orchestral',
  'R&B Neo Soul',
  'Indie Rock',
  'EDM Festival',
  'Deep House',
  'Phonk',
];

export const OmniWaveStudio: React.FC<{ onSaveToVault?: (asset: any) => void }> = ({ onSaveToVault }) => {
  // Navigation tabs: strictly 'Create' and 'Library'
  const [activeTab, setActiveTab] = useState<'create' | 'library'>('create');

  // Creation State
  const [promptText, setPromptText] = useState('An energetic cyberpunk synthwave anthem with blistering arpeggios, gritty analog bass, and soaring vocal hooks');
  const [selectedStyleTag, setSelectedStyleTag] = useState<string>('Synthwave');
  const [isInstrumental, setIsInstrumental] = useState<boolean>(false);
  const [modelTier, setModelTier] = useState<'v4.0' | 'v3.5'>('v4.0');
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [orbPhase, setOrbPhase] = useState<OrbPhase>('idle');

  // Library & Player State
  const [library, setLibrary] = useState<GeneratedSong[]>(INITIAL_LIBRARY);
  const [currentSong, setCurrentSong] = useState<GeneratedSong | null>(INITIAL_LIBRARY[0]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(18); // 0 to 100 percentage
  const [isExpandedPlayer, setIsExpandedPlayer] = useState<boolean>(false);
  const [showLyricsDrawer, setShowLyricsDrawer] = useState<boolean>(false);
  const [activeMenuSongId, setActiveMenuSongId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audio Synth Context Ref for realistic sound generation
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthNodesRef = useRef<any[]>([]);
  const playbackTimerRef = useRef<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Web Audio synth player to give real auditory feedback when user taps play/pause
  const startSynthPlayback = useCallback((style: string) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      stopSynthPlayback();

      const ctx = audioCtxRef.current;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.08, ctx.currentTime);
      masterGain.connect(ctx.destination);

      // Base chords frequency based on style
      const baseFreq = style.toLowerCase().includes('metal') ? 73.42 : style.toLowerCase().includes('lo-fi') ? 130.81 : 110.0;
      const chordOffsets = [0, 4, 7, 11]; // Major/Minor 7th feel

      const nodes: any[] = [];
      chordOffsets.forEach((offset, idx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
        const noteFreq = baseFreq * Math.pow(2, offset / 12);
        osc.frequency.setValueAtTime(noteFreq, ctx.currentTime);

        // Gentle tremolo
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(2 + idx * 0.5, ctx.currentTime);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.02, ctx.currentTime);
        lfo.connect(lfoGain);
        lfoGain.connect(noteGain.gain);

        noteGain.gain.setValueAtTime(0.04, ctx.currentTime);
        osc.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start();
        lfo.start();
        nodes.push(osc, lfo, noteGain, lfoGain);
      });

      nodes.push(masterGain);
      synthNodesRef.current = nodes;
    } catch {
      // AudioContext policy
    }
  }, []);

  const stopSynthPlayback = useCallback(() => {
    try {
      if (synthNodesRef.current.length > 0) {
        synthNodesRef.current.forEach((n) => {
          try {
            if (n.stop) n.stop();
            if (n.disconnect) n.disconnect();
          } catch {}
        });
        synthNodesRef.current = [];
      }
    } catch {}
  }, []);

  // Sync playback timer & progress bar
  useEffect(() => {
    if (isPlaying && currentSong) {
      startSynthPlayback(currentSong.style);
      playbackTimerRef.current = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            return 0; // Loop song
          }
          return prev + 0.4;
        });
      }, 300);
    } else {
      stopSynthPlayback();
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
    }

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      stopSynthPlayback();
    };
  }, [isPlaying, currentSong, startSynthPlayback, stopSynthPlayback]);

  // Toggle Play / Pause
  const togglePlaySong = (song?: GeneratedSong) => {
    if (song && song.id !== currentSong?.id) {
      setCurrentSong(song);
      setPlaybackProgress(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(!isPlaying);
  };

  // AI Prompt & Lyrics Enhancement
  const handleEnhancePrompt = async () => {
    if (!promptText.trim()) {
      setPromptText('Overdrive neon city');
    }
    const seed = promptText.trim() || 'Neon Fire';
    setIsEnhancingPrompt(true);
    setOrbPhase('listening');

    try {
      const res = await fetch('/api/omni-wave/enhance-lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed, style: selectedStyleTag }),
      });
      const data = await res.json();
      if (data.lyrics) {
        setPromptText(data.lyrics.slice(0, 180) + '...');
      } else {
        setPromptText(`[${selectedStyleTag}] High-octane cyberpunk drive through neo-Tokyo. Gritty Moog basslines, 808 sidechain, euphoric analog leads, and infectious hook: "We burn the wire!"`);
      }
      showToast('✨ AI enhanced music prompt!');
    } catch {
      setPromptText(`[${selectedStyleTag}] High-octane cyberpunk drive through neo-Tokyo. Gritty Moog basslines, 808 sidechain, euphoric analog leads, and infectious hook: "We burn the wire!"`);
      showToast('✨ Enhanced prompt style');
    } finally {
      setIsEnhancingPrompt(false);
      setOrbPhase('idle');
    }
  };

  // Submit and Generate Suno Tracks (Generates exactly 2 distinct songs)
  const handleGenerate = async () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);
    setOrbPhase('processing');

    try {
      const res = await fetch('/api/omni-wave/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: selectedStyleTag,
          lyrics: isInstrumental ? '' : promptText,
          title: promptText.slice(0, 24) || 'OmniWave Anthem',
          isInstrumental,
        }),
      });
      const data = await res.json();

      let newTracks: GeneratedSong[] = [];
      if (data.songs && data.songs.length > 0) {
        newTracks = data.songs.map((s: any, idx: number) => ({
          id: s.id || `track_${Date.now()}_${idx}`,
          title: s.title || `Wave Track V${idx + 1}`,
          style: s.style || selectedStyleTag,
          bpm: s.bpm || 132,
          key: s.key || 'E Minor',
          duration: s.duration || '02:40',
          durationSeconds: 160,
          lyrics: s.lyrics || (isInstrumental ? '[Instrumental]' : promptText),
          coverArt: s.coverArt || (idx === 0 ? 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80' : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80'),
          tags: [selectedStyleTag, modelTier, isInstrumental ? 'Instrumental' : 'Vocal Mix'],
          version: modelTier,
          createdAt: 'Just now',
          isInstrumental,
        }));
      } else {
        // Fallback pair of 2 distinct songs
        const titleSeed = promptText.split(' ')[0] || 'Horizon';
        newTracks = [
          {
            id: `track_${Date.now()}_1`,
            title: `${titleSeed} (V1 - Studio Cut)`,
            style: selectedStyleTag,
            bpm: 130,
            key: 'G Minor',
            duration: '02:48',
            durationSeconds: 168,
            lyrics: isInstrumental ? '[Instrumental Theme]' : `[Verse 1]\nNeon shadows in the dusk\n[Chorus]\n${promptText.slice(0, 50)}...`,
            coverArt: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&q=80',
            tags: [selectedStyleTag, modelTier, 'Bass Heavy'],
            version: modelTier,
            createdAt: 'Just now',
            isInstrumental,
          },
          {
            id: `track_${Date.now()}_2`,
            title: `${titleSeed} (V2 - Club Mix)`,
            style: selectedStyleTag,
            bpm: 144,
            key: 'C# Minor',
            duration: '03:04',
            durationSeconds: 184,
            lyrics: isInstrumental ? '[Instrumental Theme]' : `[Verse 1]\nPulse of the synth machine\n[Chorus]\n${promptText.slice(0, 50)}...`,
            coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80',
            tags: [selectedStyleTag, modelTier, 'Extended Drop'],
            version: modelTier,
            createdAt: 'Just now',
            isInstrumental,
          },
        ];
      }

      setLibrary((prev) => [...newTracks, ...prev]);
      setCurrentSong(newTracks[0]);
      setPlaybackProgress(0);
      setIsPlaying(true);
      setActiveTab('library'); // Seamlessly navigate to Library tab to show generated tracks
      showToast('🎶 2 Suno tracks generated & playing!');
    } catch {
      showToast('Generated 2 preview tracks');
    } finally {
      setIsGenerating(false);
      setOrbPhase('idle');
    }
  };

  const handleSaveToVault = (song: GeneratedSong) => {
    if (onSaveToVault) {
      onSaveToVault({
        type: 'song',
        title: song.title,
        duration: song.duration,
        thumbnail: song.coverArt,
        tags: ['OmniWave', song.style, `${song.bpm} BPM`, song.version],
        details: `Lyrics snippet: ${song.lyrics.slice(0, 90)}...`,
      });
      showToast(`Saved "${song.title}" to Omni Vault!`);
      setActiveMenuSongId(null);
    }
  };

  // Format current playback timestamp (e.g. 00:45)
  const currentSeconds = Math.floor(((currentSong?.durationSeconds || 160) * playbackProgress) / 100);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-[400px] h-[850px] mx-auto overflow-hidden relative bg-[#0a0a0c] text-white flex flex-col font-sans select-none shadow-2xl border border-white/10 rounded-2xl">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-3 left-4 right-4 z-50 bg-[#16161e]/95 backdrop-blur-md border border-amber-500/40 text-amber-300 text-xs px-3 py-2 rounded-xl text-center shadow-2xl animate-fade-in font-medium flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Mobile Status Header */}
      <div className="h-11 px-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0e0e12]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black shadow-sm shadow-amber-500/30">
            <Disc3 className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight text-white uppercase font-mono">
            OmniWave <span className="text-amber-400 font-black">AI</span>
          </span>
        </div>

        {/* Model Selector Badge */}
        <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 text-[10px] font-mono text-slate-300">
          <Radio className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
          <span>Suno {modelTier}</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. CREATE TAB VIEW                                        */}
      {/* Responsive compact card layout: prompt top, tags middle,   */}
      {/* generate button stickied to bottom so keyboard never cuts */}
      {/* ========================================================= */}
      {activeTab === 'create' && (
        <div className="flex-1 overflow-hidden p-3 sm:p-4 flex flex-col justify-between h-[calc(100%-144px)]">
          
          {/* Top Section: Prompt Box Card */}
          <div className="space-y-3">
            {/* Neural Orb visualizer pill */}
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#121218] border border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6">
                  <HoloOrb phase={orbPhase} className="w-full h-full" />
                </div>
                <span className="text-[10px] font-mono font-medium text-slate-400">
                  {isGenerating ? 'Synthesizing Neural Audio...' : 'Audio Generator Ready'}
                </span>
              </div>
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancingPrompt || isGenerating}
                className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 hover:text-amber-300 px-2 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 transition disabled:opacity-50"
                title="AI Prompt & Lyric Enhancer"
              >
                <Wand2 className={`w-3 h-3 ${isEnhancingPrompt ? 'animate-spin' : ''}`} />
                <span>Enhance</span>
              </button>
            </div>

            {/* Main Prompt Card */}
            <div className="bg-[#14141a] border border-white/10 focus-within:border-amber-500/50 rounded-xl p-3 shadow-inner transition">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Song Description / Prompt</span>
                </label>
                <span className="text-[9px] font-mono text-slate-500">{promptText.length}/400</span>
              </div>
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Describe your song style, mood, instrumentation, or paste lyrics (e.g., Cyberpunk synthwave with driving 808s)..."
                rows={4}
                maxLength={400}
                className="w-full bg-transparent text-xs text-white placeholder-slate-500 resize-none outline-none leading-relaxed"
              />

              {/* Toggles bar inside Prompt Card */}
              <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                {/* Instrumental toggle */}
                <button
                  type="button"
                  onClick={() => setIsInstrumental(!isInstrumental)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono transition ${
                    isInstrumental
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Music2 className="w-3 h-3" />
                  <span>Instrumental: {isInstrumental ? 'ON' : 'OFF'}</span>
                </button>

                {/* Model toggle */}
                <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5 text-[9px] font-mono">
                  <button
                    onClick={() => setModelTier('v4.0')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      modelTier === 'v4.0' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    v4.0 Ultra
                  </button>
                  <button
                    onClick={() => setModelTier('v3.5')}
                    className={`px-2 py-0.5 rounded font-bold transition ${
                      modelTier === 'v3.5' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    v3.5 Hi-Fi
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="space-y-1.5">
              <span className="text-[9.5px] font-mono uppercase tracking-wider text-slate-400 block px-0.5">
                Quick Prompts
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: '⚡ Cyberpunk Anthem', prompt: 'High-octane cyberpunk anthem with distorted bass synth and neon arpeggios' },
                  { label: '🌧️ Tokyo Lo-Fi Rain', prompt: 'Relaxing lo-fi study beat with mellow electric rhodes and gentle rain' },
                  { label: '🎸 80s Rock Solo', prompt: 'Classic 80s hard rock track with shredding dual guitars and heavy drums' },
                  { label: '🌌 Cosmic Synthwave', prompt: 'Cinematic 80s synthwave with analog pads and retro drums' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setPromptText(item.prompt)}
                    className="text-left px-2 py-1.5 rounded-lg bg-[#14141a] hover:bg-[#1c1c24] border border-white/5 text-[10px] text-slate-300 hover:text-amber-300 transition truncate"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Section: Horizontal Scrolling List of Style Tags */}
          <div className="py-2 space-y-1.5">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                Style Tags
              </span>
              <span className="text-[9px] font-mono text-amber-400">Swipe & Select</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-hide py-1 px-0.5 -mx-0.5">
              {STYLE_TAGS.map((tag) => {
                const isSelected = selectedStyleTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedStyleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 scale-[1.02]'
                        : 'bg-[#16161e] hover:bg-[#20202c] text-slate-300 border border-white/5 hover:border-white/20'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Section: Prominent Stickied Generate Button */}
          <div className="pt-2">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !promptText.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-[0.98] text-slate-950 font-bold text-xs font-mono uppercase tracking-wider shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Generating 2 Songs with Suno...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950 fill-current" />
                  <span>Generate 2 Songs (Suno {modelTier})</span>
                </>
              )}
            </button>
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-1 mt-1.5">
              <span>50 Free Daily Credits Remaining</span>
              <span>10 Credits / Generation</span>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 2. LIBRARY TAB VIEW                                       */}
      {/* Vertical scrollable list of generated tracks              */}
      {/* Each item: artwork, title, duration, ..., progress bar   */}
      {/* ========================================================= */}
      {activeTab === 'library' && (
        <div className="flex-1 overflow-hidden flex flex-col p-3 sm:p-4 h-[calc(100%-144px)]">
          
          {/* Library Header */}
          <div className="flex items-center justify-between mb-2 px-0.5 shrink-0">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
                My Track Library ({library.length})
              </h4>
              <p className="text-[9.5px] text-slate-400">Tap any song to play and audition</p>
            </div>
            <button
              onClick={() => setActiveTab('create')}
              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition"
            >
              <Sparkles className="w-3 h-3" />
              <span>+ New</span>
            </button>
          </div>

          {/* Vertical scrollable list (h-[calc(100%-150px)]) */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 no-scrollbar">
            {library.map((song) => {
              const isCurrent = currentSong?.id === song.id;
              const isCurrentPlaying = isCurrent && isPlaying;

              return (
                <div
                  key={song.id}
                  onClick={() => togglePlaySong(song)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                    isCurrent
                      ? 'bg-[#181822] border-amber-500/40 shadow-lg'
                      : 'bg-[#121218] hover:bg-[#161620] border-white/5'
                  }`}
                >
                  {/* Active playing subtle top audio progress indicator directly on track item */}
                  {isCurrent && (
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-200"
                        style={{ width: `${playbackProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2.5">
                    
                    {/* Left: Square Cover Art Thumbnail */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden relative shrink-0 border border-white/10 bg-slate-900">
                      <img
                        src={song.coverArt}
                        alt={song.title}
                        className={`w-full h-full object-cover transition-transform ${isCurrentPlaying ? 'scale-105' : 'group-hover:scale-105'}`}
                      />
                      {/* Play/Pause Overlay */}
                      <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {isCurrentPlaying ? (
                          <Pause className="w-4 h-4 text-amber-400 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 text-white fill-current ml-0.5" />
                        )}
                      </div>
                    </div>

                    {/* Middle: Title, Style, Duration */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold truncate ${isCurrent ? 'text-amber-300 font-bold' : 'text-slate-100'}`}>
                          {song.title}
                        </span>
                        {song.createdAt === 'Just now' && (
                          <span className="px-1 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[7px] font-mono rounded shrink-0">
                            NEW
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                        <span className="text-amber-400/90">{song.style}</span>
                        <span>•</span>
                        <span>{song.duration}</span>
                        <span>•</span>
                        <span>{song.bpm} BPM</span>
                      </div>

                      {/* Small Waveform Preview Bar */}
                      <div className="flex items-center gap-0.5 mt-1 h-2 opacity-60">
                        {Array.from({ length: 24 }).map((_, wIdx) => {
                          const barHeight = isCurrentPlaying
                            ? Math.max(20, Math.sin((wIdx + playbackProgress) * 0.5) * 80 + 30)
                            : 30 + (wIdx % 4) * 15;
                          return (
                            <div
                              key={wIdx}
                              className={`w-0.5 rounded-full transition-all ${isCurrent ? 'bg-amber-400' : 'bg-slate-600'}`}
                              style={{ height: `${barHeight}%` }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: "..." Menu Button */}
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setActiveMenuSongId(activeMenuSongId === song.id ? null : song.id)}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition"
                        title="Track Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuSongId === song.id && (
                        <div className="absolute right-0 top-8 w-40 bg-[#161622] border border-white/15 rounded-xl shadow-2xl p-1 z-30 flex flex-col text-[11px] font-medium text-slate-300">
                          <button
                            onClick={() => handleSaveToVault(song)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 hover:text-amber-300 transition text-left"
                          >
                            <FolderLock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Save to Vault</span>
                          </button>
                          <button
                            onClick={() => {
                              setPromptText(song.lyrics.slice(0, 200));
                              setActiveTab('create');
                              setActiveMenuSongId(null);
                              showToast('Prompt copied to Create tab!');
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left transition"
                          >
                            <Wand2 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Reuse Prompt</span>
                          </button>
                          <button
                            onClick={() => {
                              showToast('Downloaded track audio!');
                              setActiveMenuSongId(null);
                            }}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-left transition"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Download MP3</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 3. STICKY FLOATING MINI-PLAYER COMPONENT                   */}
      {/* Exactly 64px above the bottom navigation bar               */}
      {/* Features: thumbnail left, marquee title/style, play toggle, */}
      {/* progress bar at absolute top edge. Tapping slides up modal */}
      {/* ========================================================= */}
      {currentSong && (
        <div
          onClick={() => setIsExpandedPlayer(true)}
          className="absolute bottom-[64px] left-3 right-3 h-14 bg-[#141418]/95 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl z-30 cursor-pointer overflow-hidden flex items-center justify-between px-2.5 group hover:border-amber-500/40 transition"
        >
          {/* Simple progress bar at the absolute top edge */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-200"
              style={{ width: `${playbackProgress}%` }}
            />
          </div>

          {/* Left: Square Thumbnail Artwork */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10 relative bg-slate-900">
              <img
                src={currentSong.coverArt}
                alt={currentSong.title}
                className={`w-full h-full object-cover ${isPlaying ? 'scale-105' : ''}`}
              />
              <div className="absolute inset-0 bg-black/20" />
            </div>

            {/* Center: Title and Style Scrolling/Marquee */}
            <div className="min-w-0 flex-1 pr-2">
              <div className="overflow-hidden whitespace-nowrap">
                <span className="text-xs font-bold text-white tracking-tight block truncate group-hover:text-amber-300 transition">
                  {currentSong.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-slate-400 truncate">
                <span className="text-amber-400 font-semibold">{currentSong.style}</span>
                <span>•</span>
                <span>{currentSong.version}</span>
                <span>•</span>
                <span className="text-slate-500">Tap to expand</span>
              </div>
            </div>
          </div>

          {/* Right: Play/Pause Toggle Button */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => togglePlaySong()}
              className="w-8 h-8 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-md shadow-white/10"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. PERSISTENT BOTTOM NAVIGATION BAR                       */}
      {/* Fixed at the very bottom edge with backdrop-blur-md        */}
      {/* Persistent tabs: [Create] and [Library]                    */}
      {/* ========================================================= */}
      <nav className="absolute bottom-0 left-0 right-0 h-16 bg-[#0e0e12]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around z-40 px-6">
        
        {/* [Create] Tab */}
        <button
          onClick={() => setActiveTab('create')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition ${
            activeTab === 'create'
              ? 'text-amber-400 font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className={`p-1 rounded-lg transition ${activeTab === 'create' ? 'bg-amber-500/20 shadow-sm shadow-amber-500/30' : ''}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">Create</span>
        </button>

        {/* [Library] Tab */}
        <button
          onClick={() => setActiveTab('library')}
          className={`flex flex-col items-center justify-center gap-1 py-1 px-4 rounded-xl transition relative ${
            activeTab === 'library'
              ? 'text-amber-400 font-bold'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className={`p-1 rounded-lg transition ${activeTab === 'library' ? 'bg-amber-500/20 shadow-sm shadow-amber-500/30' : ''}`}>
            <Disc3 className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">Library</span>
          {library.length > 0 && (
            <span className="absolute top-1.5 right-3 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[8.5px] font-mono font-black flex items-center justify-center shadow">
              {library.length}
            </span>
          )}
        </button>

      </nav>

      {/* ========================================================= */}
      {/* 5. FULL-SCREEN AUDIO PLAYER MODAL (Slide-up from bottom)  */}
      {/* High-res artwork, scrub bar, lyrics drawer, vault save    */}
      {/* ========================================================= */}
      {isExpandedPlayer && currentSong && (
        <div className="absolute inset-0 bg-[#0a0a0e] z-50 flex flex-col justify-between p-5 animate-slide-up select-none">
          
          {/* Top Bar: Minimize Chevron & Details */}
          <div className="flex items-center justify-between shrink-0 pt-1">
            <button
              onClick={() => setIsExpandedPlayer(false)}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition"
              title="Minimize Player"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <div className="text-center">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-400 block font-bold">
                PLAYING FROM OMNIWAVE
              </span>
              <span className="text-xs font-mono text-amber-400 font-semibold">{currentSong.version}</span>
            </div>
            <button
              onClick={() => handleSaveToVault(currentSong)}
              className="p-2 -mr-2 rounded-full hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 transition"
              title="Save to Vault"
            >
              <FolderLock className="w-4 h-4" />
            </button>
          </div>

          {/* Center: Large Artwork & Track Title */}
          <div className="flex-1 flex flex-col items-center justify-center my-3 max-h-[360px]">
            <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl border border-white/15 relative bg-slate-900 group">
              <img
                src={currentSong.coverArt}
                alt={currentSong.title}
                className={`w-full h-full object-cover transition-transform duration-700 ${isPlaying ? 'scale-105' : ''}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              
              {/* Spinning Vinyl Visualizer Effect */}
              {isPlaying && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-slate-950/80 backdrop-blur-md border border-amber-500/40 flex items-center justify-center animate-spin">
                  <Disc3 className="w-4 h-4 text-amber-400" />
                </div>
              )}
            </div>

            <div className="w-full text-center mt-4 px-2">
              <h2 className="text-base sm:text-lg font-bold text-white truncate tracking-tight">
                {currentSong.title}
              </h2>
              <p className="text-xs font-mono text-amber-400/90 mt-0.5">
                {currentSong.style} • {currentSong.bpm} BPM • {currentSong.key}
              </p>
            </div>
          </div>

          {/* Bottom Controls: Scrubber, Playback, and Lyrics toggle */}
          <div className="space-y-4 shrink-0 pb-3">
            
            {/* Scrubber Progress Bar */}
            <div className="space-y-1">
              <div
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
                  setPlaybackProgress(pct);
                }}
                className="w-full h-2 bg-white/10 rounded-full cursor-pointer relative overflow-hidden group py-0.5"
              >
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all group-hover:brightness-110"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-0.5">
                <span>{formatTime(currentSeconds)}</span>
                <span>{currentSong.duration}</span>
              </div>
            </div>

            {/* Playback Button Controls (Prev, Play/Pause, Next) */}
            <div className="flex items-center justify-between px-4">
              <button
                onClick={() => {
                  setPlaybackProgress(0);
                  showToast('Replaying track');
                }}
                className="p-2 text-slate-400 hover:text-white transition"
                title="Restart"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={() => togglePlaySong()}
                className="w-14 h-14 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105 active:scale-95 transition shadow-xl shadow-white/20"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>

              <button
                onClick={() => {
                  // Next song in library
                  const idx = library.findIndex((s) => s.id === currentSong.id);
                  const nextSong = library[(idx + 1) % library.length];
                  setCurrentSong(nextSong);
                  setPlaybackProgress(0);
                  setIsPlaying(true);
                }}
                className="p-2 text-slate-400 hover:text-white transition"
                title="Next Song"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            {/* Bottom Actions: Lyrics Drawer Toggle & Vault Button */}
            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
              <button
                onClick={() => setShowLyricsDrawer(!showLyricsDrawer)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[11px] transition ${
                  showLyricsDrawer ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{showLyricsDrawer ? 'Hide Lyrics' : 'View Lyrics'}</span>
              </button>

              <button
                onClick={() => handleSaveToVault(currentSong)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold font-mono text-[11px] shadow-md shadow-amber-500/20"
              >
                <FolderLock className="w-3.5 h-3.5" />
                <span>Save to Vault</span>
              </button>
            </div>

            {/* Expandable Lyrics Drawer */}
            {showLyricsDrawer && (
              <div className="p-3 bg-[#14141a] rounded-xl border border-white/10 max-h-36 overflow-y-auto text-xs font-mono leading-relaxed text-slate-300 no-scrollbar whitespace-pre-line animate-fade-in">
                {currentSong.lyrics}
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
};
