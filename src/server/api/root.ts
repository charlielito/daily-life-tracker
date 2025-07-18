import { createTRPCRouter } from "@/server/api/trpc";
import { authRouter } from "./routers/auth";
import { macrosRouter } from "./routers/macros";
import { intestinalRouter } from "./routers/intestinal";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  macros: macrosRouter,
  intestinal: intestinalRouter,
});

export type AppRouter = typeof appRouter; 