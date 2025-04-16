import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { apiConfig } from "@/lib/config";

// Helper function to get the API URL with CORS proxy if needed
const getApiUrl = (host: string, endpoint: string) => {
  // Check if we're running in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  // Use local API route as proxy in development to avoid CORS issues
  if (isDev) {
    // Encode the entire endpoint including any query parameters
    return `/api/proxy?host=${encodeURIComponent(host)}&endpoint=${encodeURIComponent(endpoint)}`;
  }
  
  return `http://${host}/${endpoint}`;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  status: "uploading" | "uploaded" | "processing" | "error";
  s3Key?: string;
  error?: string;
};

export type Session = {
  session_id: string;
  title: string;
  created_at: string;
  last_updated: string;
  message_count: number;
};

export type ApiMessage = {
  role: "user" | "assistant";
  content: string;
};

export type HealthResponse = {
  status: string;
};

export type SessionsResponse = {
  sessions: Session[];
};

export type ConversationResponse = {
  session_id: string;
  user_id: string;
  messages: ApiMessage[];
  metadata: {
    created_at: string;
    last_updated: string;
    message_count: number;
    title: string;
  };
};

export type ChatResponse = {
  generation: string;
  session_id: string;
  messages: ApiMessage[];
  db_search?: any;
};

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastUpdatedAt: Date;
};

interface ChatStore {
  conversations: Conversation[];
  sessions: Session[];
  currentConversationId: string | null;
  files: UploadedFile[];
  isLoading: boolean;
  apiKey: string;
  userId: string;
  apiHost: string;
  isConnected: boolean;
  connectionError: string | null;
  addMessage: (content: string, role: "user" | "assistant") => void;
  sendMessage: (content: string) => Promise<void>;
  addFile: (file: UploadedFile) => void;
  updateFile: (id: string, updates: Partial<UploadedFile>) => void;
  removeFile: (id: string) => void;
  startNewConversation: () => void;
  setCurrentConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setApiKey: (key: string) => void;
  setUserId: (id: string) => void;
  setApiHost: (host: string) => void;
  connect: () => Promise<boolean>;
  loadSessions: () => Promise<void>;
  loadConversation: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

// Helper function to create a readable title from message content
const createTitleFromContent = (content: string): string => {
  // Truncate to 30 characters and add ellipsis if longer
  if (content.length <= 30) return content;
  
  // Try to find a good breaking point (space, comma, period)
  const breakPoints = [' ', ',', '.', '?', '!'];
  let bestBreakPoint = 30;
  
  for (const char of breakPoints) {
    const index = content.lastIndexOf(char, 30);
    if (index > 10) { // At least 10 chars for a meaningful title
      bestBreakPoint = index + 1; // Include the space/punctuation
      break;
    }
  }
  
  return content.substring(0, bestBreakPoint).trim() + '...';
};

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  sessions: [],
  currentConversationId: null,
  files: [],
  isLoading: false,
  apiKey: apiConfig.defaultApiKey,
  userId: "",
  apiHost: apiConfig.host,
  isConnected: false,
  connectionError: null,

  setApiKey: (key: string) => set({ apiKey: key }),
  
  setUserId: (id: string) => {
    // When changing user ID, reset the conversations and current ID
    set({ 
      userId: id,
      conversations: [],
      currentConversationId: null
    });
  },
  
  setApiHost: (host: string) => set({ apiHost: host }),
  
  connect: async () => {
    const { apiHost, apiKey, userId } = get();
    set({ isLoading: true, connectionError: null });
    
    try {
      // Test connection with health check
      const healthCheck = await axios.get<HealthResponse>(
        getApiUrl(apiHost, 'health'),
        { 
          headers: { 
            "X-API-Key": apiKey,
            // Add headers for CORS proxy
            "X-Requested-With": "XMLHttpRequest" 
          } 
        }
      );
      
      if (healthCheck.data.status === "healthy") {
        // When connecting, clear any existing conversation state
        set({ 
          isConnected: true, 
          isLoading: false,
          conversations: [], // Clear conversations
          currentConversationId: null // Reset current conversation
        });
        
        // Then load sessions for the new user
        await get().loadSessions();
        return true;
      } else {
        set({ 
          isConnected: false, 
          isLoading: false, 
          connectionError: "API is not healthy" 
        });
        return false;
      }
    } catch (error) {
      console.error("Connection error:", error);
      set({ 
        isConnected: false, 
        isLoading: false, 
        connectionError: "Failed to connect to API. Possible CORS issue. Try using the app in a non-development environment." 
      });
      return false;
    }
  },
  
