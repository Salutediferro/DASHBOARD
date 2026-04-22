"use client";

import * as React from "react";
import { toast } from "sonner";

type TherapyItemForReminder = {
  id: string;
  name: string;
  dose: string | null;
  active: boolean;
  reminderEnabled: boolean;
  /// Emitted by the API as an ISO string; the time portion is the HH:MM
  /// the patient set, the date portion is always 1970-01-01 UTC (Postgres
  /// Time type) and is ignored by the scheduler.
  reminderTime: string | null;
};

/**
 * Client-side scheduler for SELF supplement reminders. When the tab is
 * open the hook arms a setTimeout for the next occurrence of HH:MM for
 * each active reminder and refires it every 24h. On fire it shows a
 * browser notification (if the user granted permission) or a sonner
 * toast as fallback, so a patient who denied notifications still sees
 * something while the tab is foregrounded.
 *
 * Delivery is best-effort on purpose — a proper server-side reminder
 * with push notifications belongs to the mobile app, not the dashboard.
 */
export function useTherapyReminders(items: TherapyItemForReminder[]) {
  const timersRef = React.useRef<number[]>([]);
  const firedRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    // Clear any previously scheduled timers when the input list changes.
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];

    const active = items.filter(
      (i) => i.active && i.reminderEnabled && i.reminderTime,
    );
    if (active.length === 0) return;

    for (const item of active) {
      schedule(item);
    }

    function schedule(item: TherapyItemForReminder) {
      const hhmm = extractHHMM(item.reminderTime);
      if (!hhmm) return;
      const delay = msUntilNext(hhmm);
      const key = `${item.id}:${hhmm}`;
      const timer = window.setTimeout(() => {
        // Guard against double-fire when the hook re-runs within the
        // same minute (e.g. item list changes).
        if (!firedRef.current.has(key + ":" + todayStamp())) {
          firedRef.current.add(key + ":" + todayStamp());
          fire(item);
        }
        // Chain the next day's firing so the schedule is open-ended.
        schedule(item);
      }, delay);
      timersRef.current.push(timer);
    }

    return () => {
      for (const t of timersRef.current) window.clearTimeout(t);
      timersRef.current = [];
    };
  }, [items]);
}

/**
 * Ask for Notification permission. Safe to call repeatedly — the browser
 * only shows the OS prompt the first time. Returns `true` if permission
 * ends up granted, `false` otherwise (denied, dismissed, or the API is
 * not available in this runtime).
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

function fire(item: TherapyItemForReminder) {
  const title = "Promemoria supplemento";
  const body = item.dose ? `${item.name} · ${item.dose}` : item.name;

  const canNotify =
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted";

  if (canNotify) {
    try {
      new Notification(title, { body, tag: `therapy-${item.id}` });
      return;
    } catch {
      // fall through to toast
    }
  }
  toast(title, { description: body });
}

function extractHHMM(iso: string | null): string | null {
  if (!iso) return null;
  // The server stores reminderTime as UTC wall-clock (parseHHMM in
  // src/lib/services/therapy.ts uses setUTCHours), so we read it back
  // with getUTCHours/getUTCMinutes. Using getHours here would shift
  // the time by the browser's timezone offset — e.g. "23:00" saved on
  // a CEST client would come back as "01:00".
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function msUntilNext(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  const now = new Date();
  const target = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    h,
    m,
    0,
    0,
  );
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
