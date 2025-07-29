import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TRPCError } from "@trpc/server";
import { env } from "@/env.js";
import { STRIPE_CONFIG } from "@/lib/stripe";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);

// Helper function to check if user can perform AI calculation
async function checkAiUsageLimit(userId: string, db: any) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      monthlyAiUsage: true,
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
    return { canPerform: true, user };
  }

  // Check usage limits for free users
  const canPerform = user.monthlyAiUsage < STRIPE_CONFIG.FREE_LIMITS.AI_CALCULATIONS;
  if (!canPerform) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Monthly AI calculation limit reached (${STRIPE_CONFIG.FREE_LIMITS.AI_CALCULATIONS}). Please upgrade to continue.`,
    });
  }

  return { canPerform, user };
}

// Helper function to increment AI usage
async function incrementAiUsage(userId: string, db: any) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      isUnlimited: true,
      subscriptionStatus: true,
    },
  });

  // Don't increment for unlimited users
  if (user?.isUnlimited || user?.subscriptionStatus === "active") {
    return;
  }

  await db.user.update({
    where: { id: userId },
    data: {
      monthlyAiUsage: { increment: 1 },
    },
  });
}

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
        localDateTime: z.date(), // Single field for date and time in local timezone
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

      // Check AI usage limits
      await checkAiUsageLimit(userId, ctx.db);

      // Calculate macros using AI
      const calculatedMacros = await calculateMacros(input.description, input.imageUrl);

      // Increment usage counter after successful AI calculation
      if (calculatedMacros) {
        await incrementAiUsage(userId, ctx.db);
      }

      // DEBUG: Log before database insert
      console.log("🍎 [DEBUG] Macros create - About to insert localDateTime:", input.localDateTime.toISOString());

      const entry = await ctx.db.macroEntry.create({
        data: {
          userId,
          description: input.description,
          imageUrl: input.imageUrl,
          localDateTime: input.localDateTime,
          calculatedMacros: calculatedMacros,
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
        localDateTime: z.date(), // Single field for date and time in local timezone
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
        // Check AI usage limits before recalculation
        await checkAiUsageLimit(userId, ctx.db);
        
        const newMacros = await calculateMacros(input.description, input.imageUrl);
        if (newMacros) {
          calculatedMacros = newMacros;
          // Increment usage counter after successful AI calculation
          await incrementAiUsage(userId, ctx.db);
        }
        // Keep existing macros if AI calculation fails
      }

      const updatedEntry = await ctx.db.macroEntry.update({
        where: { id: input.id },
        data: {
          description: input.description,
          imageUrl: input.imageUrl,
          localDateTime: input.localDateTime,
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
          localDateTime: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: {
          localDateTime: "asc",
        },
      });


      // Parse JSON strings back to objects
      return entries.map((entry: any) => ({
        ...entry,
        calculatedMacros: entry.calculatedMacros ? JSON.parse(entry.calculatedMacros as string) : null,
      }));
    }),
}); 