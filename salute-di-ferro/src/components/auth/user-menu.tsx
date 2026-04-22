"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { LogOut, User as UserIcon, Shield } from "lucide-react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";

type UserMenuProps = {
  /** Custom trigger replacing the default avatar+name button. */
  trigger?: ReactNode;
  /** Which side of the trigger the popover opens on (default "bottom"). */
  contentSide?: "top" | "bottom" | "left" | "right";
  /** Popover alignment relative to the trigger (default "end"). */
  contentAlign?: "start" | "center" | "end";
  /** Offset along the `contentSide` axis (default 4). */
  contentSideOffset?: number;
};

// Role → canonical profile route. /dashboard/profile doesn't exist as
// a route — each role has its own /dashboard/<role>/profile page, and
// pushing to the wrong URL surfaces the app-level error boundary
// ("Qualcosa è andato storto"), which is what users were hitting from
// the avatar menu before this map landed.
const PROFILE_HREF_BY_ROLE: Record<UserRole, string> = {
  PATIENT: "/dashboard/patient/profile",
  DOCTOR: "/dashboard/doctor/profile",
  COACH: "/dashboard/coach/profile",
  ADMIN: "/dashboard/admin/profile",
};

export function UserMenu({
  trigger,
  contentSide = "bottom",
  contentAlign = "end",
  contentSideOffset = 4,
}: UserMenuProps = {}) {
  const { profile, role, user, isLoading } = useUser();
  const router = useRouter();
  const supabase = createClient();

  if (isLoading || !user) return null;

  const name = profile?.fullName ?? user.email ?? "Utente";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Fallback to /dashboard (role-redirect page) if profile/role hasn't
  // resolved yet — never push to a 404 route.
  const profileHref = role ? PROFILE_HREF_BY_ROLE[role] : "/dashboard";

  async function handleLogout() {
    // Record the LOGOUT audit row BEFORE signOut clears the session —
    // otherwise the server request comes in anonymous and the actor is
    // lost. Best-effort: don't block the sign-out on an audit failure.
    try {
      await fetch("/api/audit/logout", { method: "POST" });
    } catch {
      // ignore
    }
    await supabase.auth.signOut();
    toast.success("Disconnesso");
    router.replace("/login");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          trigger
            ? "w-full text-left outline-none"
            : "hover:bg-muted flex h-10 items-center gap-2 rounded-md px-2 transition-colors"
        }
      >
        {trigger ?? (
          <>
            <Avatar className="h-8 w-8">
              {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm sm:inline">{name}</span>
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={contentSide}
        align={contentAlign}
        sideOffset={contentSideOffset}
        className="w-56"
      >
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{name}</span>
          <span className="text-muted-foreground text-xs">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(profileHref)}>
          <UserIcon className="mr-2 h-4 w-4" />
          Profilo
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push("/dashboard/settings/security")}
        >
          <Shield className="mr-2 h-4 w-4" />
          Sicurezza (password · 2FA)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Esci
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
