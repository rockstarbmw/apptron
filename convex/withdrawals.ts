import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireAdmin } from "./helpers";

export const createWithdrawal = mutation({
  args: {
    walletAddress: v.string(),
    toAddress: v.string(),
    amount: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const withdrawalId = await ctx.db.insert("withdrawals", {
      userId: user._id,
      walletAddress: args.walletAddress,
      toAddress: args.toAddress,
      amount: args.amount,
      status: "pending",
    });

    return withdrawalId;
  },
});

export const getUserWithdrawals = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    walletAddress: string;
    toAddress: string;
    amount: string;
    txHash?: string;
    status: string;
    adminNote?: string;
    _creationTime: string;
  }>> => {
    const user = await getCurrentUser(ctx);

    const withdrawals = await ctx.db
      .query("withdrawals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return withdrawals.map((w) => ({
      _id: w._id,
      walletAddress: w.walletAddress,
      toAddress: w.toAddress,
      amount: w.amount,
      txHash: w.txHash,
      status: w.status,
      adminNote: w.adminNote,
      _creationTime: new Date(w._creationTime).toISOString(),
    }));
  },
});

export const getAllWithdrawals = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    walletAddress: string;
    toAddress: string;
    amount: string;
    txHash?: string;
    status: string;
    adminNote?: string;
    _creationTime: string;
  }>> => {
    await requireAdmin(ctx);

    const withdrawals = await ctx.db
      .query("withdrawals")
      .order("desc")
      .take(100);

    const withdrawalsWithUsers = await Promise.all(
      withdrawals.map(async (w) => {
        const user = await ctx.db.get(w.userId);
        return {
          _id: w._id,
          userId: w.userId,
          userName: user?.name,
          userEmail: user?.email,
          walletAddress: w.walletAddress,
          toAddress: w.toAddress,
          amount: w.amount,
          txHash: w.txHash,
          status: w.status,
          adminNote: w.adminNote,
          _creationTime: new Date(w._creationTime).toISOString(),
        };
      })
    );

    return withdrawalsWithUsers;
  },
});

export const updateWithdrawalStatus = mutation({
  args: {
    withdrawalId: v.id("withdrawals"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("completed")
    ),
    txHash: v.optional(v.string()),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    await ctx.db.patch(args.withdrawalId, {
      status: args.status,
      txHash: args.txHash,
      adminNote: args.adminNote,
      approvedBy: admin._id,
    });

    return args.withdrawalId;
  },
});
