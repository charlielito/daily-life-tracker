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
import {
  Activity,
  Bike,
  Dumbbell,
  Waves,
  Footprints,
  PersonStanding,
  Trophy,
  CircleDot,
  Music,
  Mountain,
  Hand,
  Circle,
  Edit,
  type LucideIcon,
} from "lucide-react";
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

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  Running: Activity,
  Cycling: Bike,
  "Weight Training": Dumbbell,
  Swimming: Waves,
  Walking: Footprints,
  Yoga: PersonStanding,
  Tennis: Trophy,
  Basketball: CircleDot,
  Soccer: CircleDot,
  Dancing: Music,
  Hiking: Mountain,
  Boxing: Hand,
  Climbing: Mountain,
  Other: Circle,
};

function getActivityIcon(type: string) {
  return ACTIVITY_ICONS[type] ?? Circle;
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
  const watchedActivityType = watch("activityType");
  const watchedIntensity = watch("intensity");

  useEffect(() => {
    if (watchedTimestamp) {
      const timestampDate = new Date(watchedTimestamp);
      setSelectedDate(timestampDate);
    }
  }, [watchedTimestamp]);

  // Register activityType and intensity manually so we can drive them from custom UI
  useEffect(() => {
    register("activityType", { required: t("activityTypeRequired") });
    register("intensity", { required: t("intensityRequired") });
  }, [register, t]);

  const utils = api.useContext();

  // Get available activity types
  const { data: activityTypes = [] } = api.activity.getActivityTypes.useQuery(
    undefined,
    { enabled: !!session }
  );

  const createActivityEntry = api.activity.create.useMutation({
    onSuccess: () => {
      reset({
        activityType: "Weight Training",
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
        <div className="text-center text-muted">{tCommon("loading")}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const totalCaloriesBurned = dayActivities.reduce((total: number, entry: any) => total + entry.caloriesBurned, 0);
  const totalDuration = dayActivities.reduce((total: number, entry: any) => total + entry.duration, 0);

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const intensityLabel = (intensity: string) => {
    if (intensity === "low") return t("low");
    if (intensity === "moderate") return t("moderate");
    if (intensity === "high") return t("high");
    return intensity;
  };

  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-4xl">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-micro text-muted mb-3">{t("logActivityDesc")}</p>
            <h1 className="font-display text-h1 text-ink mb-2">{t("title")}</h1>
            <p className="text-muted">
              {formatDate(selectedDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })}
              {!isToday && <span className="ml-2 text-iron">· {tCommon("pastDate")}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {tCommon("backToDashboard")}
            </Button>
          </div>
        </div>
      </div>

      {/* Calorie Balance — pillar pattern */}
      {calorieBalance && (
        <div className="mb-10 border-t border-b border-hairline py-8">
          <p className="text-micro text-muted mb-6">{t("dailyCalorieBalance")}</p>
          <div className="grid grid-cols-3 gap-6 md:gap-10">
            <div>
              <div className="font-display tnum text-data-xl text-ink leading-none">
                {calorieBalance.caloriesConsumed.toLocaleString()}
              </div>
              <div className="text-micro text-muted mt-3">{t("consumed")}</div>
            </div>
            <div>
              <div className="font-display tnum text-data-xl text-ink leading-none">
                {calorieBalance.totalCaloriesBurned.toLocaleString()}
              </div>
              <div className="text-micro text-muted mt-3">{t("burned")}</div>
            </div>
            <div>
              <div className={`font-display tnum text-data-xl leading-none ${calorieBalance.isDeficit ? 'text-iron' : 'text-ink'}`}>
                {calorieBalance.isDeficit ? '−' : '+'}
                {Math.abs(calorieBalance.calorieBalance).toLocaleString()}
              </div>
              <div className="text-micro text-muted mt-3">
                {calorieBalance.isDeficit ? t("deficit") : t("surplus")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-8 border border-hairline-strong bg-surface px-4 py-3 text-sm text-ink">
          {t("activityLoggedSuccess")}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Log Activity Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("logActivity")}</CardTitle>
            <CardDescription>{t("logActivityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Date and Time */}
              <div className="space-y-2">
                <Label htmlFor="localDateTime" className="text-micro text-muted">
                  {t("dateAndTime")}
                </Label>
                <Input
                  {...register("localDateTime", { required: t("dateAndTimeRequired") })}
                  type="datetime-local"
                  id="localDateTime"
                />
                {errors.localDateTime && (
                  <p className="text-iron text-sm mt-1">{errors.localDateTime.message}</p>
                )}
                <p className="text-xs text-muted-2">{t("dateAndTimeHint")}</p>
              </div>

              {/* Activity Type — Lucide-icon rows */}
              <div className="space-y-2">
                <Label className="text-micro text-muted">{t("activityType")}</Label>
                <div role="radiogroup" className="border-t border-hairline">
                  {activityTypes.map((type) => {
                    const Icon = getActivityIcon(type);
                    const selected = watchedActivityType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() =>
                          setValue("activityType", type, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        className={`group w-full flex items-center gap-3 py-3 px-1 border-b border-hairline text-left transition-colors ${
                          selected ? "text-ink" : "text-muted hover:text-ink"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${selected ? "text-ink" : "text-muted-2 group-hover:text-ink"}`}
                          strokeWidth={1.5}
                        />
                        <span className={`text-sm flex-1 ${selected ? "font-medium text-ink" : ""}`}>
                          {type}
                        </span>
                        {selected && (
                          <span aria-hidden className="text-micro text-iron">●</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {errors.activityType && (
                  <p className="text-iron text-sm mt-1">{errors.activityType.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-micro text-muted">
                  {t("description")}
                </Label>
                <Input
                  id="description"
                  placeholder={t("descriptionPlaceholder")}
                  {...register("description", { required: t("descriptionRequired") })}
                />
                {errors.description && (
                  <p className="text-iron text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-micro text-muted">
                  {t("duration")}
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  placeholder="30"
                  {...register("duration", {
                    required: t("durationRequired"),
                    min: { value: 1, message: t("durationMin") },
                  })}
                />
                {errors.duration && (
                  <p className="text-iron text-sm mt-1">{errors.duration.message}</p>
                )}
              </div>

              {/* Intensity */}
              <div className="space-y-2">
                <Label className="text-micro text-muted">{t("intensity")}</Label>
                <div className="flex gap-2">
                  {(["low", "moderate", "high"] as const).map((level) => {
                    const selected = watchedIntensity === level;
                    return (
                      <Button
                        key={level}
                        type="button"
                        variant={selected ? "default" : "outline"}
                        size="sm"
                        onClick={() =>
                          setValue("intensity", level, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })
                        }
                        aria-pressed={selected}
                      >
                        {intensityLabel(level)}
                      </Button>
                    );
                  })}
                </div>
                {errors.intensity && (
                  <p className="text-iron text-sm mt-1">{errors.intensity.message}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-micro text-muted">
                  {t("notes")}
                </Label>
                <Textarea
                  id="notes"
                  placeholder={t("notesPlaceholder")}
                  {...register("notes")}
                />
              </div>

              {/* Calories Burned */}
              <div className="space-y-2">
                <Label htmlFor="caloriesBurned" className="text-micro text-muted">
                  {t("caloriesBurned")}
                </Label>
                <Input
                  id="caloriesBurned"
                  type="number"
                  min="1"
                  placeholder={t("caloriesBurnedPlaceholder")}
                  {...register("caloriesBurned", {
                    min: { value: 1, message: t("caloriesBurnedMin") },
                  })}
                />
                {errors.caloriesBurned && (
                  <p className="text-iron text-sm mt-1">{errors.caloriesBurned.message}</p>
                )}
                <p className="text-xs text-muted-2">{t("caloriesBurnedHint")}</p>
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
        <div className="space-y-8">
          {/* Summary — pillar pattern */}
          <div className="border-t border-b border-hairline py-6">
            <p className="text-micro text-muted mb-5">
              {isToday
                ? t("todaysActivities")
                : t("activitiesForDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="font-display tnum text-data-xl text-ink leading-none">
                  {totalCaloriesBurned.toLocaleString()}
                </div>
                <div className="text-micro text-muted mt-3">{t("caloriesBurnedLabel")}</div>
              </div>
              <div>
                <div className="font-display tnum text-data-xl text-ink leading-none">
                  {totalDuration.toLocaleString()}
                </div>
                <div className="text-micro text-muted mt-3">{t("minutesActive")}</div>
              </div>
            </div>
          </div>

          {/* Activities List — meal-row pattern */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-display text-h2 text-ink">{t("activities")}</h2>
              <span className="text-micro text-muted">
                {dayActivities.length === 0
                  ? t("noActivitiesLogged")
                  : t("activitiesLogged", { count: dayActivities.length })}
              </span>
            </div>

            {isLoading ? (
              <div className="py-6 text-sm text-muted">{t("loadingActivities")}</div>
            ) : dayActivities.length === 0 ? (
              <div className="border-t border-hairline py-12 text-center">
                <Activity
                  className="h-6 w-6 mx-auto mb-3 text-muted-2"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-ink">{t("noActivitiesForDay")}</p>
                <p className="text-xs text-muted mt-1">{t("startLogging")}</p>
              </div>
            ) : (
              <div className="border-t border-hairline">
                {dayActivities.map((entry: any) => {
                  const Icon = getActivityIcon(entry.activityType);
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-4 py-3 border-b border-hairline"
                    >
                      <span className="font-mono tnum text-sm text-muted shrink-0 w-16">
                        {formatDate(convertUTCToLocalDisplay(entry.localDateTime), "HH:mm", { locale: dateLocale })}
                      </span>
                      <Icon
                        className="h-4 w-4 shrink-0 text-muted-2"
                        strokeWidth={1.5}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ink truncate">
                          {entry.activityType}
                        </div>
                        <div className="text-micro text-muted truncate">
                          {entry.duration} {t("min")} · {intensityLabel(entry.intensity)}
                          {entry.description ? ` · ${entry.description}` : ""}
                        </div>
                      </div>
                      <span className="font-mono tnum text-sm text-ink shrink-0">
                        {entry.caloriesBurned.toLocaleString()} {t("cal")}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEntry(entry)}
                        className="shrink-0"
                        aria-label={t("editActivity")}
                      >
                        <Edit className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
