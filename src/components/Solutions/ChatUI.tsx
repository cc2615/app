import React, { useCallback, useState } from 'react';
import 'katex/dist/katex.min.css';

// simple LaTeX renderer using KaTeX
const renderLatex = (text: string) => {
  // split text by LaTeX delimiters
  const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/);
  
  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      // block math
      const latex = part.slice(2, -2);
      try {
        const katex = (window as any).katex;
        if (katex) {
          return (
            <div key={index} className="my-2 text-center">
              <span
                dangerouslySetInnerHTML={{
                  __html: katex.renderToString(latex, { displayMode: true })
                }}
              />
            </div>
          );
        }
      } catch (e) {
        return <span key={index} className="text-red-400">[Math Error: {latex}]</span>;
      }
    } else if (part.startsWith('$') && part.endsWith('$')) {
      // inline math
      const latex = part.slice(1, -1);
      try {
        const katex = (window as any).katex;
        if (katex) {
          return (
            <span
              key={index}
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(latex, { displayMode: false })
              }}
            />
          );
        }
      } catch (e) {
        return <span key={index} className="text-red-400">[Math Error: {latex}]</span>;
      }
    }
    
    // regular text with basic markdown-like formatting
    return formatText(part, index);
  });
};

const formatText = (text: string, key: number) => {
  // handle code blocks
  if (text.includes('```')) {
    const parts = text.split(/(```[\s\S]*?```)/);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).trim();
        const lines = code.split('\n');
        const language = lines[0].includes(' ') ? '' : lines[0];
        const codeContent = language ? lines.slice(1).join('\n') : code;
        
        return (
          <div key={`${key}-${i}`} className="my-2 bg-black/40 rounded-lg p-3 border border-white/10">
            {language && (
              <div className="text-[10px] text-white/60 mb-2 font-mono">{language}</div>
            )}
            <pre className="text-[11px] text-green-300 font-mono whitespace-pre-wrap overflow-x-auto">
              {codeContent}
            </pre>
          </div>
        );
      }
      return formatInlineElements(part, `${key}-${i}`);
    });
  }
  
  return formatInlineElements(text, key);
};

const formatInlineElements = (text: string, key: number | string) => {
  // handle inline code
  const codeRegex = /`([^`]+)`/g;
  const parts = text.split(codeRegex);
  
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // this is inline code
      return (
        <code key={`${key}-code-${i}`} className="bg-black/40 px-1.5 py-0.5 rounded text-[11px] font-mono text-cyan-300">
          {part}
        </code>
      );
    }
    
    // handle bold text
    const boldRegex = /\*\*(.*?)\*\*/g;
    const boldParts = part.split(boldRegex);
    
    return boldParts.map((boldPart, j) => {
      if (j % 2 === 1) {
        return <strong key={`${key}-bold-${i}-${j}`} className="font-semibold text-white">{boldPart}</strong>;
      }
      
      // handle italic text
      const italicRegex = /\*(.*?)\*/g;
      const italicParts = boldPart.split(italicRegex);
      
      return italicParts.map((italicPart, k) => {
        if (k % 2 === 1) {
          return <em key={`${key}-italic-${i}-${j}-${k}`} className="italic text-white/90">{italicPart}</em>;
        }
        return <span key={`${key}-text-${i}-${j}-${k}`}>{italicPart}</span>;
      });
    });
  });
};

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isExpanded && chatInput.trim()) {
        setShowExpanded(true);
        setTimeout(() => setIsExpanded(true), 50);
      }
      handleSendChat();
    }
  }

  const handleSendClick = () => {
    if (!isExpanded && chatInput.trim()) {
      setShowExpanded(true);
      setTimeout(() => setIsExpanded(true), 50);
    }
    handleSendChat();
  };

  // load KaTeX if not already loaded
  React.useEffect(() => {
    if (!(window as any).katex) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // simple text area state - before pressing enter
  if (!showExpanded && chatHistory.length === 0) {
    return (
      <div className="w-full">
        <div className="flex gap-3 items-center bg-black/30 rounded-full px-4 py-3 border border-white/10 backdrop-blur-md">
          <input
            type="text"
            className="flex-1 bg-transparent border-none text-white text-[12px] placeholder-white/50 focus:outline-none"
            placeholder="How can I help you today?"
            value={chatInput}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={chatLoading}
          />
          <button
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSendClick}
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
    );
  }

  // expanded form - after pressing enter or when there's chat history
  return (
    <div 
      className="w-full bg-black/70 border-[3px] border-black/10 border-solid rounded-[20px] text-white font-sans backdrop-blur-md flex flex-col overflow-hidden transition-all duration-700 ease-out"
      style={{
        height: isExpanded ? '350px' : '60px',
        transform: isExpanded ? 'scale(1)' : 'scale(0.95)',
        opacity: isExpanded ? 1 : 0.8
      }}
    >
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

        <div className="space-y-4">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-start gap-2 max-w-[320px]">
                {message.role === 'ai' && (
                  <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                    <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  </div>
                )}
                <div
                  className={`text-[12px] leading-relaxed px-3 py-2 rounded-lg ${
                    message.role === 'user' 
                      ? 'text-white/90 bg-white/10 ml-auto' 
                      : 'text-white/95 bg-gray-800 mr-auto'
                  }`}
                >
                  <div className="rendered-content">
                    {renderLatex(message.content)}
                  </div>
                </div>
                {message.role === 'user' && (
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center mt-1 flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-white">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                </div>
                <div className="text-white/60 text-[12px] bg-gray-800 px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-1">
                    <span>Typing</span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              </div>
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
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={chatLoading}
          />
          <button
            className="w-8 h-8 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 hover:from-emerald-500/30 hover:to-cyan-500/30 rounded-full flex items-center justify-center transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-400/20"
            onClick={handleSendClick}
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
              className="text-emerald-300"
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