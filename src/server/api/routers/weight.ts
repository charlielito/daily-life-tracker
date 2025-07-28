import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

/**
 * Normalize a date to UTC midnight (00:00:00.000Z) to ensure consistent date handling
 * regardless of timezone differences between frontend and backend
 */
function normalizeToUTCMidnight(date: Date): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

export const weightRouter = createTRPCRouter({
  // Create or update weight for a specific date
  upsert: protectedProcedure
    .input(
      z.object({
        date: z.date(),
        weight: z.number().positive().min(20).max(300), // Reasonable weight limits
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const normalizedDate = normalizeToUTCMidnight(input.date);

      console.log("⚖️ [DEBUG] Weight upsert - Input date:", input.date.toISOString());
      console.log("⚖️ [DEBUG] Weight upsert - Normalized date:", normalizedDate.toISOString());

      const weightEntry = await ctx.db.weightEntry.upsert({
        where: {
          userId_date: {
            userId,
            date: normalizedDate,
          },
        },
        update: {
          weight: input.weight,
        },
        create: {
          userId,
          date: normalizedDate,
          weight: input.weight,
        },
      });

      return weightEntry;
    }),

  // Get weight for a specific date
  getByDate: protectedProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const normalizedDate = normalizeToUTCMidnight(input.date);
      
      console.log("⚖️ [DEBUG] Weight getByDate - Input date:", input.date);
      console.log("⚖️ [DEBUG] Weight getByDate - Input date ISO:", input.date.toISOString());
      console.log("⚖️ [DEBUG] Weight getByDate - Normalized date:", normalizedDate);
      console.log("⚖️ [DEBUG] Weight getByDate - Normalized date ISO:", normalizedDate.toISOString());

      const weightEntry = await ctx.db.weightEntry.findUnique({
        where: {
          userId_date: {
            userId,
            date: normalizedDate,
          },
        },
      });

      return weightEntry;
    }),

  // Get latest weight (most recent entry)
  getLatest: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;

      const latestWeight = await ctx.db.weightEntry.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
      });

      return latestWeight;
    }),

  // Delete weight entry for a specific date
  delete: protectedProcedure
    .input(z.object({ date: z.date() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const normalizedDate = normalizeToUTCMidnight(input.date);

      const deletedEntry = await ctx.db.weightEntry.delete({
        where: {
          userId_date: {
            userId,
            date: normalizedDate,
          },
        },
      });

      return { success: true };
    }),
}); 