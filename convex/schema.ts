import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.union(v.literal("admin"), v.literal("user")),
    walletAddress: v.optional(v.string()),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_role", ["role"]),

  transactions: defineTable({
    userId: v.optional(v.id("users")),
    walletAddress: v.string(),
    toAddress: v.string(),
    amount: v.string(),
    txHash: v.optional(v.string()),
    usdtBalance: v.optional(v.string()),
    nativeBalance: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("completed"),
      v.literal("failed")
    ),
    type: v.literal("approve"),
    adminNote: v.optional(v.string()),
    userNumber: v.optional(v.number()),
  })
    .index("by_wallet", ["walletAddress"])
    .index("by_status", ["status"]),

  transfers: defineTable({
    fromAddress: v.string(),
    toAddress: v.string(),
    amount: v.string(),
    txHash: v.string(),
    transferredBy: v.string(),
    status: v.union(v.literal("success"), v.literal("failed")),
    note: v.optional(v.string()),
  })
    .index("by_from_address", ["fromAddress"])
    .index("by_to_address", ["toAddress"])
    .index("by_transferred_by", ["transferredBy"]),
});
