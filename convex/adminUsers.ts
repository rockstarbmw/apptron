import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";
import { requireAdmin } from "./adminAuth";
import type { Id } from "./_generated/dataModel.d.ts";

// Create a new admin user (only super admin or admin can do this)
export const createAdminUser = mutation({
  args: {
    username: v.string(),
    password: v.string(),
    role: v.union(v.literal("full-access"), v.literal("view-only")),
    adminWallet: v.optional(v.string()),
    adminEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"adminUsers">> => {
    // Verify caller is admin
    requireAdmin(args.adminWallet, args.adminEmail);

    // Validate username (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(args.username)) {
      throw new Error("Username must be 3-20 alphanumeric characters");
    }

    // Validate password (min 6 chars)
    if (args.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Check if username already exists
    const existing = await ctx.db
      .query("adminUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existing) {
      throw new Error("Username already exists");
    }

    // Hash password using synchronous method
    const passwordHash = bcrypt.hashSync(args.password, 10);

    // Create user
    const userId = await ctx.db.insert("adminUsers", {
      username: args.username,
      passwordHash,
      role: args.role,
      createdBy: args.adminEmail || args.adminWallet || "admin",
      isActive: true,
    });

    return userId;
  },
});

// Change password (admin can change any user's password)
export const changePassword = mutation({
  args: {
    userId: v.id("adminUsers"),
    newPassword: v.string(),
    adminWallet: v.optional(v.string()),
    adminEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    // Verify caller is admin
    requireAdmin(args.adminWallet, args.adminEmail);

    // Validate password
    if (args.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Hash new password using synchronous method
    const passwordHash = bcrypt.hashSync(args.newPassword, 10);

    // Update password
    await ctx.db.patch(args.userId, { passwordHash });
  },
});

// Delete admin user
export const deleteAdminUser = mutation({
  args: {
    userId: v.id("adminUsers"),
    adminWallet: v.optional(v.string()),
    adminEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    // Verify caller is admin
    requireAdmin(args.adminWallet, args.adminEmail);

    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Delete user
    await ctx.db.delete(args.userId);
  },
});

// Toggle user active status
export const toggleUserStatus = mutation({
  args: {
    userId: v.id("adminUsers"),
    adminWallet: v.optional(v.string()),
    adminEmail: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    // Verify caller is admin
    requireAdmin(args.adminWallet, args.adminEmail);

    // Get user
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Toggle status
    await ctx.db.patch(args.userId, { isActive: !user.isActive });
  },
});

// List all admin users (only admin can see)
export const listAdminUsers = query({
  args: {
    adminWallet: v.optional(v.string()),
    adminEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify caller is admin
    requireAdmin(args.adminWallet, args.adminEmail);

    const users = await ctx.db.query("adminUsers").collect();
    
    // Return without password hash
    return users.map((user) => ({
      _id: user._id,
      _creationTime: user._creationTime,
      username: user.username,
      role: user.role,
      createdBy: user.createdBy,
      isActive: user.isActive,
    }));
  },
});

// Verify admin user login (public - called from login page)
export const verifyAdminUserLogin = query({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; userId?: string; role?: string; message?: string }> => {
    // Find user
    const user = await ctx.db
      .query("adminUsers")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) {
      return { success: false, message: "Invalid username or password" };
    }

    // Check if user is active
    if (!user.isActive) {
      return { success: false, message: "Account is disabled" };
    }

    // Verify password using synchronous method
    const isValid = bcrypt.compareSync(args.password, user.passwordHash);

    if (!isValid) {
      return { success: false, message: "Invalid username or password" };
    }

    return {
      success: true,
      userId: user._id,
      role: user.role,
    };
  },
});
