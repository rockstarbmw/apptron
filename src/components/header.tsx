import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-user-role";
import { Link, useLocation } from "react-router-dom";

export function Header() {
  const { user: authUser } = useAuth();
  const { isAdmin } = useUserRole();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-card">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-xl font-bold">
              USDT App
            </Link>
            {authUser && (
              <nav className="flex gap-4">
                <Link to="/">
                  <Button
                    variant={isActive("/") ? "default" : "ghost"}
                    size="sm"
                  >
                    Send
                  </Button>
                </Link>
                <Link to="/withdraw">
                  <Button
                    variant={isActive("/withdraw") ? "default" : "ghost"}
                    size="sm"
                  >
                    Withdraw
                  </Button>
                </Link>
                {isAdmin && (
                  <Link to="/admin">
                    <Button
                      variant={isActive("/admin") ? "default" : "ghost"}
                      size="sm"
                    >
                      Admin
                    </Button>
                  </Link>
                )}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-4">
            {authUser && (
              <span className="text-sm text-muted-foreground">
                {authUser.profile.email}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
