"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Activity, Edit, Trash2, Clock, Flame } from "lucide-react";
import { ActivityEditModal } from "@/components/ui/activity-edit-modal";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage, getStartOfDay } from "@/utils/dateUtils";
import { useTranslations } from "@/utils/useTranslations";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useDateLocale } from "@/utils/useDateLocale";
import { formatDate } from "@/utils/formatDate";

interface ActivityFormData {
  activityType: string;
  description: string;
  duration: string;
  intensity: "low" | "moderate" | "high";
  localDateTime: string; // Single field for datetime-local input
  notes?: string;
  caloriesBurned?: string;
}

export default function ActivityPage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations("activity");
  const { t: tCommon } = useTranslations("common");
  const dateLocale = useDateLocale();
  
  // Get date from URL parameter or default to today
  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();
  
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<ActivityFormData>({
    defaultValues: {
      localDateTime: dateParam ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      intensity: "moderate",
      activityType: "Weight Training",
    }
  });

  // Watch the timestamp field to update selectedDate when it changes
  const watchedTimestamp = watch("localDateTime");
  useEffect(() => {
    if (watchedTimestamp) {
      const timestampDate = new Date(watchedTimestamp);
      setSelectedDate(timestampDate);
    }
  }, [watchedTimestamp]);

  const utils = api.useContext();
  
  // Get available activity types
  const { data: activityTypes = [] } = api.activity.getActivityTypes.useQuery(
    undefined,
    { enabled: !!session }
  );

  const createActivityEntry = api.activity.create.useMutation({
    onSuccess: () => {
      reset({
        activityType: "",
        description: "",
        duration: "",
        intensity: "moderate",
        localDateTime: format(selectedDate, "yyyy-MM-dd'T'HH:mm"), // Reset timestamp to current date
        notes: "",
        caloriesBurned: "",
      });
      utils.activity.getToday.invalidate();
      utils.activity.getDailyCalorieBalance.invalidate();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Failed to create activity entry:", error);
    },
  });

  const updateActivityEntry = api.activity.update.useMutation({
    onSuccess: () => {
      utils.activity.getToday.invalidate();
      utils.activity.getDailyCalorieBalance.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to update activity entry:", error);
    },
  });

  const deleteActivityEntry = api.activity.delete.useMutation({
    onSuccess: () => {
      utils.activity.getToday.invalidate();
      utils.activity.getDailyCalorieBalance.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to delete activity entry:", error);
    },
  });

  const { data: dayActivities = [], isLoading } = api.activity.getToday.useQuery(
    { date: getStartOfDay(selectedDate) },
    { enabled: !!session }
  );

  const { data: calorieBalance } = api.activity.getDailyCalorieBalance.useQuery(
    { date: getStartOfDay(selectedDate) },
    { enabled: !!session }
  );

  const onSubmit = (data: ActivityFormData) => {
    // Convert local time to UTC for storage using shared utility
    const localDateTime = convertLocalToUTCForStorage(data.localDateTime);
    
    createActivityEntry.mutate({
      activityType: data.activityType,
      description: data.description,
      duration: parseInt(data.duration),
      intensity: data.intensity,
      localDateTime: localDateTime, // Use the converted timestamp
      notes: data.notes,
      caloriesBurned: data.caloriesBurned ? parseInt(data.caloriesBurned) : undefined,
    });
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (data: any) => {
    updateActivityEntry.mutate(data);
  };

  const handleDeleteEntry = () => {
    if (editingEntry) {
      deleteActivityEntry.mutate({ id: editingEntry.id });
    }
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{tCommon("loading")}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const totalCaloriesBurned = dayActivities.reduce((total: number, entry: any) => total + entry.caloriesBurned, 0);
  const totalDuration = dayActivities.reduce((total: number, entry: any) => total + entry.duration, 0);

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case "low": return "bg-green-100 text-green-800";
      case "moderate": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("title")}</h1>
            <p className="text-gray-600">
              {formatDate(selectedDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })}
              {!isToday && <span className="ml-2 text-amber-600 font-medium">{tCommon("pastDate")}</span>}
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

      {/* Calorie Balance Card */}
      {calorieBalance && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-4 w-4" />
              {t("dailyCalorieBalance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">{t("consumed")}</div>
                  <div className="text-lg font-bold text-blue-600">{calorieBalance.caloriesConsumed}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">{t("burned")}</div>
                  <div className="text-lg font-bold text-orange-600">{calorieBalance.totalCaloriesBurned}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">{t("balance")}</div>
                  <div className={`text-lg font-bold ${calorieBalance.isDeficit ? 'text-green-600' : 'text-red-600'}`}>
                    {calorieBalance.isDeficit ? '-' : '+'}{Math.abs(calorieBalance.calorieBalance)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">
                  {calorieBalance.isDeficit ? t("deficit") : t("surplus")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {t("activityLoggedSuccess")}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Log Activity Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t("logActivity")}
            </CardTitle>
            <CardDescription>
              {t("logActivityDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Date and Time */}
              <div className="space-y-2">
                <Label htmlFor="localDateTime">{t("dateAndTime")}</Label>
                <Input
                  {...register("localDateTime", { required: t("dateAndTimeRequired") })}
                  type="datetime-local"
                  id="localDateTime"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.localDateTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.localDateTime.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  {t("dateAndTimeHint")}
                </p>
              </div>

              {/* Activity Type */}
              <div>
                <Label htmlFor="activityType">{t("activityType")}</Label>
                <select
                  id="activityType"
                  {...register("activityType", { required: t("activityTypeRequired") })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">{t("selectActivityType")}</option>
                  {activityTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                {errors.activityType && (
                  <p className="text-red-500 text-sm mt-1">{errors.activityType.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">{t("description")}</Label>
                <Input
                  id="description"
                  placeholder={t("descriptionPlaceholder")}
                  {...register("description", { required: t("descriptionRequired") })}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Duration and Intensity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">{t("duration")}</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="1"
                    placeholder="30"
                    {...register("duration", { 
                      required: t("durationRequired"),
                      min: { value: 1, message: t("durationMin") }
                    })}
                  />
                  {errors.duration && (
                    <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="intensity">{t("intensity")}</Label>
                  <select
                    id="intensity"
                    {...register("intensity", { required: t("intensityRequired") })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">{t("selectIntensity")}</option>
                    <option value="low">{t("low")}</option>
                    <option value="moderate">{t("moderate")}</option>
                    <option value="high">{t("high")}</option>
                  </select>
                  {errors.intensity && (
                    <p className="text-red-500 text-sm mt-1">{errors.intensity.message}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">{t("notes")}</Label>
                <Textarea
                  id="notes"
                  placeholder={t("notesPlaceholder")}
                  {...register("notes")}
                />
              </div>

              {/* Calories Burned */}
              <div>
                <Label htmlFor="caloriesBurned">{t("caloriesBurned")}</Label>
                <Input
                  id="caloriesBurned"
                  type="number"
                  min="1"
                  placeholder={t("caloriesBurnedPlaceholder")}
                  {...register("caloriesBurned", { 
                    min: { value: 1, message: t("caloriesBurnedMin") }
                  })}
                />
                {errors.caloriesBurned && (
                  <p className="text-red-500 text-sm mt-1">{errors.caloriesBurned.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {t("caloriesBurnedHint")}
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createActivityEntry.isLoading}
              >
                {createActivityEntry.isLoading ? t("loggingActivity") : t("logActivityButton")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Activities Summary and List */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isToday ? t("todaysActivities") : t("activitiesForDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
              </CardTitle>
              <CardDescription>{t("totalActivitySummary")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalCaloriesBurned}</div>
                  <div className="text-sm text-gray-600">{t("caloriesBurnedLabel")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalDuration}</div>
                  <div className="text-sm text-gray-600">{t("minutesActive")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activities List */}
          <Card>
            <CardHeader>
              <CardTitle>{t("activities")}</CardTitle>
              <CardDescription>
                {dayActivities.length === 0 
                  ? t("noActivitiesLogged")
                  : t("activitiesLogged", { count: dayActivities.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">{t("loadingActivities")}</div>
              ) : dayActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t("noActivitiesForDay")}</p>
                  <p className="text-sm">{t("startLogging")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayActivities.map((entry: any) => (
                    <div key={entry.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{entry.activityType}</h4>
                            <Badge className={getIntensityColor(entry.intensity)}>
                              {entry.intensity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(convertUTCToLocalDisplay(entry.localDateTime), "h:mm a", { locale: dateLocale })}
                            </span>
                            <span>{entry.duration} {t("min")}</span>
                            <span className="flex items-center gap-1">
                              <Flame className="h-3 w-3" />
                              {entry.caloriesBurned} {t("cal")}
                              {entry.caloriesManuallyEntered && (
                                <span className="text-blue-600 font-medium">{t("tracker")}</span>
                              )}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic">{entry.notes}</p>
                          )}
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEntry(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <ActivityEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        entry={editingEntry}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEntry}
        activityTypes={activityTypes}
        isLoading={updateActivityEntry.isLoading || deleteActivityEntry.isLoading}
      />
    </div>
  );
} 