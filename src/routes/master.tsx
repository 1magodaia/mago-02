import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Ban,
  Check,
  KeyRound,
  Loader2,
  Shield,
  ShieldCheck,
  Users,
} from "lucide-react";
import { LogoWordmark } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import {
  listUsers,
  sendPasswordReset,
  setUserPlan,
  setUserStatus,
  type AdminUserRow,
} from "@/lib/admin.functions";

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
  const setPlan = useServerFn(setUserPlan);
  const setStatus = useServerFn(setUserStatus);
  const resetPwd = useServerFn(sendPasswordReset);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

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
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const togglePlan = async (u: AdminUserRow) => {
    setBusy(u.id);
    try {
      await setPlan({ data: { userId: u.id, plan: u.plan === "pro" ? "free" : "pro" } });
      setNotice(`Plano de ${u.email} atualizado.`);
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

      <p className="mx-auto mt-4 max-w-7xl text-xs text-muted-foreground">
        Rota oculta. Acesso restrito a papéis <code>master</code> e <code>admin</code>. Todas as ações são registradas em <code>admin_audit_log</code>.
      </p>
    </div>
  );
}
