import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FolderLock, 
  X, 
  Music, 
  Video, 
  Image as ImageIcon, 
  FileCode, 
  Download, 
  ExternalLink, 
  Sparkles, 
  Trash2, 
  Check, 
  Layers,
  Play,
  Pause,
  Plus,
  Copy,
  Clock,
  Film,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Database,
  ShieldCheck,
  RefreshCw,
  LogIn,
  LogOut,
  Info,
  AlertCircle
} from 'lucide-react';
import { 
  supabase, 
  getCurrentUser, 
  onAuthStateChange, 
  listVaultAssets, 
  saveVaultAsset, 
  deleteVaultAsset,
  VaultAsset 
} from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

export type { VaultAsset };

export const initialVaultAssets: VaultAsset[] = [
  {
    id: 'vault-1',
    name: 'Midnight Cyber City Theme.mp3',
    type: 'audio',
    studioSource: 'OmniWave',
    duration: '2:45',
    bpm: 128,
    tags: ['synthwave', 'instrumental', 'master'],
    createdAt: '10 mins ago',
  },
  {
    id: 'vault-2',
    name: 'CapCut Glitch Reel v1.mp4',
    type: 'video',
    studioSource: 'OmniMotion',
    duration: '0:15',
    resolution: '1080x1920 (9:16)',
    tags: ['tiktok', 'reels', 'glitch-fx'],
    createdAt: '22 mins ago',
  },
  {
    id: 'vault-3',
    name: 'Omni Neon Hologram Portrait.png',
    type: 'image',
    studioSource: 'OmniImagine',
    resolution: '1024x1024',
    tags: ['cyberpunk', 'volumetric', 'avatar'],
    createdAt: '1 hour ago',
  },
  {
    id: 'vault-4',
    name: 'arbitrage_orderbook_engine.rs',
    type: 'code',
    studioSource: 'OmniCode',
    tags: ['rust', 'crypto', 'sub-millisecond'],
    codeSnippet: 'pub async fn execute_arb_flash_loan(pool: &Pool) -> Result<TxHash, ArbError> { ... }',
    createdAt: '2 hours ago',
  },
];

interface VaultAssetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assets?: VaultAsset[];
  onDeleteAsset?: (id: string) => void;
  onAddCustomAsset?: (asset: VaultAsset) => void;
  onInsertToKeyboard?: (text: string) => void;
}

