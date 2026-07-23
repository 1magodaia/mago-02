import { useEffect, useState } from "react";
import { GitBranch, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VersionEntry {
  id: string;
  version: string;
  description: string;
  impact: string | null;
  risk: string | null;
  created_at: string;
}

export function VersionLog() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<VersionEntry[]>([]);
  const [latest, setLatest] = useState<string>("");

  useEffect(() => {
    supabase
      .from("version_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data) {
          setEntries(data as VersionEntry[]);
          if (data[0]) setLatest(data[0].version);
        }
      });
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="glass-panel fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-all hover:text-foreground hover:neon-violet"
      >
        <GitBranch className="h-3.5 w-3.5 text-primary" />
        <span>CACA</span>
        {latest && <span className="text-foreground">v{latest}</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-background/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <aside
            onClick={(e) => e.stopPropagation()}
            className="glass-panel h-full w-full max-w-md overflow-y-auto p-6 shadow-elevated"
          >
            <header className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-primary">Protocolo CACA</div>
                <h2 className="text-xl font-bold">Últimas atualizações</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <ul className="mt-6 space-y-4">
              {entries.map((e) => (
                <li key={e.id} className="rounded-xl border border-border bg-glass p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary ring-1 ring-primary/30">
                      v{e.version}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">{e.description}</p>
                  {e.impact && (
                    <p className="mt-2 text-xs text-emerald">
                      <span className="font-semibold">Impacto:</span> {e.impact}
                    </p>
                  )}
                  {e.risk && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      <span className="font-semibold">Risco:</span> {e.risk}
                    </p>
                  )}
                </li>
              ))}
              {entries.length === 0 && (
                <li className="text-sm text-muted-foreground">Sem atualizações registradas ainda.</li>
              )}
            </ul>
          </aside>
        </div>
      )}
    </>
  );
}
