"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Calculator, Info } from "lucide-react";

interface ProfileFormData {
  age?: number;
  gender?: "male" | "female";
  heightCm?: number;
  activityLevel?: "sedentary" | "lightly_active" | "moderately_active" | "very_active" | "extremely_active";
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<ProfileFormData>();

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

  // Reset form when profile data loads
  useEffect(() => {
    if (userProfile) {
      reset({
        age: userProfile.age || undefined,
        gender: userProfile.gender as "male" | "female" || undefined,
        heightCm: userProfile.heightCm || undefined,
        activityLevel: userProfile.activityLevel as ProfileFormData["activityLevel"] || "sedentary",
      });
    }
  }, [userProfile, reset]);

  const onSubmit = (data: ProfileFormData) => {
    updateProfile.mutate({
      age: data.age,
      gender: data.gender,
      heightCm: data.heightCm,
      activityLevel: data.activityLevel,
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const watchedData = watch();
  const canCalculateBMR = watchedData.age && watchedData.gender && watchedData.heightCm;

  // Calculate BMR preview
  let bmrPreview = 0;
  if (canCalculateBMR) {
    const weight = 70; // Default weight for preview
    if (watchedData.gender === "male") {
      bmrPreview = Math.round(10 * weight + 6.25 * (watchedData.heightCm || 0) - 5 * (watchedData.age || 0) + 5);
    } else {
      bmrPreview = Math.round(10 * weight + 6.25 * (watchedData.heightCm || 0) - 5 * (watchedData.age || 0) - 161);
    }
  }

  const activityMultipliers: Record<string, { value: number; label: string }> = {
    sedentary: { value: 1.2, label: "Sedentary - Little or no exercise" },
    lightly_active: { value: 1.375, label: "Lightly Active - Light exercise 1-3 days/week" },
    moderately_active: { value: 1.55, label: "Moderately Active - Moderate exercise 3-5 days/week" },
    very_active: { value: 1.725, label: "Very Active - Hard exercise 6-7 days/week" },
    extremely_active: { value: 1.9, label: "Extremely Active - Very hard exercise, physical job" },
  };

  const tdeePreview = bmrPreview * (activityMultipliers[watchedData.activityLevel || "sedentary"]?.value || 1.2);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Setup</h1>
            <p className="text-gray-600">
              Configure your personal information for accurate calorie calculations
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            ← Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          Profile updated successfully! Your calorie calculations will now be more accurate. 🎉
        </div>
      )}

      {/* Information Card */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Info className="h-5 w-5" />
            Why This Information Matters
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700 text-sm">
          <ul className="space-y-2">
            <li>• <strong>BMR (Basal Metabolic Rate):</strong> Calories your body burns at rest</li>
            <li>• <strong>TDEE (Total Daily Energy Expenditure):</strong> BMR + activity level multiplier</li>
            <li>• <strong>Accurate tracking:</strong> Helps determine if you're in a calorie deficit or surplus</li>
            <li>• <strong>Privacy:</strong> This data is stored securely and only used for your calculations</li>
          </ul>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Enter your details for accurate calorie calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Age */}
              <div>
                <Label htmlFor="age">Age (years)</Label>
                <Input
                  type="number"
                  min="10"
                  max="120"
                  placeholder="25"
                  {...register("age", { 
                    min: { value: 10, message: "Age must be at least 10" },
                    max: { value: 120, message: "Age must be less than 120" },
                    valueAsNumber: true
                  })}
                />
                {errors.age && (
                  <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select
                  {...register("gender")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Height */}
              <div>
                <Label htmlFor="heightCm">Height (cm)</Label>
                <Input
                  type="number"
                  min="100"
                  max="250"
                  placeholder="170"
                  {...register("heightCm", { 
                    min: { value: 100, message: "Height must be at least 100cm" },
                    max: { value: 250, message: "Height must be less than 250cm" },
                    valueAsNumber: true
                  })}
                />
                {errors.heightCm && (
                  <p className="text-red-500 text-sm mt-1">{errors.heightCm.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  1 foot = 30.48cm (e.g., 5'7" = 170cm)
                </p>
              </div>

              {/* Activity Level */}
              <div>
                <Label htmlFor="activityLevel">Activity Level</Label>
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
                  This affects your daily calorie burn calculation
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={updateProfile.isLoading}
              >
                {updateProfile.isLoading ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* BMR Calculator Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Calorie Calculation Preview
            </CardTitle>
            <CardDescription>
              See how your settings affect calorie calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {canCalculateBMR ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">BMR (Basal Metabolic Rate)</h4>
                  <p className="text-2xl font-bold text-blue-600">{bmrPreview} cal/day</p>
                  <p className="text-sm text-blue-600">Calories burned at rest (for 70kg weight)</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">TDEE (Total Daily Energy Expenditure)</h4>
                  <p className="text-2xl font-bold text-green-600">{Math.round(tdeePreview)} cal/day</p>
                  <p className="text-sm text-green-600">
                    BMR × {activityMultipliers[watchedData.activityLevel || "sedentary"]?.value} (activity multiplier)
                  </p>
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <p><strong>How it works:</strong></p>
                  <p>• TDEE = your daily calorie burn without exercise</p>
                  <p>• Exercise calories are added on top of this</p>
                  <p>• Deficit = consuming less than total burn</p>
                  <p>• Surplus = consuming more than total burn</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Enter your age, gender, and height</p>
                <p className="text-sm">to see your calorie calculation preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 