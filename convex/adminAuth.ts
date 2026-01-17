export const ADMIN_WALLET = "0x6713c28acc903af491887397c28aa1a75b2997a3";
export const SUPER_ADMIN_WALLET = "0xf404b685ddF18ae2E14Bf61D65Ca7884eE7F745E";

export function isAdmin(walletAddress: string | undefined): boolean {
  if (!walletAddress) return false;
  return walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();
}

export function isSuperAdminWallet(walletAddress: string | undefined): boolean {
  if (!walletAddress) return false;
  return walletAddress.toLowerCase() === SUPER_ADMIN_WALLET.toLowerCase();
}

export function requireAdmin(walletAddress: string | undefined): void {
  if (!isAdmin(walletAddress) && !isSuperAdminWallet(walletAddress)) {
    throw new Error("Unauthorized: Admin access required");
  }
}