  loadSessions: async () => {
    const { apiHost, apiKey, userId } = get();
    set({ isLoading: true });
    
    try {
      const response = await axios.get<SessionsResponse>(
        getApiUrl(apiHost, `sessions?user_id=${userId}`),
        { 
          headers: { 
            "X-API-Key": apiKey,
            "X-Requested-With": "XMLHttpRequest"
          } 
        }
      );
      
      if (response.data.sessions) {
        set({ 
          sessions: response.data.sessions,
          isLoading: false 
        });
      }
    } catch (error) {
      console.error("Failed to load sessions:", error);
      set({ isLoading: false });
    }
  },
  
  loadConversation: async (sessionId: string) => {
    const { apiHost, apiKey, userId } = get();
    set({ isLoading: true });
    
    try {
      const response = await axios.get<ConversationResponse>(
        getApiUrl(apiHost, `conversation?user_id=${userId}&session_id=${sessionId}`),
        { 
          headers: { 
            "X-API-Key": apiKey,
            "X-Requested-With": "XMLHttpRequest"
          } 
        }
      );
      
      if (response.data && response.data.messages) {
        const messages = response.data.messages.map((msg: ApiMessage) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(response.data.metadata.created_at)
        }));
        
        const conversation: Conversation = {
          id: sessionId,
          title: response.data.metadata.title || "Conversation",
          messages,
          createdAt: new Date(response.data.metadata.created_at),
          lastUpdatedAt: new Date(response.data.metadata.last_updated)
        };
        
    set((state) => ({
      conversations: [
            ...state.conversations.filter(c => c.id !== sessionId),
            conversation
          ],
          currentConversationId: sessionId,
          isLoading: false
        }));
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      set({ isLoading: false });
    }
  },

  sendMessage: async (content: string) => {
    const { apiHost, apiKey, userId, currentConversationId } = get();
    set({ isLoading: true });
    
    try {
      // Create the payload with the message
      const payload: {
        question: string;
        user_id: string;
        session_id?: string;
      } = {
        question: content,
        user_id: userId
      };
      
      // Only include session_id in the payload if we're in an existing session and it's a valid UUID
      if (currentConversationId && 
          get().sessions.some(s => s.session_id === currentConversationId) &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentConversationId)) {
        payload.session_id = currentConversationId;
        console.log(`Continuing session ${currentConversationId}`);
      } else {
        console.log("Starting new session or using regenerated ID");
      }
      
      // Add message to UI immediately for better UX
      get().addMessage(content, "user");
      
      console.log("Sending message with payload:", JSON.stringify(payload));
      
      const response = await axios.post<ChatResponse>(
        getApiUrl(apiHost, 'chat'),
        payload,
        { 
          headers: { 
            "X-API-Key": apiKey,
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest"
          } 
        }
      );
      
      console.log("Received response:", JSON.stringify(response.data));
      
      if (response.data.generation) {
        // Update UI with assistant response
        get().addMessage(response.data.generation, "assistant");
        
        const receivedSessionId = response.data.session_id;
        
        // If we received a session ID and either don't have one yet or it's different
        if (receivedSessionId && (!currentConversationId || currentConversationId !== receivedSessionId)) {
          
          console.log(`Updating session ID from ${currentConversationId || 'none'} to ${receivedSessionId}`);
          
          // Update the current conversation ID to match the backend's session_id
          set((state) => {
            // If this is updating an existing conversation
            if (currentConversationId) {
              const updatedConversations = state.conversations.map(c => 
                c.id === currentConversationId ? { ...c, id: receivedSessionId } : c
              );
              
              return {
                conversations: updatedConversations,
                currentConversationId: receivedSessionId
              };
            }
            
            return { currentConversationId: receivedSessionId };
          });
          
          // Refresh sessions from the backend
          await get().loadSessions();
        }
      }
      
      set({ isLoading: false });
    } catch (error) {
      console.error("Failed to send message:", error);
      set({ isLoading: false });
    }
  },

  startNewConversation: () => {
    const newId = null; // We'll get the real ID from the API after first message
    set({ currentConversationId: newId });
  },

  addMessage: (content: string, role: "user" | "assistant") => {
    const now = new Date();
    const message: Message = {
      role,
      content,
      timestamp: now,
    };

    set((state) => {
      const { conversations, currentConversationId, sessions } = state;
      
      // If no current conversation, create a temporary one
      if (!currentConversationId) {
        const tempId = uuidv4();
        return {
          conversations: [
            {
              id: tempId,
              title: role === "user" ? createTitleFromContent(content) : "New conversation",
              messages: [message],
              createdAt: now,
              lastUpdatedAt: now,
            },
            ...conversations,
          ],
          currentConversationId: tempId,
        };
      }

      // Check if we have a conversation with this ID
      const existingConversation = conversations.find(conv => conv.id === currentConversationId);
      
      if (existingConversation) {
      // Add message to existing conversation
      const updatedConversations = conversations.map((conv) => {
        if (conv.id === currentConversationId) {
          const updatedMessages = [...conv.messages, message];
            // Only update title if this is the first user message and the existing title is generic
            const shouldUpdateTitle = 
              role === "user" && 
              (conv.messages.length === 0 || 
               conv.title === "New conversation" || 
               conv.title === "New Chat");
            
          return {
            ...conv,
              title: shouldUpdateTitle ? createTitleFromContent(content) : conv.title,
            messages: updatedMessages,
            lastUpdatedAt: now,
          };
        }
        return conv;
      });

      return { conversations: updatedConversations };
      } else {
        // Check if this ID exists in sessions but not in conversations
        const session = sessions.find(s => s.session_id === currentConversationId);
        
        // Create a new conversation with this ID
        return {
          conversations: [
            {
              id: currentConversationId,
              title: session?.title || (role === "user" ? createTitleFromContent(content) : "New conversation"),
              messages: [message],
              createdAt: session ? new Date(session.created_at) : now,
              lastUpdatedAt: now,
            },
            ...conversations,
          ]
        };
      }
    });
  },

  setCurrentConversation: (id: string) => {
    const { conversations } = get();
    const conversation = conversations.find(c => c.id === id);
    
    if (conversation) {
    set({ currentConversationId: id });
    } else {
      // If conversation isn't loaded yet, load it
      get().loadConversation(id);
    }
  },

  deleteConversation: (id: string) => {
    get().deleteSession(id);
  },

  deleteSession: async (sessionId: string) => {
    const { apiHost, apiKey, userId } = get();
    set({ isLoading: true });
    
    try {
      await axios.delete(
        getApiUrl(apiHost, `session?user_id=${userId}&session_id=${sessionId}`),
        { 
          headers: { 
            "X-API-Key": apiKey,
            "X-Requested-With": "XMLHttpRequest"
          } 
        }
      );
      
    set((state) => {
        const newConversations = state.conversations.filter((conv) => conv.id !== sessionId);
        const newSessions = state.sessions.filter((session) => session.session_id !== sessionId);
        
      return {
        conversations: newConversations,
          sessions: newSessions,
        currentConversationId: 
            state.currentConversationId === sessionId
              ? null
            : state.currentConversationId,
          isLoading: false
      };
    });
    } catch (error) {
      console.error("Failed to delete session:", error);
      set({ isLoading: false });
    }
  },

  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
    })),

  updateFile: (id, updates) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, ...updates } : file
      ),
    })),

  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((file) => file.id !== id),
    })),

  setLoading: (loading) => set({ isLoading: loading }),
})); 