import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

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

      // Normalize date to start of day to ensure one entry per day
      const normalizedDate = new Date(input.date);
      normalizedDate.setHours(0, 0, 0, 0);

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
      
      // Normalize date to start of day
      const normalizedDate = new Date(input.date);
      normalizedDate.setHours(0, 0, 0, 0);

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
      
      // Normalize date to start of day
      const normalizedDate = new Date(input.date);
      normalizedDate.setHours(0, 0, 0, 0);

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