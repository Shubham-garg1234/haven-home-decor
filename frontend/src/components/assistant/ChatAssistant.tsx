import { FormEvent, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

const ChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I can help you explore our products and answer shopping questions.',
    },
  ]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending) return;

    const nextMessages = [...messages, { role: 'user' as const, content }];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const response = await api.chatWithAssistant(nextMessages.slice(-8));
      setMessages((current) => [...current, { role: 'assistant', content: response.reply }]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'The assistant could not respond. Please try again.',
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen && (
        <section
          aria-label="Shopping assistant"
          className="mb-3 flex h-[min(32rem,calc(100vh-7rem))] w-[calc(100vw-2.5rem)] max-w-sm flex-col border border-border bg-card shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <div>
              <h2 className="font-medium">Shopping assistant</h2>
              <p className="text-xs opacity-80">Ask us about shopping and products</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              aria-label="Close assistant"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={`${index}-${message.role}`}
                className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 text-sm ${
                  message.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {message.content}
              </div>
            ))}
            {isSending && (
              <p className="text-sm text-muted-foreground" role="status">
                Thinking...
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="px-4 pb-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your question..."
              aria-label="Your question"
              maxLength={2000}
              disabled={isSending}
            />
            <Button type="submit" size="icon" aria-label="Send message" disabled={!input.trim() || isSending}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </section>
      )}

      <Button
        size="icon"
        className="ml-auto flex h-14 w-14 rounded-full shadow-lg"
        aria-label={isOpen ? 'Close shopping assistant' : 'Open shopping assistant'}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
};

export default ChatAssistant;
