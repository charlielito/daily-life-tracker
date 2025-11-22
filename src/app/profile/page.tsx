"use client";

import { useSession } from "next-auth/react";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Calculator, Info } from "lucide-react";
import { calculateAge } from "@/utils/ageUtils";
import { useTranslations } from "@/utils/useTranslations";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface ProfileFormData {
  birthDate?: string; // HTML date inputs use string format
  gender?: "male" | "female";
  heightCm?: number;
  activityLevel?: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const { t } = useTranslations("profile");
  const { t: tCommon } = useTranslations("common");
  const [showSuccess, setShowSuccess] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  const { register, handleSubmit, reset, setValue, formState: { errors }, watch } = useForm<ProfileFormData>();

  const utils = api.useContext();

  // Get current user profile
  const { data: userProfile, isLoading } = api.activity.getUserProfile.useQuery(
    undefined,
    { enabled: !!session }
  );

  // Update profile mutation
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

  // Set form values when profile data loads
  useEffect(() => {
    if (userProfile) {
      // Temporarily bypass TypeScript error to see what's actually in the data
      const profile = userProfile as any;
      if (profile.birthDate) {
        // Convert ISO date to YYYY-MM-DD format for HTML date input
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
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{tCommon("loading")}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const watchedData = watch();
  const canCalculateBMR = watchedData.birthDate && watchedData.gender && watchedData.heightCm;

  // Calculate BMR preview
  let bmrPreview = 0;
  if (canCalculateBMR) {
    const weight = 70; // Default weight for preview
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("title")}</h1>
            <p className="text-gray-600">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {tCommon("backToDashboard")}
            </Button>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {t("profileUpdatedSuccess")}
        </div>
      )}

      {/* Information Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Info className="h-5 w-5" />
            {t("whyThisMatters")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm">
          <ul className="space-y-2">
            <li>• <strong>{t("bmrInfo")}</strong></li>
            <li>• <strong>{t("tdeeInfo")}</strong></li>
            <li>• <strong>{t("accurateTracking")}</strong></li>
            <li>• <strong>{t("privacy")}</strong></li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t("personalInformation")}
            </CardTitle>
            <CardDescription>
              {t("personalInformationDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Birth Date */}
              <div>
                <Label htmlFor="birthDate">{t("dateOfBirth")}</Label>
                <Input
                  type="date"
                  {...register("birthDate")}
                />
                {errors.birthDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.birthDate.message}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <Label htmlFor="gender">{t("gender")}</Label>
                <select
                  {...register("gender")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">{t("selectGender")}</option>
                  <option value="male">{t("male")}</option>
                  <option value="female">{t("female")}</option>
                </select>
              </div>

              {/* Height */}
              <div>
                <Label htmlFor="heightCm">{t("heightCm")}</Label>
                <Input
                  type="number"
                  min="100"
                  max="250"
                  placeholder="170"
                  {...register("heightCm", { 
                    min: { value: 100, message: t("heightMin") },
                    max: { value: 250, message: t("heightMax") },
                    valueAsNumber: true
                  })}
                />
                {errors.heightCm && (
                  <p className="text-red-500 text-sm mt-1">{errors.heightCm.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {t("heightHint")}
                </p>
              </div>

              {/* Activity Level */}
              <div>
                <Label htmlFor="activityLevel">{t("activityLevel")}</Label>
                <select
                  {...register("activityLevel")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {Object.entries(activityMultipliers).map(([key, { label }]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {t("activityLevelHint")}
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={updateProfile.isLoading}
              >
                {updateProfile.isLoading ? t("saving") : t("saveProfile")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* BMR Calculator Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t("calorieCalculationPreview")}
            </CardTitle>
            <CardDescription>
              {t("previewDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canCalculateBMR ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">{t("bmr")}</h4>
                  <p className="text-2xl font-bold text-blue-600">{bmrPreview} {t("calPerDay")}</p>
                  <p className="text-sm text-blue-600">{t("caloriesBurnedAtRest")}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">{t("tdee")}</h4>
                  <p className="text-2xl font-bold text-green-600">{Math.round(tdeePreview)} {t("calPerDay")}</p>
                  <p className="text-sm text-green-600">
                    {t("activityMultiplier", { multiplier: activityMultipliers[watchedData.activityLevel || "sedentary"]?.value })}
                  </p>
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <p><strong>{t("howItWorks")}</strong></p>
                  <p>• {t("tdeeExplanation")}</p>
                  <p>• {t("exerciseExplanation")}</p>
                  <p>• {t("deficitExplanation")}</p>
                  <p>• {t("surplusExplanation")}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>{t("enterDetails")}</p>
                <p className="text-sm">{t("seePreview")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 