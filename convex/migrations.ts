import { mutation } from "./_generated/server";

// One-time migration to add user numbers to existing transactions
export const backfillUserNumbers = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all transactions
    const allTransactions = await ctx.db
      .query("transactions")
      .collect();

    // Group by wallet address to find unique users
    const walletToUserNumber = new Map<string, number>();
    let nextUserNumber = 1;

    // Sort by creation time to maintain chronological order
    const sortedTransactions = allTransactions.sort(
      (a, b) => a._creationTime - b._creationTime
    );

    // Assign user numbers
    for (const tx of sortedTransactions) {
      if (!walletToUserNumber.has(tx.walletAddress)) {
        walletToUserNumber.set(tx.walletAddress, nextUserNumber);
        nextUserNumber++;
      }
    }

    // Update all transactions with their user numbers
    let updated = 0;
    for (const tx of allTransactions) {
      const userNumber = walletToUserNumber.get(tx.walletAddress);
      if (userNumber !== undefined && tx.userNumber === undefined) {
        await ctx.db.patch(tx._id, { userNumber });
        updated++;
      }
    }

    return {
      message: `Successfully updated ${updated} transactions`,
      totalUsers: walletToUserNumber.size,
    };
  },
});
