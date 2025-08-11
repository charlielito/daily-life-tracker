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
async function calculateMacros(description: string, imageUrl?: string): Promise<{ macros?: string; explanation?: string; error?: string }> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    
    let prompt = `Please analyze this food description and provide macronutrient information in a consistent format: "${description}". 
    
    IMPORTANT: You must ensure that the explanation values and final macro values are mathematically consistent.
    
    Follow this process:
    1. FIRST, analyze the food and provide detailed explanations for each component
    2. THEN, calculate the final macro values based on those explanations
    3. ENSURE the final macro values match what you explained
    
    Return a JSON object with the following structure:
    {
      "explanation": {
        "calories": "Detailed breakdown of calorie sources (e.g., '200 from x,y ingredients, 150 from z,w ingredients, 150 from a,b ingredients = 500 total')",
        "protein": "Detailed breakdown of protein (e.g., '25g from meat, 5g from vegetables = 30g total')",
        "carbs": "Detailed breakdown of carbohydrates (e.g., '20g from rice, 15g from vegetables = 35g total')",
        "fat": "Detailed breakdown of fat (e.g., '10g from oil, 8g from meat = 18g total')",
        "water": "Detailed breakdown of water content (e.g., '150ml from vegetables, 100ml from cooking = 250ml total')"
      },
      "macros": {
        "calories": number,
        "protein": number, 
        "carbs": number,
        "fat": number,
        "water": number
      }
    }
    
    CRITICAL REQUIREMENTS:
    - The explanation must show the mathematical breakdown that leads to the final macro values
    - The final macro values must be the sum of the components mentioned in the explanation
    - For water: sum of all water sources mentioned in explanation should equal the final water value
    - Use realistic portion sizes and typical macro values for ingredients
    - Consider both the natural water content of foods and any beverages included.
    - Round all values to reasonable whole numbers
    `;

    if (imageUrl) {
      prompt += ` 

IMPORTANT: An image of the food is also provided. Please use both the description AND the visual information from the image to provide more accurate macro calculations. Look at the image to:
- Estimate portion sizes more accurately
- Identify ingredients that might not be mentioned in the description
- Adjust calculations based on visual cooking methods (fried vs grilled, etc.)
- Consider any sides, sauces, or garnishes visible in the image
- Estimate water content more accurately based on visible ingredients and portion sizes

Analyze the image at: ${imageUrl}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("AI response:", text);
    
    // Extract JSON from response - handle both markdown code blocks and plain JSON
    let jsonText = text;
    
    // Remove markdown code blocks if present
    if (text.includes('```json')) {
      jsonText = text.replace(/```json\n?/, '').replace(/```\n?/, '');
    } else if (text.includes('```')) {
      jsonText = text.replace(/```\n?/, '').replace(/```\n?/, '');
    }
    
    // Try to find JSON object with a more robust regex
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        // Validate that we have the required fields
        const requiredMacroFields = ['calories', 'protein', 'carbs', 'fat', 'water'];
        const hasAllMacroFields = requiredMacroFields.every(field => 
          parsedResponse.macros && typeof parsedResponse.macros[field] === 'number'
        );
        
        const hasAllExplanationFields = requiredMacroFields.every(field => 
          parsedResponse.explanation && typeof parsedResponse.explanation[field] === 'string'
        );
        
        if (!hasAllMacroFields) {
          return { 
            error: "AI calculation returned incomplete macro data. Please try again or provide a more detailed description." 
          };
        }
        
        if (!hasAllExplanationFields) {
          return { 
            error: "AI calculation returned incomplete explanation data. Please try again or provide a more detailed description." 
          };
        }
        
        return { 
          macros: JSON.stringify(parsedResponse.macros),
          explanation: JSON.stringify(parsedResponse.explanation)
        };
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        console.error("Json match:", jsonMatch[0]);
        console.error("AI response invalid:", text);
        return { 
          error: "AI calculation returned invalid data. Please try again with a more detailed description." 
        };
      }
    } else {
      console.error("AI response invalid:", text);
      return { 
        error: "AI calculation failed to return valid data. Please try again with a more detailed description." 
      };
    }
  } catch (error) {
    console.error("AI macro calculation failed:", error);
    
    // Provide specific error messages based on the error type
    if (error instanceof Error) {
      if (error.message.includes("API_KEY")) {
        return { error: "AI service configuration error. Please contact support." };
      } else if (error.message.includes("quota") || error.message.includes("limit")) {
        return { error: "AI service quota exceeded. Please try again later." };
      } else if (error.message.includes("network") || error.message.includes("fetch")) {
        return { error: "Network error connecting to AI service. Please check your connection and try again." };
      } else if (error.message.includes("timeout")) {
        return { error: "AI calculation timed out. Please try again with a shorter description." };
      }
    }
    
    return { 
      error: "AI calculation failed. Please try again or provide a more detailed description." 
    };
  }
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
      const calculationResult = await calculateMacros(input.description, input.imageUrl);

      // Handle AI calculation errors
      if (calculationResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: calculationResult.error,
        });
      }

      // Increment usage counter after successful AI calculation
      if (calculationResult.macros) {
        await incrementAiUsage(userId, ctx.db);
      }

      const entry = await ctx.db.macroEntry.create({
        data: {
          userId,
          description: input.description,
          imageUrl: input.imageUrl,
          localDateTime: input.localDateTime,
          calculatedMacros: calculationResult.macros,
          calculationExplanation: calculationResult.explanation,
        },
      });


      // Parse the JSON strings back to objects for the response
      return {
        ...entry,
        calculatedMacros: entry.calculatedMacros ? JSON.parse(entry.calculatedMacros as string) : null,
        calculationExplanation: entry.calculationExplanation ? JSON.parse(entry.calculationExplanation as string) : null,
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
      let calculationExplanation: string | undefined = (existingEntry.calculationExplanation as string) || undefined;
      if (input.description !== existingEntry.description || input.imageUrl !== existingEntry.imageUrl) {
        // Check AI usage limits before recalculation
        await checkAiUsageLimit(userId, ctx.db);
        
        const calculationResult = await calculateMacros(input.description, input.imageUrl);
        if (calculationResult.error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: calculationResult.error,
          });
        }
        if (calculationResult.macros) {
          calculatedMacros = calculationResult.macros;
          calculationExplanation = calculationResult.explanation;
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
          calculationExplanation,
        },
      });

      return {
        ...updatedEntry,
        calculatedMacros: updatedEntry.calculatedMacros ? JSON.parse(updatedEntry.calculatedMacros as string) : null,
        calculationExplanation: updatedEntry.calculationExplanation ? JSON.parse(updatedEntry.calculationExplanation as string) : null,
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
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(input.date);
      endOfDay.setUTCHours(23, 59, 59, 999);

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
        calculationExplanation: entry.calculationExplanation ? JSON.parse(entry.calculationExplanation as string) : null,
      }));
    }),
}); 