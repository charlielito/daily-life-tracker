"use client";

import { useSession } from "next-auth/react";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { calculateAge } from "@/utils/ageUtils";
import { useTranslations } from "@/utils/useTranslations";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface ProfileFormData {
  birthDate?: string;
  gender?: "male" | "female";
  heightCm?: number;
  activityLevel?: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
}

const selectClassName =
  "flex h-10 w-full rounded border border-hairline bg-surface px-3.5 py-2 text-[15px] text-ink ring-offset-paper transition-colors placeholder:text-muted-2 focus-visible:outline-none focus-visible:border-ink focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const { t } = useTranslations("profile");
  const { t: tCommon } = useTranslations("common");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  const { register, handleSubmit, setValue, formState: { errors }, watch } = useForm<ProfileFormData>();

  const utils = api.useContext();

  const { data: userProfile, isLoading } = api.activity.getUserProfile.useQuery(
    undefined,
    { enabled: !!session }
  );

  const updateProfile = api.activity.updateUserProfile.useMutation({
    onSuccess: () => {
      utils.activity.getUserProfile.invalidate();
      utils.activity.getDailyCalorieBalance.invalidate();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Failed to update profile:", error);
    },
  });

  useEffect(() => {
    if (userProfile) {
      const profile = userProfile as any;
      if (profile.birthDate) {
        const date = new Date(profile.birthDate);
        const formattedDate = date.toISOString().split('T')[0];
        setValue("birthDate", formattedDate as any);
      }
      if (profile.gender) {
        setValue("gender", profile.gender as "male" | "female");
      }
      if (profile.heightCm) {
        setValue("heightCm", profile.heightCm);
      }
      if (profile.activityLevel) {
        setValue("activityLevel", profile.activityLevel as ProfileFormData["activityLevel"]);
      }
    }
  }, [userProfile, setValue]);

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate({
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      gender: data.gender,
      heightCm: data.heightCm,
      activityLevel: data.activityLevel,
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-16">
          <p className="text-muted">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const watchedData = watch();
  const canCalculateBMR = watchedData.birthDate && watchedData.gender && watchedData.heightCm;

  let bmrPreview = 0;
  if (canCalculateBMR) {
    const weight = 70;
    const age = watchedData.birthDate ? calculateAge(new Date(watchedData.birthDate)) : 0;
    if (watchedData.gender === "male") {
      bmrPreview = Math.round(10 * weight + 6.25 * (watchedData.heightCm || 0) - 5 * age + 5);
    } else {
      bmrPreview = Math.round(10 * weight + 6.25 * (watchedData.heightCm || 0) - 5 * age - 161);
    }
  }

  const getActivityMultipliers = () => ({
    sedentary: { value: 1.2, label: t("sedentary") },
    lightly_active: { value: 1.375, label: t("lightlyActive") },
    moderately_active: { value: 1.55, label: t("moderatelyActive") },
    very_active: { value: 1.725, label: t("veryActive") },
    extremely_active: { value: 1.9, label: t("extremelyActive") },
  });

  const activityMultipliers = getActivityMultipliers();

  const tdeePreview = bmrPreview * (activityMultipliers[watchedData.activityLevel || "sedentary"]?.value || 1.2);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-12 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tCommon("backToDashboard")}
          </Button>
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <header className="mb-14">
          <p className="text-micro text-muted mb-4">{t("title")}</p>
          <h1 className="font-display text-h1 mb-3">{t("personalInformation")}</h1>
          <p className="text-muted text-base leading-relaxed max-w-2xl">
            {t("subtitle")}
          </p>
        </header>

        {/* Success notice */}
        {showSuccess && (
          <div className="mb-10">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{t("profileUpdatedSuccess")}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Identity section */}
          <section className="border-t border-hairline pt-10 mb-12">
            <p className="text-micro text-muted mb-8">{t("sectionIdentity")}</p>
            <div className="space-y-8 max-w-xl">
              <div>
                <Label htmlFor="birthDate" className="block mb-2">
                  {t("dateOfBirth")}
                </Label>
                <Input
                  id="birthDate"
                  type="date"
                  {...register("birthDate")}
                />
                {errors.birthDate && (
                  <p className="text-iron text-sm mt-2">{errors.birthDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="gender" className="block mb-2">
                  {t("gender")}
                </Label>
                <select
                  id="gender"
                  {...register("gender")}
                  className={selectClassName}
                >
                  <option value="">{t("selectGender")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                </select>
              </div>
            </div>
          </section>

          {/* Body metrics section */}
          <section className="border-t border-hairline pt-10 mb-12">
            <p className="text-micro text-muted mb-8">{t("sectionBodyMetrics")}</p>
            <div className="space-y-8 max-w-xl">
              <div>
                <Label htmlFor="heightCm" className="block mb-2">
                  {t("heightCm")}
                </Label>
                <Input
                  id="heightCm"
                  type="number"
                  min="100"
                  max="250"
                  placeholder="170"
                  {...register("heightCm", {
                    min: { value: 100, message: t("heightMin") },
                    max: { value: 250, message: t("heightMax") },
                    valueAsNumber: true,
                  })}
                />
                {errors.heightCm && (
                  <p className="text-iron text-sm mt-2">{errors.heightCm.message}</p>
                )}
                <p className="font-mono text-xs text-muted mt-2">{t("heightHint")}</p>
              </div>
            </div>
          </section>

          {/* Activity section */}
          <section className="border-t border-hairline pt-10 mb-12">
            <p className="text-micro text-muted mb-8">{t("sectionActivity")}</p>
            <div className="space-y-8 max-w-xl">
              <div>
                <Label htmlFor="activityLevel" className="block mb-2">
                  {t("activityLevel")}
                </Label>
                <select
                  id="activityLevel"
                  {...register("activityLevel")}
                  className={selectClassName}
                >
                  {Object.entries(activityMultipliers).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-2">{t("activityLevelHint")}</p>
              </div>
            </div>
          </section>

          {/* Save action */}
          <div className="border-t border-hairline pt-8 mb-16">
            <div className="flex items-center justify-end max-w-xl">
              <Button
                type="submit"
                disabled={updateProfile.isLoading}
              >
                {updateProfile.isLoading ? t("saving") : t("saveProfile")}
              </Button>
            </div>
          </div>
        </form>

        {/* Calorie preview — editorial pillars */}
        <section className="border-t border-hairline pt-10 mb-16">
          <p className="text-micro text-muted mb-2">{t("calorieCalculationPreview")}</p>
          <h2 className="font-display text-h2 mb-3">{t("previewDesc")}</h2>

          {canCalculateBMR ? (
            <div className="grid md:grid-cols-2 md:divide-x divide-hairline mt-10">
              <div className="pb-8 md:pb-0 md:pr-10">
                <p className="text-micro text-muted mb-3">{t("bmr")}</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-display tnum text-data-xl leading-none">
                    {bmrPreview}
                  </span>
                  <span className="font-mono tnum text-sm text-muted">
                    {t("calPerDay")}
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {t("caloriesBurnedAtRest")}
                </p>
              </div>

              <div className="pt-8 md:pt-0 border-t border-hairline md:border-t-0 md:pl-10">
                <p className="text-micro text-muted mb-3">{t("tdee")}</p>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-display tnum text-data-xl leading-none">
                    {Math.round(tdeePreview)}
                  </span>
                  <span className="font-mono tnum text-sm text-muted">
                    {t("calPerDay")}
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {t("activityMultiplier", {
                    multiplier: activityMultipliers[watchedData.activityLevel || "sedentary"]?.value,
                  })}
                </p>
              </div>
            </div>
          ) : (
            <p className="font-display italic text-h3 text-muted mt-6 max-w-xl">
              {t("enterDetails")} {t("seePreview")}
            </p>
          )}
        </section>

        {/* How it works */}
        <section className="border-t border-hairline pt-10 mb-16">
          <p className="text-micro text-muted mb-2">{t("howItWorks")}</p>
          <div className="border-t border-hairline">
            <div className="py-4 border-b border-hairline text-sm text-ink">
              {t("tdeeExplanation")}
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              {t("exerciseExplanation")}
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              {t("deficitExplanation")}
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              {t("surplusExplanation")}
            </div>
          </div>
        </section>

        {/* Why this matters */}
        <section className="border-t border-hairline pt-10">
          <p className="text-micro text-muted mb-2">{t("whyThisMatters")}</p>
          <div className="border-t border-hairline">
            <div className="py-4 border-b border-hairline text-sm text-ink">
              {t("bmrInfo")}
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              {t("tdeeInfo")}
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              {t("accurateTracking")}
            </div>
            <div className="py-4 border-b border-hairline text-sm text-ink">
              {t("privacy")}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
