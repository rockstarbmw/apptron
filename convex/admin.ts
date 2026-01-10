import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./helpers";

export const getAllUsers = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    name?: string;
    email?: string;
    role: string;
    walletAddress?: string;
    _creationTime: string;
  }>> => {
    await requireAdmin(ctx);

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
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.userId, { role: args.role });
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx): Promise<{
    totalUsers: number;
    totalTransactions: number;
    pendingWithdrawals: number;
    totalWithdrawals: number;
  }> => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();
    const transactions = await ctx.db.query("transactions").collect();
    const withdrawals = await ctx.db.query("withdrawals").collect();
    const pendingWithdrawals = await ctx.db
      .query("withdrawals")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return {
      totalUsers: users.length,
      totalTransactions: transactions.length,
      pendingWithdrawals: pendingWithdrawals.length,
      totalWithdrawals: withdrawals.length,
    };
  },
});
