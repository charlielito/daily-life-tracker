import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const intestinalRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        date: z.date(),
        hour: z.date(),
        consistency: z.string().min(1),
        color: z.string().min(1),
        painLevel: z.number().min(0).max(10),
        notes: z.string().optional(),
        imageUrl: z.string().optional().or(z.null()).transform((val) => val || undefined),
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

      const entry = await ctx.db.intestinalEntry.create({
        data: {
          userId,
          ...input,
        },
      });

      return entry;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.date(),
        hour: z.date(),
        consistency: z.string().min(1),
        color: z.string().min(1),
        painLevel: z.number().min(0).max(10),
        notes: z.string().optional(),
        imageUrl: z.string().optional().or(z.null()).transform((val) => val || undefined),
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
      const existingEntry = await ctx.db.intestinalEntry.findFirst({
        where: { id: input.id, userId },
      });

      if (!existingEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found or access denied",
        });
      }

      const updatedEntry = await ctx.db.intestinalEntry.update({
        where: { id: input.id },
        data: {
          date: input.date,
          hour: input.hour,
          consistency: input.consistency,
          color: input.color,
          painLevel: input.painLevel,
          notes: input.notes,
          imageUrl: input.imageUrl,
        },
      });

      return updatedEntry;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;

      // Verify the entry belongs to the user before deleting
      const entry = await ctx.db.intestinalEntry.findFirst({
        where: { id: input.id, userId },
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found or access denied",
        });
      }

      await ctx.db.intestinalEntry.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  getToday: protectedProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const startOfDay = new Date(input.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(input.date);
      endOfDay.setHours(23, 59, 59, 999);

      return ctx.db.intestinalEntry.findMany({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: { hour: "asc" },
      });
    }),

  getRange: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;

      return ctx.db.intestinalEntry.findMany({
        where: {
          userId,
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        orderBy: { hour: "asc" },
      });
    }),
}); 