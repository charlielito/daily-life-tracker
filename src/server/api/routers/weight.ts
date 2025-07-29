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
        },
        create: {
          userId,
          localDate: input.localDate,
          weight: input.weight,
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

      return { success: true };
    }),
}); 