import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LogoWordmark } from "@/components/logo";

type OAuthDetails = {
  client?: { name?: string; client_uri?: string; redirect_uris?: string[] } | null;
  scope?: string | null;
  redirect_url?: string | null;
  redirect_to?: string | null;
} | null;
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails; error: Error | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: Error | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: Error | null }>;
};
function oauthApi(): OAuthApi {
  return (supabase.auth as unknown as { oauth: OAuthApi }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { redirect: next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      window.location.href = immediate;
      return null;
    }
    return data;
  },
  component: ConsentPage,
  errorComponent: ({ error }) => (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="glass-panel max-w-md rounded-2xl p-6 text-center">
        <h1 className="text-lg font-extrabold">Não foi possível carregar a autorização</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error)?.message ?? String(error)}
        </p>
      </div>
    </div>
  ),
});

function ConsentPage() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const nav = useNavigate();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
  }, []);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const api = oauthApi();
    const { data, error } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("O servidor de autorização não retornou uma URL de redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "um aplicativo";
  const scopes = (details?.scope ?? "").split(/\s+/).filter(Boolean);
  const scopeLabel = (s: string) => {
    if (s === "openid") return "Verificar sua identidade";
    if (s === "email") return "Ver seu endereço de e-mail";
    if (s === "profile") return "Ver seu nome e foto de perfil";
    return `Permissão adicional: ${s}`;
  };

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <LogoWordmark variant="full" className="h-20 w-auto sm:h-24" />
        </div>
        <div className="glass-panel rounded-2xl p-6 sm:p-8">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/15 ring-1 ring-primary/40">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-center text-xl font-extrabold tracking-tight">
            Conectar <span className="text-primary">{clientName}</span> ao Busca Mágica
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Isso permite que <strong className="text-foreground">{clientName}</strong> use as
            ferramentas do Busca Mágica agindo como você.
          </p>

          {userEmail && (
            <p className="mt-4 rounded-xl bg-glass px-4 py-2.5 text-center text-xs text-muted-foreground ring-1 ring-border">
              Conectando como <strong className="text-foreground">{userEmail}</strong>
            </p>
          )}

          {scopes.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Permissões solicitadas
              </p>
              <ul className="mt-2 space-y-1.5">
                {scopes.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-sm">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{scopeLabel(s)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-4 text-[11px] text-muted-foreground">
            Suas quotas, plano e políticas de acesso do Busca Mágica continuam valendo — o cliente
            só enxerga seus próprios dados.
          </p>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs text-destructive"
            >
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={() => decide(true)}
              disabled={busy !== null}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
            >
              {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Aprovar conexão
            </button>
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={busy !== null}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-glass text-sm font-semibold text-foreground ring-1 ring-border transition hover:bg-white/5 disabled:opacity-60"
            >
              {busy === "deny" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Recusar
            </button>
            <button
              type="button"
              onClick={() => nav({ to: "/" })}
              className="mt-1 text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Cancelar e voltar ao app
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
