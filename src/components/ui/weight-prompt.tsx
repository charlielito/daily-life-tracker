"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { ImageUpload } from "./image-upload";
import { X, Scale } from "lucide-react";

interface WeightPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (weight: number, imageUrl?: string) => void;
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
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>();
  const { register, handleSubmit, formState: { errors }, reset } = useForm<WeightFormData>();

  const onSubmit = (data: WeightFormData) => {
    const weight = parseFloat(data.weight);
    if (!isNaN(weight) && weight > 0) {
      onSave(weight, uploadedImageUrl);
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
            <h2 className="text-lg font-semibold">Daily Weight</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-gray-600 text-sm mb-2">
            {isToday 
              ? "Let's track your weight for today! This helps monitor your health progress."
              : `Enter your weight for ${date.toLocaleDateString()}`
            }
          </p>
          <p className="text-gray-500 text-xs">
            Weight is tracked once per day and helps with health correlation analysis.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="20"
              max="300"
              placeholder="e.g., 70.5"
              {...register("weight", { 
                required: "Please enter your weight",
                min: { value: 20, message: "Weight must be at least 20kg" },
                max: { value: 300, message: "Weight must be less than 300kg" }
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
            label="Weight Photo (Optional)"
            disabled={isLoading}
          />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : "Save Weight"}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Skip for now
            </Button>
          </div>
        </form>

        {/* Help text */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-blue-700 text-xs">
            💡 <strong>Tip:</strong> Regular weight tracking helps identify patterns between your diet, health, and weight changes over time.
          </p>
        </div>
      </div>
    </div>
  );
} 