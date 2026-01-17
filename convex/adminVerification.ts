// Admin verification functions - secure backend validation
import { query } from "./_generated/server";
import { v } from "convex/values";
import { isAdmin, isSuperAdminWallet } from "./adminAuth";

// Verify if a wallet address is admin
export const verifyAdminWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    return isAdmin(args.walletAddress);
  },
});

// Verify if a wallet address is super admin
export const verifySuperAdminWallet = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    return isSuperAdminWallet(args.walletAddress);
  },
});
