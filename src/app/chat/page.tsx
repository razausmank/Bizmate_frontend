"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/store/chat-store";
import type { Conversation, Session } from "@/store/chat-store";
import Link from "next/link";
import { Home, Menu, MessageSquare, Plus, Trash2, ChevronDown, ChevronRight, Settings, RefreshCw, Key, User } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";

// Helper function to render newlines as <br> tags
const renderNewlines = (text: string) => {
  return text.split('\\n').map((line, index, array) => (
    <span key={index}>
      {line}
      {index < array.length - 1 && <br />}
    </span>
  ));
};

type MonthGroup = {
  month: string;
  conversations: Conversation[];
};

export default function ChatPage() {
  const {
    conversations,
    sessions,
    currentConversationId,
    isLoading,
    isConnected,
    connectionError,
    apiKey,
    userId,
    apiHost,
    sendMessage,
    startNewConversation,
    setCurrentConversation,
    deleteConversation,
    setApiKey,
    setUserId,
    setApiHost,
    connect,
    loadConversation,
  } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Find the current conversation from state
  const currentConversation = useMemo(() => {
    return conversations.find(conv => conv.id === currentConversationId);
  }, [currentConversationId, conversations]);

  // Effect to load conversation data if it doesn't exist in state
  useEffect(() => {
    let isMounted = true;

    const fetchConversation = async () => {
      const shouldLoadConversation = 
        currentConversationId && 
        !conversations.some(conv => conv.id === currentConversationId) && 
        isConnected &&
        sessions.some(s => s.session_id === currentConversationId);
        
      if (shouldLoadConversation && isMounted) {
        try {
          await loadConversation(currentConversationId);
        } catch (error) {
          console.error("Error loading conversation:", error);
        }
      }
    };

    fetchConversation();

    return () => {
      isMounted = false;
    };
  }, [currentConversationId, conversations, sessions, isConnected, loadConversation]);

  // Group sessions by month
  const sessionGroups = useMemo(() => {
    const groups: Record<string, { month: string, sessions: Session[] }> = {};
    
    sessions.forEach((session) => {
      const date = new Date(session.created_at);
      const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!groups[month]) {
        groups[month] = {
          month,
          sessions: []
        };
      }
      groups[month].sessions.push(session);
    });

    // Convert to array and sort by date (most recent first)
    return Object.values(groups).sort((a, b) => {
      const dateA = new Date(a.sessions[0].created_at);
      const dateB = new Date(b.sessions[0].created_at);
      return dateB.getTime() - dateA.getTime();
    });
  }, [sessions]);

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
    
    await sendMessage(message);
    
    (e.target as HTMLFormElement).reset();
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const handleNewChat = () => {
    startNewConversation();
    setIsSidebarOpen(false);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const handleConnect = async () => {
    const success = await connect();
    
    if (success) {
      // Close the settings modal after successful connection
      setShowApiSettings(false);
      
      // Focus on message input when ready
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }
  };

  // Focus input when page loads
  useEffect(() => {
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-gray-50 dark:bg-gray-900 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
              aria-label="Toggle sidebar"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              BizMate Chat 
            </h1>
            {isConnected && (
              <div className="hidden md:flex items-center gap-2 bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-md text-xs font-medium text-gray-700 dark:text-gray-300">
                <User size={12} />
                <span className="truncate max-w-[150px]">{userId}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowApiSettings(!showApiSettings)}
              className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
              title="API Settings"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <Plus size={18} />
              <span>New Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* API Settings Modal */}
      <AnimatePresence>
        {showApiSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center"
            onClick={() => setShowApiSettings(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">API Connection</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">API Host</label>
                  <div className="flex">
                    <input 
                      type="text"
                      value={apiHost}
                      onChange={(e) => setApiHost(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                      placeholder="host:port"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                  <div className="flex">
                    <input 
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                      placeholder="Enter your API key"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">User ID</label>
                  <div className="flex">
                    <input 
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
                      placeholder="Enter your user ID"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700" 
                    onClick={() => setShowApiSettings(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className={`px-4 py-2 flex items-center gap-2 ${
                      isConnected 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "bg-blue-600 hover:bg-blue-700"
                    } text-white rounded-md`} 
                    onClick={handleConnect}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Connecting...
                      </>
                    ) : isConnected ? (
                      <>
                        Connected
                      </>
                    ) : (
                      <>
                        Connect
                      </>
                    )}
                  </button>
                </div>
                
                {connectionError && (
                  <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 rounded-md text-sm">
                    {connectionError}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsible Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-16 left-0 w-80 h-[calc(100vh-4rem)] bg-gray-800 text-white z-10 shadow-xl overflow-hidden flex flex-col"
          >
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Chat History</h2>
              </div>
              <Link href="/" className="text-gray-400 hover:text-white">
                <Home size={20} />
              </Link>
            </div>

            <div className="p-4 border-b border-gray-700 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <User size={14} />
                <span className="truncate">{userId || "Not connected"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <Key size={14} />
                <span className="truncate">{apiKey ? "API Key set" : "No API Key"}</span>
              </div>
              <button
                onClick={isConnected ? handleNewChat : handleConnect}
                className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md ${
                  isConnected
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-green-600 hover:bg-green-700"
                }`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    {isConnected ? "Creating..." : "Connecting..."}
                  </>
                ) : isConnected ? (
                  <>
                    <Plus size={16} />
                    New Chat
                  </>
                ) : (
                  <>
                    Connect
                  </>
                )}
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {!isConnected ? (
                <div className="p-4 text-center text-gray-400">
                  Connect to view your sessions
                </div>
              ) : sessions.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  No conversations yet
                </div>
              ) : (
                <div className="p-4">
                  {sessionGroups.map((group) => (
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
                            {group.sessions.map((session) => (
                              <div
                                key={session.session_id}
                                className={`group flex items-center gap-3 p-3 ml-4 rounded-lg cursor-pointer mb-2 ${
                                  currentConversationId === session.session_id
                                    ? "bg-gray-700"
                                    : "hover:bg-gray-700/50"
                                }`}
                                onClick={() => {
                                  setCurrentConversation(session.session_id);
                                  setIsSidebarOpen(false);
                                }}
                              >
                                <MessageSquare size={16} className="shrink-0" />
                                <span className="flex-1 truncate text-sm">{session.title}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConversation(session.session_id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-600 rounded"
                                  aria-label="Delete conversation"
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
              )}
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
            {!isConnected ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-6 rounded-full">
                  <Settings size={32} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-medium text-gray-800 dark:text-gray-200">Connect to API</h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-md">
                  Configure your API key and user ID to start chatting.
                </p>
                <button
                  onClick={() => setShowApiSettings(true)}
                  className={`mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700`}
                  aria-label="Configure API Connection"
                >
                  Configure API
                </button>
              </div>
            ) : (
              <>
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
                          } whitespace-pre-wrap`}
                        >
                          {renderNewlines(message.content)}
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
                    ref={messageInputRef}
                    type="text"
                    name="message"
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Type your message..."
                    disabled={!isConnected || isLoading}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!isConnected || isLoading}
                  >
                    Send
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
} 