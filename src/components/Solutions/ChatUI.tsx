import React, { useCallback, useState } from 'react';

const ChatUI = ({
  chatHistory,
  chatInput,
  setChatInput,
  chatLoading,
  handleSendChat
}: {
  chatHistory: { role: 'user' | 'ai'; content: string }[]
  chatInput: string
  setChatInput: React.Dispatch<React.SetStateAction<string>>
  chatLoading: boolean
  handleSendChat: () => void
}) => {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChat()
    }
  }

  return (
    <div className="w-full h-[350px] bg-black/70 border-[3px] border-black/10 border-solid rounded-[20px] text-white font-sans backdrop-blur-md flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-white/60 rounded-full mr-3"></div>
          <span className="text-[13px] font-medium">AI Response</span>
        </div>
        <span className="text-[11px] text-white/60">What is AI Chat?</span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/20">
        {chatHistory.length === 0 && (
          <div className="text-white/60 text-center text-[12px]">Start a conversation...</div>
        )}

        <div className="space-y-3">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[280px] text-[12px] leading-relaxed whitespace-pre-wrap px-3 py-2 rounded-lg ${
                  message.role === 'user' ? 'text-white/90 bg-white/10 ml-auto' : 'text-white/90 bg-gray-800 mr-auto'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="text-white/60 text-[12px]">Typing...</div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-3 items-center bg-black/30 rounded-full px-4 py-3 border border-white/10">
          <input
            type="text"
            className="flex-1 bg-transparent border-none text-white text-[12px] placeholder-white/50 focus:outline-none"
            placeholder="How can I help you today?"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={chatLoading}
          />
          <button
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSendChat}
            disabled={chatLoading || !chatInput.trim()}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatUI;
