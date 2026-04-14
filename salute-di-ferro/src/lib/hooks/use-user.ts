"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "ADMIN" | "COACH" | "CLIENT";

export type UserProfile = {
  id: string;
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  sex: "MALE" | "FEMALE" | "OTHER" | null;
  birthDate: string | null; // YYYY-MM-DD
  heightCm: number | null;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
};

export function useUser() {
  const supabase = createClient();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setAuthUser(data.user);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  const profileQuery = useQuery<UserProfile | null>({
    queryKey: ["profile", authUser?.id],
    enabled: !!authUser,
    queryFn: async () => {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const profile = profileQuery.data ?? null;
  const role = profile?.role;

  return {
    user: authUser,
    profile,
    isLoading: authLoading || profileQuery.isLoading,
    isCoach: role === "COACH",
    isClient: role === "CLIENT",
    isAdmin: role === "ADMIN",
  };
}
