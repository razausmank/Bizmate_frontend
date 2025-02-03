import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

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

export type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastUpdatedAt: Date;
};

interface ChatStore {
  conversations: Conversation[];
  currentConversationId: string | null;
  files: UploadedFile[];
  isLoading: boolean;
  addMessage: (content: string, role: "user" | "assistant") => void;
  addFile: (file: UploadedFile) => void;
  updateFile: (id: string, updates: Partial<UploadedFile>) => void;
  removeFile: (id: string) => void;
  startNewConversation: () => void;
  setCurrentConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  files: [],
  isLoading: false,

  startNewConversation: () => {
    const newId = uuidv4();
    const now = new Date();
    set((state) => ({
      conversations: [
        {
          id: newId,
          title: "New Chat",
          messages: [],
          createdAt: now,
          lastUpdatedAt: now,
        },
        ...state.conversations,
      ],
      currentConversationId: newId,
    }));
  },

  addMessage: (content: string, role: "user" | "assistant") => {
    const now = new Date();
    const message: Message = {
      role,
      content,
      timestamp: now,
    };

    set((state) => {
      const { conversations, currentConversationId } = state;
      
      // If no current conversation, create one
      if (!currentConversationId) {
        const newId = uuidv4();
        return {
          conversations: [
            {
              id: newId,
              title: content.substring(0, 30) + "...",
              messages: [message],
              createdAt: now,
              lastUpdatedAt: now,
            },
            ...conversations,
          ],
          currentConversationId: newId,
        };
      }

      // Add message to existing conversation
      const updatedConversations = conversations.map((conv) => {
        if (conv.id === currentConversationId) {
          const updatedMessages = [...conv.messages, message];
          return {
            ...conv,
            title: conv.messages.length === 0 ? content.substring(0, 30) + "..." : conv.title,
            messages: updatedMessages,
            lastUpdatedAt: now,
          };
        }
        return conv;
      });

      return { conversations: updatedConversations };
    });
  },

  setCurrentConversation: (id: string) => {
    set({ currentConversationId: id });
  },

  deleteConversation: (id: string) => {
    set((state) => {
      const newConversations = state.conversations.filter((conv) => conv.id !== id);
      return {
        conversations: newConversations,
        currentConversationId: 
          state.currentConversationId === id
            ? newConversations[0]?.id ?? null
            : state.currentConversationId,
      };
    });
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