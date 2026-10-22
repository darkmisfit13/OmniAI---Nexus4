import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Mail, 
  CheckSquare, 
  Plus, 
  ExternalLink, 
  Send, 
  Copy, 
  Check, 
  LogOut, 
  RefreshCw, 
  Folder, 
  Database,
  Lock,
  Sparkles,
  X,
  FolderLock
} from 'lucide-react';
import { 
  auth, 
  signInWithGoogleWorkspace, 
  signOut, 
  getCachedAccessToken 
} from '../lib/firebase';
import { 
  listGoogleDriveFiles, 
  listGmailThreads, 
  sendGmail, 
  DEFAULT_KEEP_NOTES, 
  DriveFileItem, 
  GmailMessageItem, 
  KeepNoteItem 
} from '../lib/workspace';
import { User } from 'firebase/auth';

interface WorkspaceHubProps {
  onInsertToKeyboard?: (text: string) => void;
  onLoadIntoScreenSimulator?: (title: string, body: string, sender: string) => void;
  onSaveToVault?: (asset: any) => void;
}

export const WorkspaceHub: React.FC<WorkspaceHubProps> = ({
  onInsertToKeyboard,
  onLoadIntoScreenSimulator,
  onSaveToVault,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [activeTab, setActiveTab] = useState<'drive' | 'gmail' | 'keep'>('drive');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Drive state
  const [driveFiles, setDriveFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  // Gmail state
  const [gmailMessages, setGmailMessages] = useState<GmailMessageItem[]>([]);
  const [isLoadingGmail, setIsLoadingGmail] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [isSendingMail, setIsSendingMail] = useState(false);
  const [mailSentSuccess, setMailSentSuccess] = useState(false);

  // Keep & Scratchpad state
  const [keepNotes, setKeepNotes] = useState<KeepNoteItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omni_keep_notes');
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return DEFAULT_KEEP_NOTES;
  });
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteBody, setNewNoteBody] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  // Floating '+' Quick Scratchpad Note Modal State
  const [showQuickScratchpad, setShowQuickScratchpad] = useState(false);
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteBody, setQuickNoteBody] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Synchronize Note directly with Global Vault & LocalStorage
  const syncNoteToVault = (title: string, body: string) => {
    const cleanTitle = title.trim() || 'Untitled Scratchpad';
    const vaultAsset = {
      id: `vault-scratchpad-${Date.now()}`,
      name: `${cleanTitle}.txt`,
      type: 'text' as const,
      studioSource: 'Workspace Hub',
      text: body.trim(),
      tags: ['scratchpad', 'workspace', 'vault', 'note'],
      createdAt: 'Just now',
    };

    // 1. Sync to localStorage for global vault persistence
    try {
      const existing = JSON.parse(localStorage.getItem('omni_vault_assets') || '[]');
      localStorage.setItem('omni_vault_assets', JSON.stringify([vaultAsset, ...existing]));
    } catch (err) {
      console.warn('Vault local storage warning:', err);
    }

    // 2. Broadcast vault update event across all drawers and components
    window.dispatchEvent(new CustomEvent('omni_vault_updated', { detail: { asset: vaultAsset } }));

    // 3. Sync to backend API endpoint
    fetch('/api/vault/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vaultAsset),
    }).catch((err) => console.warn('Vault server sync warning:', err));

    // 4. Invoke prop callback if passed
    onSaveToVault?.(vaultAsset);

    // 5. Tactile feedback
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (localStorage.getItem('omni_haptic_enabled') !== 'false') {
        try { navigator.vibrate(12); } catch {}
      }
    }

    // 6. Show notification toast
    setToastMessage(`✨ Scratchpad "${cleanTitle}" saved & synced to Vault.`);
    setTimeout(() => setToastMessage(null), 3200);
  };

  const handleCreateKeepNote = () => {
    if (!newNoteTitle.trim() && !newNoteBody.trim()) return;
    const title = newNoteTitle.trim() || 'Untitled Note';
    const body = newNoteBody.trim();
    const newNote: KeepNoteItem = {
      id: `keep_${Date.now()}`,
      title,
      body,
      isPinned: true,
      color: 'cyan',
      updatedAt: 'Just now',
    };
    const updated = [newNote, ...keepNotes];
    setKeepNotes(updated);
    try {
      localStorage.setItem('omni_keep_notes', JSON.stringify(updated));
    } catch {}
    syncNoteToVault(title, body);
    setNewNoteTitle('');
    setNewNoteBody('');
    setShowAddNote(false);
  };

  const handleSaveQuickScratchpad = () => {
    if (!quickNoteTitle.trim() && !quickNoteBody.trim()) return;
    const title = quickNoteTitle.trim() || 'Quick Scratchpad';
    const body = quickNoteBody.trim();
    const newNote: KeepNoteItem = {
      id: `keep_${Date.now()}`,
      title,
      body,
      isPinned: true,
      color: 'cyan',
      updatedAt: 'Just now',
    };
    const updated = [newNote, ...keepNotes];
    setKeepNotes(updated);
    try {
      localStorage.setItem('omni_keep_notes', JSON.stringify(updated));
    } catch {}
    syncNoteToVault(title, body);
    setQuickNoteTitle('');
    setQuickNoteBody('');
    setShowQuickScratchpad(false);
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      if (user) {
        loadDrive();
        loadGmail();
      }
    });
    return () => unsubscribe();
  }, []);

  const loadDrive = async () => {
    setIsLoadingDrive(true);
    try {
      const files = await listGoogleDriveFiles();
      setDriveFiles(files);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const loadGmail = async () => {
    setIsLoadingGmail(true);
    try {
      const msgs = await listGmailThreads();
      setGmailMessages(msgs);
    } finally {
      setIsLoadingGmail(false);
    }
  };

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const { user } = await signInWithGoogleWorkspace();
      setCurrentUser(user);
      loadDrive();
      loadGmail();
    } catch (err) {
      console.error('Sign-in error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const handleSendEmail = async () => {
    if (!composeTo || !composeSubject || !composeBody) return;
    setIsSendingMail(true);
    try {
      const ok = await sendGmail(composeTo, composeSubject, composeBody);
      if (ok) {
        setMailSentSuccess(true);
        setTimeout(() => {
          setMailSentSuccess(false);
          setShowCompose(false);
          setComposeTo('');
          setComposeSubject('');
          setComposeBody('');
        }, 1500);
      }
    } finally {
      setIsSendingMail(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] text-slate-100 overflow-y-auto font-mono">
      {/* 1. GOOGLE WORKSPACE AUTHENTICATION HEADER */}
      <div className="p-3.5 bg-[#0B0B0C] border-b border-white/10 flex items-center justify-between">
        {currentUser ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2.5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-9 h-9 rounded-full border border-[#00f2fe]/40 shadow-[0_0_10px_rgba(0,242,254,0.3)]"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#0575e6] flex items-center justify-center font-bold text-white text-xs">
                  {currentUser.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <span className="text-xs font-semibold text-white block">
                  {currentUser.displayName || 'Google Account'}
                </span>
                <span className="text-[10px] text-slate-400 block leading-tight">
                  {currentUser.email}
                </span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg bg-black text-slate-400 hover:text-white border border-white/10 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center py-2 space-y-2">
            <p className="text-xs text-slate-400 text-center text-[11px]">
              Authorize Google Workspace to inspect Drive files, Gmail threads, and Keep ledgers.
            </p>

            <button
              onClick={handleSignIn}
              disabled={isAuthenticating}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-black font-bold text-xs shadow-[0_0_15px_rgba(255,255,255,0.2)] transition active:scale-95 disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isAuthenticating ? 'Connecting...' : 'Authorize Workspace'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. PRODUCT TABS */}
      <div className="grid grid-cols-3 p-1.5 bg-[#000000] border-b border-white/10 text-xs">
        <button
          onClick={() => setActiveTab('drive')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition ${
            activeTab === 'drive'
              ? 'bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/60 shadow-[0_0_10px_rgba(0,242,254,0.2)]'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Drive</span>
        </button>

        <button
          onClick={() => setActiveTab('gmail')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition ${
            activeTab === 'gmail'
              ? 'bg-[#7f00ff]/20 text-[#c084fc] border border-[#7f00ff]/60 shadow-[0_0_10px_rgba(127,0,255,0.2)]'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Gmail</span>
        </button>

        <button
          onClick={() => setActiveTab('keep')}
          className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-bold transition ${
            activeTab === 'keep'
              ? 'bg-[#0575e6]/20 text-[#38bdf8] border border-[#0575e6]/60 shadow-[0_0_10px_rgba(5,117,230,0.2)]'
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Keep</span>
        </button>
      </div>

      {/* 3. TAB BODIES */}
      <div className="p-3.5 flex-1 bg-[#000000]">
        {/* TAB 1: GOOGLE DRIVE */}
        {activeTab === 'drive' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-[#00f2fe]" />
                Drive Files & Ledgers
              </span>
              <button
                onClick={loadDrive}
                className="p-1 rounded-md text-slate-400 hover:text-white"
                title="Refresh Drive"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin text-[#00f2fe]' : ''}`} />
              </button>
            </div>

            <div className="space-y-2">
              {driveFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 rounded-xl bg-[#0B0B0C] border border-white/10 flex items-center justify-between gap-2.5 hover:border-[#00f2fe]/40 transition group"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1">
                    <FileText className="w-4 h-4 text-[#00f2fe] shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold text-slate-200 truncate">
                        {file.name}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        {file.modifiedTime || 'Synced with Drive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onInsertToKeyboard?.(`[Drive File: ${file.name}]`)}
                      className="px-2.5 py-1 rounded-lg bg-[#00f2fe]/20 text-[#00f2fe] border border-[#00f2fe]/40 text-[10px] font-bold hover:bg-[#00f2fe]/30 transition"
                      title="Insert reference into active keyboard input"
                    >
                      Insert
                    </button>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-black text-slate-400 hover:text-white border border-white/10"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: GMAIL */}
        {activeTab === 'gmail' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#7f00ff]" />
                Gmail Threads
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowCompose(!showCompose)}
                  className="px-2 py-1 rounded-lg bg-[#7f00ff]/20 text-[#c084fc] border border-[#7f00ff]/40 text-xs font-bold hover:bg-[#7f00ff]/30 transition"
                >
                  {showCompose ? 'Close' : '+ Compose'}
                </button>
                <button
                  onClick={loadGmail}
                  className="p-1 text-slate-400 hover:text-white"
                  title="Refresh Gmail"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingGmail ? 'animate-spin text-[#7f00ff]' : ''}`} />
                </button>
              </div>
            </div>

            {/* Compose Mail Drawer */}
            {showCompose && (
              <div className="p-3.5 rounded-2xl bg-[#0B0B0C] border border-[#7f00ff]/40 space-y-2.5 mb-3 animate-in fade-in">
                <span className="text-xs font-bold text-[#c084fc] block">Compose with OmniAI</span>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="To: recipient@example.com"
                  className="w-full rounded-xl bg-black border border-white/15 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#7f00ff]"
                />
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject: Status update"
                  className="w-full rounded-xl bg-black border border-white/15 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#7f00ff]"
                />
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Message body..."
                  rows={3}
                  className="w-full rounded-xl bg-black border border-white/15 p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#7f00ff]"
                />
                <button
                  onClick={handleSendEmail}
                  disabled={!composeTo || !composeSubject || !composeBody || isSendingMail}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#7f00ff] to-[#0575e6] text-white font-bold text-xs hover:brightness-110 transition disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(127,0,255,0.3)]"
                >
                  {isSendingMail ? (
                    'Sending via Gmail API...'
                  ) : mailSentSuccess ? (
                    'Sent Successfully! ✓'
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Email</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Gmail Messages List */}
            <div className="space-y-2">
              {gmailMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 rounded-xl bg-[#0B0B0C] border border-white/10 space-y-1.5 hover:border-[#7f00ff]/40 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white truncate max-w-[70%]">
                      {msg.from}
                    </span>
                    <span className="text-[10px] text-slate-500">{msg.date}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200">
                    {msg.subject}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {msg.snippet}
                  </p>

                  <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                    <button
                      onClick={() => onLoadIntoScreenSimulator?.(msg.subject || 'Gmail Email', msg.snippet, msg.from || 'Sender')}
                      className="text-[10px] text-[#00f2fe] hover:text-[#38bdf8] font-bold"
                    >
                      Inspect in Viewport Cognition →
                    </button>
                    <button
                      onClick={() => {
                        setComposeTo(msg.from?.match(/<([^>]+)>/)?.[1] || '');
                        setComposeSubject(`Re: ${msg.subject}`);
                        setShowCompose(true);
                      }}
                      className="text-[10px] text-[#c084fc] hover:text-[#d8b4fe] font-bold ml-auto"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE KEEP */}
        {activeTab === 'keep' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-[#0575e6]" />
                Keep Notes & Ledgers
              </span>
              <button
                onClick={() => setShowAddNote(!showAddNote)}
                className="px-2.5 py-1 rounded-lg bg-[#0575e6]/20 text-[#38bdf8] border border-[#0575e6]/40 text-xs font-bold hover:bg-[#0575e6]/30 transition"
              >
                {showAddNote ? 'Cancel' : '+ New Note'}
              </button>
            </div>

            {showAddNote && (
              <div className="p-3.5 rounded-2xl bg-[#0B0B0C] border border-[#0575e6]/40 space-y-2 mb-3">
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Note Title..."
                  className="w-full rounded-xl bg-black border border-white/15 px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0575e6]"
                />
                <textarea
                  value={newNoteBody}
                  onChange={(e) => setNewNoteBody(e.target.value)}
                  placeholder="Note body or checklist..."
                  rows={3}
                  className="w-full rounded-xl bg-black border border-white/15 p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#0575e6]"
                />
                <button
                  onClick={handleCreateKeepNote}
                  className="w-full py-2 rounded-xl bg-[#0575e6] text-white font-bold text-xs hover:bg-[#0284c7] transition"
                >
                  Save to Keep
                </button>
              </div>
            )}

            <div className="space-y-2.5">
              {keepNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-3 rounded-xl bg-[#0B0B0C] border border-white/10 hover:border-[#0575e6]/40 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#38bdf8]">
                      {note.title}
                    </span>
                    <span className="text-[10px] text-slate-500">{note.updatedAt}</span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed text-[11px]">
                    {note.body}
                  </p>
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                    <button
                      onClick={() => onInsertToKeyboard?.(note.body)}
                      className="px-2.5 py-1 rounded-lg bg-[#0575e6]/20 text-[#38bdf8] border border-[#0575e6]/40 text-[10px] font-bold hover:bg-[#0575e6]/30 transition"
                    >
                      Insert into Input
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FLOATING '+' SCRATCHPAD NOTE BUTTON */}
      <div className="fixed bottom-24 right-5 sm:bottom-28 sm:right-8 z-40">
        <button
          type="button"
          onClick={() => {
            setShowQuickScratchpad(true);
            if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
              if (localStorage.getItem('omni_haptic_enabled') !== 'false') {
                try { navigator.vibrate(10); } catch {}
              }
            }
          }}
          className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#00f2fe] via-[#0575e6] to-[#7f00ff] text-white shadow-[0_0_25px_rgba(0,242,254,0.45)] hover:shadow-[0_0_35px_rgba(0,242,254,0.7)] hover:scale-105 active:scale-95 transition-all duration-200 border border-white/30"
          title="Create Scratchpad Note (Auto-syncs with Vault)"
          aria-label="Create Scratchpad Note"
        >
          <Plus className="w-7 h-7 text-white stroke-[2.5] group-hover:rotate-90 transition-transform duration-300" />
          <span className="absolute -top-9 right-0 bg-[#090b14]/95 text-cyan-300 text-[10px] font-mono px-2.5 py-1 rounded-md border border-cyan-500/30 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-lg">
            + Scratchpad → Vault Sync
          </span>
        </button>
      </div>

      {/* QUICK SCRATCHPAD MODAL */}
      {showQuickScratchpad && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 animate-in fade-in">
          <div className="relative w-full max-w-lg bg-[#090b14] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col space-y-4 p-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>New Scratchpad Note</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                      Vault Auto-Sync
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Captures raw thoughts & automatically persists to the Global Vault.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowQuickScratchpad(false);
                  setQuickNoteTitle('');
                  setQuickNoteBody('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Inputs */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Note Title
                </label>
                <input
                  type="text"
                  value={quickNoteTitle}
                  onChange={(e) => setQuickNoteTitle(e.target.value)}
                  placeholder="e.g., Midnight Production Directives, Architecture Idea..."
                  className="w-full rounded-xl bg-black border border-white/15 px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Scratchpad Content
                </label>
                <textarea
                  rows={5}
                  value={quickNoteBody}
                  onChange={(e) => setQuickNoteBody(e.target.value)}
                  placeholder="Type raw lyrics, code logic, concept sketches, checklist items, or heavy emotional prompts..."
                  className="w-full rounded-xl bg-black border border-white/15 p-3.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400 font-mono leading-relaxed"
                />
              </div>

              {/* Sync Destination Indicator */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-950/30 via-slate-900 to-cyan-950/30 border border-purple-500/20 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-purple-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Vault Destination: <strong className="text-white">/vault/scratchpads</strong></span>
                </div>
                <span className="font-mono text-[10px] text-cyan-400">⚡ Instant Sync</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setShowQuickScratchpad(false);
                  setQuickNoteTitle('');
                  setQuickNoteBody('');
                }}
                className="px-4 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs font-mono transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveQuickScratchpad}
                disabled={!quickNoteTitle.trim() && !quickNoteBody.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,242,254,0.3)] transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Save & Sync to Vault</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#090b14] border border-cyan-500/50 text-cyan-300 text-xs px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(0,242,254,0.3)] font-mono animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

