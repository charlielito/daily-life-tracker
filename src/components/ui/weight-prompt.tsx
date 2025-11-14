"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { ImageUpload } from "./image-upload";
import { X, Scale } from "lucide-react";
import { useTranslations } from "@/utils/useTranslations";
import { format } from "date-fns";

interface WeightPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weight: number, imageUrl?: string | null) => void;
  isLoading?: boolean;
  date: Date;
}

interface WeightFormData {
  weight: string;
}

export function WeightPrompt({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  date,
}: WeightPromptProps) {
  const { t } = useTranslations("weight");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<WeightFormData>();

  const onSubmit = (data: WeightFormData) => {
    const weight = parseFloat(data.weight);
    if (!isNaN(weight) && weight > 0) {
      onSave(weight, uploadedImageUrl || null); // Explicitly pass null when undefined
      reset();
      setUploadedImageUrl(undefined);
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
  };

  const handleImageRemove = () => {
    setUploadedImageUrl(undefined);
  };

  if (!isOpen) return null;

  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">{t("dailyWeight")}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-gray-600 text-sm mb-2">
            {isToday 
              ? t("trackWeightToday")
              : t("enterWeightForDate", { date: format(date, "MMM d, yyyy") })
            }
          </p>
          <p className="text-gray-500 text-xs">
            {t("weightTrackingInfo")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight">{t("weightKg")}</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="e.g., 70.5"
              {...register("weight", { 
                required: t("weightRequired"),
                min: { value: 20, message: t("weightMin") },
                max: { value: 300, message: t("weightMax") }
              })}
              autoFocus
            />
            {errors.weight && (
              <p className="text-red-500 text-sm">{errors.weight.message}</p>
            )}
          </div>

          {/* Image Upload */}
          <ImageUpload
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            currentImage={uploadedImageUrl}
            label={t("weightPhoto")}
            disabled={isLoading}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isLoading}
            >
              {isLoading ? t("saving") : t("saveWeight")}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {t("skipForNow")}
            </Button>
          </div>
        </form>

        {/* Help text */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-700 text-xs">
            {t("weightTrackingTip")}
          </p>
        </div>
      </div>
    </div>
  );
} 