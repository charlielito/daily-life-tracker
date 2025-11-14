"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { ImageUpload } from "./image-upload";
import { X, Edit, Trash2 } from "lucide-react";
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
  error
}: EditEntryModalProps) {
  const { t } = useTranslations(type === "food" ? "food" : "health");
  const { t: tCommon } = useTranslations("common");
  const BRISTOL_SCALE = type === "health" ? getBristolScale(t) : [];
  const COMMON_COLORS = type === "health" ? getCommonColors(t) : [];
  
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>(entry?.imageUrl);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {type === "food" ? t("editMealEntry") : t("editHealthEntry")}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0">
                    <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-red-800 font-medium">
                      {type === "food" ? t("macroCalculationError") : t("updateError")}
                    </p>
                    <p className="text-sm text-red-700 mt-1">{error.message}</p>
                    {type === "food" && error.message.includes("limit") && (
                      <p className="text-xs text-red-600 mt-2">
                        {t("limitReachedHint")}
                      </p>
                    )}
                    {type === "food" && error.message.includes("detailed description") && (
                      <p className="text-xs text-red-600 mt-2">
                        {t("detailedDescriptionHint")}
                      </p>
                    )}
                    {type === "food" && error.message.includes("network") && (
                      <p className="text-xs text-red-600 mt-2">
                        {t("networkHint")}
                      </p>
                    )}
                    {type === "food" && error.message.includes("timeout") && (
                      <p className="text-xs text-red-600 mt-2">
                        {t("timeoutHint")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="localDateTime" className="block text-sm font-medium text-gray-700 mb-1">
                  {type === "food" ? t("whenDidYouEat") : t("whenOccurred")}
                </label>
                <input
                  {...register("localDateTime", { required: t("dateAndTimeRequired") })}
                  type="datetime-local"
                  id="localDateTime"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.localDateTime && (
                  <p className="text-red-500 text-sm mt-1">{(errors.localDateTime as any)?.message}</p>
                )}
              </div>

            {type === "food" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("foodDescription")} {uploadedImageUrl && <span className="text-gray-500 font-normal">{t("foodDescriptionOptional")}</span>}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder={uploadedImageUrl ? t("foodDescriptionPlaceholder") : t("mealDescriptionPlaceholder")}
                    {...register("description", { 
                      required: !uploadedImageUrl ? t("foodDescriptionRequired") : false 
                    })}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm">{(errors.description as any)?.message}</p>
                  )}
                  {uploadedImageUrl && (
                    <p className="text-xs text-gray-500">
                      {t("photoHint")}
                    </p>
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
                  <Label htmlFor="consistency">{t("bristolStoolScale")}</Label>
                  <select
                    id="consistency"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register("consistency", { required: t("selectConsistency") })}
                  >
                    {BRISTOL_SCALE.map((scale) => (
                      <option key={scale.value} value={scale.value}>
                        {scale.label}
                      </option>
                    ))}
                  </select>
                  {errors.consistency && (
                    <p className="text-red-500 text-sm">{(errors.consistency as any)?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">{t("color")}</Label>
                  <select
                    id="color"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register("color", { required: t("selectColor") })}
                  >
                    {COMMON_COLORS.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                  {errors.color && (
                    <p className="text-red-500 text-sm">{(errors.color as any)?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="painLevel">{t("painLevel")}</Label>
                  <Input
                    id="painLevel"
                    type="range"
                    min="0"
                    max="10"
                    {...register("painLevel", { valueAsNumber: true })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t("noPain")}</span>
                    <span className="font-medium text-gray-700">{t("current", { level: watch("painLevel") })}</span>
                    <span>{t("severePain")}</span>
                  </div>
                  {(errors as any).painLevel && (
                    <p className="text-red-500 text-sm">{(errors as any).painLevel.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("notesOptional")}</Label>
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
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isLoading}
              >
                {isLoading ? tCommon("saving") : tCommon("saveChanges")}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                {tCommon("cancel")}
              </Button>
              
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-2">{tCommon("deleteEntry")}</h3>
              <p className="text-gray-600 mb-4">
                {type === "health" ? t("deleteHealthEntry") : type === "food" ? t("deleteMealEntry") : tCommon("deleteConfirmation")}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {tCommon("delete")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {tCommon("cancel")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 