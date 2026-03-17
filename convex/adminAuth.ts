export const ADMIN_WALLET = "TLtk7LwG56nCJBv8V6tb4KoyFrZutCtFAP";
export const SUPER_ADMIN_WALLET = "TLtk7LwG56nCJBv8V6tb4KoyFrZutCtFAP";

export function isAdmin(walletAddress: string | undefined): boolean {
  if (!walletAddress) return false;
  return walletAddress === ADMIN_WALLET;
}

export function isSuperAdminWallet(walletAddress: string | undefined): boolean {
  if (!walletAddress) return false;
  return walletAddress === SUPER_ADMIN_WALLET;
}

export function requireAdmin(walletAddress: string | undefined): void {
  if (!isAdmin(walletAddress) && !isSuperAdminWallet(walletAddress)) {
    throw new Error("Unauthorized: Admin access required");
  }
}
