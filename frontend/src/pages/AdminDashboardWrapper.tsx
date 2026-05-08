import { useIsDesktop } from "@/hooks/use-desktop";
import AdminDashboard from "./AdminDashboard";
import DesktopAdminDashboard from "./DesktopAdminDashboard";
import { BottomNav } from "@/components/BottomNav";

export default function AdminDashboardWrapper() {
  const isDesktop = useIsDesktop();

  if (isDesktop === undefined) {
    return null;
  }

  return (
    <>
      {isDesktop ? <DesktopAdminDashboard /> : <AdminDashboard />}
      <BottomNav />
    </>
  );
}