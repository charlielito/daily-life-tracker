import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const weightRouter = createTRPCRouter({
  // Create or update weight for a specific date
  upsert: protectedProcedure
    .input(
      z.object({
        localDate: z.date(), // Local date without timezone considerations
        weight: z.number().positive().min(20).max(300), // Reasonable weight limits
        imageUrl: z.string().nullable().optional(), // Optional image URL that can be null
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

      const weightEntry = await ctx.db.weightEntry.upsert({
        where: {
          userId_localDate: {
            userId,
            localDate: input.localDate,
          },
        },
        update: {
          weight: input.weight,
          imageUrl: input.imageUrl,
        },
        create: {
          userId,
          localDate: input.localDate,
          weight: input.weight,
          imageUrl: input.imageUrl,
        },
      });

      return weightEntry;
    }),

  // Get weight for a specific date
  getByDate: protectedProcedure
    .input(z.object({ localDate: z.date() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      
      const weightEntry = await ctx.db.weightEntry.findUnique({
        where: {
          userId_localDate: {
            userId,
            localDate: input.localDate,
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
        orderBy: { localDate: "desc" },
      });

      return latestWeight;
    }),

  // Get weight entries for a specific month
  getByMonth: protectedProcedure
    .input(z.object({ 
      year: z.number(),
      month: z.number(), // 1-12
    }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      
      // Create start and end dates for the month
      const startDate = new Date(input.year, input.month - 1, 1);
      const endDate = new Date(input.year, input.month, 0); // Last day of the month

      const weightEntries = await ctx.db.weightEntry.findMany({
        where: {
          userId,
          localDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { localDate: "asc" },
      });

      return weightEntries;
    }),

  // Update weight entry
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        weight: z.number().positive().min(20).max(300),
        imageUrl: z.string().nullable().optional(),
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

      // Verify the entry belongs to the user
      const existingEntry = await ctx.db.weightEntry.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!existingEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Weight entry not found",
        });
      }

      const updatedEntry = await ctx.db.weightEntry.update({
        where: { id: input.id },
        data: {
          weight: input.weight,
          imageUrl: input.imageUrl,
        },
      });

      return updatedEntry;
    }),

  // Delete weight entry for a specific date
  delete: protectedProcedure
    .input(z.object({ localDate: z.date() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;

      const deletedEntry = await ctx.db.weightEntry.delete({
        where: {
          userId_localDate: {
            userId,
            localDate: input.localDate,
          },
        },
      });

      return deletedEntry;
    }),

  // Delete weight entry by ID
  deleteById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;

      // Verify the entry belongs to the user
      const existingEntry = await ctx.db.weightEntry.findFirst({
        where: {
          id: input.id,
          userId,
        },
      });

      if (!existingEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Weight entry not found",
        });
      }

      const deletedEntry = await ctx.db.weightEntry.delete({
        where: { id: input.id },
      });

      return deletedEntry;
    }),
}); 