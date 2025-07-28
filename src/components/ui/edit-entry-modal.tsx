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
  error?: any; // Add error prop
}

interface FoodFormData {
  description: string;
  timestamp: string; // New field for datetime-local input
  date: string;
  hour: string;
}

interface HealthFormData {
  timestamp: string; // New field for datetime-local input
  date: string;
  hour: string;
  consistency: string;
  color: string;
  painLevel: number;
  notes: string;
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
  error = null, // Add error prop
}: EditEntryModalProps) {
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>(entry?.imageUrl);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm<FoodFormData | HealthFormData>({
    defaultValues: type === "food" ? {
      description: entry?.description || "",
      date: entry?.date ? format(new Date(entry.date), "yyyy-MM-dd") : "",
      hour: entry?.hour ? format(new Date(entry.hour), "HH:mm") : "",
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
      
      // Convert timestamp or hour to datetime-local format
      const entryTimestamp = entry.timestamp || entry.hour;
      const formattedTimestamp = entryTimestamp ? format(new Date(entryTimestamp), "yyyy-MM-dd'T'HH:mm") : "";
      
      reset(type === "food" ? {
        description: entry.description || "",
        timestamp: formattedTimestamp,
        date: entry.date ? format(new Date(entry.date), "yyyy-MM-dd") : "",
        hour: entry.hour ? format(new Date(entry.hour), "HH:mm") : "",
      } : {
        timestamp: formattedTimestamp,
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
    // Parse the datetime-local input
    const timestamp = new Date(data.timestamp);
    const entryDate = new Date(timestamp);
    entryDate.setHours(0, 0, 0, 0); // Reset to start of day for date field

    if (type === "food") {
      const foodData = data as FoodFormData;
      onSave({
        id: entry.id,
        description: foodData.description,
        timestamp: timestamp, // Use new timestamp field
        date: entryDate, // Keep for backward compatibility
        hour: timestamp, // Keep for backward compatibility
        imageUrl: uploadedImageUrl,
      });
    } else {
      const healthData = data as HealthFormData;
      onSave({
        id: entry.id,
        timestamp: timestamp, // Use new timestamp field
        date: entryDate, // Keep for backward compatibility
        hour: timestamp, // Keep for backward compatibility
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
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-red-600 text-sm">
                  <strong>Error:</strong> {error.message}
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 mb-1">
                  {type === "food" ? "When did you eat this?" : "When did this occur?"}
                </label>
                <input
                  {...register("timestamp", { required: "Date and time are required" })}
                  type="datetime-local"
                  id="timestamp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.timestamp && (
                  <p className="text-red-500 text-sm mt-1">{errors.timestamp.message}</p>
                )}
              </div>

              {/* Hidden fields for backward compatibility */}
              <input type="hidden" {...register("date")} />
              <input type="hidden" {...register("hour")} />

            {type === "food" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="description">Food Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what you ate..."
                    {...register("description", { required: "Description is required" })}
                  />
                  {errors.description && (
                    <p className="text-red-500 text-sm">{errors.description.message}</p>
                  )}
                </div>

                <ImageUpload
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  currentImage={uploadedImageUrl}
                  label="Food Photo (Optional)"
                  disabled={isLoading}
                />
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
                  {errors.consistency && (
                    <p className="text-red-500 text-sm">{errors.consistency.message}</p>
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
                  {errors.color && (
                    <p className="text-red-500 text-sm">{errors.color.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="painLevel">Pain Level (0-10)</Label>
                  <Input
                    id="painLevel"
                    type="number"
                    min="0"
                    max="10"
                    {...register("painLevel", { 
                      required: "Please rate pain level",
                      min: { value: 0, message: "Pain level must be at least 0" },
                      max: { value: 10, message: "Pain level must be at most 10" }
                    })}
                  />
                  {errors.painLevel && (
                    <p className="text-red-500 text-sm">{errors.painLevel.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes..."
                    {...register("notes")}
                  />
                </div>

                <ImageUpload
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  currentImage={uploadedImageUrl}
                  label="Photo (Optional)"
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