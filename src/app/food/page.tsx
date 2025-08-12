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
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage, getStartOfDay } from "@/utils/dateUtils";
import { MacroDetailsModal } from "@/components/ui/macro-details-modal";
import { Info } from "lucide-react";

interface FoodFormData {
  description?: string;
  localDateTime: string; // Single field for datetime-local input
}

export default function FoodPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>();
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [detailsEntry, setDetailsEntry] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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
      localDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), // Use datetime-local format
    }
  });

  // Watch the timestamp field to update selectedDate when it changes
  const watchedTimestamp = watch("localDateTime");
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
        localDateTime: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
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
    { date: getStartOfDay(selectedDate) },
    { enabled: !!session }
  );


  const onSubmit = (data: FoodFormData) => {
    // Convert local time to UTC for storage using shared utility
    const localDateTime = convertLocalToUTCForStorage(data.localDateTime);
    
    // If no image is provided, description is required
    // If image is provided, description can be empty (AI will generate it)
    const description = data.description?.trim() || undefined;
    
    createMacroEntry.mutate({
      description: description,
      localDateTime: localDateTime, // Use the converted date
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
        acc.water += entry.calculatedMacros.water || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 }
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
              Describe your meal or take a photo, and our AI will calculate the macros for you
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-red-800 font-medium">Macro Calculation Error</p>
                      <p className="text-sm text-red-700 mt-1">{createMacroEntry.error.message}</p>
                      {createMacroEntry.error.message.includes("limit") && (
                        <p className="text-xs text-red-600 mt-2">
                          💡 Consider upgrading your plan for unlimited AI calculations
                        </p>
                      )}
                      {createMacroEntry.error.message.includes("detailed description") && (
                        <p className="text-xs text-red-600 mt-2">
                          💡 Try adding more details like portion size, cooking method, or ingredients
                        </p>
                      )}
                      {createMacroEntry.error.message.includes("network") && (
                        <p className="text-xs text-red-600 mt-2">
                          💡 Check your internet connection and try again
                        </p>
                      )}
                      {createMacroEntry.error.message.includes("timeout") && (
                        <p className="text-xs text-red-600 mt-2">
                          💡 Try a shorter, more concise description
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="localDateTime">Date and Time</Label>
                <Input
                  {...register("localDateTime", { required: "Date and time are required" })}
                  type="datetime-local"
                  id="localDateTime"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.localDateTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.localDateTime.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  You can log meals for any date and time, not just today
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Meal Description {uploadedImageUrl && <span className="text-gray-500 font-normal">(Optional when photo is provided)</span>}
                </Label>
                <Textarea
                  id="description"
                  placeholder={uploadedImageUrl ? "Optional: Add details about your meal, or let AI analyze the photo" : "e.g., Grilled chicken breast with rice and broccoli, medium portion"}
                  {...register("description", { 
                    required: !uploadedImageUrl ? "Please describe your meal or upload a photo" : false 
                  })}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm">{errors.description.message}</p>
                )}
                {uploadedImageUrl && (
                  <p className="text-xs text-gray-500">
                    💡 With a photo, AI can analyze your meal automatically. Adding a description helps improve accuracy.
                  </p>
                )}
              </div>

              {/* Image Upload */}
              <ImageUpload
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                currentImage={uploadedImageUrl}
                label="Food Photo "
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
              <div className="grid grid-cols-3 gap-4">
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
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-600">{Math.round(totalMacros.water)}ml</div>
                  <div className="text-sm text-gray-600">Water</div>
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
                                {format(convertUTCToLocalDisplay(entry.localDateTime), "h:mm a")}
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
                        <div className="space-y-2">
                          <div className="grid grid-cols-5 gap-2 mt-2 text-sm">
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
                            <div className="text-center bg-cyan-50 p-2 rounded">
                              <div className="font-medium text-cyan-700">
                                {Math.round(entry.calculatedMacros.water || 0)}ml
                              </div>
                              <div className="text-xs text-cyan-600">water</div>
                            </div>
                          </div>
                          
                          {/* Details Button */}
                          {entry.calculationExplanation && (
                            <div className="flex justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDetailsEntry(entry);
                                  setIsDetailsModalOpen(true);
                                }}
                                className="text-xs"
                              >
                                <Info className="h-3 w-3 mr-1" />
                                View Calculation Details
                              </Button>
                            </div>
                          )}
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

      {/* Macro Details Modal */}
      <MacroDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setDetailsEntry(null);
        }}
        macros={detailsEntry?.calculatedMacros}
        explanations={detailsEntry?.calculationExplanation}
        description={detailsEntry?.description || ""}
      />
    </div>
  );
} 