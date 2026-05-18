"use client";

import { useSession } from "next-auth/react";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { useEffect } from "react";
import { LocalizedLink } from "@/components/ui/localized-link";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/utils/useTranslations";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const { t } = useTranslations("home");
  const { t: tCommon } = useTranslations("common");

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (session) {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-paper text-ink flex items-center justify-center">
        <p className="text-muted">{tCommon("loading")}</p>
      </div>
    );
  }

  // If user is authenticated, they'll be redirected, so don't show content
  if (session) {
    return null;
  }

  // Show landing page only for unauthenticated users
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-hairline">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="font-display text-xl tracking-tight">
            Daily Life <em className="not-italic text-iron">Tracker</em>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 md:px-10 pt-24 md:pt-32 pb-20">
        <p className="text-micro text-iron mb-6">{t("kicker")}</p>
        <h1 className="font-display text-[clamp(48px,7vw,96px)] leading-[0.95] tracking-[-0.02em] max-w-4xl">
          {t("title")} <em className="text-iron">{t("titleAccent")}</em>
        </h1>
        <p className="mt-8 text-lg text-muted max-w-2xl leading-relaxed">
          {t("subtitle")}
        </p>

        <div className="mt-14 flex flex-wrap gap-3">
          <LocalizedLink href="/auth/signup">
            <Button size="lg">{t("getStartedFree")}</Button>
          </LocalizedLink>
          <LocalizedLink href="/auth/signin">
            <Button size="lg" variant="outline">
              {t("signIn")}
            </Button>
          </LocalizedLink>
        </div>
        <p className="mt-6 text-sm text-muted">{t("signUpWithEmail")}</p>
      </section>

      <section className="border-t border-hairline">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 grid md:grid-cols-2 gap-x-16 gap-y-12">
          <div className="md:col-span-2">
            <p className="text-micro text-muted mb-4">{t("whatItDoes")}</p>
            <h2 className="font-display text-h1 max-w-2xl">
              {t("whatItDoesHead")}
            </h2>
          </div>
          {[
            { title: t("foodTracking"), body: t("foodTrackingDesc") },
            { title: t("activityTracking"), body: t("activityTrackingDesc") },
            { title: t("calorieBalance"), body: t("calorieBalanceDesc") },
            { title: t("healthMonitoring"), body: t("healthMonitoringDesc") },
          ].map((f) => (
            <div key={f.title} className="border-t border-hairline pt-6">
              <h3 className="font-display text-h2 mb-3">{f.title}</h3>
              <p className="text-muted leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
