"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { ImageUpload } from "./image-upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { useTranslations } from "@/utils/useTranslations";
import { useDateLocale } from "@/utils/useDateLocale";
import { formatDate } from "@/utils/formatDate";

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
  const dateLocale = useDateLocale();
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

  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dailyWeight")}</DialogTitle>
          <p className="mt-1 text-sm text-muted">
            {isToday
              ? t("trackWeightToday")
              : t("enterWeightForDate", {
                  date: formatDate(date, "MMM d, yyyy", { locale: dateLocale }),
                })}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-micro text-muted">
              {t("weightKg")}
            </Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="70.5"
              className="font-mono tnum"
              {...register("weight", {
                required: t("weightRequired"),
                min: { value: 20, message: t("weightMin") },
                max: { value: 300, message: t("weightMax") },
              })}
              autoFocus
            />
            {errors.weight && (
              <p className="text-sm text-iron">{errors.weight.message}</p>
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

          {/* Note */}
          <div className="border-t border-hairline pt-3">
            <p className="text-xs text-muted-2">{t("weightTrackingInfo")}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? t("saving") : t("saveWeight")}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isLoading}
            >
              {t("skipForNow")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
