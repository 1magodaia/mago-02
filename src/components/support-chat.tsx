import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageSquare, Send, Trash2, X } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  ts: number;
}

const STORAGE_KEY = "bm.chatHistory";
const MAX_HISTORY = 10;
const WELCOME: Msg = {
  role: "assistant",
  content: "Olá! 👋 Sou o assistente do Busca Mágica. Como posso ajudar?",
  ts: Date.now(),
};

function loadHistory(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Msg[];
    if (!Array.isArray(arr)) return [];
    return arr.slice(-MAX_HISTORY);
  } catch {
    return [];
  }
}

function saveHistory(msgs: Msg[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY)));
  } catch {
    /* quota */
  }
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMsgs(loadHistory());
  }, []);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, open, sending]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const displayMsgs = useMemo(() => (msgs.length ? msgs : [WELCOME]), [msgs]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: Msg = { role: "user", content: text, ts: Date.now() };
    const next = [...msgs, userMsg].slice(-MAX_HISTORY);
    setMsgs(next);
    saveHistory(next);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/chat/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: msgs.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        response?: string;
        error?: string;
      };
      if (!res.ok || !json.success || !json.response) {
        setError(json.error || "Ops! Algo deu errado. Tente novamente.");
      } else {
        const reply: Msg = { role: "assistant", content: json.response, ts: Date.now() };
        const merged = [...next, reply].slice(-MAX_HISTORY);
        setMsgs(merged);
        saveHistory(merged);
      }
    } catch {
      setError("Sem conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function clearHistory() {
    if (!window.confirm("Tem certeza? Isso vai apagar todo o histórico do chat.")) return;
    setMsgs([]);
    setError(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-x-3 bottom-[8.5rem] z-[999] flex max-h-[65vh] w-auto flex-col overflow-hidden rounded-2xl border border-primary/40 bg-popover shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-24 sm:h-[560px] sm:max-h-[calc(100vh-8rem)] sm:w-[360px]"
          role="dialog"
          aria-label="Chat de suporte"
        >
          <header className="flex h-14 items-center justify-between gap-2 bg-primary px-4 text-primary-foreground">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm font-bold">Precisa de ajuda?</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                aria-label="Limpar histórico"
                title="Limpar histórico"
                className="rounded-full p-1.5 text-primary-foreground/80 hover:bg-white/10 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Fechar chat"
                className="rounded-full p-1.5 text-primary-foreground/80 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3 overflow-y-auto bg-background/50 p-4"
          >
            {displayMsgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  Pensando...
                </div>
              </div>
            )}
            {error && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-[12px] text-destructive">
                  {error}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-end gap-2 border-t border-border bg-background p-3"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Faça sua pergunta..."
              rows={1}
              disabled={sending}
              className="flex-1 resize-none rounded-lg border border-border bg-glass px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary disabled:opacity-60"
              style={{ maxHeight: 100 }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Enviar"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat" : "Abrir chat de suporte"}
        title="Precisa de ajuda?"
        className="fixed bottom-20 right-4 z-[999] flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-2 ring-primary/25 transition hover:scale-105 sm:bottom-24 sm:right-6"
      >
        {open ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
      </button>
    </>
  );
}
