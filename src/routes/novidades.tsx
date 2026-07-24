import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, GitBranch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/novidades")({
  head: () => ({
    meta: [
      { title: "Novidades — Busca Mágica" },
      { name: "description", content: "Changelog público do Busca Mágica: cada versão traz melhorias documentadas via Protocolo CACA." },
      { property: "og:title", content: "Novidades — Busca Mágica" },
      { property: "og:description", content: "Últimas versões e melhorias entregues no Busca Mágica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Novidades,
});

interface VersionEntry {
  id: string;
  version: string;
  description: string;
  impact: string | null;
  risk: string | null;
  created_at: string;
}

function Novidades() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["version_log_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_version_log")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as VersionEntry[];
    },
  });

  return (
    <div className="min-h-screen">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <h1 className="text-lg font-extrabold text-foreground">Novidades</h1>
        <span />
      </nav>

      <main className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <GitBranch className="h-3 w-3" /> Protocolo CACA · changelog público
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Cada versão do Busca Mágica traz uma melhoria documentada — o que mudou, o impacto para você e o risco associado.
        </p>

        {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
        {error && <p className="text-sm text-destructive">Falha ao carregar changelog.</p>}

        <ol className="space-y-3">
          {(data ?? []).map((e) => (
            <li key={e.id} className="glass-panel rounded-2xl p-4">
              <header className="flex items-center gap-2">
                <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary ring-1 ring-primary/30">
                  v{e.version}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(e.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </header>
              <p className="mt-2 text-sm text-foreground">{e.description}</p>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
