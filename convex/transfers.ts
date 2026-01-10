import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const createTransfer = mutation({
  args: {
    fromAddress: v.string(),
    toAddress: v.string(),
    amount: v.string(),
    txHash: v.string(),
    transferredBy: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transferId = await ctx.db.insert("transfers", {
      fromAddress: args.fromAddress,
      toAddress: args.toAddress,
      amount: args.amount,
      txHash: args.txHash,
      transferredBy: args.transferredBy,
      status: args.status,
      note: args.note,
    });

    return transferId;
  },
});

export const getAllTransfers = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    txHash: string;
    transferredBy: string;
    status: string;
    note?: string;
    _creationTime: string;
  }>> => {
    const transfers = await ctx.db
      .query("transfers")
      .order("desc")
      .take(100);

    return transfers.map((transfer) => ({
      _id: transfer._id,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      amount: transfer.amount,
      txHash: transfer.txHash,
      transferredBy: transfer.transferredBy,
      status: transfer.status,
      note: transfer.note,
      _creationTime: new Date(transfer._creationTime).toLocaleString(),
    }));
  },
});

export const getTransfersByUser = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args): Promise<Array<{
    _id: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    txHash: string;
    transferredBy: string;
    status: string;
    note?: string;
    _creationTime: string;
  }>> => {
    const transfers = await ctx.db
      .query("transfers")
      .withIndex("by_from_address", (q) => q.eq("fromAddress", args.walletAddress))
      .order("desc")
      .collect();

    return transfers.map((transfer) => ({
      _id: transfer._id,
      fromAddress: transfer.fromAddress,
      toAddress: transfer.toAddress,
      amount: transfer.amount,
      txHash: transfer.txHash,
      transferredBy: transfer.transferredBy,
      status: transfer.status,
      note: transfer.note,
      _creationTime: new Date(transfer._creationTime).toLocaleString(),
    }));
  },
});
