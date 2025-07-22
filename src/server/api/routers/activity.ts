import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Activity types with average calorie burn rates per minute per kg of body weight
const ACTIVITY_CALORIES: Record<string, { low: number; moderate: number; high: number }> = {
  "Weight Training": { low: 0.08, moderate: 0.12, high: 0.16 },
  "Running": { low: 0.15, moderate: 0.20, high: 0.25 },
  "Cycling": { low: 0.12, moderate: 0.16, high: 0.20 },
  "Swimming": { low: 0.14, moderate: 0.18, high: 0.22 },
  "Walking": { low: 0.05, moderate: 0.08, high: 0.10 },
  "Yoga": { low: 0.04, moderate: 0.06, high: 0.08 },
  "Tennis": { low: 0.10, moderate: 0.14, high: 0.18 },
  "Basketball": { low: 0.12, moderate: 0.16, high: 0.20 },
  "Soccer": { low: 0.12, moderate: 0.16, high: 0.20 },
  "Dancing": { low: 0.06, moderate: 0.10, high: 0.14 },
  "Hiking": { low: 0.08, moderate: 0.12, high: 0.16 },
  "Boxing": { low: 0.14, moderate: 0.18, high: 0.22 },
  "Climbing": { low: 0.12, moderate: 0.16, high: 0.20 },
  "Other": { low: 0.06, moderate: 0.10, high: 0.14 }
};

// Function to calculate calories burned
function calculateCaloriesBurned(
  activityType: string,
  intensity: string,
  duration: number,
  userWeight: number
): number {
  const activityData = ACTIVITY_CALORIES[activityType] || ACTIVITY_CALORIES["Other"];
  const caloriesPerMinutePerKg = activityData[intensity as keyof typeof activityData];
  
  return Math.round(caloriesPerMinutePerKg * duration * userWeight);
}

// Function to calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
function calculateBMR(weight: number, heightCm?: number, age?: number, gender?: string): number {
  // Default values if user data is missing
  const defaultHeight = heightCm || 170; // cm
  const defaultAge = age || 30;
  const defaultGender = gender || "male";

  let bmr: number;
  
  if (defaultGender === "male") {
    bmr = 10 * weight + 6.25 * defaultHeight - 5 * defaultAge + 5;
  } else {
    bmr = 10 * weight + 6.25 * defaultHeight - 5 * defaultAge - 161;
  }
  
  return Math.round(bmr);
}

// Function to calculate Total Daily Energy Expenditure (TDEE)
function calculateTDEE(bmr: number, activityLevel: string): number {
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,          // Little or no exercise
    lightly_active: 1.375,   // Light exercise 1-3 days/week
    moderately_active: 1.55, // Moderate exercise 3-5 days/week
    very_active: 1.725,      // Hard exercise 6-7 days/week
    extremely_active: 1.9    // Very hard exercise, physical job
  };
  
  const multiplier = activityMultipliers[activityLevel] || activityMultipliers.sedentary;
  return Math.round(bmr * multiplier);
}

