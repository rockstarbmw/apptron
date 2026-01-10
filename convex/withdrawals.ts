import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getAllWithdrawals = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: string;
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
    const withdrawals = await ctx.db
      .query("withdrawals")
      .order("desc")
      .take(100);

    return withdrawals.map((w) => ({
      _id: w._id,
      userName: undefined,
      userEmail: undefined,
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
    await ctx.db.patch(args.withdrawalId, {
      status: args.status,
      txHash: args.txHash,
      adminNote: args.adminNote,
    });

    return args.withdrawalId;
  },
});
