import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapMaster, getMyProfile, type Profile } from "@/lib/profile.functions";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  loading: boolean;
  isMaster: boolean;
  isAdmin: boolean;
  isPro: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const res = await getMyProfile();
      setProfile(res?.profile ?? null);
      setRoles(res?.roles ?? []);
    } catch {
      setProfile(null);
      setRoles([]);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_IN" && s?.user) {
        // Fire-and-forget bootstrap for MASTER_EMAIL match, then load profile
        bootstrapMaster().catch(() => {}).finally(() => {
          loadProfile();
        });
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setRoles([]);
      } else if (event === "USER_UPDATED") {
        loadProfile();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        bootstrapMaster().catch(() => {}).finally(() => loadProfile().finally(() => setLoading(false)));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRoles([]);
  };

  const value: AuthCtx = {
    user,
    session,
    profile,
    roles,
    loading,
    isMaster: roles.includes("master"),
    isAdmin: roles.includes("master") || roles.includes("admin"),
    isPro: profile?.plan === "pro",
    refreshProfile: loadProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
