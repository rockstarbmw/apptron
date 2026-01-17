// Admin verification functions - secure backend validation
import { query } from "./_generated/server";
import { v } from "convex/values";
import { isAdmin, isSuperAdmin } from "./adminAuth";

// Verify if a wallet address is admin
export const verifyAdminWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    return isAdmin(args.walletAddress);
  },
});

// Verify if an email is super admin
export const verifySuperAdmin = query({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    return isSuperAdmin(args.email);
  },
});
