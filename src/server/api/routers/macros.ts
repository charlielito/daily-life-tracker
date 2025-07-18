import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TRPCError } from "@trpc/server";
import { env } from "@/env.js";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);

export const macrosRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1),
        imageUrl: z.string().optional(),
        hour: z.date(),
        date: z.date(),
        weight: z.preprocess((val) => {
          // Handle empty string and NaN cases for optional number fields
          if (val === "" || val === null || val === undefined) return undefined;
          const num = Number(val);
          return isNaN(num) ? undefined : num;
        }, z.number().positive().optional()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("Session in macros.create:", ctx.session);
      console.log("User ID:", ctx.session?.user?.id);
      
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const userId = ctx.session.user.id;

      // Calculate macros using AI
      let calculatedMacros: string | undefined = undefined;
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        let prompt = `Please analyze this food description and provide macronutrient information in JSON format: "${input.description}". 
        Return only a JSON object with: {"calories": number, "protein": number, "carbs": number, "fat": number}. 
        Estimate reasonable values based on typical portions.`;

        if (input.imageUrl) {
          prompt += ` An image is also provided that shows the food.`;
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Extract JSON from response
        const jsonMatch = text.match(/\{[^}]+\}/);
        if (jsonMatch) {
          const parsedMacros = JSON.parse(jsonMatch[0]);
          calculatedMacros = JSON.stringify(parsedMacros); // Store as string for SQLite
        }
      } catch (error) {
        console.error("AI macro calculation failed:", error);
        // Continue without macros if AI fails
      }

      const entry = await ctx.db.macroEntry.create({
        data: {
          userId,
          description: input.description,
          imageUrl: input.imageUrl,
          hour: input.hour,
          date: input.date,
          calculatedMacros,
          weight: input.weight,
        },
      });

      // Parse the JSON string back to object for the response
      return {
        ...entry,
        calculatedMacros: entry.calculatedMacros ? JSON.parse(entry.calculatedMacros as string) : null,
      };
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

      const entries = await ctx.db.macroEntry.findMany({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: { hour: "asc" },
      });

      // Parse JSON strings back to objects
      return entries.map(entry => ({
        ...entry,
        calculatedMacros: entry.calculatedMacros ? JSON.parse(entry.calculatedMacros as string) : null,
      }));
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1).optional(),
        calculatedMacros: z.object({
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
        }).optional(),
        weight: z.number().optional(),
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
      const { id, calculatedMacros, ...updateData } = input;

      const entry = await ctx.db.macroEntry.findUnique({
        where: { id },
      });

      if (!entry || entry.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found",
        });
      }

      const updatedEntry = await ctx.db.macroEntry.update({
        where: { id },
        data: {
          ...updateData,
          calculatedMacros: calculatedMacros ? JSON.stringify(calculatedMacros) : undefined,
        },
      });

      // Parse the JSON string back to object for the response
      return {
        ...updatedEntry,
        calculatedMacros: updatedEntry.calculatedMacros ? JSON.parse(updatedEntry.calculatedMacros as string) : null,
      };
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

      const entry = await ctx.db.macroEntry.findUnique({
        where: { id: input.id },
      });

      if (!entry || entry.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found",
        });
      }

      return ctx.db.macroEntry.delete({
        where: { id: input.id },
      });
    }),
}); 