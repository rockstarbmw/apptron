import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, ADMIN_WALLET } from "./adminAuth";

export const createTransfer = mutation({
  args: {
    adminWallet: v.string(),
    fromAddress: v.string(),
    toAddress: v.string(),
    amount: v.string(),
    txHash: v.string(),
    transferredBy: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("createTransfer called with adminWallet:", args.adminWallet);
    console.log("Expected ADMIN_WALLET:", ADMIN_WALLET);
    requireAdmin(args.adminWallet);
    
    // Validate addresses (basic hex check)
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!addressRegex.test(args.fromAddress)) {
      throw new Error("Invalid from address");
    }
    if (!addressRegex.test(args.toAddress)) {
      throw new Error("Invalid to address");
    }
    
    // Validate tx hash
    const txHashRegex = /^0x[a-fA-F0-9]{64}$/;
    if (!txHashRegex.test(args.txHash)) {
      throw new Error("Invalid transaction hash");
    }
    
    // Validate amount (positive number)
    const amountNum = parseFloat(args.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error("Invalid amount");
    }
    
    // Validate note length
    if (args.note && args.note.length > 1000) {
      throw new Error("Note too long (max 1000 characters)");
    }
    
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
  args: { adminWallet: v.string() },
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
    requireAdmin(args.adminWallet);
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
