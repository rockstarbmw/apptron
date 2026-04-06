import { useState } from "react";

export default function CheckAllowance() {
  const [userAddress, setUserAddress] = useState("");
  const [allowance, setAllowance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
  const TRON_SPENDER = "TD7YMonVkbcEiVu5tqXvEeBa2zniao86pJ";

  async function checkAllowance() {
    if (!userAddress.trim()) {
      setError("Please enter wallet address");
      return;
    }

    setLoading(true);
    setError("");
    setAllowance(null);

    try {
      console.log("🔍 Checking allowance for:", userAddress);

      const tw = new (window as any).TronWeb({ fullHost: "https://api.trongrid.io" });

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

      console.log("📝 Calling allowance function...");
      const contract = await tw.contract(allowanceABI, TRON_USDT);
      const allowanceRaw = await contract.allowance(userAddress, TRON_SPENDER).call();
      
      const allowanceUSDT = (Number(allowanceRaw) / 1e6).toFixed(2);
      console.log("✅ Allowance:", allowanceUSDT, "USDT");

      setAllowance(allowanceUSDT);

    } catch (err: any) {
      console.error("❌ Error:", err);
      setError(err.message || "Failed to check allowance");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      margin: 0,
      minHeight: "100vh",
      background: "#1c1c1e",
      color: "#ffffff",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
      padding: "20px",
      maxWidth: "500px",
      marginLeft: "auto",
      marginRight: "auto",
    }}>

      <div style={{ marginBottom: "40px", textAlign: "center" }}>
        <h1 style={{ fontSize: "28px", marginBottom: "10px" }}>
          💰 Check Approval
        </h1>
        <p style={{ color: "#8e8e93", margin: 0 }}>
          Check USDT allowance for user
        </p>
      </div>

      <div style={{
        background: "#242426",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "20px",
      }}>
        <label style={{
          display: "block",
          fontSize: "14px",
          fontWeight: 500,
          color: "#8e8e93",
          marginBottom: "8px",
        }}>
          Wallet Address
        </label>
        <input
          type="text"
          value={userAddress}
          onChange={(e) => setUserAddress(e.target.value)}
          placeholder="T..."
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "#1c1c1e",
            border: "1px solid #2e2e30",
            borderRadius: "12px",
            color: "#fff",
            fontSize: "14px",
            boxSizing: "border-box",
            fontFamily: "monospace",
          }}
        />
      </div>

      <button
        onClick={checkAllowance}
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px",
          background: loading ? "#2a6e3a" : "#39d353",
          color: "#000",
          border: "none",
          borderRadius: "12px",
          fontSize: "16px",
          fontWeight: 600,
          cursor: loading ? "default" : "pointer",
          marginBottom: "20px",
          transition: "all 0.2s",
        }}
      >
        {loading ? "Checking..." : "Check Allowance"}
      </button>

      {error && (
        <div style={{
          background: "#3e2626",
          border: "1px solid #8b4545",
          borderRadius: "12px",
          padding: "14px",
          marginBottom: "20px",
          color: "#ff6b6b",
          fontSize: "14px",
        }}>
          ❌ {error}
        </div>
      )}

      {allowance !== null && (
        <div style={{
          background: "#264029",
          border: "1px solid #4a7c45",
          borderRadius: "12px",
          padding: "20px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "12px", color: "#8e8e93", marginBottom: "8px" }}>
            USDT Allowance
          </div>
          <div style={{ fontSize: "32px", fontWeight: 700, color: "#39d353", marginBottom: "10px" }}>
            {allowance}
          </div>
          <div style={{ fontSize: "12px", color: "#8e8e93" }}>
            {parseFloat(allowance) > 0 ? "✅ Approval Given" : "❌ No Approval"}
          </div>
        </div>
      )}

      <div style={{
        marginTop: "40px",
        padding: "16px",
        background: "#242426",
        borderRadius: "12px",
        fontSize: "13px",
        color: "#8e8e93",
        lineHeight: "1.6",
      }}>
        <p style={{ margin: "0 0 10px 0" }}>
          <strong>Contract:</strong> {TRON_USDT.slice(0, 10)}...
        </p>
        <p style={{ margin: "0 0 10px 0" }}>
          <strong>Spender:</strong> {TRON_SPENDER.slice(0, 10)}...
        </p>
        <p style={{ margin: 0 }}>
          <strong>Network:</strong> TRON Mainnet
        </p>
      </div>
    </div>
  );
}
