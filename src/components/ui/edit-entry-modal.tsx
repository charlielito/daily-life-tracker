"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { ImageUpload } from "./image-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage } from "@/utils/dateUtils";
import { useTranslations } from "@/utils/useTranslations";

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: () => void;
  entry: any;
  type: "food" | "health";
  isLoading?: boolean;
  error?: any;
}

function getBristolScale(t: (key: string) => string) {
  return [
    { value: "1", label: t("bristolType1") },
    { value: "2", label: t("bristolType2") },
    { value: "3", label: t("bristolType3") },
    { value: "4", label: t("bristolType4") },
    { value: "5", label: t("bristolType5") },
    { value: "6", label: t("bristolType6") },
    { value: "7", label: t("bristolType7") },
  ];
}

function getCommonColors(t: (key: string) => string) {
  return [
    { value: "Brown", label: t("colorBrown") },
    { value: "Light Brown", label: t("colorLightBrown") },
    { value: "Dark Brown", label: t("colorDarkBrown") },
    { value: "Yellow", label: t("colorYellow") },
    { value: "Green", label: t("colorGreen") },
    { value: "Red", label: t("colorRed") },
    { value: "Black", label: t("colorBlack") },
    { value: "Other", label: t("colorOther") },
  ];
}

export function EditEntryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  entry,
  type,
  isLoading = false,
  error,
}: EditEntryModalProps) {
  const { t } = useTranslations(type === "food" ? "food" : "health");
  const { t: tCommon } = useTranslations("common");
  const BRISTOL_SCALE = type === "health" ? getBristolScale(t) : [];
  const COMMON_COLORS = type === "health" ? getCommonColors(t) : [];

  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>(
    entry?.imageUrl,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<any>();

  // Reset form when entry changes
  useEffect(() => {
    if (isOpen && entry) {
      setUploadedImageUrl(entry.imageUrl);

      // Convert localDateTime to datetime-local format for display
      const localDisplayTime = convertUTCToLocalDisplay(entry.localDateTime);
      const formattedTimestamp = format(localDisplayTime, "yyyy-MM-dd'T'HH:mm");

      if (type === "food") {
        reset({
          description: entry.description || "",
          localDateTime: formattedTimestamp,
        });
      } else {
        reset({
          localDateTime: formattedTimestamp,
          consistency: entry.consistency || "4",
          color: entry.color || "Brown",
          painLevel: entry.painLevel || 0,
          notes: entry.notes || "",
        });
      }
    }
  }, [isOpen, entry, type, reset]);

  const onSubmit = (data: any) => {
    // Convert local time to UTC for storage using shared utility
    const localDateTime = convertLocalToUTCForStorage(data.localDateTime);

    if (type === "food") {
      // If no image is provided, description is required
      // If image is provided, description can be empty (AI will generate it)
      const description = data.description?.trim() || undefined;

      onSave({
        id: entry.id,
        description: description,
        localDateTime: localDateTime,
        imageUrl: uploadedImageUrl || null, // Explicitly pass null when undefined
      });
    } else {
      onSave({
        id: entry.id,
        localDateTime: localDateTime,
        consistency: data.consistency,
        color: data.color,
        painLevel: data.painLevel,
        notes: data.notes,
        imageUrl: uploadedImageUrl || null, // Explicitly pass null when undefined
      });
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
  };

  const handleImageRemove = () => {
    setUploadedImageUrl(undefined);
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {type === "food" ? t("editMealEntry") : t("editHealthEntry")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Error Display */}
          {error && (
            <div className="border border-hairline bg-iron-soft/40 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle
                  className="h-4 w-4 flex-shrink-0 text-iron"
                  strokeWidth={1.5}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">
                    {type === "food" ? t("macroCalculationError") : t("updateError")}
                  </p>
                  <p className="mt-1 text-sm text-muted">{error.message}</p>
                  {type === "food" && error.message.includes("limit") && (
                    <p className="mt-2 text-xs text-muted-2">{t("limitReachedHint")}</p>
                  )}
                  {type === "food" && error.message.includes("detailed description") && (
                    <p className="mt-2 text-xs text-muted-2">
                      {t("detailedDescriptionHint")}
                    </p>
                  )}
                  {type === "food" && error.message.includes("network") && (
                    <p className="mt-2 text-xs text-muted-2">{t("networkHint")}</p>
                  )}
                  {type === "food" && error.message.includes("timeout") && (
                    <p className="mt-2 text-xs text-muted-2">{t("timeoutHint")}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="localDateTime" className="text-micro text-muted">
                {type === "food" ? t("whenDidYouEat") : t("whenOccurred")}
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
                <p className="text-sm text-iron">
                  {(errors.localDateTime as any)?.message}
                </p>
              )}
            </div>

            {type === "food" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-micro text-muted">
                    {t("foodDescription")}{" "}
                    {uploadedImageUrl && (
                      <span className="text-muted-2 normal-case tracking-normal">
                        {t("foodDescriptionOptional")}
                      </span>
                    )}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={
                      uploadedImageUrl
                        ? t("foodDescriptionPlaceholder")
                        : t("mealDescriptionPlaceholder")
                    }
                    {...register("description", {
                      required: !uploadedImageUrl
                        ? t("foodDescriptionRequired")
                        : false,
                    })}
                  />
                  {errors.description && (
                    <p className="text-sm text-iron">
                      {(errors.description as any)?.message}
                    </p>
                  )}
                  {uploadedImageUrl && (
                    <p className="text-xs text-muted-2">{t("photoHint")}</p>
                  )}
                </div>

                <ImageUpload
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  currentImage={uploadedImageUrl}
                  label={t("foodPhotoLabel")}
                  disabled={isLoading}
                />
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="consistency" className="text-micro text-muted">
                    {t("bristolStoolScale")}
                  </Label>
                  <select
                    id="consistency"
                    className="flex h-10 w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-ink ring-offset-paper placeholder:text-muted-2 focus:outline-none focus:border-ink focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register("consistency", {
                      required: t("selectConsistency"),
                    })}
                  >
                    {BRISTOL_SCALE.map((scale) => (
                      <option key={scale.value} value={scale.value}>
                        {scale.label}
                      </option>
                    ))}
                  </select>
                  {errors.consistency && (
                    <p className="text-sm text-iron">
                      {(errors.consistency as any)?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color" className="text-micro text-muted">
                    {t("color")}
                  </Label>
                  <select
                    id="color"
                    className="flex h-10 w-full rounded border border-hairline bg-surface px-3 py-2 text-sm text-ink ring-offset-paper placeholder:text-muted-2 focus:outline-none focus:border-ink focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                    {...register("color", { required: t("selectColor") })}
                  >
                    {COMMON_COLORS.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                  {errors.color && (
                    <p className="text-sm text-iron">
                      {(errors.color as any)?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="painLevel" className="text-micro text-muted">
                    {t("painLevel")}
                  </Label>
                  <Input
                    id="painLevel"
                    type="range"
                    min="0"
                    max="10"
                    {...register("painLevel", { valueAsNumber: true })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-2">
                    <span>{t("noPain")}</span>
                    <span className="font-mono tnum text-ink">
                      {t("current", { level: watch("painLevel") })}
                    </span>
                    <span>{t("severePain")}</span>
                  </div>
                  {(errors as any).painLevel && (
                    <p className="text-sm text-iron">
                      {(errors as any).painLevel.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-micro text-muted">
                    {t("notesOptional")}
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder={t("notesPlaceholder")}
                    {...register("notes")}
                  />
                </div>

                <ImageUpload
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  currentImage={uploadedImageUrl}
                  label={t("photoOptional")}
                  disabled={isLoading}
                />
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
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
              aria-label={tCommon("delete")}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            </Button>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <Dialog
            open={showDeleteConfirm}
            onOpenChange={(open) => !open && setShowDeleteConfirm(false)}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{tCommon("deleteEntry")}</DialogTitle>
                <p className="mt-1 text-sm text-muted">
                  {type === "health"
                    ? t("deleteHealthEntry")
                    : type === "food"
                    ? t("deleteMealEntry")
                    : tCommon("deleteConfirmation")}
                </p>
              </DialogHeader>
              <div className="flex gap-2 border-t border-hairline pt-4">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {tCommon("delete")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {tCommon("cancel")}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
