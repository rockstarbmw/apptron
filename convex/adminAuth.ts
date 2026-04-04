export const ADMIN_WALLET = "TT6vDMDWeR89Xi3HcAMqFj4Um9ZF6judSq";
export const SUPER_ADMIN_WALLET = "TLtk7LwG56nCJBv8V6tb4KoyFrZutCtFAP";

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
