"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { X, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage } from "@/utils/dateUtils";

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

export function ActivityEditModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  entry,
  activityTypes,
  isLoading = false,
}: ActivityEditModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<ActivityFormData>();

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
        intensity: entry.intensity || "moderate",
        localDateTime: formattedTimestamp,
        notes: entry.notes || "",
        caloriesBurned: entry.caloriesBurned?.toString() || "",
      });
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
      localDateTime: localDateTime, // Use the converted localDateTime
      notes: data.notes,
      caloriesBurned: data.caloriesBurned ? parseInt(data.caloriesBurned) : undefined,
    });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete();
  };

  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Edit Activity</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showDeleteConfirm ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Date and Time */}
              <div>
                <label htmlFor="localDateTime" className="block text-sm font-medium text-gray-700 mb-1">
                  When did you do this activity?
                </label>
                <input
                  {...register("localDateTime", { required: "Date and time are required" })}
                  type="datetime-local"
                  id="localDateTime"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.localDateTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.localDateTime.message}</p>
                )}
              </div>

              {/* Activity Type */}
              <div>
                <Label htmlFor="activityType">Activity Type</Label>
                <select
                  {...register("activityType", { required: "Activity type is required" })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">Select activity type</option>
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
                <Label htmlFor="description">Description</Label>
                <Input
                  placeholder="e.g., Morning run around the park"
                  {...register("description", { required: "Description is required" })}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              {/* Duration and Intensity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    {...register("duration", { 
                      required: "Duration is required",
                      min: { value: 1, message: "Duration must be at least 1 minute" },
                      valueAsNumber: true
                    })}
                  />
                  {errors.duration && (
                    <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="intensity">Intensity</Label>
                  <select
                    {...register("intensity", { required: "Intensity is required" })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select intensity</option>
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                  </select>
                  {errors.intensity && (
                    <p className="text-red-500 text-sm mt-1">{errors.intensity.message}</p>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  placeholder="Any additional notes about your activity..."
                  {...register("notes")}
                />
              </div>

              {/* Calories Burned */}
              <div>
                <Label htmlFor="caloriesBurned">Calories Burned (optional)</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g., 300"
                  {...register("caloriesBurned", { 
                    min: { value: 1, message: "Calories must be at least 1" },
                    valueAsNumber: true
                  })}
                />
                {errors.caloriesBurned && (
                  <p className="text-red-500 text-sm mt-1">{errors.caloriesBurned.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Enter the calories burned from your fitness tracker or watch for more accuracy
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
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
          ) : (
            /* Delete Confirmation */
            <div className="text-center py-6">
              <div className="mb-4">
                <Trash2 className="h-12 w-12 text-red-500 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Activity</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete this activity? This action cannot be undone.
                </p>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium">{entry.activityType}</p>
                  <p className="text-sm text-gray-600">{entry.description}</p>
                  <p className="text-xs text-gray-500">
                    {format(convertUTCToLocalDisplay(entry.localDateTime), "MMM d, h:mm a")} • {entry.duration} minutes
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? "Deleting..." : "Delete Activity"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 