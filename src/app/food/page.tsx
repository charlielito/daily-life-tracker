"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { EditEntryModal } from "@/components/ui/edit-entry-modal";
import { format } from "date-fns";
import { Edit, Trash2 } from "lucide-react";
import Image from "next/image";

interface FoodFormData {
  description: string;
  date: string;
  hour: string;
  timestamp: string; // New field for datetime-local input
}

export default function FoodPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>();
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

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<FoodFormData>({
    defaultValues: {
      timestamp: format(new Date(), "yyyy-MM-dd'T'HH:mm"), // Use datetime-local format
      date: format(new Date(), "yyyy-MM-dd"),
      hour: format(new Date(), "HH:mm"),
    }
  });

  // Watch the timestamp field to update selectedDate when it changes
  const watchedTimestamp = watch("timestamp");
  useEffect(() => {
    if (watchedTimestamp) {
      const timestampDate = new Date(watchedTimestamp);
      setSelectedDate(timestampDate);
    }
  }, [watchedTimestamp]);

  const utils = api.useContext();
  
  const createMacroEntry = api.macros.create.useMutation({
    onSuccess: () => {
      reset({
        description: "",
        timestamp: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
        date: format(selectedDate, "yyyy-MM-dd"),
        hour: format(new Date(), "HH:mm"),
      });
      setUploadedImageUrl(undefined); // Clear the uploaded image
      utils.macros.getToday.invalidate();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000); // Hide success message after 3 seconds
    },
    onError: (error) => {
      console.error("Failed to create macro entry:", error);
    },
  });

  const updateMacroEntry = api.macros.update.useMutation({
    onSuccess: () => {
      utils.macros.getToday.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to update macro entry:", error);
    },
  });

  const deleteMacroEntry = api.macros.delete.useMutation({
    onSuccess: () => {
      utils.macros.getToday.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to delete macro entry:", error);
    },
  });

  const { data: dayMacros = [], isLoading } = api.macros.getToday.useQuery(
    { date: selectedDate },
    { enabled: !!session }
  );

  const onSubmit = (data: FoodFormData) => {
    // Parse the datetime-local input
    const timestamp = new Date(data.timestamp);
    
    // Create dates in local timezone to avoid timezone shifts
    const mealDate = new Date(timestamp);
    mealDate.setHours(0, 0, 0, 0); // Reset to start of day for date field
    
    createMacroEntry.mutate({
      description: data.description,
      timestamp: timestamp, // Use the new timestamp field
      hour: timestamp, // Keep for backward compatibility
      date: mealDate, // Keep for backward compatibility
      imageUrl: uploadedImageUrl,
    });
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (data: any) => {
    updateMacroEntry.mutate(data);
  };

  const handleDeleteEntry = () => {
    if (editingEntry) {
      deleteMacroEntry.mutate({ id: editingEntry.id });
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
  };

  const handleImageRemove = () => {
    setUploadedImageUrl(undefined);
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const totalMacros = dayMacros.reduce(
    (acc, entry) => {
      if (entry.calculatedMacros) {
        acc.calories += entry.calculatedMacros.calories || 0;
        acc.protein += entry.calculatedMacros.protein || 0;
        acc.carbs += entry.calculatedMacros.carbs || 0;
        acc.fat += entry.calculatedMacros.fat || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Food Tracking</h1>
            <p className="text-gray-600">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
              {!isToday && <span className="ml-2 text-amber-600 font-medium">(Past Date)</span>}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            ← Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Add New Meal Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Meal</CardTitle>
            <CardDescription>
              Describe your meal and our AI will calculate the macros for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Success Display */}
              {showSuccess && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-green-600 text-sm">
                    <strong>Success!</strong> Your meal has been logged and macros calculated.
                  </p>
                </div>
              )}

              {/* Error Display */}
              {createMacroEntry.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-600 text-sm">
                    <strong>Error:</strong> {createMacroEntry.error.message}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  {...register("timestamp", { required: "Date and time are required" })}
                  type="datetime-local"
                  id="timestamp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.timestamp && (
                  <p className="text-red-500 text-sm mt-1">{errors.timestamp.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  You can log meals for any date, not just today
                </p>
              </div>

              {/* Hidden fields for backward compatibility */}
              <input type="hidden" {...register("date")} />
              <input type="hidden" {...register("hour")} />

              <div className="space-y-2">
                <Label htmlFor="description">Meal Description</Label>
                <Textarea
                  id="description"
                  placeholder="e.g., Grilled chicken breast with rice and broccoli, medium portion"
                  {...register("description", { required: "Please describe your meal" })}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm">{errors.description.message}</p>
                )}
              </div>

              {/* Image Upload */}
              <ImageUpload
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                currentImage={uploadedImageUrl}
                label="Food Photo (Optional)"
                disabled={createMacroEntry.isLoading}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createMacroEntry.isLoading}
              >
                {createMacroEntry.isLoading ? "Adding meal..." : "Add Meal & Calculate Macros"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Day's Summary */}
        <div className="space-y-6">
          {/* Macro Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isToday ? "Today's" : format(selectedDate, "MMM d")} Macros
              </CardTitle>
              <CardDescription>Total nutrition from all meals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(totalMacros.calories)}</div>
                  <div className="text-sm text-gray-600">Calories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(totalMacros.protein)}g</div>
                  <div className="text-sm text-gray-600">Protein</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{Math.round(totalMacros.carbs)}g</div>
                  <div className="text-sm text-gray-600">Carbs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{Math.round(totalMacros.fat)}g</div>
                  <div className="text-sm text-gray-600">Fat</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day's Meals */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isToday ? "Today's" : format(selectedDate, "MMM d")} Meals ({dayMacros.length})
              </CardTitle>
              <CardDescription>Your food entries for this date</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-gray-500">Loading...</p>
              ) : dayMacros.length === 0 ? (
                <p className="text-gray-500">No meals logged for this date</p>
              ) : (
                <div className="space-y-4">
                  {dayMacros.map((entry) => (
                    <div key={entry.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="font-medium">{entry.description}</p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(entry.timestamp || entry.hour), "h:mm a")}
                              </p>
                            </div>
                            {/* Display image if available */}
                            {entry.imageUrl && (
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                <Image
                                  src={entry.imageUrl}
                                  alt="Meal photo"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Edit/Delete buttons */}
                        <div className="flex gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEntry(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {entry.calculatedMacros ? (
                        <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                          <div className="text-center bg-blue-50 p-2 rounded">
                            <div className="font-medium text-blue-700">
                              {Math.round(entry.calculatedMacros.calories)}
                            </div>
                            <div className="text-xs text-blue-600">cal</div>
                          </div>
                          <div className="text-center bg-green-50 p-2 rounded">
                            <div className="font-medium text-green-700">
                              {Math.round(entry.calculatedMacros.protein)}g
                            </div>
                            <div className="text-xs text-green-600">protein</div>
                          </div>
                          <div className="text-center bg-yellow-50 p-2 rounded">
                            <div className="font-medium text-yellow-700">
                              {Math.round(entry.calculatedMacros.carbs)}g
                            </div>
                            <div className="text-xs text-yellow-600">carbs</div>
                          </div>
                          <div className="text-center bg-red-50 p-2 rounded">
                            <div className="font-medium text-red-700">
                              {Math.round(entry.calculatedMacros.fat)}g
                            </div>
                            <div className="text-xs text-red-600">fat</div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          Macros calculation in progress or failed
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Entry Modal */}
      <EditEntryModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEntry}
        entry={editingEntry}
        type="food"
        isLoading={updateMacroEntry.isLoading || deleteMacroEntry.isLoading}
        error={updateMacroEntry.error || deleteMacroEntry.error}
      />
    </div>
  );
} 