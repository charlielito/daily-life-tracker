import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { email, password, name } = input;

      const exists = await ctx.db.user.findUnique({
        where: { email },
      });

      if (exists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await ctx.db.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
      };
    }),
}); 