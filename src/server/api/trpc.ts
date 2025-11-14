import { initTRPC, TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "@/lib/db";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { defaultLocale, type Locale } from "@/i18n/request";

type CreateContextOptions = {
  session: Session | null;
  locale: Locale;
};

const createInnerTRPCContext = (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    db,
    locale: opts.locale,
  };
};

export const createTRPCContext = async () => {
  // Get the session from the server using the getServerSession wrapper function
  const session = await getServerSession(authOptions);
  
  // Get locale from headers (set by next-intl middleware or from request)
  const headersList = await headers();
  let locale: Locale = defaultLocale;
  
  // Try to get locale from next-intl header first
  const nextIntlLocale = headersList.get('x-next-intl-locale');
  if (nextIntlLocale && (nextIntlLocale === 'en' || nextIntlLocale === 'es')) {
    locale = nextIntlLocale as Locale;
  } else {
    // Fallback to accept-language header
    const acceptLanguage = headersList.get('accept-language');
    if (acceptLanguage) {
      // Extract locale from header (e.g., "es" or "en" from "es-ES" or "en-US")
      const localeMatch = acceptLanguage.match(/^([a-z]{2})(?:-|$)/i);
      if (localeMatch && (localeMatch[1] === 'en' || localeMatch[1] === 'es')) {
        locale = localeMatch[1] as Locale;
      }
    }
  }

  return createInnerTRPCContext({
    session,
    locale,
  });
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed); 