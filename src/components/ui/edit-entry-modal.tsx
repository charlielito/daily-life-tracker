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

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: () => void;
  entry: any;
  type: "food" | "health";
  isLoading?: boolean;
}

interface FoodFormData {
  description: string;
  date: string;
  hour: string;
  weight?: string;
}

interface HealthFormData {
  date: string;
  hour: string;
  consistency: string;
  color: string;
  painLevel: number;
  notes?: string;
}

const BRISTOL_SCALE = [
  { value: "1", label: "Type 1: Separate hard lumps" },
  { value: "2", label: "Type 2: Sausage-shaped but lumpy" },
  { value: "3", label: "Type 3: Sausage-shaped with cracks" },
  { value: "4", label: "Type 4: Sausage-shaped, smooth and soft" },
  { value: "5", label: "Type 5: Soft blobs with clear-cut edges" },
  { value: "6", label: "Type 6: Fluffy pieces with ragged edges" },
  { value: "7", label: "Type 7: Watery, no solid pieces" },
];

const COMMON_COLORS = [
  "Brown", "Light Brown", "Dark Brown", "Yellow", "Green", "Red", "Black", "Other"
];

export function EditEntryModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  entry,
  type,
  isLoading = false,
}: EditEntryModalProps) {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>(entry?.imageUrl);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<FoodFormData | HealthFormData>({
    defaultValues: type === "food" ? {
      description: entry?.description || "",
      date: entry?.date ? format(new Date(entry.date), "yyyy-MM-dd") : "",
      hour: entry?.hour ? format(new Date(entry.hour), "HH:mm") : "",
      weight: entry?.weight?.toString() || "",
    } : {
      date: entry?.date ? format(new Date(entry.date), "yyyy-MM-dd") : "",
      hour: entry?.hour ? format(new Date(entry.hour), "HH:mm") : "",
      consistency: entry?.consistency || "4",
      color: entry?.color || "Brown",
      painLevel: entry?.painLevel || 0,
      notes: entry?.notes || "",
    }
  });

  useEffect(() => {
    if (isOpen && entry) {
      setUploadedImageUrl(entry.imageUrl);
      reset(type === "food" ? {
        description: entry.description || "",
        date: entry.date ? format(new Date(entry.date), "yyyy-MM-dd") : "",
        hour: entry.hour ? format(new Date(entry.hour), "HH:mm") : "",
        weight: entry.weight?.toString() || "",
      } : {
        date: entry.date ? format(new Date(entry.date), "yyyy-MM-dd") : "",
        hour: entry.hour ? format(new Date(entry.hour), "HH:mm") : "",
        consistency: entry.consistency || "4",
        color: entry.color || "Brown",
        painLevel: entry.painLevel || 0,
        notes: entry.notes || "",
      });
    }
  }, [isOpen, entry, reset, type]);

  const onSubmit = (data: FoodFormData | HealthFormData) => {
    const [hours, minutes] = data.hour.split(':');
    const [year, month, day] = data.date.split('-').map(Number);
    const entryDate = new Date(year, month - 1, day);
    const entryTime = new Date(year, month - 1, day);
    entryTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    if (type === "food") {
      const foodData = data as FoodFormData;
      const weight = foodData.weight && foodData.weight.trim() !== "" ? parseFloat(foodData.weight) : undefined;
      
      onSave({
        id: entry.id,
        description: foodData.description,
        date: entryDate,
        hour: entryTime,
        weight,
        imageUrl: uploadedImageUrl,
      });
    } else {
      const healthData = data as HealthFormData;
      onSave({
        id: entry.id,
        date: entryDate,
        hour: entryTime,
        consistency: healthData.consistency,
        color: healthData.color,
        painLevel: healthData.painLevel,
        notes: healthData.notes,
        imageUrl: uploadedImageUrl,
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
            Edit {type === "food" ? "Meal" : "Health"} Entry
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                {...register("date", { required: "Please select a date" })}
              />
              {errors.date && (
                <p className="text-red-500 text-sm">{errors.date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hour">Time</Label>
              <Input
                id="hour"
                type="time"
                {...register("hour", { required: "Please set the time" })}
              />
              {errors.hour && (
                <p className="text-red-500 text-sm">{errors.hour.message}</p>
              )}
            </div>

            {type === "food" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">Meal Description</Label>
                  <Textarea
                    id="description"
                    placeholder="e.g., Grilled chicken breast with rice and broccoli"
                    {...register("description", { required: "Please describe your meal" })}
                  />
                  {(errors as any).description && (
                    <p className="text-red-500 text-sm">{(errors as any).description.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg) - Optional</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 70.5"
                    {...register("weight")}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="consistency">Bristol Stool Scale</Label>
                  <select
                    id="consistency"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register("consistency", { required: "Please select consistency" })}
                  >
                    {BRISTOL_SCALE.map((scale) => (
                      <option key={scale.value} value={scale.value}>
                        {scale.label}
                      </option>
                    ))}
                  </select>
                  {(errors as any).consistency && (
                    <p className="text-red-500 text-sm">{(errors as any).consistency.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <select
                    id="color"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    {...register("color", { required: "Please select color" })}
                  >
                    {COMMON_COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                  {(errors as any).color && (
                    <p className="text-red-500 text-sm">{(errors as any).color.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="painLevel">Pain Level (0-10)</Label>
                  <Input
                    id="painLevel"
                    type="range"
                    min="0"
                    max="10"
                    {...register("painLevel", { valueAsNumber: true })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>0 - No pain</span>
                    <span className="font-medium text-gray-700">Current: {watch("painLevel")}</span>
                    <span>10 - Severe pain</span>
                  </div>
                  {(errors as any).painLevel && (
                    <p className="text-red-500 text-sm">{(errors as any).painLevel.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional observations, symptoms, or notes..."
                    {...register("notes")}
                  />
                </div>
              </>
            )}

            {/* Image Upload */}
            <ImageUpload
              onImageUpload={handleImageUpload}
              onImageRemove={handleImageRemove}
              currentImage={uploadedImageUrl}
              label={`${type === "food" ? "Food" : "Health"} Photo (Optional)`}
              disabled={isLoading}
            />

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
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
              <h3 className="text-lg font-semibold mb-2">Delete Entry</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this {type} entry? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 