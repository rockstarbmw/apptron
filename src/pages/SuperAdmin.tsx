import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Shield, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AdminPage } from "./Admin.tsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";

declare global {
  interface Window {
    ethereum?: Record<string, unknown>;
  }
}

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Backend verification for super admin wallet
  const verifySuperAdmin = useQuery(
    api.adminVerification.verifySuperAdminWallet,
    connectedWallet ? { walletAddress: connectedWallet } : "skip"
  );

  // Check authorization
  useEffect(() => {
    if (connectedWallet && verifySuperAdmin !== undefined) {
      setIsAuthorized(verifySuperAdmin);
      if (!verifySuperAdmin) {
        toast.error("Access denied. Super admin wallet only.");
        setTimeout(() => navigate("/"), 2000);
      }
    }
  }, [connectedWallet, verifySuperAdmin, navigate]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error("Please install MetaMask or Trust Wallet");
      return;
    }

    setIsConnecting(true);
    try {
      const accounts = (await ((window.ethereum as any) as any).request({
        method: "eth_requestAccounts",
      })) as string[];

      if (accounts.length > 0) {
        setConnectedWallet(accounts[0]);
        toast.success("Wallet connected");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast.error("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  // Show connection screen if no wallet connected
  if (!connectedWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md shadow-2xl border-primary/20">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Super Admin Access</CardTitle>
            <CardDescription className="text-center">
              Connect your super admin wallet to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full gap-2"
            >
              <Wallet className="h-4 w-4" />
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-4">
              Only authorized super admin wallet can access this portal
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show verifying screen
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Verifying Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Verifying super admin wallet...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show access denied screen
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
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
      </div>
    );
  }

  // Show admin dashboard
  return <AdminPage adminWallet={connectedWallet} />;
}
