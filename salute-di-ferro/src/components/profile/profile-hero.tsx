"use client";

import * as React from "react";
import { Camera } from "lucide-react";
import type { UserRole } from "@prisma/client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import type { UserProfile } from "@/lib/hooks/use-user";
import { AvatarUploadDialog } from "@/components/profile/avatar-upload-dialog";

type Stat = { label: string; value: React.ReactNode };

type Props = {
  profile: UserProfile;
  stats: Stat[];
};

/**
 * Premium profile hero: brand-chrome cover + overlapping avatar with
 * in-place upload trigger + name/role + compact stats row.
 */
export function ProfileHero({ profile, stats }: Props) {
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const initials = profile.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="flex flex-col" aria-labelledby="profile-hero-name">
      {/* Cover */}
      <div
        className="relative h-32 w-full rounded-xl md:h-40"
        style={{
          backgroundImage: "var(--gradient-brand)",
        }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-xl bg-gradient-to-t from-background/80 to-transparent"
        />
      </div>

      {/* Card with avatar + meta + stats */}
      <div className="-mt-12 flex flex-col gap-4 px-2 md:-mt-14">
        <div className="flex flex-wrap items-end gap-4">
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            aria-label="Cambia foto profilo"
            className="focus-ring group relative inline-flex overflow-visible rounded-full"
          >
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg md:h-28 md:w-28">
              {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              aria-hidden
              className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-110"
            >
              <Camera className="h-3.5 w-3.5" />
            </span>
          </button>

          <div className="flex min-w-0 flex-1 flex-col gap-1 pb-1">
            <h1
              id="profile-hero-name"
              className="text-display text-2xl md:text-3xl"
            >
              {profile.fullName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <RoleChip role={profile.role} />
              <span className="truncate text-xs text-muted-foreground">
                {profile.email}
              </span>
            </div>
          </div>
        </div>

        {stats.length > 0 && (
          <dl className="grid grid-cols-3 gap-2 rounded-xl surface-1 p-3 md:p-4">
            {stats.map((s, i) => (
              <div
                key={i}
                className={
                  i > 0 ? "border-l border-border/60 pl-3" : undefined
                }
              >
                <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {s.label}
                </dt>
                <dd className="mt-0.5 text-display text-lg tabular-nums">
                  {s.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <AvatarUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        currentUrl={profile.avatarUrl}
      />
    </section>
  );
}

function RoleChip({ role }: { role: UserRole }) {
  const map: Record<UserRole, { label: string; cls: string }> = {
    PATIENT: { label: "Paziente", cls: "bg-info/15 text-info border-info/30" },
    COACH: {
      label: "Coach",
      cls: "bg-accent-500/15 text-accent-500 border-accent-500/30",
    },
    DOCTOR: {
      label: "Medico",
      cls: "bg-warning/15 text-warning border-warning/30",
    },
    ADMIN: {
      label: "Admin",
      cls: "bg-primary-500/15 text-primary-500 border-primary-500/30",
    },
  };
  const m = map[role];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${m.cls}`}
    >
      {m.label}
    </span>
  );
}
