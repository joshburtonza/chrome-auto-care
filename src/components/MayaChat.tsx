import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Send, Loader2, ChevronDown, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function MayaChat() {
  const { user, userRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && !minimised && messages.length === 0) {
      const greeting = userRole === 'staff' || userRole === 'admin'
        ? "Hey — what do you need?"
        : "Hey! I'm Maya, Race Technik's AI assistant. Ask me anything about our services, pricing, or your booking.";
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open && !minimised) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimised]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/maya', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(-16),
          userRole: userRole ?? 'client',
          userName: user?.email?.split('@')[0] ?? undefined,
        }),
      });

      const data = await res.json() as { reply?: string; error?: string };
      const reply = data.reply || "Sorry, I couldn't get a response right now. Try again in a moment.";
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: "Something went wrong on my end. Try again in a second.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-black text-white px-4 py-3 rounded-full shadow-2xl hover:bg-zinc-900 transition-all duration-200 group"
        aria-label="Open Maya chat"
      >
        <Sparkles className="h-4 w-4 text-zinc-300" />
        <span className="text-sm font-medium">Ask Maya</span>
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 ring-2 ring-white animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] max-w-[calc(100vw-2rem)] shadow-2xl rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black text-white">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-zinc-300" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 ring-1 ring-black" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Maya</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">Race Technik AI</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMinimised(!minimised)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label={minimised ? 'Expand' : 'Minimise'}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${minimised ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => { setOpen(false); setMessages([]); }}
            className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimised && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 h-80 px-4 py-3">
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-black text-white rounded-br-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Suggested prompts (shown when no conversation yet) */}
          {messages.length <= 1 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {(userRole === 'staff' || userRole === 'admin'
                ? ['Highest margin services?', 'PPF film grades?', 'Full body combo price?']
                : ['What does full body PPF cost?', 'Ceramic vs PPF?', 'How long does a wrap take?']
              ).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                  className="text-xs px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-600 dark:text-zinc-400"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-1 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask Maya anything..."
                className="min-h-[40px] max-h-32 resize-none text-sm rounded-xl border-zinc-200 dark:border-zinc-700 focus-visible:ring-1 focus-visible:ring-zinc-400"
                rows={1}
              />
              <Button
                onClick={send}
                disabled={!input.trim() || loading}
                size="icon"
                className="h-10 w-10 shrink-0 rounded-xl bg-black hover:bg-zinc-800 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-zinc-400 text-center mt-1.5">
              Powered by Amalfi AI
            </p>
          </div>
        </>
      )}
    </div>
  );
}
