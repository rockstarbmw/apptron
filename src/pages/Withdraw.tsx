import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Header } from "@/components/header.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge.tsx";

export default function Withdraw() {
  return (
    <>
      <Unauthenticated>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-6">
            <h1 className="text-4xl text-balance font-bold tracking-tight">
              Withdraw USDT
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Sign in to request a withdrawal
            </p>
            <SignInButton />
          </div>
        </div>
      </Unauthenticated>
      <AuthLoading>
        <Skeleton className="h-screen w-full" />
      </AuthLoading>
      <Authenticated>
        <WithdrawPage />
      </Authenticated>
    </>
  );
}

function WithdrawPage() {
  const withdrawals = useQuery(api.withdrawals.getUserWithdrawals);
  const createWithdrawal = useMutation(api.withdrawals.createWithdrawal);

  const [walletAddress, setWalletAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!walletAddress || !toAddress || !amount) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await createWithdrawal({
        walletAddress,
        toAddress,
        amount,
      });

      toast.success("Withdrawal request submitted!");
      setWalletAddress("");
      setToAddress("");
      setAmount("");
    } catch (error) {
      toast.error("Failed to submit withdrawal request");
    } finally {
      setIsSubmitting(false);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Request Withdrawal</CardTitle>
            <CardDescription>
              Submit a withdrawal request. Admin will review and process it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="wallet">Your Wallet Address</Label>
                <Input
                  id="wallet"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="toAddress">Withdrawal To Address</Label>
                <Input
                  id="toAddress"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="0x..."
                  required
                />
              </div>

              <div>
                <Label htmlFor="amount">Amount (USDT)</Label>
                <Input
                  id="amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  type="number"
                  step="0.01"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Withdrawal Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {withdrawals && withdrawals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Withdrawals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal._id}
                    className="rounded-lg border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">
                        {withdrawal.amount} USDT
                      </div>
                      <Badge className={getStatusColor(withdrawal.status)}>
                        {withdrawal.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="font-mono">
                        To: {withdrawal.toAddress.slice(0, 10)}...
                        {withdrawal.toAddress.slice(-8)}
                      </div>
                      {withdrawal.txHash && (
                        <div className="font-mono">
                          Tx: {withdrawal.txHash.slice(0, 10)}...
                          {withdrawal.txHash.slice(-8)}
                        </div>
                      )}
                      <div className="text-xs">
                        {new Date(withdrawal._creationTime).toLocaleString()}
                      </div>
                    </div>

                    {withdrawal.adminNote && (
                      <div className="rounded bg-muted p-2 text-sm">
                        <div className="font-semibold">Admin Note:</div>
                        <div className="text-muted-foreground">
                          {withdrawal.adminNote}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
