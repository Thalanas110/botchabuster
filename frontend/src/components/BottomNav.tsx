import { NavLink as RouterNavLink } from "react-router-dom";
import { Camera, ClipboardList, BarChart3, Shield, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/inspect", icon: Camera, label: "Inspect" },
  { to: "/history", icon: ClipboardList, label: "History" },
  { to: "/dashboard", icon: BarChart3, label: "Stats" },
];

export function BottomNav() {
  const { isAdmin } = useAuth();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <RouterNavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="font-display text-[10px] uppercase tracking-wider">{label}</span>
          </RouterNavLink>
        ))}
        {isAdmin && (
          <RouterNavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Shield className="h-5 w-5" />
            <span className="font-display text-[10px] uppercase tracking-wider">Admin</span>
          </RouterNavLink>
        )}
        <RouterNavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          <UserRound className="h-5 w-5" />
          <span className="font-display text-[10px] uppercase tracking-wider">Profile</span>
        </RouterNavLink>
      </div>
    </nav>
  );
}