export const activityRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        activityType: z.string().min(1),
        description: z.string().min(1),
        duration: z.number().positive(),
        intensity: z.enum(["low", "moderate", "high"]),
        date: z.date(),
        hour: z.date(),
        notes: z.string().optional(),
        caloriesBurned: z.number().positive().optional(), // User-provided calories (optional)
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

      // Get user's weight for calorie calculation
      const latestWeight = await ctx.db.weightEntry.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
      });

      if (!latestWeight) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please add your weight first to calculate calories burned accurately.",
        });
      }

      // Use provided calories or calculate automatically
      let caloriesBurned = 0;
      if (input.caloriesBurned) {
        // Use user-provided calories from fitness tracker
        caloriesBurned = input.caloriesBurned;
      } else {
        // Calculate calories automatically
        caloriesBurned = calculateCaloriesBurned(
          input.activityType,
          input.intensity,
          input.duration,
          latestWeight.weight
        );
      }

      const entry = await ctx.db.activityEntry.create({
        data: {
          userId,
          activityType: input.activityType,
          description: input.description,
          duration: input.duration,
          intensity: input.intensity,
          caloriesBurned,
          caloriesManuallyEntered: !!input.caloriesBurned, // Set to true if user provided calories
          date: input.date,
          hour: input.hour,
          notes: input.notes,
        },
      });

      return entry;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        activityType: z.string().min(1),
        description: z.string().min(1),
        duration: z.number().positive(),
        intensity: z.enum(["low", "moderate", "high"]),
        date: z.date(),
        hour: z.date(),
        notes: z.string().optional(),
        caloriesBurned: z.number().positive().optional(), // User-provided calories (optional)
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
      const existingEntry = await ctx.db.activityEntry.findFirst({
        where: { id: input.id, userId },
      });

      if (!existingEntry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Activity entry not found or access denied",
        });
      }

      // Get user's weight for calorie calculation
      const latestWeight = await ctx.db.weightEntry.findFirst({
        where: { userId },
        orderBy: { date: "desc" },
      });

      if (!latestWeight) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please add your weight first to calculate calories burned accurately.",
        });
      }

      // Use provided calories or calculate automatically
      let caloriesBurned = 0;
      if (input.caloriesBurned) {
        // Use user-provided calories from fitness tracker
        caloriesBurned = input.caloriesBurned;
      } else {
        // Calculate calories automatically
        caloriesBurned = calculateCaloriesBurned(
          input.activityType,
          input.intensity,
          input.duration,
          latestWeight.weight
        );
      }

      const updatedEntry = await ctx.db.activityEntry.update({
        where: { id: input.id },
        data: {
          activityType: input.activityType,
          description: input.description,
          duration: input.duration,
          intensity: input.intensity,
          caloriesBurned,
          caloriesManuallyEntered: !!input.caloriesBurned, // Set to true if user provided calories
          date: input.date,
          hour: input.hour,
          notes: input.notes,
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
      const entry = await ctx.db.activityEntry.findFirst({
        where: { id: input.id, userId },
      });

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Activity entry not found or access denied",
        });
      }

      await ctx.db.activityEntry.delete({
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

      const entries = await ctx.db.activityEntry.findMany({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        orderBy: { hour: "asc" },
      });

      return entries;
    }),

  getDailyCalorieBalance: protectedProcedure
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

      // Get user data for BMR calculation
      const user = await ctx.db.user.findUnique({
        where: { id: userId },
        select: {
          age: true,
          gender: true,
          heightCm: true,
          activityLevel: true,
        },
      });

      // Get today's weight or latest weight
      const weight = await ctx.db.weightEntry.findFirst({
        where: {
          userId,
          date: {
            lte: endOfDay,
          },
        },
        orderBy: { date: "desc" },
      });

      if (!weight) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Please add your weight first to calculate calorie balance.",
        });
      }

      // Get calories consumed from food
      const macroEntries = await ctx.db.macroEntry.findMany({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const caloriesConsumed = macroEntries.reduce((total, entry) => {
        if (entry.calculatedMacros) {
          const macros = JSON.parse(entry.calculatedMacros as string);
          return total + (macros.calories || 0);
        }
        return total;
      }, 0);

      // Get calories burned from activities
      const activityEntries = await ctx.db.activityEntry.findMany({
        where: {
          userId,
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const caloriesBurnedFromActivity = activityEntries.reduce(
        (total, entry) => total + entry.caloriesBurned,
        0
      );

      // Calculate BMR and TDEE
      const bmr = calculateBMR(
        weight.weight,
        user?.heightCm || undefined,
        user?.age || undefined,
        user?.gender || undefined
      );

      const tdee = calculateTDEE(bmr, user?.activityLevel || "sedentary");

      // Total calories burned = TDEE + additional activity calories
      const totalCaloriesBurned = tdee + caloriesBurnedFromActivity;

      // Calculate balance (negative = deficit, positive = surplus)
      const calorieBalance = caloriesConsumed - totalCaloriesBurned;

      return {
        caloriesConsumed: Math.round(caloriesConsumed),
        bmr,
        tdee,
        caloriesBurnedFromActivity,
        totalCaloriesBurned,
        calorieBalance: Math.round(calorieBalance),
        isDeficit: calorieBalance < 0,
        activityEntries,
      };
    }),

  updateUserProfile: protectedProcedure
    .input(
      z.object({
        age: z.number().positive().optional(),
        gender: z.enum(["male", "female"]).optional(),
        heightCm: z.number().positive().optional(),
        activityLevel: z.enum([
          "sedentary",
          "lightly_active",
          "moderately_active",
          "very_active",
          "extremely_active"
        ]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
      });

      return updatedUser;
    }),

  getUserProfile: protectedProcedure
    .query(async ({ ctx }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          age: true,
          gender: true,
          heightCm: true,
          activityLevel: true,
        },
      });

      return user;
    }),

  getActivityTypes: protectedProcedure
    .query(() => {
      return Object.keys(ACTIVITY_CALORIES);
    }),
}); 