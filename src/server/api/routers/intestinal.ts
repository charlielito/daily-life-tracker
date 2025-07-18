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
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const entry = await ctx.db.intestinalEntry.create({
        data: {
          userId,
          ...input,
        },
      });

      return entry;
    }),

  getToday: protectedProcedure
    .input(z.object({ date: z.date() }))
    .query(async ({ ctx, input }) => {
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

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        consistency: z.string().optional(),
        color: z.string().optional(),
        painLevel: z.number().min(0).max(10).optional(),
        notes: z.string().optional(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const { id, ...updateData } = input;

      const entry = await ctx.db.intestinalEntry.findUnique({
        where: { id },
      });

      if (!entry || entry.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found",
        });
      }

      return ctx.db.intestinalEntry.update({
        where: { id },
        data: updateData,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const entry = await ctx.db.intestinalEntry.findUnique({
        where: { id: input.id },
      });

      if (!entry || entry.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found",
        });
      }

      return ctx.db.intestinalEntry.delete({
        where: { id: input.id },
      });
    }),
}); 