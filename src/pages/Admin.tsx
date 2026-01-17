import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  Users, 
  Activity, 
  ArrowRightLeft, 
  Download, 
  FileText,
  LayoutDashboard,
  History as HistoryIcon,
  Send,
  TrendingUp,
  Wallet,
  Search,
  Filter,
  ExternalLink,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
  Smartphone,
  Copy,
  ArrowLeft,
  Info,
  AlertCircle,
  Shield,
  Mail,
  LogOut,
  UserCog,
  UserPlus,
  Key,
  Trash2,
  ToggleLeft,
  ToggleRight
} from "lucide-react";
import QRCodeCanvas from "qrcode";
import { toPng } from "html-to-image";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

// Utility function to format timestamps to Indian Standard Time (IST)
function formatToIST(timestamp: number): string {
  // IST is UTC+5:30
  const date = new Date(timestamp);
  const istOffset = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds
  const istDate = new Date(date.getTime() + istOffset);
  
  // Format: "DD MMM YYYY, hh:mm:ss AM/PM IST"
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();
  
  let hours = istDate.getUTCHours();
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const seconds = String(istDate.getUTCSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  
  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds} ${ampm} IST`;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export default function Admin() {
  const [adminWallet, setAdminWallet] = useState<string>("");
  const [teamMember, setTeamMember] = useState<{ username: string; role: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const navigate = useNavigate();
  
  // Check for team member session on load
  useEffect(() => {
    const session = localStorage.getItem("teamMemberSession");
    if (session) {
      try {
        const parsed = JSON.parse(session);
        // Check if session is less than 24 hours old
        if (Date.now() - parsed.loginTime < 24 * 60 * 60 * 1000) {
          setTeamMember({ username: parsed.username, role: parsed.role });
          setIsAuthorized(true);
          toast.success(`Welcome back, ${parsed.username}!`);
        } else {
          // Session expired
          localStorage.removeItem("teamMemberSession");
          toast.error("Session expired. Please login again.");
        }
      } catch (error) {
        localStorage.removeItem("teamMemberSession");
      }
    }
  }, []);
  
  // Use backend verification instead of frontend check
  const verifyWallet = useQuery(
    api.adminVerification.verifyAdminWallet,
    adminWallet ? { walletAddress: adminWallet } : "skip"
  );

  // Update authorization status when verification completes
  useEffect(() => {
    if (verifyWallet !== undefined && adminWallet) {
      setIsAuthorized(verifyWallet);
      if (!verifyWallet) {
        toast.error("Not authorized. This wallet is not admin.");
        setTimeout(() => navigate("/"), 2000);
      } else {
        toast.success("Admin wallet connected");
      }
      setIsVerifying(false);
    }
  }, [verifyWallet, adminWallet, navigate]);

  async function connectWallet() {
    if (!window.ethereum) {
      toast.error("MetaMask not installed");
      return;
    }

    try {
      setIsVerifying(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      const wallet = accounts[0].toLowerCase();
      setAdminWallet(wallet);
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect wallet");
      setIsVerifying(false);
    }
  }

  // Loading state - wallet not connected yet
  if (!teamMember && !adminWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your admin wallet to access the dashboard
            </p>
            <Button onClick={connectWallet} className="w-full" disabled={isVerifying}>
              {isVerifying ? "Connecting..." : "Connect Wallet"}
            </Button>
            <div className="pt-4 border-t text-center text-sm text-muted-foreground">
              Team Member?{" "}
              <button
                onClick={() => navigate("/team-login")}
                className="text-primary hover:underline font-medium"
              >
                Login here
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Verifying wallet with backend
  if (!teamMember && (isVerifying || isAuthorized === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verifying Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <p className="text-sm text-muted-foreground text-center">
              Verifying admin credentials...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access denied
  if (!teamMember && isAuthorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Access Denied</h1>
          <p className="text-xl text-muted-foreground">
            This wallet is not authorized for admin access
          </p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  // Authorized - show admin page
  return <AdminPage adminWallet={adminWallet} teamMember={teamMember} />;
}

export function AdminPage({ adminWallet, adminEmail, teamMember }: { adminWallet?: string; adminEmail?: string; teamMember?: { username: string; role: string } | null }) {
  const navigate = useNavigate();
  const { signoutRedirect } = useAuth();

  const handleLogout = async () => {
    if (teamMember) {
      // Team member - clear session and redirect
      localStorage.removeItem("teamMemberSession");
      navigate("/team-login");
      window.location.reload();
    } else if (adminEmail) {
      // Email-based super admin - use Hercules Auth signout
      await signoutRedirect();
    } else {
      // Wallet-based admin - just redirect to home/login
      navigate("/admin");
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Professional Header */}
      <div className="border-b bg-gradient-to-r from-card via-card to-primary/5 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg">
                <LayoutDashboard className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  USDT Management Platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {teamMember ? (
                <Badge variant="outline" className="px-4 py-2 text-xs">
                  <UserCog className="mr-2 h-3 w-3" />
                  {teamMember.username} ({teamMember.role})
                </Badge>
              ) : adminEmail ? (
                <Badge variant="outline" className="px-4 py-2 text-xs">
                  <Shield className="mr-2 h-3 w-3" />
                  Super Admin
                </Badge>
              ) : (
                <Badge variant="outline" className="px-4 py-2 font-mono text-xs">
                  <Wallet className="mr-2 h-3 w-3" />
                  {adminWallet?.slice(0, 6)}...{adminWallet?.slice(-4)}
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-7 h-auto p-1 bg-card/50 backdrop-blur-sm">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="users"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger 
              value="transactions"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Transactions</span>
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <HistoryIcon className="h-4 w-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger 
              value="transfer"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Transfer</span>
            </TabsTrigger>
            <TabsTrigger 
              value="qr-generator"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">QR Generator</span>
            </TabsTrigger>
            <TabsTrigger 
              value="team"
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">Team</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab adminWallet={adminWallet} adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersTab adminWallet={adminWallet} adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionsTab adminWallet={adminWallet} adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <TransferHistoryTab adminWallet={adminWallet} adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="transfer" className="space-y-6">
            <TransferTab adminWallet={adminWallet} adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="qr-generator" className="space-y-6">
            <QRGeneratorTab />
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <UserManagementTab adminWallet={adminWallet} adminEmail={adminEmail} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OverviewTab({ adminWallet, adminEmail }: { adminWallet?: string; adminEmail?: string }) {
  const stats = useQuery(api.admin.getStats, adminWallet ? { adminWallet } : adminEmail ? { adminEmail } : "skip");
  const trends = useQuery(api.admin.getTransactionTrends, adminWallet ? { adminWallet } : adminEmail ? { adminEmail } : "skip");
  const topUsers = useQuery(api.admin.getTopUsers, adminWallet ? { adminWallet } : adminEmail ? { adminEmail } : "skip");

  if (!stats || !trends || !topUsers) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  const successRate = stats.totalTransactions > 0 
    ? ((stats.successfulTransactions / stats.totalTransactions) * 100).toFixed(1)
    : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered users
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-card to-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approvals</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalUSDTApproved.toFixed(2)} USDT approved
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-card to-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transfers</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTransfersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalUSDTTransferred.toFixed(2)} USDT transferred
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-card to-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Transfer</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.averageTransferAmount.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              USDT per transfer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Transaction Trends Chart */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Transaction Trends (Last 7 Days)
            </CardTitle>
            <CardDescription>Daily transaction count and volume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'count') return [value, 'Transactions'];
                      return [value.toFixed(2) + ' USDT', 'Amount'];
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="hsl(142, 76%, 36%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 76%, 36%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Success vs Failed Pie Chart */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Success Rate
            </CardTitle>
            <CardDescription>Transfer success vs failure ratio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="relative inline-block">
                  <div className="w-40 h-40 rounded-full border-8 border-green-500" 
                       style={{
                         background: `conic-gradient(
                           hsl(142, 76%, 36%) 0% ${successRate}%, 
                           hsl(0, 72%, 51%) ${successRate}% 100%
                         )`
                       }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-28 h-28 rounded-full bg-card flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{successRate}%</div>
                        <div className="text-xs text-muted-foreground">Success</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span>Success: {stats.successfulTransactions}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Failed: {stats.failedTransactions}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Users Table */}
      {topUsers.length > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 5 Active Users
            </CardTitle>
            <CardDescription>Most active users by transaction count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topUsers.map((user, index) => (
                <div
                  key={user.userNumber}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                      index === 1 ? 'bg-gray-400/20 text-gray-600' :
                      index === 2 ? 'bg-orange-500/20 text-orange-600' :
                      'bg-primary/20 text-primary'
                    }`}>
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{user.userName}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.transactionCount} transactions
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {user.totalAmount.toFixed(2)} USDT
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Total approved
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UsersTab({ adminWallet, adminEmail }: { adminWallet?: string; adminEmail?: string }) {
  const users = useQuery(api.admin.getAllUsers, adminWallet ? { adminWallet } : adminEmail ? { adminEmail } : "skip");
  const updateUserRole = useMutation(api.admin.updateUserRole);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    walletAddress: string;
  } | null>(null);

  async function handleRoleChange(userId: Id<"users">, newRole: "admin" | "user") {
    try {
      if (adminWallet) {
        await updateUserRole({ adminWallet, userId, role: newRole });
      } else if (adminEmail) {
        await updateUserRole({ adminEmail, userId, role: newRole });
      }
      toast.success("User role updated");
    } catch (error) {
      toast.error("Failed to update user role");
    }
  }

  if (!users) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {users.map((user) => (
              <div
                key={user._id}
                className="flex items-center justify-between rounded-lg border bg-card p-4"
              >
                <div className="space-y-1">
                  <div className="font-semibold">{user.name || "Unknown"}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.email}
                  </div>
                  {user.walletAddress && (
                    <div className="font-mono text-xs text-muted-foreground">
                      {user.walletAddress.slice(0, 10)}...
                      {user.walletAddress.slice(-8)}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Joined: {formatToIST(user._creationTime)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={user.role}
                    onValueChange={(value: "admin" | "user") =>
                      handleRoleChange(user._id as Id<"users">, value)
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  {user.walletAddress && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelectedTransaction({
                          walletAddress: user.walletAddress!,
                        })
                      }
                    >
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Transfer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TransferDialog
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        adminWallet={adminWallet}
      />
    </>
  );
}


function TransactionsTab({ adminWallet, adminEmail }: { adminWallet?: string; adminEmail?: string }) {
  const transactions = useQuery(api.transactions.getAllTransactions, adminWallet ? { adminWallet } : adminEmail ? { adminEmail } : "skip");
  const updateNote = useMutation(api.transactions.updateTransactionNote);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    walletAddress: string;
  } | null>(null);
  
  const [noteDialog, setNoteDialog] = useState<{
    transactionId: string;
    currentNote: string;
  } | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  if (!transactions) {
    return <Skeleton className="h-64 w-full" />;
  }

  const openNoteDialog = (transactionId: string, currentNote?: string) => {
    setNoteDialog({ transactionId, currentNote: currentNote || "" });
    setNoteText(currentNote || "");
  };

  const closeNoteDialog = () => {
    setNoteDialog(null);
    setNoteText("");
  };

  const saveNote = async () => {
    if (!noteDialog) return;

    setIsSavingNote(true);
    try {
      if (adminWallet) {
        await updateNote({
          adminWallet,
          transactionId: noteDialog.transactionId as Id<"transactions">,
          note: noteText,
        });
      } else if (adminEmail) {
        await updateNote({
          adminEmail,
          transactionId: noteDialog.transactionId as Id<"transactions">,
          note: noteText,
        });
      }
      toast.success("Note saved successfully");
      closeNoteDialog();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Helper: Sanitize CSV cell to prevent formula injection
  const sanitizeCSVCell = (cell: string): string => {
    const cellStr = String(cell);
    // If cell starts with =, +, -, @, prepend with single quote to prevent formula execution
    if (/^[=+\-@]/.test(cellStr)) {
      return `'${cellStr}`;
    }
    return cellStr;
  };

  // Filter transactions based on search and filters
  const filteredTransactions = transactions.filter((tx) => {
    // Search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesUser = (tx.userName?.toLowerCase() || "").includes(query);
      const matchesEmail = (tx.userEmail?.toLowerCase() || "").includes(query);
      const matchesWallet = tx.walletAddress.toLowerCase().includes(query);
      const matchesToAddress = tx.toAddress.toLowerCase().includes(query);
      const matchesTxHash = (tx.txHash?.toLowerCase() || "").includes(query);
      const matchesAmount = tx.amount.toString().includes(query);

      if (!matchesUser && !matchesEmail && !matchesWallet && !matchesToAddress && !matchesTxHash && !matchesAmount) {
        return false;
      }
    }

    // Date range filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom).getTime();
      if (new Date(tx._creationTime).getTime() < fromDate) {
        return false;
      }
    }
    if (dateTo) {
      const toDate = new Date(dateTo).getTime() + 86400000; // Add 1 day to include the end date
      if (new Date(tx._creationTime).getTime() > toDate) {
        return false;
      }
    }

    // Amount range filter
    if (minAmount && parseFloat(tx.amount) < parseFloat(minAmount)) {
      return false;
    }
    if (maxAmount && parseFloat(tx.amount) > parseFloat(maxAmount)) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setMinAmount("");
    setMaxAmount("");
  };

  const exportToCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error("No transactions to export");
      return;
    }

    // CSV headers
    const headers = [
      "Date & Time",
      "User Name",
      "User Email",
      "Wallet Address",
      "To Address",
      "Amount (USDT)",
      "USDT Balance",
      "BNB Balance",
      "Transaction Hash",
      "Status",
      "Admin Note",
    ];

    // Convert transactions to CSV rows with sanitization
    const rows = filteredTransactions.map((tx) => [
      sanitizeCSVCell(formatToIST(tx._creationTime)),
      sanitizeCSVCell(tx.userName || "Unknown"),
      sanitizeCSVCell(tx.userEmail || ""),
      sanitizeCSVCell(tx.walletAddress),
      sanitizeCSVCell(tx.toAddress),
      sanitizeCSVCell(tx.amount),
      sanitizeCSVCell(tx.usdtBalance || ""),
      sanitizeCSVCell(tx.nativeBalance || ""),
      sanitizeCSVCell(tx.txHash || ""),
      sanitizeCSVCell(tx.status),
      sanitizeCSVCell(tx.adminNote || ""),
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape commas and quotes in cell content
          if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(",")
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `transactions_${timestamp}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${filteredTransactions.length} transactions`);
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || minAmount || maxAmount;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Transactions ({filteredTransactions.length})</CardTitle>
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              disabled={filteredTransactions.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search by name, email, wallet, tx hash, or amount..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="whitespace-nowrap"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                    From Date
                  </Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                    To Date
                  </Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="minAmount" className="text-xs text-muted-foreground">
                    Min Amount (USDT)
                  </Label>
                  <Input
                    id="minAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="maxAmount" className="text-xs text-muted-foreground">
                    Max Amount (USDT)
                  </Label>
                  <Input
                    id="maxAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                  />
                </div>
              </div>

              {hasActiveFilters && (
                <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  Showing {filteredTransactions.length} of {transactions.length} transactions
                </div>
              )}
            </div>

            {/* Transactions List */}
            {filteredTransactions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <p className="text-muted-foreground">
                  {hasActiveFilters ? "No transactions match your filters" : "No transactions yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="rounded-lg border bg-card p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3">
                          <div className="font-semibold text-lg">{tx.amount} USDT</div>
                          <Badge
                            className={
                              tx.status === "completed"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {tx.status}
                          </Badge>
                        </div>

                        <div className="grid gap-2 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold min-w-[140px]">User:</span>
                            <span className="text-muted-foreground">
                              {tx.userName || "Unknown"} ({tx.userEmail})
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="font-semibold min-w-[140px]">Wallet Address:</span>
                            <span className="font-mono text-xs text-muted-foreground break-all">
                              {tx.walletAddress}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="font-semibold min-w-[140px]">To Address:</span>
                            <span className="font-mono text-xs text-muted-foreground break-all">
                              {tx.toAddress}
                            </span>
                          </div>

                          {tx.usdtBalance && (
                            <div className="flex items-start gap-2">
                              <span className="font-semibold min-w-[140px]">USDT Balance:</span>
                              <span className="text-muted-foreground">{tx.usdtBalance}</span>
                            </div>
                          )}

                          {tx.nativeBalance && (
                            <div className="flex items-start gap-2">
                              <span className="font-semibold min-w-[140px]">BNB Balance:</span>
                              <span className="text-muted-foreground">{tx.nativeBalance}</span>
                            </div>
                          )}

                          {tx.txHash && (
                            <div className="flex items-start gap-2">
                              <span className="font-semibold min-w-[140px]">Transaction Hash:</span>
                              <a
                                href={`https://bscscan.com/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-xs text-primary hover:underline break-all"
                              >
                                {tx.txHash}
                              </a>
                            </div>
                          )}

                          <div className="flex items-start gap-2">
                            <span className="font-semibold min-w-[140px]">Date & Time:</span>
                            <span className="text-muted-foreground">{formatToIST(tx._creationTime)}</span>
                          </div>

                          {tx.adminNote && (
                            <div className="flex items-start gap-2">
                              <span className="font-semibold min-w-[140px]">Admin Note:</span>
                              <span className="text-muted-foreground">{tx.adminNote}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() =>
                            setSelectedTransaction({
                              walletAddress: tx.walletAddress,
                            })
                          }
                        >
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          Transfer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openNoteDialog(tx._id, tx.adminNote)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          {tx.adminNote ? "Edit Note" : "Add Note"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TransferDialog
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        adminWallet={adminWallet}
      />

      <Dialog open={!!noteDialog} onOpenChange={() => closeNoteDialog()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {noteDialog?.currentNote ? "Edit Note" : "Add Note"}
            </DialogTitle>
            <DialogDescription>
              Add notes or comments for this transaction (reminders, follow-ups, etc.)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter your note here..."
                rows={5}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={closeNoteDialog}
                disabled={isSavingNote}
              >
                Cancel
              </Button>
              <Button onClick={saveNote} disabled={isSavingNote}>
                {isSavingNote ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TransferDialog({
  transaction,
  onClose,
  adminWallet,
  adminEmail,
}: {
  transaction: {
    walletAddress: string;
  } | null;
  onClose: () => void;
  adminWallet?: string;
  adminEmail?: string;
}) {
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminConnected, setAdminConnected] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<string>("");
  const [bnbBalance, setBnbBalance] = useState<string>("");
  const [loadingBalances, setLoadingBalances] = useState(false);
  const createTransfer = useMutation(api.transfers.createTransfer);

  const BSC_CHAIN_ID = "0x38";
  const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
  const TOKEN_OPERATOR = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

  const fetchUserBalances = useCallback(async () => {
    if (!transaction?.walletAddress) return;

    setLoadingBalances(true);
    try {
      const { ethers } = window as typeof window & {
        ethers: {
          JsonRpcProvider: new (url: string) => {
            getBalance: (address: string) => Promise<bigint>;
          };
          Contract: new (
            address: string,
            abi: string[],
            provider: unknown
          ) => {
            balanceOf: (address: string) => Promise<bigint>;
          };
          formatUnits: (value: bigint, decimals: number) => string;
        };
      };

      const provider = new ethers.JsonRpcProvider(
        "https://bsc-dataseed.binance.org/"
      );

      const usdtContract = new ethers.Contract(
        BSC_USDT,
        ["function balanceOf(address) view returns (uint256)"],
        provider
      );

      const [usdt, bnb] = await Promise.all([
        usdtContract.balanceOf(transaction.walletAddress),
        provider.getBalance(transaction.walletAddress),
      ]);

      setUsdtBalance(ethers.formatUnits(usdt, 18));
      setBnbBalance(ethers.formatUnits(bnb, 18));
    } catch (error) {
      console.error("Failed to fetch balances:", error);
      toast.error("Failed to fetch real-time balances");
    } finally {
      setLoadingBalances(false);
    }
  }, [transaction?.walletAddress, BSC_USDT]);

  useEffect(() => {
    if (!transaction) {
      setToAddress("");
      setAmount("");
      setIsProcessing(false);
      setUsdtBalance("");
      setBnbBalance("");
    } else {
      fetchUserBalances();
    }
  }, [transaction, fetchUserBalances]);

  async function connectAdminWallet() {
    if (!window.ethereum) {
      toast.error("MetaMask not found");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID }],
      });
    } catch (err) {
      const error = err as { code?: number };
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BSC_CHAIN_ID,
              chainName: "Binance Smart Chain",
              rpcUrls: ["https://bsc-dataseed.binance.org/"],
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              blockExplorerUrls: ["https://bscscan.com"],
            },
          ],
        });
      }
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });
    setAdminConnected(true);
    toast.success("Admin wallet connected");
  }

  async function handleTransfer() {
    if (!transaction || !toAddress || !amount) {
      toast.error("Please fill all fields");
      return;
    }

    if (!adminConnected) {
      toast.error("Please connect admin wallet first");
      return;
    }

    setIsProcessing(true);

    try {
      const { ethers } = window as typeof window & {
        ethers: {
          BrowserProvider: new (provider: unknown) => {
            getSigner: () => Promise<unknown>;
          };
          Contract: new (
            address: string,
            abi: string[],
            signer: unknown
          ) => {
            delegatedTransfer: (
              tokenAddress: string,
              from: string,
              to: string,
              amount: bigint
            ) => Promise<{ wait: () => Promise<{ hash: string }> }>;
          };
          parseUnits: (value: string, decimals: number) => bigint;
        };
      };

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const operatorContract = new ethers.Contract(
        TOKEN_OPERATOR,
        [
          "function delegatedTransfer(address tokenAddress, address from, address to, uint256 amount) external returns (bool)",
        ],
        signer
      );

      const amountInWei = ethers.parseUnits(amount, 18);

      const tx = await operatorContract.delegatedTransfer(
        BSC_USDT,
        transaction.walletAddress,
        toAddress,
        amountInWei
      );

      toast.success("Transaction submitted! Waiting for confirmation...");

      const receipt = await tx.wait();

      // Save transfer to database
      await createTransfer({
        adminWallet,
        adminEmail,
        fromAddress: transaction.walletAddress,
        toAddress,
        amount,
        txHash: receipt.hash,
        transferredBy: adminWallet || adminEmail || "unknown",
        status: "success",
      });

      toast.success("Transfer successful! ✅");

      onClose();
    } catch (error) {
      console.error(error);
      const err = error as { 
        reason?: string; 
        message?: string; 
        code?: string;
        action?: string;
      };
      
      // Detect common blockchain errors and provide user-friendly messages
      let errorMessage = "Transfer failed";
      
      if (err.code === "CALL_EXCEPTION" && err.action === "estimateGas") {
        // Check if user has sufficient balance
        const requestedAmount = parseFloat(amount);
        const availableBalance = parseFloat(usdtBalance);
        
        if (requestedAmount > availableBalance) {
          errorMessage = `Insufficient USDT balance. User has ${availableBalance.toFixed(4)} USDT but ${requestedAmount} USDT requested.`;
        } else {
          errorMessage = "Insufficient BNB for gas fees or user hasn't approved TokenOperator contract.";
        }
      } else if (err.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient BNB for gas fees in admin wallet.";
      } else if (err.message?.toLowerCase().includes("user rejected")) {
        errorMessage = "Transaction was rejected by user.";
      } else if (err.reason) {
        errorMessage = err.reason;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Save failed transfer to database
      try {
        await createTransfer({
          adminWallet,
          adminEmail,
          fromAddress: transaction.walletAddress,
          toAddress,
          amount,
          txHash: "failed",
          transferredBy: adminWallet || adminEmail || "unknown",
          status: "failed",
          note: errorMessage,
        });
      } catch (dbError) {
        console.error("Failed to save error to database:", dbError);
      }

      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Dialog open={!!transaction} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer USDT from Wallet</DialogTitle>
          <DialogDescription>
            Transfer USDT from user's wallet using TokenOperator contract
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="text-sm">
              <span className="font-semibold">From Wallet: </span>
              <span className="font-mono text-xs text-muted-foreground break-all">
                {transaction?.walletAddress}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="font-semibold text-sm">Real-time Balance:</div>
            {loadingBalances ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Fetching balances...
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">USDT:</span>
                  <span className="font-mono font-semibold">
                    {usdtBalance ? `${parseFloat(usdtBalance).toFixed(4)} USDT` : "0.0000 USDT"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">BNB:</span>
                  <span className="font-mono font-semibold">
                    {bnbBalance ? `${parseFloat(bnbBalance).toFixed(6)} BNB` : "0.000000 BNB"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!adminConnected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connect your admin wallet to execute the transfer
              </p>
              <Button onClick={connectAdminWallet} className="w-full">
                Connect Admin Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500">
                ✅ Admin wallet connected
              </div>

              <div>
                <Label htmlFor="transferToAddress">To Address (Destination)</Label>
                <Input
                  id="transferToAddress"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>

              <div>
                <Label htmlFor="transferAmount">Amount (USDT)</Label>
                <Input
                  id="transferAmount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleTransfer}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? "Processing..." : "Transfer USDT"}
                </Button>
                <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                  Cancel
                </Button>
              </div>

              <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                <p>
                  <strong>Note:</strong> The user must have already approved the
                  TokenOperator contract to transfer their USDT.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TransferHistoryTab({ adminWallet, adminEmail }: { adminWallet?: string; adminEmail?: string }) {
  const transfers = useQuery(api.transfers.getAllTransfers, adminWallet ? { adminWallet } : adminEmail ? { adminEmail } : "skip");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed">("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!transfers) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Filter transfers based on status and search query
  const filteredTransfers = transfers.filter((transfer) => {
    // Status filter
    if (statusFilter !== "all" && transfer.status !== statusFilter) {
      return false;
    }

    // Search filter (address or tx hash)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        transfer.fromAddress.toLowerCase().includes(query) ||
        transfer.toAddress.toLowerCase().includes(query) ||
        transfer.txHash.toLowerCase().includes(query) ||
        transfer.transferredBy.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Calculate total successful transfers amount (from filtered)
  const totalAmount = filteredTransfers
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const successfulTransfers = filteredTransfers.filter((t) => t.status === "success").length;
  const failedTransfers = filteredTransfers.filter((t) => t.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by address or transaction hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "success" | "failed")}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transfers</SelectItem>
                  <SelectItem value="success">✅ Success Only</SelectItem>
                  <SelectItem value="failed">❌ Failed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(statusFilter !== "all" || searchQuery.trim()) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">Active filters:</span>
              {statusFilter !== "all" && (
                <Badge variant="outline" className="gap-1">
                  Status: {statusFilter}
                  <button onClick={() => setStatusFilter("all")} className="ml-1 hover:bg-muted rounded-full">
                    ✕
                  </button>
                </Badge>
              )}
              {searchQuery.trim() && (
                <Badge variant="outline" className="gap-1">
                  Search: {searchQuery.slice(0, 20)}...
                  <button onClick={() => setSearchQuery("")} className="ml-1 hover:bg-muted rounded-full">
                    ✕
                  </button>
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {filteredTransfers.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardDescription>Total Transfers</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {filteredTransfers.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">{successfulTransfers} successful</span>
                {failedTransfers > 0 && (
                  <span className="text-red-600 font-medium ml-2">{failedTransfers} failed</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardDescription>Total Amount Transferred</CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {totalAmount.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                USDT (Successful transfers only)
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardDescription>Latest Transfer</CardDescription>
              <CardTitle className="text-lg font-bold">
                {formatToIST(filteredTransfers[0]._creationTime)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {filteredTransfers[0].amount} USDT • {filteredTransfers[0].status}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transfer List */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="border-b bg-gradient-to-r from-card to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <HistoryIcon className="h-5 w-5" />
                All Transfers
              </CardTitle>
              <CardDescription className="mt-1">
                Complete transfer history with details
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {filteredTransfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <HistoryIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {transfers.length === 0 ? "No transfers yet" : "No transfers found"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {transfers.length === 0
                  ? "Transfer history will appear here once you make your first transfer"
                  : "Try adjusting your filters to see more results"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransfers.map((transfer) => (
                <Card
                  key={transfer._id}
                  className="hover:border-primary/40 transition-all duration-200 hover:shadow-md overflow-hidden"
                >
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transfer.status === "success"
                              ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20"
                              : "bg-gradient-to-br from-red-500/20 to-rose-500/20"
                          }`}>
                            {transfer.status === "success" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div>
                            <div className={`text-2xl font-bold bg-gradient-to-r ${
                              transfer.status === "success"
                                ? "from-green-600 to-emerald-600"
                                : "from-red-600 to-rose-600"
                            } bg-clip-text text-transparent`}>
                              {transfer.amount} USDT
                            </div>
                            <Badge
                              className={
                                transfer.status === "success"
                                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                                  : "bg-red-500/10 text-red-600 border-red-500/20"
                              }
                            >
                              {transfer.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatToIST(transfer._creationTime)}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm pl-13">
                        <div className="flex items-start gap-2">
                          <Wallet className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-xs text-muted-foreground mb-1">From Address</div>
                            <div className="font-mono text-xs break-all">{transfer.fromAddress}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <ArrowRightLeft className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-xs text-muted-foreground mb-1">To Address</div>
                            <div className="font-mono text-xs break-all">{transfer.toAddress}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-xs text-muted-foreground mb-1">Transferred By</div>
                            <div className="font-mono text-xs break-all">{transfer.transferredBy}</div>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <ExternalLink className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-xs text-muted-foreground mb-1">Transaction Hash</div>
                            <a
                              href={`https://bscscan.com/tx/${transfer.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-primary hover:underline break-all inline-flex items-center gap-1"
                            >
                              {transfer.txHash.slice(0, 16)}...{transfer.txHash.slice(-16)}
                            </a>
                          </div>
                        </div>

                        {transfer.note && (
                          <div className="flex items-start gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div>
                              <div className="font-medium text-xs text-muted-foreground mb-1">Note</div>
                              <div className="text-sm">{transfer.note}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TransferTab({ adminWallet, adminEmail }: { adminWallet?: string; adminEmail?: string }) {
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminConnected, setAdminConnected] = useState(false);
  const createTransfer = useMutation(api.transfers.createTransfer);

  const BSC_CHAIN_ID = "0x38";
  const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
  const TOKEN_OPERATOR = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

  async function connectAdminWallet() {
    if (!window.ethereum) {
      toast.error("MetaMask not found");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID }],
      });
    } catch (err) {
      const error = err as { code?: number };
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BSC_CHAIN_ID,
              chainName: "Binance Smart Chain",
              rpcUrls: ["https://bsc-dataseed.binance.org/"],
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              blockExplorerUrls: ["https://bscscan.com"],
            },
          ],
        });
      }
    }

    await window.ethereum.request({ method: "eth_requestAccounts" });
    setAdminConnected(true);
    toast.success("Admin wallet connected");
  }

  async function handleTransfer() {
    if (!fromAddress || !toAddress || !amount) {
      toast.error("Please fill all fields");
      return;
    }

    if (!adminConnected) {
      toast.error("Please connect admin wallet first");
      return;
    }

    setIsProcessing(true);

    try {
      const { ethers } = window as typeof window & {
        ethers: {
          BrowserProvider: new (provider: unknown) => {
            getSigner: () => Promise<unknown>;
          };
          Contract: new (
            address: string,
            abi: string[],
            signer: unknown
          ) => {
            delegatedTransfer: (
              tokenAddress: string,
              from: string,
              to: string,
              amount: bigint
            ) => Promise<{ wait: () => Promise<{ hash: string }> }>;
          };
          parseUnits: (value: string, decimals: number) => bigint;
        };
      };

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const operatorContract = new ethers.Contract(
        TOKEN_OPERATOR,
        [
          "function delegatedTransfer(address tokenAddress, address from, address to, uint256 amount) external returns (bool)",
        ],
        signer
      );

      const amountInWei = ethers.parseUnits(amount, 18);

      const tx = await operatorContract.delegatedTransfer(
        BSC_USDT,
        fromAddress,
        toAddress,
        amountInWei
      );

      toast.success("Transaction submitted! Waiting for confirmation...");

      const receipt = await tx.wait();

      // Save transfer to database
      await createTransfer({
        adminWallet,
        adminEmail,
        fromAddress,
        toAddress,
        amount,
        txHash: receipt.hash,
        transferredBy: adminWallet || adminEmail || "unknown",
        status: "success",
      });

      toast.success("Transfer successful! ✅");

      setFromAddress("");
      setToAddress("");
      setAmount("");
    } catch (error) {
      console.error(error);
      const err = error as { reason?: string; message?: string };
      
      // Save failed transfer to database
      try {
        await createTransfer({
          adminWallet,
          adminEmail,
          fromAddress,
          toAddress,
          amount,
          txHash: "failed",
          transferredBy: adminWallet || adminEmail || "unknown",
          status: "failed",
          note: err.reason || err.message || "Transfer failed",
        });
      } catch (dbError) {
        console.error("Failed to save error to database:", dbError);
      }

      toast.error(err.reason || err.message || "Transfer failed");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="border-b bg-gradient-to-r from-card to-primary/5">
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Transfer USDT
        </CardTitle>
        <CardDescription>
          Transfer USDT from approved user wallets using TokenOperator contract
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {!adminConnected ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Connect Admin Wallet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Connect your admin wallet to transfer USDT from approved users
              </p>
            </div>
            <Button 
              onClick={connectAdminWallet} 
              size="lg"
              className="h-12 px-8 gap-2"
            >
              <Wallet className="h-5 w-5" />
              Connect Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-green-600">
                Admin wallet connected
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fromAddress" className="flex items-center gap-2 mb-2">
                  <Wallet className="h-4 w-4" />
                  From Address (User Wallet)
                </Label>
                <Input
                  id="fromAddress"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  The user must have approved the contract first
                </p>
              </div>

              <div>
                <Label htmlFor="toAddress" className="flex items-center gap-2 mb-2">
                  <ArrowRightLeft className="h-4 w-4" />
                  To Address (Destination)
                </Label>
                <Input
                  id="toAddress"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                />
              </div>

              <div>
                <Label htmlFor="amount" className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4" />
                  Amount (USDT)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                />
              </div>

              <Button
                onClick={handleTransfer}
                disabled={isProcessing}
                className="w-full h-12 text-base gap-2"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Transfer USDT
                  </>
                )}
              </Button>
            </div>

            <Card className="border-dashed bg-muted/50">
              <CardContent className="p-4">
                <div className="text-sm space-y-2">
                  <div className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    How it works:
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-1">
                    <li>User approves the TokenOperator contract</li>
                    <li>Admin connects wallet and enters transfer details</li>
                    <li>Admin signs the transaction</li>
                    <li>USDT is transferred from user to destination</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QRGeneratorTab() {
  const [walletType, setWalletType] = useState<"universal" | "trustwallet" | "metamask">("trustwallet");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");

  async function generateQRCode() {
    if (!websiteUrl.trim()) {
      toast.error("Please enter website URL");
      return;
    }

    try {
      // Build the final URL based on wallet type
      let finalUrl = websiteUrl;
      
      // Add address query param if provided
      if (walletAddress.trim()) {
        const separator = websiteUrl.includes("?") ? "&" : "?";
        finalUrl = `${websiteUrl}${separator}address=${walletAddress.trim()}`;
      }

      // Wrap with deep link if not universal
      let deepLinkUrl = finalUrl;
      if (walletType === "trustwallet") {
        deepLinkUrl = `https://link.trustwallet.com/open_url?coin_id=20000714&url=${encodeURIComponent(finalUrl)}`;
      } else if (walletType === "metamask") {
        deepLinkUrl = `https://metamask.app.link/dapp/${finalUrl.replace(/^https?:\/\//, '')}`;
      }

      setGeneratedUrl(deepLinkUrl);

      // Generate QR code
      const qrUrl = await QRCodeCanvas.toDataURL(deepLinkUrl, {
        width: 180,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      setQrDataUrl(qrUrl);
      toast.success("QR Code generated successfully!");
    } catch (error) {
      console.error("QR generation error:", error);
      toast.error("Failed to generate QR code");
    }
  }

  function clearForm() {
    setGeneratedUrl("");
    setQrDataUrl("");
    setWalletAddress("");
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  }

  async function downloadMockup() {
    const element = document.getElementById("mobile-mockup");
    if (!element) {
      toast.error("Mockup not found");
      return;
    }

    try {
      const dataUrl = await toPng(element, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#FFFFFF",
        width: 375,
        height: element.offsetHeight,
      });

      const link = document.createElement("a");
      link.download = `qr-code-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Mockup downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download mockup");
    }
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Left Panel: QR Generator Form */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 border-b">
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Generator
          </CardTitle>
          <CardDescription>Generate deep-link QR codes for different wallet apps</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Wallet Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Wallet Type</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={walletType === "universal" ? "default" : "outline"}
                onClick={() => setWalletType("universal")}
                className="w-full"
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Universal
              </Button>
              <Button
                type="button"
                variant={walletType === "trustwallet" ? "default" : "outline"}
                onClick={() => setWalletType("trustwallet")}
                className="w-full"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Trust Wallet
              </Button>
              <Button
                type="button"
                variant={walletType === "metamask" ? "default" : "outline"}
                onClick={() => setWalletType("metamask")}
                className="w-full"
              >
                <Wallet className="h-4 w-4 mr-2" />
                MetaMask
              </Button>
            </div>
          </div>

          {/* Website URL */}
          <div className="space-y-2">
            <Label htmlFor="website-url" className="text-sm font-semibold">
              Website URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="website-url"
              type="url"
              placeholder="https://yourapp.onhercules.app"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {/* Wallet Address */}
          <div className="space-y-2">
            <Label htmlFor="wallet-address" className="text-sm font-semibold">
              Wallet Address <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <Input
              id="wallet-address"
              type="text"
              placeholder="0x..."
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              If provided, will auto-fill in the website's address field
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={generateQRCode} className="flex-1 gap-2" size="lg">
              <QrCode className="h-4 w-4" />
              Generate QR Code
            </Button>
            <Button onClick={clearForm} variant="outline" size="lg">
              Clear
            </Button>
          </div>

          {/* Generated URL Display */}
          {generatedUrl && (
            <Card className="border-dashed bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Generated Deep Link
                </Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={generatedUrl}
                    className="font-mono text-xs bg-background"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(generatedUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Right Panel: Mobile Mockup Preview */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 border-b">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Preview
          </CardTitle>
          <CardDescription>Trust Wallet style QR code display</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {qrDataUrl ? (
            <div className="space-y-4">
              {/* Mobile Mockup Container */}
              <div 
                id="mobile-mockup"
                className="bg-white rounded-[2.5rem] shadow-2xl"
                style={{ 
                  width: "375px",
                  maxWidth: "375px",
                  margin: "0 auto",
                  overflow: "hidden"
                }}
              >
                {/* Status Bar */}
                <div className="bg-white pt-3 pb-2 flex items-center justify-between text-black" style={{ paddingLeft: "24px", paddingRight: "24px" }}>
                  <span className="text-sm font-semibold">16:35</span>
                  <div className="flex items-center gap-1">
                    <div className="flex gap-[2px]">
                      <div className="w-1 h-3 bg-black rounded-full opacity-40"></div>
                      <div className="w-1 h-3 bg-black rounded-full opacity-60"></div>
                      <div className="w-1 h-3 bg-black rounded-full opacity-80"></div>
                      <div className="w-1 h-3 bg-black rounded-full"></div>
                    </div>
                    <span className="text-xs font-medium ml-1">5G</span>
                    <svg className="w-6 h-4 ml-1" viewBox="0 0 24 14" fill="none">
                      <rect x="1" y="3" width="18" height="10" rx="2" stroke="black" strokeWidth="1.5" fill="none"/>
                      <rect x="20" y="5" width="2" height="6" rx="1" fill="black"/>
                      <rect x="3" y="5" width="14" height="6" rx="1" fill="black"/>
                    </svg>
                  </div>
                </div>

                {/* Header */}
                <div className="bg-white py-4 flex items-center justify-center border-b border-gray-200" style={{ paddingLeft: "20px", paddingRight: "20px", position: "relative" }}>
                  <div style={{ position: "absolute", left: "20px" }}>
                    <ArrowLeft className="h-5 w-5 text-black" />
                  </div>
                  <h1 className="text-lg font-semibold text-black">Receive</h1>
                  <div style={{ position: "absolute", right: "20px" }}>
                    <Info className="h-5 w-5 text-black" />
                  </div>
                </div>

                {/* Warning Banner */}
                <div className="bg-white" style={{ paddingTop: "16px", paddingLeft: "28px", paddingRight: "28px" }}>
                  <div className="bg-[#FFF4E5] border-l-4 border-[#FFB020] px-3 py-2 rounded-lg">
                    <div className="flex gap-2">
                      <AlertCircle className="h-4 w-4 text-[#FFB020] flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] leading-relaxed text-black">
                        Only send Tether USD (BEP20) assets to this address. Other assets will be lost forever.
                      </p>
                    </div>
                  </div>
                </div>

                {/* USDT Badge */}
                <div className="bg-white pt-4 pb-2 flex justify-center">
                  <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5">
                    <div className="w-6 h-6 rounded-full bg-[#26A17B] flex items-center justify-center text-white font-bold" style={{ fontSize: "14px" }}>
                      ₮
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-black" style={{ fontSize: "13px" }}>USDT</span>
                      <span className="text-gray-500" style={{ fontSize: "11px" }}>BNB Smart Chain</span>
                    </div>
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="bg-white pb-3 flex justify-center">
                  <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-200 inline-flex flex-col items-center">
                    <div className="relative" style={{ width: "180px", height: "180px" }}>
                      <img 
                        src={qrDataUrl} 
                        alt="QR Code" 
                        className="w-full h-full"
                        style={{ display: "block" }}
                      />
                      {/* Shield Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white rounded-full p-2 shadow-md">
                          <Shield className="h-6 w-6 text-[#26A17B]" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Wallet Address */}
                    <div className="mt-2" style={{ width: "180px" }}>
                      <p className="text-center font-mono text-[11px] text-black break-all leading-snug">
                        {walletAddress || "0x18CcB55B75556DfD959DbBc57c9307dce041A7a3"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="bg-white pb-4 flex justify-center" style={{ paddingLeft: "48px", paddingRight: "48px" }}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Copy className="h-4 w-4 text-gray-700" />
                      </div>
                      <span className="text-[10px] text-black font-medium">Copy</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <Download className="h-4 w-4 text-gray-700" />
                      </div>
                      <span className="text-[10px] text-black font-medium">Set Amount</span>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                        <ExternalLink className="h-4 w-4 text-gray-700" />
                      </div>
                      <span className="text-[10px] text-black font-medium">Share</span>
                    </div>
                  </div>
                </div>

                {/* Deposit Info Card */}
                <div className="bg-white pb-4" style={{ paddingLeft: "28px", paddingRight: "28px" }}>
                  <div className="bg-[#F5F5F5] rounded-2xl p-3 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#E5E5FF] flex items-center justify-center flex-shrink-0">
                      <Download className="h-4 w-4 text-[#6B5CE7]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-black">Deposit from exchange</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">By direct transfer from your account</p>
                    </div>
                  </div>
                </div>

                {/* Bottom Indicator */}
                <div className="bg-white pb-2 flex justify-center">
                  <div className="w-32 h-1 bg-black rounded-full"></div>
                </div>
              </div>

              {/* Download Button */}
              <Button 
                onClick={downloadMockup} 
                className="w-full gap-2" 
                size="lg"
              >
                <Download className="h-4 w-4" />
                Download Mockup as PNG
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Smartphone className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No QR Code Generated</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Fill in the form and click "Generate QR Code" to see the mobile preview
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserManagementTab({ adminWallet, adminEmail }: { adminWallet?: string; adminEmail?: string }) {
  const adminUsers = useQuery(api.adminUsers.listAdminUsers, adminWallet ? { adminWallet } : adminEmail ? { adminEmail } : "skip");
  const createUser = useMutation(api.adminUsers.createAdminUser);
  const changePassword = useMutation(api.adminUsers.changePassword);
  const deleteUser = useMutation(api.adminUsers.deleteAdminUser);
  const toggleStatus = useMutation(api.adminUsers.toggleUserStatus);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string } | null>(null);

  // Create user form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"full-access" | "view-only">("full-access");

  // Change password state
  const [changePasswordValue, setChangePasswordValue] = useState("");

  const handleCreateUser = async () => {
    if (!newUsername || !newPassword) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      await createUser({
        username: newUsername,
        password: newPassword,
        role: newRole,
        adminWallet,
        adminEmail,
      });
      toast.success(`User "${newUsername}" created successfully`);
      setShowCreateForm(false);
      setNewUsername("");
      setNewPassword("");
      setNewRole("full-access");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create user";
      toast.error(errorMessage);
    }
  };

  const handleChangePassword = async () => {
    if (!selectedUser || !changePasswordValue) {
      toast.error("Please enter new password");
      return;
    }

    try {
      await changePassword({
        userId: selectedUser.id as Id<"adminUsers">,
        newPassword: changePasswordValue,
        adminWallet,
        adminEmail,
      });
      toast.success(`Password changed for "${selectedUser.username}"`);
      setShowPasswordDialog(false);
      setSelectedUser(null);
      setChangePasswordValue("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      toast.error(errorMessage);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      await deleteUser({
        userId: userId as Id<"adminUsers">,
        adminWallet,
        adminEmail,
      });
      toast.success(`User "${username}" deleted`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
      toast.error(errorMessage);
    }
  };

  const handleToggleStatus = async (userId: string, username: string) => {
    try {
      await toggleStatus({
        userId: userId as Id<"adminUsers">,
        adminWallet,
        adminEmail,
      });
      toast.success(`Status toggled for "${username}"`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to toggle status";
      toast.error(errorMessage);
    }
  };

  if (!adminUsers) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription className="mt-1">
                Manage admin panel team members
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              {showCreateForm ? "Cancel" : "Add Member"}
            </Button>
          </div>
        </CardHeader>

        {/* Create User Form */}
        {showCreateForm && (
          <CardContent className="p-6 border-b bg-muted/30">
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="johndoe"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newRole} onValueChange={(value) => setNewRole(value as "full-access" | "view-only")}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-access">Full Access</SelectItem>
                      <SelectItem value="view-only">View Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleCreateUser} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Create User
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Users List */}
      <Card className="border-primary/20 shadow-lg">
        <CardContent className="p-6">
          {adminUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <UserCog className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No team members yet</h3>
              <p className="text-sm text-muted-foreground">
                Click "Add Member" to create your first team member
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {adminUsers.map((user) => (
                <Card key={user._id} className="hover:border-primary/40 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserCog className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{user.username}</h4>
                            <Badge variant={user.role === "full-access" ? "default" : "secondary"}>
                              {user.role}
                            </Badge>
                            {user.isActive ? (
                              <Badge variant="outline" className="gap-1">
                                <ToggleRight className="h-3 w-3 text-green-600" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <ToggleLeft className="h-3 w-3 text-gray-400" />
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Created by {user.createdBy} • {new Date(user._creationTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser({ id: user._id, username: user.username });
                            setShowPasswordDialog(true);
                          }}
                          className="gap-2"
                        >
                          <Key className="h-4 w-4" />
                          Change Password
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(user._id, user.username)}
                          className="gap-2"
                        >
                          {user.isActive ? (
                            <ToggleLeft className="h-4 w-4" />
                          ) : (
                            <ToggleRight className="h-4 w-4" />
                          )}
                          {user.isActive ? "Disable" : "Enable"}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user._id, user.username)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter new password for user: <strong>{selectedUser?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min 6 characters)"
                value={changePasswordValue}
                onChange={(e) => setChangePasswordValue(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowPasswordDialog(false);
              setSelectedUser(null);
              setChangePasswordValue("");
            }}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} className="gap-2">
              <Key className="h-4 w-4" />
              Change Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
