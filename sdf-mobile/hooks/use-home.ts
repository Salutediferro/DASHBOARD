import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

/**
 * Shape mirrors the subset of /api/me the mobile home actually uses.
 * Keeping it narrow prevents accidental leakage of clinical fields
 * (conditions, allergies, medications) into the home screen.
 */
export type MeResponse = {
  id: string;
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  role: "ADMIN" | "DOCTOR" | "COACH" | "PATIENT";
  avatarUrl: string | null;
  onboardingCompleted: boolean;
};

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: "REMINDER" | "CHECK_IN" | "PAYMENT" | "SYSTEM" | "AI";
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: NotificationRow[];
  unreadCount: number;
};

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<MeResponse>("/api/me"),
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiFetch<NotificationsResponse>("/api/notifications"),
    refetchInterval: 60_000,
  });
}
