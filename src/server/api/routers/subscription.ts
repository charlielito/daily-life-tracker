import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { stripe, STRIPE_CONFIG } from "@/lib/stripe";
import { env } from "@/env.js";

export const subscriptionRouter = createTRPCRouter({
  // Get Stripe configuration (price IDs, etc.)
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      return {
        premiumPriceId: STRIPE_CONFIG.PREMIUM_PRICE_ID,
        limits: STRIPE_CONFIG.FREE_LIMITS,
      };
    }),

  // Get current user subscription status and usage
  getStatus: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          subscriptionStatus: true,
          trialEndDate: true,
          subscriptionEndDate: true,
          monthlyAiUsage: true,
          monthlyUploads: true,
          lastUsageReset: true,
          isUnlimited: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if we need to reset monthly usage
      const now = new Date();
      const lastReset = new Date(user.lastUsageReset);
      const shouldReset = now.getMonth() !== lastReset.getMonth() || 
                         now.getFullYear() !== lastReset.getFullYear();

      if (shouldReset) {
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: {
            monthlyAiUsage: 0,
            monthlyUploads: 0,
            lastUsageReset: now,
          },
        });
        user.monthlyAiUsage = 0;
        user.monthlyUploads = 0;
      }

      return {
        ...user,
        limits: {
          aiCalculations: STRIPE_CONFIG.FREE_LIMITS.AI_CALCULATIONS,
          uploads: STRIPE_CONFIG.FREE_LIMITS.UPLOADS,
        },
        hasUnlimitedAccess: user.isUnlimited || user.subscriptionStatus === "active",
      };
    }),

  // Create Stripe checkout session for subscription
  createCheckoutSession: protectedProcedure
    .input(z.object({
      priceId: z.string(),
      successUrl: z.string().url(),
      cancelUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          email: true,
          customerId: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      try {
        // Create or retrieve Stripe customer
        let customerId = user.customerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            metadata: {
              userId: ctx.session.user.id,
            },
          });
          customerId = customer.id;
          
          // Update user with customer ID
          await ctx.db.user.update({
            where: { id: ctx.session.user.id },
            data: { customerId },
          });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price: input.priceId,
              quantity: 1,
            },
          ],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: {
            userId: ctx.session.user.id,
          },
        });

        return { sessionUrl: session.url };
      } catch (error) {
        console.error("Stripe checkout error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }
    }),

  // Create Stripe portal session for managing subscription
  createPortalSession: protectedProcedure
    .input(z.object({
      returnUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { customerId: true },
      });

      if (!user?.customerId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No customer found",
        });
      }

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: user.customerId,
          return_url: input.returnUrl,
        });

        return { sessionUrl: session.url };
      } catch (error) {
        console.error("Stripe portal error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create portal session",
        });
      }
    }),

  // Admin: Grant unlimited access to a user
  grantUnlimitedAccess: protectedProcedure
    .input(z.object({
      userEmail: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // Check if current user is admin (you can modify this logic)
      const currentUser = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { email: true, isUnlimited: true },
      });

      // Simple admin check - you can enhance this with proper admin roles
      const adminEmails = ["candres.alv@gmail.com"]; // Replace with your actual admin emails
      if (!currentUser || !adminEmails.includes(currentUser.email)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin access required",
        });
      }

      try {
        const updatedUser = await ctx.db.user.update({
          where: { email: input.userEmail },
          data: {
            isUnlimited: true,
            subscriptionStatus: "unlimited",
          },
        });

        return {
          success: true,
          message: `Unlimited access granted to ${input.userEmail}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }
    }),

  // Check if user can perform an action (AI calculation or upload)
  checkUsage: protectedProcedure
    .input(z.object({
      action: z.enum(["ai_calculation", "upload"]),
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          subscriptionStatus: true,
          monthlyAiUsage: true,
          monthlyUploads: true,
          isUnlimited: true,
        },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if user has unlimited access
      if (user.isUnlimited || user.subscriptionStatus === "active") {
        return { canPerform: true, usage: 0, limit: null };
      }

      // Check usage limits for free users
      if (input.action === "ai_calculation") {
        const canPerform = user.monthlyAiUsage < STRIPE_CONFIG.FREE_LIMITS.AI_CALCULATIONS;
        return {
          canPerform,
          usage: user.monthlyAiUsage,
          limit: STRIPE_CONFIG.FREE_LIMITS.AI_CALCULATIONS,
        };
      } else if (input.action === "upload") {
        const canPerform = user.monthlyUploads < STRIPE_CONFIG.FREE_LIMITS.UPLOADS;
        return {
          canPerform,
          usage: user.monthlyUploads,
          limit: STRIPE_CONFIG.FREE_LIMITS.UPLOADS,
        };
      }

      return { canPerform: false, usage: 0, limit: 0 };
    }),

  // Increment usage counter
  incrementUsage: protectedProcedure
    .input(z.object({
      action: z.enum(["ai_calculation", "upload"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          isUnlimited: true,
          subscriptionStatus: true,
        },
      });

      // Don't increment for unlimited users
      if (user?.isUnlimited || user?.subscriptionStatus === "active") {
        return { success: true };
      }

      const updateData: any = {};
      if (input.action === "ai_calculation") {
        updateData.monthlyAiUsage = { increment: 1 };
      } else if (input.action === "upload") {
        updateData.monthlyUploads = { increment: 1 };
      }

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: updateData,
      });

      return { success: true };
    }),
}); 