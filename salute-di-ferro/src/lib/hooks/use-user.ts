"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { User as AuthUser } from "@supabase/supabase-js";
import type { UserRole } from "@prisma/client";
import { createClient } from "@/lib/supabase/client";

export type { UserRole };

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
  taxCode: string | null;
  emergencyContact: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
  // Clinical profile (visible to authorized professionals)
  medicalConditions: string | null;
  allergies: string | null;
  medications: string | null;
  injuries: string | null;
  // Public professional profile (DOCTOR/COACH only — visible to linked patients)
  bio: string | null;
  specialties: string | null;
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
    role: (role ?? null) as UserRole | null,
    isLoading: authLoading || profileQuery.isLoading,
    isAdmin: role === "ADMIN",
    isDoctor: role === "DOCTOR",
    isCoach: role === "COACH",
    isPatient: role === "PATIENT",
  };
}
