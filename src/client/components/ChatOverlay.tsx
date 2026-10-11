'use client';

import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

const QUICK_PRESETS = [
  'How far my people! 👋',
  'Mama Bole dey hot today! 🥘',
  'Olu Obasanjo road clear! 🚗',
  'Elder Tamuno, ₦200 Garrison drop! 🛺',
  'Garden City dey vibe! 🇳🇬',
];

export function ChatOverlay() {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const chatMessages = useGameStore((state) => state.chatMessages);
  const sendChatMessage = useGameStore((state) => state.sendChatMessage);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat log to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isExpanded]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    sendChatMessage(text);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="absolute bottom-20 sm:bottom-6 left-4 z-40 max-w-sm sm:max-w-md w-full pointer-events-none select-none">
      <div className="pointer-events-auto flex flex-col items-start gap-2">
        {/* Toggle / Unread Pill */}
        <button
          onClick={() => {
            setIsExpanded(!isExpanded);
            if (!isExpanded) {
              setTimeout(() => inputRef.current?.focus(), 100);
            }
          }}
          className="px-3.5 py-1.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-2 cursor-pointer transition-all active:scale-95"
        >
          <span>💬</span>
          <span>Neighbourhood Chat</span>
          <span className="px-1.5 py-0.2 bg-amber-500/20 rounded-full text-[10px]">
            {chatMessages.length}
          </span>
          <span className="text-[10px] text-zinc-400">
            {isExpanded ? '▼' : '▲'}
          </span>
        </button>

        {/* Collapsible Chat Window */}
        {isExpanded && (
          <div className="w-full bg-zinc-950/90 backdrop-blur-lg border border-white/15 rounded-3xl p-4 shadow-2xl flex flex-col gap-3 text-white animate-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                D-Line Local Chat
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Message Stream */}
            <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1 text-xs">
              {chatMessages.map((msg) => (
                <div key={msg.id} className="flex flex-col gap-0.5 bg-white/5 rounded-xl p-2 border border-white/5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-400">
                      {msg.displayName}
                    </span>
                    <span className="text-[9px] text-zinc-400 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-zinc-200 text-xs break-words">
                    {msg.text}
                  </p>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Nigerian Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/10">
              {QUICK_PRESETS.map((preset, i) => (
                <button
                  key={`preset-${i}`}
                  onClick={() => handleSend(preset)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 border border-white/10 transition-colors cursor-pointer active:scale-95"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="flex items-center gap-2 mt-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                maxLength={140}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type in D-Line chat..."
                className="flex-1 bg-zinc-900 border border-white/20 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
              <button
                onClick={() => handleSend()}
                disabled={!inputText.trim()}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95"
              >
                Send
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
