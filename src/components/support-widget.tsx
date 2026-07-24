import { useEffect, useState } from "react";
import { MessageCircle, X, Loader2 } from "lucide-react";
import { getAppSettings } from "@/lib/settings.functions";

/** Floating WhatsApp support button. Reads number from public app_settings.
 *  Hidden when no number configured. */
export function SupportWidget() {
  const [whatsapp, setWhatsapp] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("Olá! Preciso de ajuda com o Busca Mágica.");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getAppSettings()
      .then((s) => {
        if (!alive) return;
        setWhatsapp(s.support_whatsapp);
        if (s.support_message) setMessage(s.support_message);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  if (loading || !whatsapp) return null;

  const digits = whatsapp.replace(/\D/g, "");
  const href = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  return (
    <>
      {open && (
        <div
          className="fixed right-4 z-40 w-72 rounded-2xl border border-border bg-popover p-4 shadow-2xl sm:right-6"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-foreground">Fale com a gente</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Suporte direto pelo WhatsApp. Respondemos rápido.
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="rounded-full p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-bold text-white transition hover:brightness-110"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir WhatsApp
          </a>
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Falar com o desenvolvedor"
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl ring-4 ring-[#25D366]/25 transition hover:scale-105 sm:right-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </>
  );
}

export function SupportWidgetFallback() {
  return (
    <div
      className="fixed right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-glass ring-1 ring-border sm:right-6"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
  );
}
