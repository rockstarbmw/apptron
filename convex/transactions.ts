import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser, requireAdmin } from "./helpers";

export const createTransaction = mutation({
  args: {
    walletAddress: v.string(),
    toAddress: v.string(),
    amount: v.string(),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);

    const transactionId = await ctx.db.insert("transactions", {
      userId: user._id,
      walletAddress: args.walletAddress,
      toAddress: args.toAddress,
      amount: args.amount,
      txHash: args.txHash,
      status: "completed",
      type: "approve",
    });

    return transactionId;
  },
});

export const getUserTransactions = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    walletAddress: string;
    toAddress: string;
    amount: string;
    txHash?: string;
    status: string;
    _creationTime: string;
  }>> => {
    const user = await getCurrentUser(ctx);

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return transactions.map((tx) => ({
      _id: tx._id,
      walletAddress: tx.walletAddress,
      toAddress: tx.toAddress,
      amount: tx.amount,
      txHash: tx.txHash,
      status: tx.status,
      _creationTime: new Date(tx._creationTime).toISOString(),
    }));
  },
});

export const getAllTransactions = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    userId: string;
    userName?: string;
    walletAddress: string;
    toAddress: string;
    amount: string;
    txHash?: string;
    status: string;
    _creationTime: string;
  }>> => {
    await requireAdmin(ctx);

    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .take(100);

    const transactionsWithUsers = await Promise.all(
      transactions.map(async (tx) => {
        const user = await ctx.db.get(tx.userId);
        return {
          _id: tx._id,
          userId: tx.userId,
          userName: user?.name,
          walletAddress: tx.walletAddress,
          toAddress: tx.toAddress,
          amount: tx.amount,
          txHash: tx.txHash,
          status: tx.status,
          _creationTime: new Date(tx._creationTime).toISOString(),
        };
      })
    );

    return transactionsWithUsers;
  },
});
