import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { 
  supabase, 
  getCurrentUser, 
  getSession, 
  onAuthStateChange, 
  listChatThreads, 
  createChatThread, 
  renameChatThread, 
  deleteChatThread, 
  loadThreadMessages, 
  saveChatMessage,
  ChatThreadItem 
} from '../lib/supabase';
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

interface OmniChatContextType {
  messages: ChatMessage[];
  threads: ChatThreadItem[];
  activeThread: ChatThreadItem | null;
  supabaseUser: SupabaseUser | null;
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

export const OmniChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME_MESSAGE]);
  const [threads, setThreads] = useState<ChatThreadItem[]>([]);
  const [activeThread, setActiveThread] = useState<ChatThreadItem | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [failedMessage, setFailedMessage] = useState<{ text: string; imageBase64?: string | null; council?: boolean } | null>(null);
  const [orbPhase, setOrbPhase] = useState<OrbPhase>('idle');
  const [activeStudioContext, setActiveStudioContext] = useState<StudioContextInfo | null>(null);
  const [isCompanionOpen, setIsCompanionOpen] = useState(false);

  // Initialize Supabase Auth & Threads
  useEffect(() => {
    getCurrentUser().then((u) => {
      setSupabaseUser(u);
      if (u) {
        refreshThreads(u.id);
      }
    });

    const { data: { subscription } } = onAuthStateChange((u) => {
      setSupabaseUser(u);
      if (u) {
        refreshThreads(u.id);
      } else {
        setThreads([]);
        setActiveThread(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshThreads = async (userId: string) => {
    try {
      const list = await listChatThreads(userId);
      setThreads(list);
      if (!activeThread && list.length > 0) {
        setActiveThread(list[0]);
        loadMessagesForThread(list[0].id, userId);
      }
    } catch (err) {
      console.warn('Could not list threads:', err);
    }
  };

  const loadMessagesForThread = async (threadId: string, userId: string) => {
    try {
      const records = await loadThreadMessages(threadId, userId);
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
      } else {
        setMessages([
          {
            id: `welcome-${threadId}`,
            sender: 'omni',
            text: "Conversation opened. Ready for your instructions.",
            timestamp: 'Just now',
            mode: 'normal',
          },
        ]);
      }
    } catch (err) {
      console.warn('Could not load thread messages:', err);
    }
  };

  const selectThread = async (thread: ChatThreadItem) => {
    setActiveThread(thread);
    setChatError(null);
    if (supabaseUser) {
      await loadMessagesForThread(thread.id, supabaseUser.id);
    }
  };

  const createNewThread = async (title = 'New conversation'): Promise<ChatThreadItem | null> => {
    if (!supabaseUser) {
      // Local guest thread
      const guestThread: ChatThreadItem = {
        id: crypto.randomUUID(),
        user_id: 'guest',
        title: title || 'New conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setActiveThread(guestThread);
      setMessages([INITIAL_WELCOME_MESSAGE]);
      return guestThread;
    }

    try {
      const created = await createChatThread(supabaseUser.id, title);
      setThreads((prev) => [created, ...prev]);
      setActiveThread(created);
      setMessages([
        {
          id: `welcome-${created.id}`,
          sender: 'omni',
          text: `New conversation started. I am OmniAI, ready to assist.`,
          timestamp: 'Just now',
          mode: 'normal',
        },
      ]);
      return created;
    } catch (err: any) {
      setChatError(`Could not create conversation: ${err?.message || err}`);
      return null;
    }
  };

  const renameCurrentThread = async (threadId: string, newTitle: string) => {
    if (!supabaseUser) {
      if (activeThread?.id === threadId) {
        setActiveThread((prev) => prev ? { ...prev, title: newTitle } : null);
      }
      return;
    }
    await renameChatThread(threadId, supabaseUser.id, newTitle);
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, title: newTitle } : t))
    );
    if (activeThread?.id === threadId) {
      setActiveThread((prev) => prev ? { ...prev, title: newTitle } : null);
    }
  };

  const deleteCurrentThread = async (threadId: string) => {
    if (!supabaseUser) {
      if (activeThread?.id === threadId) {
        setActiveThread(null);
        setMessages([INITIAL_WELCOME_MESSAGE]);
      }
      return;
    }
    await deleteChatThread(threadId, supabaseUser.id);
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThread?.id === threadId) {
      const remaining = threads.filter((t) => t.id !== threadId);
      if (remaining.length > 0) {
        setActiveThread(remaining[0]);
        loadMessagesForThread(remaining[0].id, supabaseUser.id);
      } else {
        setActiveThread(null);
        setMessages([INITIAL_WELCOME_MESSAGE]);
      }
    }
  };

  const clearChatError = () => {
    setChatError(null);
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

      // Determine active thread ID (must be a valid UUID for Supabase)
      let currentThreadId = activeThread?.id;
      if (!currentThreadId) {
        currentThreadId = crypto.randomUUID();
        const placeholderThread: ChatThreadItem = {
          id: currentThreadId,
          user_id: supabaseUser?.id || 'guest',
          title: cleanPrompt.slice(0, 40) || 'New conversation',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setActiveThread(placeholderThread);
        setThreads((prev) => [placeholderThread, ...prev]);
        if (supabaseUser) {
          createChatThread(supabaseUser.id, cleanPrompt.slice(0, 40)).catch(console.warn);
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

      setMessages((prev) => [...prev, userMsg]);
      setIsGenerating(true);
      setOrbPhase('processing');

      // Save user message to Supabase if authenticated
      if (supabaseUser) {
        saveChatMessage(currentThreadId, supabaseUser.id, userMsgId, userMsg).catch((err) => {
          console.warn('Could not persist user message:', err);
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

        // Format according to AI SDK UI-message contract
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

        setMessages((prev) => [...prev, botMsg]);
        setOrbPhase('talking');

        // Speak aloud with user's selected browser voice
        if (omniVoice.getVoiceEnabled() && replyText) {
          omniVoice.speak(replyText);
        }

        // Persist reply to Supabase if authenticated
        if (supabaseUser) {
          saveChatMessage(currentThreadId, supabaseUser.id, botMsgId, botMsg).catch((err) => {
            console.warn('Could not persist reply:', err);
          });
        }

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
    [messages, activeThread, supabaseUser, activeStudioContext]
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
