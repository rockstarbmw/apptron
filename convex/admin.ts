import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./adminAuth";

export const getAllUsers = query({
  args: { 
    adminWallet: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<{
    _id: string;
    name?: string;
    email?: string;
    role: string;
    walletAddress?: string;
    _creationTime: number;
  }>> => {
    requireAdmin(args.adminWallet);
    const users = await ctx.db.query("users").collect();

    return users.map((user) => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress,
      _creationTime: user._creationTime,
    }));
  },
});

export const updateUserRole = mutation({
  args: {
    adminWallet: v.optional(v.string()),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    requireAdmin(args.adminWallet);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

export const getStats = query({
  args: { 
    adminWallet: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    totalUsers: number;
    totalTransactions: number;
    totalTransfersCount: number;
    totalUSDTTransferred: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageTransferAmount: number;
    totalUSDTApproved: number;
  }> => {
    requireAdmin(args.adminWallet);
    const users = await ctx.db.query("users").collect();
    const transactions = await ctx.db.query("transactions").collect();
    const transfers = await ctx.db.query("transfers").collect();
    const successfulTransfers = transfers.filter(t => t.status === "success");
    const failedTransfers = transfers.filter(t => t.status === "failed");
    const totalUSDTTransferred = successfulTransfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalUSDTApproved = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const averageTransferAmount = successfulTransfers.length > 0 
      ? totalUSDTTransferred / successfulTransfers.length 
      : 0;

    return {
      totalUsers: users.length,
      totalTransactions: transactions.length,
      totalTransfersCount: transfers.length,
      totalUSDTTransferred,
      successfulTransactions: successfulTransfers.length,
      failedTransactions: failedTransfers.length,
      averageTransferAmount,
      totalUSDTApproved,
    };
  },
});

export const getTransactionTrends = query({
  args: { 
    adminWallet: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<{
    date: string;
    count: number;
    amount: number;
  }>> => {
    requireAdmin(args.adminWallet);
    const transactions = await ctx.db
      .query("transactions")
      .order("desc")
      .take(100);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const grouped = last7Days.map(date => {
      const dayTransactions = transactions.filter(tx => {
        const txDate = new Date(tx._creationTime).toISOString().split('T')[0];
        return txDate === date;
      });

      return {
        date,
        count: dayTransactions.length,
        amount: dayTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0),
      };
    });

    return grouped;
  },
});

export const getTopUsers = query({
  args: { 
    adminWallet: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Array<{
    userNumber: number;
    userName: string;
    transactionCount: number;
    totalAmount: number;
  }>> => {
    requireAdmin(args.adminWallet);
    const transactions = await ctx.db.query("transactions").collect();
    const userStats = new Map<number, { count: number; amount: number }>();
    transactions.forEach(tx => {
      if (tx.userNumber !== undefined) {
        const current = userStats.get(tx.userNumber) || { count: 0, amount: 0 };
        userStats.set(tx.userNumber, {
          count: current.count + 1,
          amount: current.amount + parseFloat(tx.amount),
        });
      }
    });

    const topUsers = Array.from(userStats.entries())
      .map(([userNumber, stats]) => ({
        userNumber,
        userName: `User ${userNumber}`,
        transactionCount: stats.count,
        totalAmount: stats.amount,
      }))
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, 5);

    return topUsers;
  },
});
