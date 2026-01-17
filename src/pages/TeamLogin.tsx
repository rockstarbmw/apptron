import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { UserCog, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function TeamLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // We'll verify login when user clicks submit
  const handleLogin = async () => {
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }

    setIsLoading(true);

    try {
      // Call verification query
      const result = await fetch(`${import.meta.env.VITE_CONVEX_URL}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "adminUsers:verifyAdminUserLogin",
          args: { username, password },
          format: "json",
        }),
      }).then((res) => res.json());

      if (result.value.success) {
        // Store session in localStorage
        localStorage.setItem("teamMemberSession", JSON.stringify({
          userId: result.value.userId,
          username: username,
          role: result.value.role,
          loginTime: Date.now(),
        }));

        toast.success("Login successful!");
        navigate("/admin");
      } else {
        toast.error(result.value.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-2xl">
        <CardHeader className="space-y-4 text-center bg-gradient-to-br from-primary/10 to-primary/5 border-b">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
            <UserCog className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl">Team Member Login</CardTitle>
            <CardDescription className="mt-2">
              Sign in with your team credentials
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="current-password"
            />
          </div>

          <Button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full gap-2"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign In
              </>
            )}
          </Button>

          <div className="pt-4 border-t text-center text-sm text-muted-foreground">
            Admin or Super Admin?{" "}
            <button
              onClick={() => navigate("/admin")}
              className="text-primary hover:underline font-medium"
            >
              Click here
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
