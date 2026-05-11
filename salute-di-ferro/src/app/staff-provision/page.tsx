import { cookies } from "next/headers";
import {
  STAFF_GATE_COOKIE,
  verifyGateToken,
} from "@/lib/staff-provision/token";
import { GateForm } from "./gate-form";
import { ProvisionForm } from "./provision-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Staff",
  robots: { index: false, follow: false },
};

export default async function StaffProvisionPage() {
  const jar = await cookies();
  const unlocked = verifyGateToken(jar.get(STAFF_GATE_COOKIE)?.value);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-10">
      {unlocked ? <ProvisionForm /> : <GateForm />}
    </div>
  );
}
