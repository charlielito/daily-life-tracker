import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TRPCError } from "@trpc/server";
import { env } from "@/env.js";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);

// Reusable function for AI macro calculation
async function calculateMacros(description: string, imageUrl?: string): Promise<string | undefined> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    let prompt = `Please analyze this food description and provide macronutrient information in JSON format: "${description}". 
    Return only a JSON object with: {"calories": number, "protein": number, "carbs": number, "fat": number}. 
    Estimate reasonable values based on typical portions.`;

    if (imageUrl) {
      prompt += ` 

IMPORTANT: An image of the food is also provided. Please use both the description AND the visual information from the image to provide more accurate macro calculations. Look at the image to:
- Estimate portion sizes more accurately
- Identify ingredients that might not be mentioned in the description
- Adjust calculations based on visual cooking methods (fried vs grilled, etc.)
- Consider any sides, sauces, or garnishes visible in the image

Analyze the image at: ${imageUrl}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsedMacros = JSON.parse(jsonMatch[0]);
      return JSON.stringify(parsedMacros); // Store as string for SQLite
    }
  } catch (error) {
    console.error("AI macro calculation failed:", error);
    // Return undefined if AI fails
  }
  
  return undefined;
}

export const macrosRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1),
        imageUrl: z.string().optional().or(z.null()).transform((val) => val || undefined),
        hour: z.date(),
        date: z.date(),
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
      const calculatedMacros = await calculateMacros(input.description, input.imageUrl);

      const entry = await ctx.db.macroEntry.create({
        data: {
          userId,
          description: input.description,
          imageUrl: input.imageUrl,
          hour: input.hour,
          date: input.date,
          calculatedMacros,
        },
      });

      // Parse the JSON string back to object for the response
      return {
        ...entry,
        calculatedMacros: entry.calculatedMacros ? JSON.parse(entry.calculatedMacros as string) : null,
      };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        description: z.string().min(1),
        imageUrl: z.string().optional().or(z.null()).transform((val) => val || undefined),
        hour: z.date(),
        date: z.date(),
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
      const existingEntry = await ctx.db.macroEntry.findFirst({
        where: { id: input.id, userId },
      });

      if (!existingEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found or access denied",
        });
      }

      // Calculate macros using AI if description or image changed
      let calculatedMacros: string | undefined = (existingEntry.calculatedMacros as string) || undefined;
      if (input.description !== existingEntry.description || input.imageUrl !== existingEntry.imageUrl) {
        const newMacros = await calculateMacros(input.description, input.imageUrl);
        if (newMacros) {
          calculatedMacros = newMacros;
        }
        // Keep existing macros if AI calculation fails
      }

      const updatedEntry = await ctx.db.macroEntry.update({
        where: { id: input.id },
        data: {
          description: input.description,
          imageUrl: input.imageUrl,
          hour: input.hour,
          date: input.date,
          calculatedMacros,
        },
      });

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

      // Verify the entry belongs to the user before deleting
      const entry = await ctx.db.macroEntry.findFirst({
        where: { id: input.id, userId },
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Entry not found or access denied",
        });
      }

      await ctx.db.macroEntry.delete({
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
}); 