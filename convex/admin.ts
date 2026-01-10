import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

export const getAllUsers = query({
  args: { adminWallet: v.string() },
  handler: async (ctx, args): Promise<Array<{
    _id: string;
    name?: string;
    email?: string;
    role: string;
    walletAddress?: string;
    _creationTime: string;
  }>> => {
    requireAdmin(args.adminWallet);
    const users = await ctx.db.query("users").collect();

    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
      _creationTime: new Date(user._creationTime).toISOString(),
    }));
  },
});

export const updateUserRole = mutation({
  args: {
    adminWallet: v.string(),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminWallet);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

export const getStats = query({
  args: { adminWallet: v.string() },
  handler: async (ctx, args): Promise<{
    totalUsers: number;
    totalTransactions: number;
  }> => {
    requireAdmin(args.adminWallet);
    const users = await ctx.db.query("users").collect();
    const transactions = await ctx.db.query("transactions").collect();

    return {
      totalUsers: users.length,
      totalTransactions: transactions.length,
    };
  },
});
