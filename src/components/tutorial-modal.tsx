import { useEffect, useState } from "react";
import { X, Search, Sparkles, Download, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";

const STORAGE_KEY = "hasSeenTutorial";

export function hasSeenTutorial(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function markTutorialSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, "true");
}

export function resetTutorial() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Search,
    title: "Comece aqui",
    body: (
      <>
        <p>Digite uma <strong>categoria</strong> (padaria, farmácia, academia, escolinha de futebol…) e sua <strong>região</strong> ou use o GPS.</p>
        <p className="mt-2 text-muted-foreground">Ajuste o raio de busca (1 km a 25 km) e clique em <strong>Buscar</strong>.</p>
      </>
    ),
  },
  {
    icon: Sparkles,
    title: "Entenda os dados",
    body: (
      <>
        <ul className="space-y-2">
          <li>🟢 <strong>Verde</strong> = oportunidade quente (sem site nem redes)</li>
          <li>🟡 <strong>Amarelo</strong> = oportunidade média (presença parcial)</li>
          <li>🟠 <strong>Laranja</strong> = presença digital completa</li>
          <li>⭐ Rating + nº de avaliações = atividade real no Google</li>
          <li>📱 Instagram / Facebook / site quando detectados</li>
        </ul>
      </>
    ),
  },
  {
    icon: Download,
    title: "Leve os dados com você",
    body: (
      <>
        <p><Download className="inline h-4 w-4 text-primary" /> <strong>Exportar CSV</strong> baixa todos os campos em Excel.</p>
        <p className="mt-2"><MessageCircle className="inline h-4 w-4 text-primary" /> Botão <strong>WhatsApp</strong> em cada lead abre a conversa com mensagem pronta.</p>
        <p className="mt-3 text-muted-foreground">Com esses dois passos você prospecta leads de forma automática.</p>
      </>
    ),
  },
];

export function TutorialModal({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tryClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function tryClose() {
    if (window.confirm("Tem certeza? Você pode ver o tutorial novamente no menu.")) {
      markTutorialSeen();
      onClose();
    }
  }

  function goto(next: number) {
    setFade(false);
    setTimeout(() => {
      setStep(next);
      setFade(true);
    }, 180);
  }

  if (!open) return null;

  const S = STEPS[step];
  const Icon = S.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div
        className="w-full max-w-[500px] rounded-2xl border-2 border-primary bg-popover p-6 shadow-2xl sm:p-8"
        style={{ animation: "fadeIn .2s ease-out" }}
      >
        {/* Progress */}
        <div className="mb-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">Passo {step + 1} de {STEPS.length}</span>
          <button onClick={tryClose} aria-label="Fechar" className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div style={{ opacity: fade ? 1 : 0, transition: "opacity .18s" }}>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-primary" style={{ fontSize: 18 }}>{S.title}</h2>
          <div className="mt-2 text-sm text-foreground">{S.body}</div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            onClick={() => goto(Math.max(0, step - 1))}
            disabled={step === 0}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-border bg-transparent px-3 text-sm text-foreground transition hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
          {isLast ? (
            <button
              onClick={() => { markTutorialSeen(); onClose(); }}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              ✅ Entendi! Começar
            </button>
          ) : (
            <button
              onClick={() => goto(step + 1)}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-110"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function TutorialBadge({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
      <span className="text-foreground">📚 Novo por aqui?</span>
      <button
        onClick={onStart}
        className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110"
      >
        Iniciar tutorial
      </button>
      <button
        onClick={onSkip}
        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
      >
        Pular tutorial
      </button>
    </div>
  );
}
