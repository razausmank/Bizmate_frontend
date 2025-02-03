"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import type { Conversation } from "@/store/chat-store";
import Link from "next/link";
import { Home, Menu, MessageSquare, Plus, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

type MonthGroup = {
  month: string;
  conversations: Conversation[];
};

export default function ChatPage() {
  const {
    conversations,
    currentConversationId,
    isLoading,
    addMessage,
    startNewConversation,
    setCurrentConversation,
    deleteConversation,
    setLoading,
  } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  // Group conversations by month
  const monthGroups = useMemo(() => {
    const groups: Record<string, MonthGroup> = {};
    
    conversations.forEach((conv) => {
      const month = conv.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[month]) {
        groups[month] = {
          month,
          conversations: []
        };
      }
      groups[month].conversations.push(conv);
    });

    // Convert to array and sort by date (most recent first)
    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.conversations[0].createdAt);
      const dateB = new Date(b.conversations[0].createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [conversations]);

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => 
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const message = formData.get("message") as string;
    
    if (!message.trim()) return;

    addMessage(message, "user");
    setLoading(true);

    // TODO: Integrate with Llama 3.1 API
    setTimeout(() => {
      addMessage(
        "This is a mock response. Llama 3.1 integration pending.",
        "assistant"
      );
      setLoading(false);
    }, 1000);

    (e.target as HTMLFormElement).reset();
  };

  const handleNewChat = () => {
    startNewConversation();
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-gray-50 dark:bg-gray-900 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              BizMate Chat 
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <Plus size={18} />
              <span>New Chat</span>
            </button>
            <Link
              href="/upload"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Upload Documents
            </Link>
          </div>
        </div>
      </div>

      {/* Collapsible Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-16 left-0 w-80 h-[calc(100vh-4rem)] bg-gray-800 text-white z-10 shadow-xl"
          >
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Chat History</h2>
              </div>
              <Link href="/" className="text-gray-400 hover:text-white">
                <Home size={20} />
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {monthGroups.map((group) => (
                <div key={group.month} className="mb-4">
                  <button
                    onClick={() => toggleMonth(group.month)}
                    className="w-full flex items-center justify-between p-2 hover:bg-gray-700 rounded-md mb-2"
                  >
                    <span className="text-sm text-gray-300">{group.month}</span>
                    {expandedMonths.includes(group.month) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {expandedMonths.includes(group.month) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-1"
                      >
                        {group.conversations.map((conv) => (
                          <div
                            key={conv.id}
                            className={`group flex items-center gap-3 p-3 ml-4 rounded-lg cursor-pointer mb-2 ${
                              currentConversationId === conv.id
                                ? "bg-gray-700"
                                : "hover:bg-gray-700/50"
                            }`}
                            onClick={() => {
                              setCurrentConversation(conv.id);
                              setIsSidebarOpen(false);
                            }}
                          >
                            <MessageSquare size={16} className="shrink-0" />
                            <span className="flex-1 truncate text-sm">{conv.title}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteConversation(conv.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 min-h-[calc(100vh-12rem)] flex flex-col"
          >
            <div className="flex-1 overflow-y-auto mb-4 space-y-4">
              {!currentConversation?.messages.length ? (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  Start a conversation by sending a message
                </div>
              ) : (
                currentConversation.messages.map((message, index) => (
                  <motion.div
                    key={`${currentConversation.id}-${index}`}
                    initial={{ opacity: 0, x: message.role === "user" ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                name="message"
                placeholder="Ask about your business data..."
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 p-3 
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  placeholder-gray-400 dark:placeholder-gray-300"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Send
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 