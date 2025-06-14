"use client";

import { useState } from 'react';

type Message = { type: 'user' | 'ai'; content: string };

export default function PopupPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendPrompt = async () => {
    if (!prompt.trim()) return;
    
    const userMessage: Message = { type: 'user', content: prompt };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    const currentPrompt = prompt;
    setPrompt('');
    
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt }),
      });
      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
      
      const aiMessage: Message = { type: 'ai', content };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage: Message = { type: 'ai', content: 'Error occurred while processing your request.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  interface KeyPressEvent extends React.KeyboardEvent<HTMLInputElement> {}

  const handleKeyPress = (e: KeyPressEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  };

  return (
    <div className="w-full h-full overflow-hidden bg-transparent flex items-center justify-center">
      <div className="w-[500px] h-[350px] bg-black/70 border-[3px] border-black/10 border-solid rounded-[20px] text-white font-sans backdrop-blur-md flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 drag">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-white/60 rounded-full mr-3"></div>
            <span className="text-[13px] font-medium">AI Response</span>
          </div>
          <span className="text-[11px] text-white/60">What is AI Chat?</span>
        </div>

        <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20 no-drag">
          {messages.length === 0 && (
            <div className="text-white/60 text-center text-[12px]">Start a conversation...</div>
          )}
          
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[280px] text-[12px] leading-relaxed ${
                  message.type === 'user' 
                    ? 'text-white/90 ml-auto bg-white/10 px-3 py-2 rounded-lg' 
                    : 'text-white/90 mr-auto'
                }`}>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="text-white/60 text-[12px]">
                  Typing...
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 no-drag">
          <div className="flex gap-3 items-center bg-black/30 rounded-full px-4 py-3 border border-white/10">
            <input
              type="text"
              className="flex-1 bg-transparent border-none text-white text-[12px] placeholder-white/50 focus:outline-none no-drag"
              placeholder="How can I help you today?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed no-drag"
              onClick={sendPrompt}
              disabled={loading || !prompt.trim()}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}