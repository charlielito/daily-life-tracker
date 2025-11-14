import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const calendarRouter = createTRPCRouter({
  // Get calendar data for a specific month
  getMonthData: protectedProcedure
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
      startDate.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(input.year, input.month, 0); // Last day of the month
      endDate.setUTCHours(23, 59, 59, 999);

      // Fetch all data types for the month in parallel
      const [macroEntries, activityEntries, intestinalEntries, weightEntries] = await Promise.all([
        // Macro entries (meals)
        ctx.db.macroEntry.findMany({
          where: {
            userId,
            localDateTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { localDateTime: "asc" },
        }),
        
        // Activity entries
        ctx.db.activityEntry.findMany({
          where: {
            userId,
            localDateTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { localDateTime: "asc" },
        }),
        
        // Intestinal entries (health)
        ctx.db.intestinalEntry.findMany({
          where: {
            userId,
            localDateTime: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { localDateTime: "asc" },
        }),
        
        // Weight entries
        ctx.db.weightEntry.findMany({
          where: {
            userId,
            localDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          orderBy: { localDate: "asc" },
        }),
      ]);

      // Group data by day
      const dayData: Record<string, {
        date: string;
        macroCount: number;
        activityCount: number;
        healthCount: number;
        weightCount: number;
        totalCalories?: number;
        totalCaloriesBurned?: number;
        entries: {
          macros: any[];
          activities: any[];
          health: any[];
          weight: any[];
        };
      }> = {};

      // Initialize all days in the month
      for (let day = 1; day <= new Date(input.year, input.month, 0).getDate(); day++) {
        const dateKey = `${input.year}-${String(input.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayData[dateKey] = {
          date: dateKey,
          macroCount: 0,
          activityCount: 0,
          healthCount: 0,
          weightCount: 0,
          entries: {
            macros: [],
            activities: [],
            health: [],
            weight: [],
          },
        };
      }

      // Process macro entries
      macroEntries.forEach(entry => {
        const date = new Date(entry.localDateTime);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (dayData[dateKey]) {
          dayData[dateKey].macroCount++;
          const parsedEntry = {
            ...entry,
            calculatedMacros: entry.calculatedMacros ? JSON.parse(entry.calculatedMacros as string) : null,
            calculationExplanation: entry.calculationExplanation ? JSON.parse(entry.calculationExplanation as string) : null,
          };
          dayData[dateKey].entries.macros.push(parsedEntry);
          
          // Calculate total calories for the day
          if (parsedEntry.calculatedMacros?.calories) {
            dayData[dateKey].totalCalories = (dayData[dateKey].totalCalories || 0) + parsedEntry.calculatedMacros.calories;
          }
        }
      });

      // Process activity entries
      activityEntries.forEach(entry => {
        const date = new Date(entry.localDateTime);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (dayData[dateKey]) {
          dayData[dateKey].activityCount++;
          dayData[dateKey].entries.activities.push(entry);
          
          // Calculate total calories burned for the day
          dayData[dateKey].totalCaloriesBurned = (dayData[dateKey].totalCaloriesBurned || 0) + entry.caloriesBurned;
        }
      });

      // Process intestinal entries
      intestinalEntries.forEach(entry => {
        const date = new Date(entry.localDateTime);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        if (dayData[dateKey]) {
          dayData[dateKey].healthCount++;
          dayData[dateKey].entries.health.push(entry);
        }
      });

      // Process weight entries
      weightEntries.forEach(entry => {
        // Convert UTC date to local date components (same logic as convertUTCToLocalDisplay)
        const utcDate = new Date(entry.localDate);
        const localDate = new Date(
          utcDate.getUTCFullYear(),
          utcDate.getUTCMonth(),
          utcDate.getUTCDate(),
          utcDate.getUTCHours(),
          utcDate.getUTCMinutes(),
          utcDate.getUTCSeconds(),
          utcDate.getUTCMilliseconds()
        );
        const dateKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
        
        if (dayData[dateKey]) {
          dayData[dateKey].weightCount++;
          dayData[dateKey].entries.weight.push(entry);
        }
      });

      return Object.values(dayData);
    }),

  // Get detailed data for a specific day
  getDayDetails: protectedProcedure
    .input(z.object({ 
      date: z.date(),
    }))
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

      // Fetch all data for the specific day
      const [macroEntries, activityEntries, intestinalEntries, weightEntries] = await Promise.all([
        ctx.db.macroEntry.findMany({
          where: {
            userId,
            localDateTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          orderBy: { localDateTime: "asc" },
        }),
        
        ctx.db.activityEntry.findMany({
          where: {
            userId,
            localDateTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          orderBy: { localDateTime: "asc" },
        }),
        
        ctx.db.intestinalEntry.findMany({
          where: {
            userId,
            localDateTime: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          orderBy: { localDateTime: "asc" },
        }),
        
        ctx.db.weightEntry.findMany({
          where: {
            userId,
            localDate: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          orderBy: { localDate: "asc" },
        }),
      ]);

      // Create timeline entries with all events
      const timelineEntries: Array<{
        id: string;
        type: 'meal' | 'activity' | 'health' | 'weight';
        time: Date;
        title: string;
        description: string;
        details: any;
      }> = [];

      // Add macro entries to timeline
      macroEntries.forEach(entry => {
        const parsedEntry = {
          ...entry,
          calculatedMacros: entry.calculatedMacros ? JSON.parse(entry.calculatedMacros as string) : null,
          calculationExplanation: entry.calculationExplanation ? JSON.parse(entry.calculationExplanation as string) : null,
        };
        
        timelineEntries.push({
          id: entry.id,
          type: 'meal',
          time: entry.localDateTime,
          title: 'Meal',
          description: entry.description,
          details: parsedEntry,
        });
      });

      // Add activity entries to timeline
      activityEntries.forEach(entry => {
        timelineEntries.push({
          id: entry.id,
          type: 'activity',
          time: entry.localDateTime,
          title: entry.activityType,
          description: `${entry.description} (${entry.duration} min, ${entry.caloriesBurned} cal)`,
          details: entry,
        });
      });

      // Add intestinal entries to timeline
      intestinalEntries.forEach(entry => {
        timelineEntries.push({
          id: entry.id,
          type: 'health',
          time: entry.localDateTime,
          title: 'Health Entry',
          description: `Bristol Scale ${entry.consistency}, Pain Level ${entry.painLevel}`,
          details: entry,
        });
      });

      // Add weight entries to timeline
      weightEntries.forEach(entry => {
        timelineEntries.push({
          id: entry.id,
          type: 'weight',
          time: entry.localDate,
          title: 'Weight',
          description: `${entry.weight} kg`,
          details: entry,
        });
      });

      // Sort timeline by time
      timelineEntries.sort((a, b) => a.time.getTime() - b.time.getTime());

      // Calculate summary stats
      const totalCalories = macroEntries.reduce((total, entry) => {
        if (entry.calculatedMacros) {
          const macros = JSON.parse(entry.calculatedMacros as string);
          return total + (macros.calories || 0);
        }
        return total;
      }, 0);

      const totalCaloriesBurned = activityEntries.reduce(
        (total, entry) => total + entry.caloriesBurned,
        0
      );

      return {
        date: input.date,
        summary: {
          mealsCount: macroEntries.length,
          activitiesCount: activityEntries.length,
          healthEntriesCount: intestinalEntries.length,
          weightEntriesCount: weightEntries.length,
          totalCalories: Math.round(totalCalories),
          totalCaloriesBurned,
          calorieBalance: Math.round(totalCalories - totalCaloriesBurned),
        },
        timeline: timelineEntries,
        entries: {
          macros: macroEntries.map(entry => ({
            ...entry,
            calculatedMacros: entry.calculatedMacros ? JSON.parse(entry.calculatedMacros as string) : null,
            calculationExplanation: entry.calculationExplanation ? JSON.parse(entry.calculationExplanation as string) : null,
          })),
          activities: activityEntries,
          health: intestinalEntries,
          weight: weightEntries,
        },
      };
    }),
});

