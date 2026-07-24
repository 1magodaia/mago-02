import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Ban,
  Check,
  KeyRound,
  Loader2,
  MessageCircle,
  Save,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import {
  listUsers,
  sendPasswordReset,
  grantProAccess,
  setUserStatus,
  type AdminUserRow,
} from "@/lib/admin.functions";
import { getAppSettings, updateAppSettings } from "@/lib/settings.functions";
import { getCitationCostStats, type CitationCostStats } from "@/lib/citations.functions";


export const Route = createFileRoute("/master")({
  head: () => ({
    meta: [
      { title: "Painel Master — Busca Mágica" },
      { name: "description", content: "Painel de administração restrito." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Busca Mágica — Painel Master" },
      { property: "og:description", content: "Área administrativa restrita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MasterPanel,
});

function MasterPanel() {
  const { loading, user, isAdmin, isMaster } = useAuth();
  const nav = useNavigate();
  const list = useServerFn(listUsers);
  const grantAccess = useServerFn(grantProAccess);
  const setStatus = useServerFn(setUserStatus);
  const resetPwd = useServerFn(sendPasswordReset);
  const readSettings = useServerFn(getAppSettings);
  const writeSettings = useServerFn(updateAppSettings);
  const readCostStats = useServerFn(getCitationCostStats);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const [supportWa, setSupportWa] = useState("");
  const [supportMsg, setSupportMsg] = useState("");
  const [citationsEnabled, setCitationsEnabled] = useState(false);
  const [citationsLimit, setCitationsLimit] = useState(20);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [costStats, setCostStats] = useState<CitationCostStats | null>(null);


  useEffect(() => {
    if (loading) return;
    if (!user) {
      nav({ to: "/auth", search: { redirect: "/master" } });
      return;
    }
    if (!isAdmin) {
      nav({ to: "/" });
      return;
    }
    setReady(true);
  }, [loading, user, isAdmin, nav]);

  const load = async () => {
    setLoadErr(null);
    try {
      const r = await list();
      setUsers(r.users);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Falha ao carregar.");
    }
  };

  useEffect(() => {
    if (ready) {
      load();
      readSettings()
        .then((s) => {
          setSupportWa(s.support_whatsapp ?? "");
          setSupportMsg(s.support_message ?? "");
          setCitationsEnabled(s.citations_enabled);
          setCitationsLimit(s.citations_daily_limit);
        })
        .catch(() => {});
      readCostStats().then(setCostStats).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsBusy(true);
    setSettingsError(null);
    try {
      const r = await writeSettings({
        data: {
          support_whatsapp: supportWa || null,
          support_message: supportMsg || null,
          citations_enabled: citationsEnabled,
          citations_daily_limit: citationsLimit,
        },
      });
      setSupportWa(r.support_whatsapp ?? "");
      setSupportMsg(r.support_message ?? "");
      setCitationsEnabled(r.citations_enabled);
      setCitationsLimit(r.citations_daily_limit);
      setNotice("Configurações atualizadas.");
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSettingsBusy(false);
    }
  };

  const toggleCitations = async (next: boolean) => {
    setCitationsEnabled(next);
    setSettingsBusy(true);
    try {
      const r = await writeSettings({ data: { citations_enabled: next } });
      setCitationsEnabled(r.citations_enabled);
      setNotice(next ? "Busca de citações ATIVADA para usuários Pro." : "Busca de citações DESLIGADA.");
    } catch (err) {
      setCitationsEnabled(!next);
      setSettingsError(err instanceof Error ? err.message : "Erro ao alternar.");
    } finally {
      setSettingsBusy(false);
    }
  };


  const grant = async (u: AdminUserRow, payload: Parameters<typeof grantAccess>[0]["data"]) => {
    setBusy(u.id);
    try {
      await grantAccess({ data: payload });
      const nice = payload.mode === "free"
        ? `${u.email} voltou para Free.`
        : payload.mode === "date"
          ? `${u.email} é Pro até ${new Date(payload.valid_until!).toLocaleDateString("pt-BR")}.`
          : `${u.email} é Pro com ${payload.searches_granted} buscas.`;
      setNotice(nice);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (u: AdminUserRow) => {
    setBusy(u.id);
    try {
      await setStatus({ data: { userId: u.id, status: u.status === "active" ? "blocked" : "active" } });
      setNotice(`${u.email} agora está ${u.status === "active" ? "bloqueado" : "ativo"}.`);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(null);
    }
  };

  const resetPassword = async (u: AdminUserRow) => {
    setBusy(u.id);
    try {
      await resetPwd({ data: { email: u.email } });
      setNotice(`Link de redefinição enviado para ${u.email}.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Erro.");
    } finally {
      setBusy(null);
    }
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6">
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> App
        </Link>
        <LogoWordmark />
      </nav>

      <header className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/40">
            {isMaster ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Shield className="h-5 w-5 text-primary" />}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Painel {isMaster ? "Master" : "Admin"}</h1>
            <p className="text-xs text-muted-foreground">Gestão de contas, planos e status.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-glass px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border">
          <Users className="h-3.5 w-3.5 text-primary" /> {users.length} usuários
        </div>
      </header>

      {notice && (
        <div className="mx-auto mt-4 max-w-7xl rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm text-primary">
          {notice}
        </div>
      )}
      {loadErr && (
        <div className="mx-auto mt-4 max-w-7xl rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {loadErr}
        </div>
      )}

      {/* SUPORTE / CONTATO — WhatsApp global do app */}
      <section className="glass-panel mx-auto mt-6 max-w-7xl rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#25D366]/15 ring-1 ring-[#25D366]/40">
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Contato do desenvolvedor (WhatsApp)</h2>
            <p className="text-xs text-muted-foreground">
              O número salvo aqui aparece no botão flutuante de suporte em todas as telas do app.
              Use formato internacional só com dígitos (ex: <code>5511999998888</code>).
            </p>
          </div>
        </div>
        <form onSubmit={saveSettings} className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr_auto]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">WhatsApp</span>
            <input
              type="tel"
              inputMode="tel"
              placeholder="5511999998888"
              value={supportWa}
              onChange={(e) => setSupportWa(e.target.value)}
              maxLength={20}
              className="mt-1 w-full rounded-xl bg-glass px-4 py-2.5 text-sm tabular-nums outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">Mensagem pré-preenchida</span>
            <input
              type="text"
              placeholder="Olá! Preciso de ajuda com o Busca Mágica."
              value={supportMsg}
              onChange={(e) => setSupportMsg(e.target.value)}
              maxLength={280}
              className="mt-1 w-full rounded-xl bg-glass px-4 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
            />
          </label>
          <button
            type="submit"
            disabled={settingsBusy}
            className="mt-6 inline-flex items-center justify-center gap-2 self-end rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-60 sm:mt-0"
          >
            {settingsBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
        </form>
        {settingsError && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {settingsError}
          </div>
        )}
        {supportWa && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Preview:{" "}
            <a
              href={`https://wa.me/${supportWa.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              wa.me/{supportWa.replace(/\D/g, "")}
            </a>
          </p>
        )}
      </section>

      {/* CITAÇÕES WEB — Kill switch + limite diário + custo */}
      <section className="glass-panel mx-auto mt-6 max-w-7xl rounded-2xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-warn/15 ring-1 ring-warn/40">
              <Shield className="h-4 w-4 text-warn" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Busca de citações web (IA)</h2>
              <p className="max-w-xl text-xs text-muted-foreground">
                Kill switch global. Nasce <strong>desligado</strong>. Ative apenas depois de validar o custo real
                por busca com dados abaixo. Admin e master ignoram o interruptor para testes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => toggleCitations(!citationsEnabled)}
            disabled={settingsBusy}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ring-1 transition ${
              citationsEnabled
                ? "bg-primary/15 text-primary ring-primary/40"
                : "bg-muted text-muted-foreground ring-border"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${citationsEnabled ? "bg-primary" : "bg-muted-foreground"}`} />
            {citationsEnabled ? "Ativado para Pro" : "Desligado"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">Limite diário por usuário</span>
            <input
              type="number"
              min={0}
              max={1000}
              value={citationsLimit}
              onChange={(e) => setCitationsLimit(Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
              onBlur={() =>
                writeSettings({ data: { citations_daily_limit: citationsLimit } }).catch(() => {})
              }
              className="mt-1 w-full rounded-xl bg-glass px-4 py-2.5 text-sm tabular-nums outline-none ring-1 ring-border focus:ring-2 focus:ring-primary/70"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <CostTile label="Hoje" calls={costStats?.today_calls} cents={costStats?.today_cost_cents} />
            <CostTile label="7 dias" calls={costStats?.last7_calls} cents={costStats?.last7_cost_cents} />
            <CostTile label="30 dias" calls={costStats?.last30_calls} cents={costStats?.last30_cost_cents} sub={costStats ? `${costStats.distinct_users_30d} usuários` : undefined} />
          </div>
        </div>
      </section>





      <div className="glass-panel mx-auto mt-6 max-w-7xl overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.02] text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Usuário</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Buscas/mês</th>
              <th className="px-4 py-3">Último login</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === user?.id;
              return (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{u.full_name || u.email.split("@")[0]}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    {u.roles.includes("master") && (
                      <span className="mt-1 inline-block rounded-full bg-warn/20 px-2 py-0.5 text-[10px] font-bold text-warn">MASTER</span>
                    )}
                    {u.roles.includes("admin") && !u.roles.includes("master") && (
                      <span className="mt-1 inline-block rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">ADMIN</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.plan === "pro" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {u.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.status === "active" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                      {u.status === "active" ? "Ativo" : "Bloqueado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">{u.search_count_month}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-1.5">
                      <button
                        onClick={() => togglePlan(u)}
                        disabled={busy === u.id}
                        className="rounded-full bg-glass px-3 py-1 text-xs font-semibold ring-1 ring-border hover:bg-white/5 disabled:opacity-50"
                      >
                        {u.plan === "pro" ? "Voltar Free" : "Tornar Pro"}
                      </button>
                      <button
                        onClick={() => toggleStatus(u)}
                        disabled={busy === u.id || isSelf}
                        title={isSelf ? "Não é possível bloquear a si mesmo" : ""}
                        className="flex items-center gap-1 rounded-full bg-glass px-3 py-1 text-xs font-semibold ring-1 ring-border hover:bg-white/5 disabled:opacity-40"
                      >
                        {u.status === "active" ? <><Ban className="h-3 w-3" /> Bloquear</> : <><Check className="h-3 w-3" /> Ativar</>}
                      </button>
                      <button
                        onClick={() => resetPassword(u)}
                        disabled={busy === u.id}
                        className="flex items-center gap-1 rounded-full bg-glass px-3 py-1 text-xs font-semibold ring-1 ring-border hover:bg-white/5 disabled:opacity-50"
                      >
                        <KeyRound className="h-3 w-3" /> Reset senha
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Nenhum usuário cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AiKeysPanel />

      <p className="mx-auto mt-4 max-w-7xl text-xs text-muted-foreground">
        Rota oculta. Acesso restrito a papéis <code>master</code> e <code>admin</code>. Todas as ações são registradas em <code>admin_audit_log</code>.
      </p>
    </div>
  );
}

function CostTile({ label, calls, cents, sub }: { label: string; calls?: number; cents?: number; sub?: string }) {
  const brl = cents == null ? "—" : `R$ ${(cents / 100).toFixed(2)}`;
  return (
    <div className="rounded-xl bg-glass p-3 ring-1 ring-border">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-extrabold tabular-nums text-foreground">{calls ?? 0}</div>
      <div className="text-[11px] tabular-nums text-primary">{brl}</div>
      {sub && <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ============================================================================
// v5.4.3 Part G — Multi-provider AI key registry (failover cadastro)
// ============================================================================
import {
  listAiProviderKeys,
  upsertAiProviderKey,
  deleteAiProviderKey,
  testAiProviderKey,
  type AiProviderKey,
} from "@/lib/ai-keys.functions";
import { Plus, Trash2, PlayCircle, KeySquare } from "lucide-react";

const STATUS_STYLES: Record<AiProviderKey["status"], string> = {
  active:       "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40",
  untested:     "bg-white/5 text-muted-foreground ring-border",
  rate_limited: "bg-amber-500/15 text-amber-200 ring-amber-400/40",
  error:        "bg-red-500/15 text-red-300 ring-red-400/40",
  disabled:     "bg-white/5 text-muted-foreground/60 ring-border",
};
const STATUS_LABEL: Record<AiProviderKey["status"], string> = {
  active: "Ativa",
  untested: "Não testada",
  rate_limited: "Limite atingido",
  error: "Com erro",
  disabled: "Desativada",
};

function AiKeysPanel() {
  const list = useServerFn(listAiProviderKeys);
  const upsert = useServerFn(upsertAiProviderKey);
  const del = useServerFn(deleteAiProviderKey);
  const test = useServerFn(testAiProviderKey);
  const [rows, setRows] = useState<AiProviderKey[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({ provider: "openai" as AiProviderKey["provider"], label: "", secret_name: "", priority: 100 });
  const [loading, setLoading] = useState(true);

  async function reload() {
    setErr(null);
    try { setRows(await list()); }
    catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label || !form.secret_name) return;
    setBusy("new");
    try { await upsert({ data: form }); setForm({ ...form, label: "", secret_name: "" }); await reload(); }
    catch (e: any) { setErr(String(e?.message ?? e)); }
    finally { setBusy(null); }
  }

  return (
    <section className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
      <div className="glass-panel rounded-2xl p-4 sm:p-6">
        <header className="mb-4 flex flex-wrap items-center gap-2">
          <KeySquare className="h-5 w-5 text-primary" />
          <h2 className="text-base font-extrabold text-foreground">Chaves de IA com failover</h2>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary ring-1 ring-primary/30">
            v5.4.3 · Parte G
          </span>
        </header>
        <p className="mb-4 text-xs text-muted-foreground">
          Cadastre múltiplas chaves por provedor (OpenAI, Gemini, Groq, Lovable). A ordem de <b>prioridade</b> define
          o failover: a menor prioridade é tentada primeiro; se retornar erro ou limite, a próxima ativa entra em ação.
          Os valores das chaves ficam no cofre de secrets — aqui só ficam o nome do secret, prioridade e status.
        </p>

        <form onSubmit={add} className="mb-4 grid gap-2 rounded-xl bg-glass p-3 ring-1 ring-border sm:grid-cols-[140px_1fr_1fr_90px_auto]">
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value as any })}
            className="rounded-md bg-background px-2 py-1.5 text-sm ring-1 ring-border"
          >
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
            <option value="lovable">Lovable AI</option>
          </select>
          <input
            placeholder="Rótulo (ex: OpenAI principal)"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="rounded-md bg-background px-2 py-1.5 text-sm ring-1 ring-border"
          />
          <input
            placeholder="Nome do secret (ex: OPENAI_API_KEY_1)"
            value={form.secret_name}
            onChange={(e) => setForm({ ...form, secret_name: e.target.value.toUpperCase() })}
            className="rounded-md bg-background px-2 py-1.5 text-sm font-mono ring-1 ring-border"
          />
          <input
            type="number"
            min={1}
            max={999}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
            className="rounded-md bg-background px-2 py-1.5 text-sm tabular-nums ring-1 ring-border"
          />
          <button
            disabled={busy === "new"}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Cadastrar
          </button>
        </form>
        <p className="mb-3 text-[11px] text-muted-foreground">
          Depois de cadastrar, salve o valor da chave em <b>Configurações → Secrets</b> com exatamente o mesmo nome. Use <b>“Testar”</b> para validar.
        </p>

        {err && <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{err}</div>}

        <div className="overflow-x-auto rounded-xl ring-1 ring-border">
          <table className="w-full text-xs">
            <thead className="bg-glass text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Provedor</th>
                <th className="px-3 py-2 text-left">Rótulo</th>
                <th className="px-3 py-2 text-left">Secret</th>
                <th className="px-3 py-2 text-center">Prioridade</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Último teste</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">Carregando…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  Nenhuma chave cadastrada. Adicione ao menos <b>duas</b> para ativar o failover.
                </td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 font-bold uppercase text-primary">{r.provider}</td>
                  <td className="px-3 py-2">{r.label}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">
                    {r.secret_name}{" "}
                    {!r.secret_present && (
                      <span className="ml-1 rounded bg-red-500/15 px-1 py-0.5 text-[9px] font-bold text-red-300 ring-1 ring-red-400/40">
                        secret vazio
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{r.priority}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${STATUS_STYLES[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.last_error && (
                      <div className="mt-0.5 text-[10px] text-red-300/80">{r.last_error}</div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">
                    {r.last_tested_at ? new Date(r.last_tested_at).toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={async () => { setBusy(r.id); try { await test({ data: { id: r.id } }); await reload(); } finally { setBusy(null); } }}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1 rounded-full bg-glass px-2.5 py-1 text-[11px] font-semibold ring-1 ring-border hover:bg-white/5 disabled:opacity-50"
                      >
                        {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />} Testar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Remover a chave “${r.label}”?`)) return;
                          setBusy(r.id);
                          try { await del({ data: { id: r.id } }); await reload(); }
                          finally { setBusy(null); }
                        }}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1 rounded-full bg-glass px-2.5 py-1 text-[11px] font-semibold text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" /> Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
