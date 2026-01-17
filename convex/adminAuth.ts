// Admin authorization helper
export const ADMIN_WALLET = "0x6713c28acc903af491887397c28aa1a75b2997a3";

// Multiple super admin emails - add more emails to this array
export const SUPER_ADMIN_EMAILS = [
  "rohitcryptodxb@gmail.com",
  // Add more super admin emails here:
  // "admin2@example.com",
  // "admin3@example.com",
];

export function isAdmin(walletAddress: string | undefined): boolean {
  if (!walletAddress) return false;
  return walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();
}

export function isSuperAdmin(email: string | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  return SUPER_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalizedEmail);
}

export function requireAdmin(walletAddress: string | undefined, email?: string | undefined): void {
  const walletValid = isAdmin(walletAddress);
  const emailValid = isSuperAdmin(email);
  
  if (!walletValid && !emailValid) {
    throw new Error("Unauthorized: Admin access required");
  }
}
