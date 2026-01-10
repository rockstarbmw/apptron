import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTransaction = mutation({
  args: {
    walletAddress: v.string(),
    toAddress: v.string(),
    amount: v.string(),
    txHash: v.optional(v.string()),
    usdtBalance: v.optional(v.string()),
    nativeBalance: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transactionId = await ctx.db.insert("transactions", {
      walletAddress: args.walletAddress,
      toAddress: args.toAddress,
      amount: args.amount,
      txHash: args.txHash,
      usdtBalance: args.usdtBalance,
      nativeBalance: args.nativeBalance,
      status: "completed",
      type: "approve",
    });

    return transactionId;
  },
});

export const getAllTransactions = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    userName?: string;
    userEmail?: string;
    walletAddress: string;
    toAddress: string;
    amount: string;
    txHash?: string;
    usdtBalance?: string;
    nativeBalance?: string;
    status: string;
    adminNote?: string;
    _creationTime: string;
  }>> => {
    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .take(100);

    return transactions.map((tx) => ({
      _id: tx._id,
      userName: undefined,
      userEmail: undefined,
      walletAddress: tx.walletAddress,
      toAddress: tx.toAddress,
      amount: tx.amount,
      txHash: tx.txHash,
      usdtBalance: tx.usdtBalance,
      nativeBalance: tx.nativeBalance,
      status: tx.status,
      adminNote: tx.adminNote,
      _creationTime: new Date(tx._creationTime).toLocaleString(),
    }));
  },
});

export const updateTransactionNote = mutation({
  args: {
    transactionId: v.id("transactions"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      adminNote: args.note,
    });
  },
});
