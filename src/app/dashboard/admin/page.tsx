import { UserMenu } from "@/components/auth/user-menu";

export const metadata = { title: "Dashboard Admin — Salute di Ferro" };

export default function AdminDashboardPage() {
  return (
    <main className="flex min-h-screen flex-1 flex-col px-8 py-8">
      <header className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Dashboard Admin
        </h1>
        <UserMenu />
      </header>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-lg">Coming soon</p>
      </div>
    </main>
  );
}
