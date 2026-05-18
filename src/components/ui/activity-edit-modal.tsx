"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { formatDate } from "@/utils/formatDate";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage } from "@/utils/dateUtils";
import { useTranslations } from "@/utils/useTranslations";
import { useDateLocale } from "@/utils/useDateLocale";

interface ActivityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: () => void;
  entry: any;
  activityTypes: string[];
  isLoading?: boolean;
}

interface ActivityFormData {
  activityType: string;
  description: string;
  duration: number;
  intensity: "low" | "moderate" | "high";
  localDateTime: string; // Single field for datetime-local input
  notes?: string;
  caloriesBurned?: string;
}

const selectClassName =
  "flex h-10 w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-ink ring-offset-paper placeholder:text-muted-2 focus:outline-none focus:border-ink focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50";

export function ActivityEditModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  entry,
  activityTypes,
  isLoading = false,
}: ActivityEditModalProps) {
  const { t } = useTranslations("activity");
  const { t: tCommon } = useTranslations("common");
  const dateLocale = useDateLocale();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ActivityFormData>();

  // Reset form when entry changes
  useEffect(() => {
    if (isOpen && entry) {
      // Convert localDateTime to datetime-local format for display
      const localDisplayTime = convertUTCToLocalDisplay(entry.localDateTime);
      const formattedTimestamp = format(localDisplayTime, "yyyy-MM-dd'T'HH:mm");

      reset({
        activityType: entry.activityType || "",
        description: entry.description || "",
        duration: entry.duration?.toString() || "",
        intensity: entry.intensity || "",
        localDateTime: formattedTimestamp,
        notes: entry.notes || "",
        caloriesBurned: entry.caloriesBurned?.toString() || "",
      } as any);
    }
  }, [isOpen, entry, reset]);

  const onSubmit = (data: any) => {
    // Convert local time to UTC for storage using shared utility
    const localDateTime = convertLocalToUTCForStorage(data.localDateTime);

    onSave({
      id: entry.id,
      activityType: data.activityType,
      description: data.description,
      duration: parseInt(data.duration),
      intensity: data.intensity,
      localDateTime: localDateTime,
      notes: data.notes,
      caloriesBurned: data.caloriesBurned
        ? parseInt(data.caloriesBurned)
        : undefined,
    });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  if (!entry) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("editActivity")}</DialogTitle>
        </DialogHeader>

        {!showDeleteConfirm ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Date and Time */}
            <div className="space-y-2">
              <Label htmlFor="localDateTime" className="text-micro text-muted">
                {t("whenDidYouDoActivity")}
              </Label>
              <Input
                {...register("localDateTime", {
                  required: t("dateAndTimeRequired"),
                })}
                type="datetime-local"
                id="localDateTime"
                className="font-mono tnum"
              />
              {errors.localDateTime && (
                <p className="text-sm text-iron">{errors.localDateTime.message}</p>
              )}
            </div>

            {/* Activity Type */}
            <div className="space-y-2">
              <Label htmlFor="activityType" className="text-micro text-muted">
                {t("activityType")}
              </Label>
              <select
                {...register("activityType", {
                  required: t("activityTypeRequired"),
                })}
                className={selectClassName}
              >
                <option value="">{t("selectActivityType")}</option>
                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.activityType && (
                <p className="text-sm text-iron">{errors.activityType.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-micro text-muted">
                {t("description")}
              </Label>
              <Input
                placeholder={t("descriptionPlaceholder")}
                {...register("description", {
                  required: t("descriptionRequired"),
                })}
              />
              {errors.description && (
                <p className="text-sm text-iron">{errors.description.message}</p>
              )}
            </div>

            {/* Duration and Intensity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration" className="text-micro text-muted">
                  {t("duration")}
                </Label>
                <Input
                  type="number"
                  min="1"
                  className="font-mono tnum"
                  {...register("duration", {
                    required: t("durationRequired"),
                    min: { value: 1, message: t("durationMin") },
                    valueAsNumber: true,
                  })}
                />
                {errors.duration && (
                  <p className="text-sm text-iron">{errors.duration.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="intensity" className="text-micro text-muted">
                  {t("intensity")}
                </Label>
                <select
                  {...register("intensity", {
                    required: t("intensityRequired"),
                  })}
                  className={selectClassName}
                >
                  <option value="">{t("selectIntensity")}</option>
                  <option value="low">{t("low")}</option>
                  <option value="moderate">{t("moderate")}</option>
                  <option value="high">{t("high")}</option>
                </select>
                {errors.intensity && (
                  <p className="text-sm text-iron">{errors.intensity.message}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-micro text-muted">
                {t("notes")}
              </Label>
              <Textarea
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
                type="number"
                min="1"
                className="font-mono tnum"
                placeholder={t("caloriesBurnedPlaceholder")}
                {...register("caloriesBurned", {
                  min: { value: 1, message: t("caloriesBurnedMin") },
                  valueAsNumber: true,
                })}
              />
              {errors.caloriesBurned && (
                <p className="text-sm text-iron">{errors.caloriesBurned.message}</p>
              )}
              <p className="text-xs text-muted-2">{t("caloriesBurnedHint")}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 border-t border-hairline pt-4">
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? tCommon("saving") : tCommon("saveChanges")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
                aria-label={t("deleteActivity")}
              >
                <Trash2 className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </form>
        ) : (
          /* Delete Confirmation */
          <div className="space-y-4">
            <p className="text-sm text-muted">{t("deleteActivityConfirmation")}</p>
            <div className="border-y border-hairline py-3">
              <p className="text-micro text-muted">{entry.activityType}</p>
              <p className="mt-1 text-sm text-ink">{entry.description}</p>
              <p className="mt-1 font-mono tnum text-xs text-muted-2">
                {formatDate(
                  convertUTCToLocalDisplay(entry.localDateTime),
                  "MMM d, h:mm a",
                  { locale: dateLocale },
                )}{" "}
                &middot; {entry.duration} {t("min")}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="destructive"
                onClick={handleDelete}
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? t("deleting") : t("deleteActivity")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
                disabled={isLoading}
              >
                {tCommon("cancel")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
