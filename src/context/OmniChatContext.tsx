import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { 
  supabase, 
  getCurrentUser as getSupabaseUser, 
  getSession, 
  onAuthStateChange as onSupabaseAuthStateChange, 
  listChatThreads as listSupabaseThreads, 
  createChatThread as createSupabaseThread, 
  renameChatThread as renameSupabaseThread, 
  deleteChatThread as deleteSupabaseThread, 
  loadThreadMessages as loadSupabaseMessages, 
  saveChatMessage as saveSupabaseChatMessage,
  ChatThreadItem 
} from '../lib/supabase';
import { 
  auth as firebaseAuth, 
  saveFirebaseChatThread, 
  saveFirebaseChatMessage, 
  loadFirebaseChatThreads, 
  loadFirebaseChatMessages 
} from '../lib/firebase';
import { omniVoice } from '../lib/omniVoice';
import { OrbPhase } from '../components/HoloOrb';

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

export interface StudioContextInfo {
  id: string;
  name: string;
  tag: string;
}

export interface CloudSyncState {
  status: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
  provider: 'firebase' | 'supabase' | 'hybrid' | 'local';
  errorMessage?: string | null;
}

interface OmniChatContextType {
  messages: ChatMessage[];
  threads: ChatThreadItem[];
  activeThread: ChatThreadItem | null;
  supabaseUser: SupabaseUser | null;
  firebaseUser: FirebaseUser | null;
  cloudSyncState: CloudSyncState;
  isGenerating: boolean;
  chatError: string | null;
  failedMessage: { text: string; imageBase64?: string | null; council?: boolean } | null;
  orbPhase: OrbPhase;
  activeStudioContext: StudioContextInfo | null;
  setActiveStudioContext: (ctx: StudioContextInfo | null) => void;
  isCompanionOpen: boolean;
  setIsCompanionOpen: (open: boolean) => void;
  sendMessage: (
    userText: string, 
    options?: { imageBase64?: string | null; council?: boolean; studioContext?: string }
  ) => Promise<boolean>;
  retryLastMessage: () => Promise<void>;
  selectThread: (thread: ChatThreadItem) => Promise<void>;
  createNewThread: (title?: string) => Promise<ChatThreadItem | null>;
  renameCurrentThread: (threadId: string, newTitle: string) => Promise<void>;
  deleteCurrentThread: (threadId: string) => Promise<void>;
  syncAllToCloud: () => Promise<void>;
  clearChatError: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const OmniChatContext = createContext<OmniChatContextType | undefined>(undefined);

const INITIAL_WELCOME_MESSAGE: ChatMessage = {
  id: 'msg-welcome-init',
  sender: 'omni',
  text: "I am OmniAI, your creative partner. Whether you need direct intelligence, studio generation guidance, or the Unified Multi-LLM Council for high-stakes problem solving, I am online and listening.",
  timestamp: 'Just now',
  mode: 'normal',
};

// Local storage key constants for persistent offline and guest sessions
const LOCAL_THREADS_KEY = 'omni_chat_threads_cache_v2';
const LOCAL_MSG_PREFIX = 'omni_chat_msgs_cache_';

export const OmniChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Pre-load from cache if available to prevent flash of empty content
  const [threads, setThreads] = useState<ChatThreadItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_THREADS_KEY);
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  const [activeThread, setActiveThread] = useState<ChatThreadItem | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(LOCAL_THREADS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
        }
      } catch {}
    }
    return null;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedThreads = localStorage.getItem(LOCAL_THREADS_KEY);
        if (cachedThreads) {
          const parsedThreads = JSON.parse(cachedThreads);
          if (Array.isArray(parsedThreads) && parsedThreads.length > 0) {
            const firstId = parsedThreads[0].id;
            const cachedMsgs = localStorage.getItem(`${LOCAL_MSG_PREFIX}${firstId}`);
            if (cachedMsgs) return JSON.parse(cachedMsgs);
          }
        }
      } catch {}
    }
    return [INITIAL_WELCOME_MESSAGE];
  });

  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(firebaseAuth.currentUser);
  const [cloudSyncState, setCloudSyncState] = useState<CloudSyncState>({
    status: 'idle',
    lastSyncedAt: null,
    provider: 'local',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<{ text: string; imageBase64?: string | null; council?: boolean } | null>(null);
  const [orbPhase, setOrbPhase] = useState<OrbPhase>('idle');
  const [activeStudioContext, setActiveStudioContext] = useState<StudioContextInfo | null>(null);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);

  // Helper to persist in local storage cache
  const saveToLocalCache = (threadId: string, msgs: ChatMessage[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${LOCAL_MSG_PREFIX}${threadId}`, JSON.stringify(msgs));
      } catch {}
    }
  };

  const saveThreadsToLocalCache = (items: ChatThreadItem[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_THREADS_KEY, JSON.stringify(items));
      } catch {}
    }
  };

  // Sync threads and messages with Firebase / Supabase
  const syncWithRemoteServices = useCallback(async (fUser: FirebaseUser | null, sUser: SupabaseUser | null) => {
    const activeProvider: 'firebase' | 'supabase' | 'hybrid' | 'local' = 
      fUser && sUser ? 'hybrid' : fUser ? 'firebase' : sUser ? 'supabase' : 'local';

    setCloudSyncState((prev) => ({ ...prev, status: 'syncing', provider: activeProvider }));

    try {
      const mergedThreadsMap = new Map<string, ChatThreadItem>();

      // 1. Pull existing local threads
      threads.forEach((t) => mergedThreadsMap.set(t.id, t));

      // 2. Fetch Firebase Firestore threads
      if (fUser) {
        try {
          const fbThreads = await loadFirebaseChatThreads(fUser.uid);
          fbThreads.forEach((ft) => {
            mergedThreadsMap.set(ft.id, {
              id: ft.id,
              user_id: ft.userId,
              title: ft.title,
              created_at: ft.createdAt,
              updated_at: ft.updatedAt,
            });
          });
        } catch (fbErr) {
          console.warn('[CloudSync] Firebase thread pull error:', fbErr);
        }
      }

      // 3. Fetch Supabase threads
      if (sUser) {
        try {
          const sbThreads = await listSupabaseThreads(sUser.id);
          sbThreads.forEach((st) => {
            mergedThreadsMap.set(st.id, st);
          });
        } catch (sbErr) {
          console.warn('[CloudSync] Supabase thread pull error:', sbErr);
        }
      }

      const mergedList = Array.from(mergedThreadsMap.values()).sort(
        (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      );

      setThreads(mergedList);
      saveThreadsToLocalCache(mergedList);

      const targetThread = activeThread || (mergedList.length > 0 ? mergedList[0] : null);
      if (targetThread) {
        if (!activeThread) setActiveThread(targetThread);
        
        // Load messages for target thread
        let threadMsgs: ChatMessage[] = [];

        // Try Firebase first if authenticated
        if (fUser) {
          try {
            const fbMsgs = await loadFirebaseChatMessages(fUser.uid, targetThread.id);
            if (fbMsgs.length > 0) {
              threadMsgs = fbMsgs.map((m) => ({
                id: m.id,
                sender: m.sender,
                text: m.text,
                timestamp: m.timestamp,
                mode: (m.mode as any) || 'normal',
                councilData: m.councilData,
              }));
            }
          } catch {}
        }

        // Try Supabase if authenticated and empty
        if (sUser && threadMsgs.length === 0) {
          try {
            const sbMsgs = await loadSupabaseMessages(targetThread.id, sUser.id);
            if (sbMsgs.length > 0) {
              threadMsgs = sbMsgs.map((r) => {
                const m = r.message || {};
                return {
                  id: r.sdk_id || r.id,
                  sender: m.sender || (m.role === 'user' ? 'user' : m.mode === 'council' ? 'council' : 'omni'),
                  text: m.text || m.content || '',
                  timestamp: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier',
                  mode: m.mode || 'normal',
                  councilData: m.councilData,
                };
              });
            }
          } catch {}
        }

        // Fallback to local cache
        if (threadMsgs.length === 0) {
          const localCache = localStorage.getItem(`${LOCAL_MSG_PREFIX}${targetThread.id}`);
          if (localCache) {
            try { threadMsgs = JSON.parse(localCache); } catch {}
          }
        }

        if (threadMsgs.length > 0) {
          setMessages(threadMsgs);
          saveToLocalCache(targetThread.id, threadMsgs);
        }
      }

      setCloudSyncState({
        status: 'synced',
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        provider: activeProvider,
        errorMessage: null,
      });
    } catch (err: any) {
      console.warn('[CloudSync] Unified sync error:', err);
      setCloudSyncState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err?.message || 'Sync failed',
      }));
    }
  }, [threads, activeThread]);

  // Auth subscriptions for both Firebase and Supabase
  useEffect(() => {
    // 1. Firebase Auth Listener
    const unsubFirebase = onAuthStateChanged(firebaseAuth, (u) => {
      setFirebaseUser(u);
      syncWithRemoteServices(u, supabaseUser);
    });

    // 2. Supabase Auth Listener
    getSupabaseUser().then((u) => {
      setSupabaseUser(u);
      syncWithRemoteServices(firebaseAuth.currentUser, u);
    });

    const { data: { subscription } } = onSupabaseAuthStateChange((u) => {
      setSupabaseUser(u);
      syncWithRemoteServices(firebaseAuth.currentUser, u);
    });

    return () => {
      unsubFirebase();
      subscription.unsubscribe();
    };
  }, []);

  const selectThread = async (thread: ChatThreadItem) => {
    setActiveThread(thread);
    setChatError(null);

    // 1. Try local cache instantly
    const localMsgs = localStorage.getItem(`${LOCAL_MSG_PREFIX}${thread.id}`);
    if (localMsgs) {
      try {
        setMessages(JSON.parse(localMsgs));
      } catch {}
    }

    // 2. Fetch from Firebase
    if (firebaseUser) {
      try {
        const fbMsgs = await loadFirebaseChatMessages(firebaseUser.uid, thread.id);
        if (fbMsgs.length > 0) {
          const mapped: ChatMessage[] = fbMsgs.map((m) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            timestamp: m.timestamp,
            mode: (m.mode as any) || 'normal',
            councilData: m.councilData,
          }));
          setMessages(mapped);
          saveToLocalCache(thread.id, mapped);
          return;
        }
      } catch {}
    }

    // 3. Fetch from Supabase
    if (supabaseUser) {
      try {
        const records = await loadSupabaseMessages(thread.id, supabaseUser.id);
        if (records.length > 0) {
          const mapped: ChatMessage[] = records.map((r) => {
            const m = r.message || {};
            return {
              id: r.sdk_id || r.id,
              sender: m.sender || (m.role === 'user' ? 'user' : m.mode === 'council' ? 'council' : 'omni'),
              text: m.text || m.content || '',
              timestamp: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Earlier',
              mode: m.mode || 'normal',
              councilData: m.councilData,
            };
          });
          setMessages(mapped);
          saveToLocalCache(thread.id, mapped);
        }
      } catch {}
    }
  };

  const createNewThread = async (title = 'New conversation'): Promise<ChatThreadItem | null> => {
    const threadId = crypto.randomUUID();
    const newThread: ChatThreadItem = {
      id: threadId,
      user_id: firebaseUser?.uid || supabaseUser?.id || 'guest',
      title: title || 'New conversation',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setThreads((prev) => [newThread, ...prev]);
    saveThreadsToLocalCache([newThread, ...threads]);
    setActiveThread(newThread);

    const welcomeMsg: ChatMessage = {
      id: `welcome-${newThread.id}`,
      sender: 'omni',
      text: "New conversation initiated. OmniAI is ready.",
      timestamp: 'Just now',
      mode: 'normal',
    };
    setMessages([welcomeMsg]);
    saveToLocalCache(threadId, [welcomeMsg]);

    // Async sync to Firebase
    if (firebaseUser) {
      saveFirebaseChatThread(firebaseUser.uid, newThread).catch(console.warn);
      saveFirebaseChatMessage(firebaseUser.uid, threadId, welcomeMsg).catch(console.warn);
    }

    // Async sync to Supabase
    if (supabaseUser) {
      createSupabaseThread(supabaseUser.id, title).catch(console.warn);
    }

    return newThread;
  };

  const renameCurrentThread = async (threadId: string, newTitle: string) => {
    setThreads((prev) => {
      const updated = prev.map((t) => (t.id === threadId ? { ...t, title: newTitle, updated_at: new Date().toISOString() } : t));
      saveThreadsToLocalCache(updated);
      return updated;
    });

    if (activeThread?.id === threadId) {
      setActiveThread((prev) => prev ? { ...prev, title: newTitle } : null);
    }

    if (firebaseUser) {
      saveFirebaseChatThread(firebaseUser.uid, { id: threadId, title: newTitle, updatedAt: new Date().toISOString() }).catch(console.warn);
    }

    if (supabaseUser) {
      renameSupabaseThread(threadId, supabaseUser.id, newTitle).catch(console.warn);
    }
  };

  const deleteCurrentThread = async (threadId: string) => {
    const remaining = threads.filter((t) => t.id !== threadId);
    setThreads(remaining);
    saveThreadsToLocalCache(remaining);
    localStorage.removeItem(`${LOCAL_MSG_PREFIX}${threadId}`);

    if (activeThread?.id === threadId) {
      if (remaining.length > 0) {
        selectThread(remaining[0]);
      } else {
        setActiveThread(null);
        setMessages([INITIAL_WELCOME_MESSAGE]);
      }
    }

    if (supabaseUser) {
      deleteSupabaseThread(threadId, supabaseUser.id).catch(console.warn);
    }
  };

  const clearChatError = () => {
    setChatError(null);
  };

  const syncAllToCloud = async () => {
    await syncWithRemoteServices(firebaseUser, supabaseUser);
  };

  const sendMessage = useCallback(
    async (
      userText: string,
      options?: { imageBase64?: string | null; council?: boolean; studioContext?: string }
    ): Promise<boolean> => {
      const cleanPrompt = userText.trim();
      if (!cleanPrompt && !options?.imageBase64) return false;

      setChatError(null);
      setFailedMessage(null);

      // Determine active thread ID
      let currentThreadId = activeThread?.id;
      if (!currentThreadId) {
        currentThreadId = crypto.randomUUID();
        const placeholderThread: ChatThreadItem = {
          id: currentThreadId,
          user_id: firebaseUser?.uid || supabaseUser?.id || 'guest',
          title: cleanPrompt.slice(0, 40) || 'New conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setActiveThread(placeholderThread);
        setThreads((prev) => {
          const updated = [placeholderThread, ...prev];
          saveThreadsToLocalCache(updated);
          return updated;
        });

        if (firebaseUser) {
          saveFirebaseChatThread(firebaseUser.uid, placeholderThread).catch(console.warn);
        }
        if (supabaseUser) {
          createSupabaseThread(supabaseUser.id, cleanPrompt.slice(0, 40)).catch(console.warn);
        }
      }

      // Create and append user message
      const userMsgId = `user-${Date.now()}`;
      const userMsg: ChatMessage = {
        id: userMsgId,
        sender: 'user',
        text: cleanPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        mode: options?.council ? 'council' : 'normal',
      };

      setMessages((prev) => {
        const next = [...prev, userMsg];
        saveToLocalCache(currentThreadId, next);
        return next;
      });

      setIsGenerating(true);
      setOrbPhase('processing');

      // Sync user message to Firebase
      if (firebaseUser) {
        saveFirebaseChatMessage(firebaseUser.uid, currentThreadId, userMsg).catch((err) => {
          console.warn('[Firebase CloudSync] User message save error:', err);
        });
      }

      // Sync user message to Supabase
      if (supabaseUser) {
        saveSupabaseChatMessage(currentThreadId, supabaseUser.id, userMsgId, userMsg).catch((err) => {
          console.warn('[Supabase CloudSync] User message save error:', err);
        });
      }

      try {
        const session = await getSession();
        const authToken = session?.access_token;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        const formattedMessages = [
          ...messages.map((m) => ({
            id: m.id,
            role: m.sender === 'user' ? 'user' : 'assistant',
            parts: [{ type: 'text', text: m.text }],
          })),
          {
            id: userMsgId,
            role: 'user',
            parts: [
              ...(options?.imageBase64
                ? [{ type: 'file', url: options.imageBase64 }]
                : []),
              ...(cleanPrompt ? [{ type: 'text', text: cleanPrompt }] : []),
            ],
          },
        ];

        const studioContextPayload =
          options?.studioContext ||
          (activeStudioContext
            ? `Active Studio: ${activeStudioContext.name} (${activeStudioContext.tag})`
            : undefined);

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            threadId: currentThreadId,
            messages: formattedMessages,
            council: Boolean(options?.council),
            director: true,
            studioContext: studioContextPayload,
          }),
        });

        if (!res.ok) {
          let errorMsg = `Server error (${res.status})`;
          try {
            const errJson = await res.json();
            errorMsg = errJson.message || errJson.error || errorMsg;
          } catch {
            const errText = await res.text();
            if (errText) errorMsg = errText;
          }
          throw new Error(errorMsg);
        }

        const data = await res.json();
        const replyText = data.reply || data.verdict || '';

        const botMsgId = `omni-${Date.now()}`;
        const botMsg: ChatMessage = {
          id: botMsgId,
          sender: options?.council ? 'council' : 'omni',
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: options?.council ? 'council' : 'normal',
          councilData: data.councilData,
        };

        setMessages((prev) => {
          const next = [...prev, botMsg];
          saveToLocalCache(currentThreadId, next);
          return next;
        });
        setOrbPhase('talking');

        // Speak aloud with voice engine
        if (omniVoice.getVoiceEnabled() && replyText) {
          omniVoice.speak(replyText);
        }

        // Sync assistant reply to Firebase
        if (firebaseUser) {
          saveFirebaseChatMessage(firebaseUser.uid, currentThreadId, botMsg).catch((err) => {
            console.warn('[Firebase CloudSync] Assistant reply save error:', err);
          });
        }

        // Sync assistant reply to Supabase
        if (supabaseUser) {
          saveSupabaseChatMessage(currentThreadId, supabaseUser.id, botMsgId, botMsg).catch((err) => {
            console.warn('[Supabase CloudSync] Assistant reply save error:', err);
          });
        }

        setCloudSyncState((prev) => ({
          ...prev,
          status: 'synced',
          lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));

        setTimeout(() => {
          setOrbPhase('idle');
        }, 1200);

        return true;
      } catch (err: any) {
        console.error('Chat error:', err);
        setOrbPhase('idle');
        setChatError(err?.message || 'Failed to connect to OmniAI. Please try again.');
        setFailedMessage({
          text: cleanPrompt,
          imageBase64: options?.imageBase64,
          council: options?.council,
        });
        return false;
      } finally {
        setIsGenerating(false);
      }
    },
    [messages, activeThread, firebaseUser, supabaseUser, activeStudioContext]
  );

  const retryLastMessage = async () => {
    if (!failedMessage) return;
    const { text, imageBase64, council } = failedMessage;
    await sendMessage(text, { imageBase64, council });
  };

  return (
    <OmniChatContext.Provider
      value={{
        messages,
        threads,
        activeThread,
        supabaseUser,
        firebaseUser,
        cloudSyncState,
        isGenerating,
        chatError,
        failedMessage,
        orbPhase,
        activeStudioContext,
        setActiveStudioContext,
        isCompanionOpen,
        setIsCompanionOpen,
        sendMessage,
        retryLastMessage,
        selectThread,
        createNewThread,
        renameCurrentThread,
        deleteCurrentThread,
        syncAllToCloud,
        clearChatError,
        setMessages,
      }}
    >
      {children}
    </OmniChatContext.Provider>
  );
};

export const useOmniChat = (): OmniChatContextType => {
  const context = useContext(OmniChatContext);
  if (!context) {
    throw new Error('useOmniChat must be used within an OmniChatProvider');
  }
  return context;
};
