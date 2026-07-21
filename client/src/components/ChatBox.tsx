import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../types/game';
import { sound } from '../services/sound';

interface ChatBoxProps {
  chatHistory: ChatMessage[];
  myId?: string;
  onSendMessage: (message: string) => Promise<boolean>;
}

export const ChatBox: React.FC<ChatBoxProps> = ({ chatHistory, myId, onSendMessage }) => {
  const [text, setText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when chat history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;

    sound.playClick();
    setIsSending(true);
    const success = await onSendMessage(text.trim());
    setIsSending(false);
    if (success) {
      setText('');
    }
  };

  return (
    <div className="glass-panel border border-purple-500/25 rounded-3xl p-4 flex flex-col h-[320px] shadow-lg relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-500/15">
        <MessageSquare className="w-4 h-4 text-neon-cyan animate-pulse" />
        <span className="text-xs font-black uppercase tracking-wider text-purple-300">
          In-Game Text Chat
        </span>
      </div>

      {/* Messages Scroll Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1 scrollbar-thin"
      >
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-xs text-purple-300/40 p-4">
            <MessageSquare className="w-8 h-8 mb-1.5 opacity-30" />
            <p>No messages yet. Start the debate!</p>
          </div>
        ) : (
          chatHistory.map((msg, idx) => {
            const isMe = msg.senderId === myId;
            return (
              <div 
                key={idx} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] font-bold ${isMe ? 'text-neon-cyan' : 'text-purple-300'}`}>
                    {msg.senderName}
                  </span>
                  <span className="text-[8px] text-gray-500">{msg.timestamp}</span>
                </div>
                <div 
                  className={`px-3 py-1.5 rounded-2xl max-w-[85%] text-xs font-medium break-all ${
                    isMe 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none' 
                      : 'bg-dark-900/80 border border-purple-500/15 text-gray-150 rounded-tl-none'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSending}
          maxLength={150}
          placeholder="Send message to room..."
          className="flex-1 px-3 py-2 rounded-xl text-xs bg-dark-900 border border-purple-500/25 placeholder:text-gray-500 focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_8px_rgba(0,245,212,0.25)] text-white"
        />
        <button
          type="submit"
          disabled={!text.trim() || isSending}
          className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-500 border border-purple-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
