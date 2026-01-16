import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Shield, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AdminPage } from "./Admin.tsx";

// Super admin email
const SUPER_ADMIN_EMAIL = "rohitcryptodxb@gmail.com";

export default function SuperAdmin() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Check if user is authenticated super admin
  useEffect(() => {
    if (!isLoading && user) {
      const userEmail = user.profile.email?.toLowerCase();
      if (userEmail !== SUPER_ADMIN_EMAIL) {
        toast.error("Access denied. Super admin only.");
        setTimeout(() => navigate("/"), 2000);
      }
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return <Skeleton className="h-screen w-full" />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <AuthLoading>
        <Skeleton className="h-screen w-full" />
      </AuthLoading>
      
      <Unauthenticated>
        <Card className="w-full max-w-md shadow-2xl border-primary/20">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Super Admin Access</CardTitle>
            <CardDescription className="text-center">
              Sign in with your super admin email to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInButton className="w-full gap-2">
              <Mail className="h-4 w-4" />
              Sign in with Email
            </SignInButton>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Only authorized super admin accounts can access this portal
            </p>
          </CardContent>
        </Card>
      </Unauthenticated>

      <Authenticated>
        {user?.profile.email?.toLowerCase() === SUPER_ADMIN_EMAIL ? (
          <AdminPage adminEmail={user.profile.email} />
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-destructive">Access Denied</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                You are not authorized to access the super admin dashboard
              </p>
              <Button onClick={() => navigate("/")} variant="outline">
                Go Home
              </Button>
            </CardContent>
          </Card>
        )}
      </Authenticated>
    </div>
  );
}
