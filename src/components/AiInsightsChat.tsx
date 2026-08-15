import React, { useState, useRef, useEffect } from 'react';
import { SiteMaster, SkuMaster, MovementTypeRef, MovementData } from '../types';

interface AiInsightsChatProps {
  parsedData: {
    siteMaster: SiteMaster[];
    skuMaster: SkuMaster[];
    movementTypeRef: MovementTypeRef[];
    movementData: MovementData[];
  };
  snapshotDate: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolsUsed?: string[];
  timestamp: string;
}

const PRESET_PROMPTS = [
  'Explain SKU1001 at EU_HUB_01',
  'Explain SKU1060 at EU_HUB_01',
  'Top 3 SKUs with longest IAT',
  'Simulate snapshot date of 2026-06-30',
];

export const AiInsightsChat: React.FC<AiInsightsChatProps> = ({
  parsedData,
  snapshotDate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'Hello. I am the IAT Calculation Assistant. Ask questions regarding SKU-Site interarrival times, audit rule substitutions, or simulate hypothetical snapshot dates with deterministic tool verification.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = (customMessage || inputMessage).trim();
    if (!textToSend || isLoading) return;

    setErrorMsg(null);
    const userMsgId = `user-${Date.now()}`;
    const newMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: newMsgTime,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    if (!customMessage) setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation history for API
      const historyForApi = messages
        .filter((m) => m.id !== 'welcome-1')
        .map((m) => ({
          role: m.role === 'user' ? ('user' as const) : ('model' as const),
          parts: [{ text: m.content }],
        }));

      const payload = {
        message: textToSend,
        history: historyForApi,
        context: {
          siteMaster: parsedData.siteMaster,
          skuMaster: parsedData.skuMaster,
          movementTypeRef: parsedData.movementTypeRef,
          movementData: parsedData.movementData,
          snapshotDateStr: snapshotDate,
        },
      };

      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'Calculation completed.',
        toolsUsed: data.toolsUsed || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setErrorMsg(err.message || 'Failed to retrieve AI insights. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white rounded border border-slate-200 overflow-hidden text-xs">
      {/* Header */}
      <div className="px-3.5 py-2 bg-slate-900 text-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-white text-xs">
            IAT Calculation Assistant &amp; Simulation
          </h3>
          <p className="text-[11px] text-slate-400">
            Answers questions strictly grounded in tool-executed calculation logic
          </p>
        </div>

        <button
          onClick={() => {
            setMessages([
              {
                id: 'welcome-reset',
                role: 'assistant',
                content: 'Chat history cleared. What would you like to analyze next?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
            setErrorMsg(null);
          }}
          className="text-slate-400 hover:text-white px-2 py-0.5 rounded text-[11px] hover:bg-slate-800 cursor-pointer"
        >
          Clear History
        </button>
      </div>

      {/* Preset Suggestions */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
          Quick Queries:
        </span>
        {PRESET_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Message History */}
      <div className="p-3 space-y-3 max-h-[360px] min-h-[200px] overflow-y-auto bg-slate-50/40">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-white font-mono text-[10px] font-bold ${
                  isUser ? 'bg-slate-900' : 'bg-slate-700'
                }`}
              >
                {isUser ? 'U' : 'AI'}
              </div>

              <div className={`max-w-[82%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`p-2.5 rounded text-xs leading-relaxed ${
                    isUser
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>

                {/* Grounding Tools Used Tag */}
                {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500 px-1 pt-0.5">
                    <span className="font-semibold text-slate-600">Calculated via:</span>
                    <span className="font-mono text-slate-700 bg-slate-100 px-1 py-0.2 rounded border border-slate-200">
                      {msg.toolsUsed.join(', ')}
                    </span>
                  </div>
                )}

                <div
                  className={`text-[9px] text-slate-400 px-1 ${
                    isUser ? 'text-right' : 'text-left'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded bg-slate-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              AI
            </div>
            <div className="p-2.5 bg-white border border-slate-200 shadow-2xs rounded text-slate-600 flex items-center space-x-2">
              <span className="inline-block w-1.5 h-1.5 bg-slate-900 rounded-full animate-ping" />
              <span className="text-xs">Computing grounded supply chain results...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
            {errorMsg}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask e.g. 'Explain SKU1001 at EU_HUB_01' or 'Simulate snapshot 2026-06-30'..."
          disabled={isLoading}
          className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-500"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputMessage.trim()}
          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          Send
        </button>
      </div>
    </div>
  );
};
