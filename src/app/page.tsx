"use client";

import { useSession } from "next-auth/react";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { useEffect } from "react";
import { LocalizedLink } from "@/components/ui/localized-link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{tCommon("loading")}</div>
      </div>
    );
  }

  // If user is authenticated, they'll be redirected, so don't show content
  if (session) {
    return null;
  }

  // Show landing page only for unauthenticated users
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-end mb-4">
        <LanguageSwitcher />
      </div>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{t("title")}</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t("subtitle")}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🍽️ {t("foodTracking")}
            </CardTitle>
            <CardDescription>
              {t("foodTrackingDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              • {t("aiPoweredMacro")}
              • {t("dailyNutritionSummaries")}
              • {t("weightTracking")}
              • {t("mealHistory")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏃‍♂️ {t("activityTracking")}
            </CardTitle>
            <CardDescription>
              {t("activityTrackingDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              • {t("logSports")}
              • {t("automaticCalorieBurn")}
              • {t("activityIntensity")}
              • {t("exerciseHistory")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔥 {t("calorieBalance")}
            </CardTitle>
            <CardDescription>
              {t("calorieBalanceDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              • {t("bmrCalculation")}
              • {t("tdeeWithActivity")}
              • {t("dailyDeficitSurplus")}
              • {t("weightLossGain")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏥 {t("healthMonitoring")}
            </CardTitle>
            <CardDescription>
              {t("healthMonitoringDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              • {t("bristolStoolScale")}
              • {t("painLevelAssessment")}
              • {t("colorConsistency")}
              • {t("healthPatternAnalysis")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New Calorie Balance Feature Highlight */}
      <div className="mb-8">
        <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 text-xl">
              {t("smartCalorieBalance")}
            </CardTitle>
            <CardDescription className="text-orange-700">
              {t("achieveWeightGoals")}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-orange-700">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">{t("howItWorks")}</h4>
                <ul className="text-sm space-y-1">
                  <li>• {t("setUpProfile")}</li>
                  <li>• {t("logMeals")}</li>
                  <li>• {t("trackWorkouts")}</li>
                  <li>• {t("getAnalysis")}</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">{t("whatYouGet")}</h4>
                <ul className="text-sm space-y-1">
                  <li>• {t("bmrExplanation")}</li>
                  <li>• {t("tdeeExplanation")}</li>
                  <li>• {t("activityCalories")}</li>
                  <li>• {t("balanceExplanation")}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center space-y-4">
        <div className="flex gap-4 justify-center">
          <LocalizedLink href="/auth/signup">
            <Button size="lg">
              {t("getStartedFree")}
            </Button>
          </LocalizedLink>
          <LocalizedLink href="/auth/signin">
            <Button variant="outline" size="lg">
              {t("signIn")}
            </Button>
          </LocalizedLink>
        </div>
        
        <p className="text-sm text-gray-500 text-center">
          {t("signUpWithEmail")}
        </p>
      </div>
    </div>
  );
} 