export const VaultAssetsDrawer: React.FC<VaultAssetsDrawerProps> = ({
  isOpen,
  onClose,
  assets = initialVaultAssets,
  onDeleteAsset,
  onAddCustomAsset,
  onInsertToKeyboard,
}) => {
  const [internalAssets, setInternalAssets] = useState<VaultAsset[]>(assets);
  const [activeTab, setActiveTab] = useState<'all' | 'audio' | 'video' | 'image' | 'code'>('all');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<'date' | 'type' | 'label'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Supabase User Authentication State (Single backend for shared account data)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'Syncing' | 'Synced' | 'Error'>('Synced');
  const [syncStatusText, setSyncStatusText] = useState<string | null>(null);
  const [vaultQueryError, setVaultQueryError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Load authenticated Supabase user and listen to auth changes
  useEffect(() => {
    getCurrentUser().then((u) => {
      setSupabaseUser(u);
      if (u) {
        fetchUserVault(u.id);
      }
    });

    const { data: authListener } = onAuthStateChange((user) => {
      setSupabaseUser(user);
      if (user) {
        fetchUserVault(user.id);
      } else {
        setInternalAssets(assets.length > 0 ? assets : initialVaultAssets);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Fetch private Vault items from Supabase (enforces RLS: auth.uid() = user_id)
  const fetchUserVault = useCallback(async (userId: string) => {
    setIsSyncing(true);
    setSyncStatus('Syncing');
    setSyncStatusText('Loading your private vault from Supabase...');
    setVaultQueryError(null);
    try {
      const remoteAssets = await listVaultAssets(userId);
      if (remoteAssets && remoteAssets.length > 0) {
        setInternalAssets(remoteAssets);
        setSyncStatusText(`Synced ${remoteAssets.length} item${remoteAssets.length !== 1 ? 's' : ''} via Supabase RLS`);
      } else {
        // If no items in Supabase yet, keep initial sample assets
        setSyncStatusText('Connected to Supabase (RLS Active)');
      }
      setSyncStatus('Synced');
    } catch (err: any) {
      console.error('[VaultAssetsDrawer] Supabase Vault query failed:', err);
      const message = err?.message || 'Database query failed';
      setVaultQueryError(message);
      setSyncStatusText('Vault query failed (Check database table)');
      setSyncStatus('Error');
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Handle adding custom asset with Supabase persistence
  const handleAddAsset = async (asset: VaultAsset) => {
    // 1. Update local UI
    setInternalAssets((prev) => [asset, ...prev.filter((a) => a.id !== asset.id)]);
    if (onAddCustomAsset) {
      onAddCustomAsset(asset);
    }

    // 2. Persist to Supabase if authenticated
    if (supabaseUser) {
      setIsSyncing(true);
      setSyncStatus('Syncing');
      try {
        await saveVaultAsset(supabaseUser.id, asset);
        setSyncStatusText('Saved to Supabase with Row Level Security');
        setSyncStatus('Synced');
      } catch (err: any) {
        console.warn('[VaultAssetsDrawer] Failed to save to Supabase:', err);
        setSyncStatusText('Saved locally (Supabase write pending)');
        setSyncStatus('Error');
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncStatusText(null), 3000);
      }
    }
  };

  // Handle deleting an asset with Supabase persistence
  const handleDeleteAsset = async (id: string) => {
    setInternalAssets((prev) => prev.filter((a) => a.id !== id));
    if (onDeleteAsset) {
      onDeleteAsset(id);
    }

    if (supabaseUser) {
      setIsSyncing(true);
      setSyncStatus('Syncing');
      try {
        await deleteVaultAsset(supabaseUser.id, id);
        setSyncStatusText('Deleted from Supabase');
        setSyncStatus('Synced');
      } catch (err: any) {
        console.warn('[VaultAssetsDrawer] Failed to delete from Supabase:', err);
        setSyncStatus('Error');
      } finally {
        setIsSyncing(false);
        setTimeout(() => setSyncStatusText(null), 2500);
      }
    }
  };

  // Quick Supabase Auth Submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) return;
    setIsAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        setSyncStatusText('Confirmation email sent. Please check your inbox.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (error) throw error;
        setShowAuthModal(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSupabaseUser(null);
    setInternalAssets(initialVaultAssets);
    setSyncStatusText('Signed out (Switched to guest mode)');
    setTimeout(() => setSyncStatusText(null), 3000);
  };

  useEffect(() => {
    if (assets && !supabaseUser) {
      setInternalAssets(assets);
    }
  }, [assets, supabaseUser]);

  const currentList = internalAssets;
  const filteredAssets = useMemo(() => {
    const list = currentList.filter((asset) => {
      if (activeTab === 'all') return true;
      return asset.type === activeTab;
    });

    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = (a.createdAt || '').localeCompare(b.createdAt || '');
      } else if (sortBy === 'type') {
        comparison = (a.type || '').localeCompare(b.type || '');
      } else if (sortBy === 'label') {
        comparison = (a.name || '').localeCompare(b.name || '');
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [currentList, activeTab, sortBy, sortOrder]);

  if (!isOpen) return null;

  const togglePlayAudio = (id: string) => {
    setPlayingAudioId((prev) => (prev === id ? null : id));
  };

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (asset: VaultAsset) => {
    const element = document.createElement('a');
    let content = '';
    let mimeType = 'text/plain';

    if (asset.type === 'code' && asset.codeSnippet) {
      content = asset.codeSnippet;
      mimeType = 'text/javascript';
    } else if (asset.type === 'audio' && asset.lyrics) {
      content = `Title: ${asset.name}\nBPM: ${asset.bpm || 140}\n\nLyrics:\n${asset.lyrics}`;
    } else {
      content = asset.text || JSON.stringify(asset, null, 2);
    }

    const file = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(file);
    element.download = asset.name.toLowerCase().replace(/\s+/g, '_') + (asset.type === 'code' ? '.tsx' : '.txt');
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end font-sans">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      {/* Slide-over Drawer */}
      <div className="relative w-full max-w-md bg-[#0a0d16] border-l border-slate-800 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#080b12]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Omni Global Vault</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {internalAssets.length} Assets
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Shared media & project store across all 14 studios
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Close Vault"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supabase Unified Backend & Row Level Security Toolbar */}
        <div className="px-4 py-2.5 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-indigo-950/30 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-lg border transition ${
              supabaseUser 
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 shadow-[0_0_10px_rgba(0,242,254,0.2)]' 
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}>
              {supabaseUser ? <ShieldCheck className="w-4 h-4" /> : <Database className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white text-[11px]">Supabase Vault Sync</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  supabaseUser
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,242,254,0.2)]'
                    : 'bg-slate-800 text-slate-400 border border-slate-750'
                }`}>
                  {supabaseUser ? 'RLS ENFORCED' : 'LOCAL GUEST'}
                </span>
                
                {/* Visual Synchronization Status Indicator */}
                <div 
                  className="flex items-center gap-1 shrink-0" 
                  title={`Supabase Persistence Status: ${syncStatus}`}
                >
                  {syncStatus === 'Syncing' && (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.25)] animate-pulse">
                      <RefreshCw className="w-2.5 h-2.5 text-amber-400 animate-spin" />
                      <span>Syncing</span>
                    </span>
                  )}
                  {syncStatus === 'Synced' && (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span>Synced</span>
                    </span>
                  )}
                  {syncStatus === 'Error' && (
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-rose-300 bg-rose-500/20 border border-rose-500/50 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.3)] animate-pulse">
                      <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                      <span>Error</span>
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">
                {syncStatusText || (
                  supabaseUser
                    ? `Account: ${supabaseUser.email || supabaseUser.id.slice(0, 8)}`
                    : 'Sign in to isolate vault by account'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {supabaseUser ? (
              <>
                <button
                  type="button"
                  onClick={() => fetchUserVault(supabaseUser.id)}
                  disabled={isSyncing}
                  className="p-1 rounded-md text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition"
                  title="Reload from Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition"
                  title="Sign out of Supabase"
                >
                  <LogOut className="w-3 h-3 text-slate-400" />
                  <span>Exit</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 text-[10px] font-mono font-bold transition shadow-sm"
                title="Sign in with Supabase to sync your vault items across devices"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Visible Vault Query Failure Notice */}
        {vaultQueryError && (
          <div className="mx-4 my-2.5 p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs flex items-start gap-2.5 shadow-lg animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300">Vault Query Error</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-900/60 text-rose-200">
                  SQL Table Standby
                </span>
              </div>
              <p className="text-[11px] text-rose-300/90 font-mono mt-1 break-words">
                {vaultQueryError}
              </p>
              <p className="text-[10px] text-slate-300 mt-1.5 leading-relaxed">
                Notice: The <code className="text-cyan-300 font-mono">vault_assets</code> table does not exist in your Supabase project yet. Apply migration <code className="text-cyan-300 font-mono">supabase/migrations/20261021160000_create_vault_assets.sql</code> in your Supabase SQL editor to create it.
              </p>
            </div>
          </div>
        )}

        {/* Cross-Device Sync Verification Notice */}
        <div className="px-4 py-2 bg-slate-950/90 border-b border-slate-800 flex items-start gap-2 text-[10.5px] text-slate-400 font-mono leading-relaxed">
          <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-300 font-semibold block">Cross-Device Vault Sync: Not Ready Yet</span>
            <span>The Vercel web app does not yet read or write the <code className="text-cyan-300">vault_assets</code> table. Cross-device sync is inactive until the web app is updated to use this table.</span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 text-xs">
          {(['all', 'audio', 'video', 'image', 'code'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-center capitalize font-semibold transition-all ${
                activeTab === tab
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown Toolbar */}
        <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950 border-b border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'type' | 'label')}
              className="bg-slate-900 border border-slate-750 text-cyan-300 text-xs font-mono rounded-lg px-2.5 py-1 focus:outline-none focus:border-cyan-400 cursor-pointer"
            >
              <option value="date">Date Created</option>
              <option value="type">Asset Type</option>
              <option value="label">Label / Name</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">
              {filteredAssets.length} item{filteredAssets.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-mono text-[11px] transition"
              title={sortOrder === 'asc' ? 'Sorted Ascending (Click to switch to Descending)' : 'Sorted Descending (Click to switch to Ascending)'}
            >
              <span>{sortOrder === 'desc' ? 'Newest / Z-A' : 'Oldest / A-Z'}</span>
              {sortOrder === 'desc' ? (
                <ArrowDown className="w-3 h-3 text-cyan-400" />
              ) : (
                <ArrowUp className="w-3 h-3 text-cyan-400" />
              )}
            </button>
          </div>
        </div>

        {/* Asset Cards List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredAssets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <FolderLock className="w-10 h-10 text-slate-700" />
              <p className="text-xs font-semibold">No assets found in this filter.</p>
              <p className="text-[11px] text-slate-600">
                Use OmniMotion, OmniBeat, OmniWave, or OmniImagine and click "Save to Vault" to populate your media vault.
              </p>
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const isPlaying = playingAudioId === asset.id;

              return (
                <div
                  key={asset.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5 shadow-md"
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail / Icon */}
                    <div className="w-12 h-12 rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                      {asset.thumbnailUrl ? (
                        <img
                          src={asset.thumbnailUrl}
                          alt={asset.name}
                          className="w-full h-full object-cover"
                        />
                      ) : asset.type === 'audio' ? (
                        <Music className="w-5 h-5 text-emerald-400" />
                      ) : asset.type === 'video' ? (
                        <Film className="w-5 h-5 text-cyan-400" />
                      ) : asset.type === 'code' ? (
                        <FileCode className="w-5 h-5 text-purple-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-blue-400" />
                      )}

                      {/* Mini Play Icon for Audio */}
                      {asset.type === 'audio' && (
                        <button
                          onClick={() => togglePlayAudio(asset.id)}
                          className="absolute inset-0 bg-black/50 hover:bg-black/30 flex items-center justify-center text-white"
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 fill-current text-cyan-400" />
                          ) : (
                            <Play className="w-4 h-4 fill-current text-white ml-0.5" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="font-bold text-xs text-white truncate">{asset.name}</h4>
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Delete from Vault"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {asset.type}
                        </span>
                        {asset.duration && (
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {asset.duration}
                          </span>
                        )}
                        {asset.bpm && (
                          <span className="text-[10px] text-emerald-400 font-mono">
                            {asset.bpm} BPM
                          </span>
                        )}
                        {asset.resolution && (
                          <span className="text-[10px] text-cyan-400 font-mono">
                            {asset.resolution}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lyrics / Snippet Preview */}
                  {asset.lyrics && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 italic max-h-16 overflow-y-auto">
                      "{asset.lyrics.slice(0, 160)}..."
                    </div>
                  )}

                  {asset.codeSnippet && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-cyan-300 max-h-16 overflow-y-auto">
                      {asset.codeSnippet.slice(0, 140)}...
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-[10px] text-slate-500 font-mono">
                      {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'Recent'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {asset.codeSnippet && (
                        <button
                          onClick={() => copyCode(asset.codeSnippet!, asset.id)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] flex items-center gap-1"
                        >
                          {copiedId === asset.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDownload(asset)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Add Custom Asset Footer */}
        <div className="p-3 border-t border-slate-800 bg-[#080b12] flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-mono">
            {supabaseUser ? 'Supabase RLS Protected' : 'Guest Mode'}
          </span>
          <button
            onClick={() => {
              handleAddAsset({
                id: `asset-${Date.now()}`,
                name: `Quick Note Asset ${new Date().toLocaleTimeString()}`,
                type: 'text',
                text: 'Omni quick note saved to vault.',
                createdAt: new Date().toISOString(),
              });
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 font-semibold text-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Asset</span>
          </button>
        </div>

        {/* Modal: Supabase Account Sign-In / Sign-Up */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#090b14] border border-cyan-500/40 p-5 space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-bold text-sm text-white">
                    {authMode === 'login' ? 'Sign in to Supabase' : 'Create Supabase Account'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Connect your account to store and sync your Vault items under your own private user ID, protected by Supabase Row Level Security.
              </p>

              {authError && (
                <div className="p-2 rounded bg-rose-950/50 border border-rose-500/50 text-[11px] text-rose-300">
                  {authError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg bg-slate-900 border border-slate-750 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full py-2 rounded-lg bg-cyan-400 text-slate-950 font-bold hover:bg-cyan-300 transition text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isAuthLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{authMode === 'login' ? 'Sign In' : 'Sign Up'}</span>
                </button>
              </form>

              <div className="pt-2 text-center border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode((prev) => (prev === 'login' ? 'signup' : 'login'));
                    setAuthError(null);
                  }}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  {authMode === 'login'
                    ? "Don't have an account? Sign up"
                    : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
