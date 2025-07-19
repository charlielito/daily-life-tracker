import { createTRPCRouter } from "@/server/api/trpc";
import { authRouter } from "@/server/api/routers/auth";
import { macrosRouter } from "@/server/api/routers/macros";
import { intestinalRouter } from "@/server/api/routers/intestinal";
import { weightRouter } from "@/server/api/routers/weight";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  macros: macrosRouter,
  intestinal: intestinalRouter,
  weight: weightRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter; 