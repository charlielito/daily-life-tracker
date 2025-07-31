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
import { Edit } from "lucide-react";
import Image from "next/image";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage, getStartOfDay } from "@/utils/dateUtils";

interface HealthFormData {
  localDateTime: string; // Single field for datetime-local input
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

export default function HealthPage() {
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

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<HealthFormData>({
    defaultValues: {
      localDateTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), // Use datetime-local format
      consistency: "4",
      color: "Brown",
      painLevel: 0,
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
  
  const createHealthEntry = api.intestinal.create.useMutation({
    onSuccess: () => {
      reset({
        localDateTime: format(selectedDate, "yyyy-MM-dd'T'HH:mm"),
        consistency: "4",
        color: "Brown",
        painLevel: 0,
        notes: "",
      });
      setUploadedImageUrl(undefined); // Clear the uploaded image
      utils.intestinal.getToday.invalidate();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000); // Hide success message after 3 seconds
    },
    onError: (error) => {
      console.error("Failed to create health entry:", error);
    },
  });

  const updateHealthEntry = api.intestinal.update.useMutation({
    onSuccess: () => {
      utils.intestinal.getToday.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to update health entry:", error);
    },
  });

  const deleteHealthEntry = api.intestinal.delete.useMutation({
    onSuccess: () => {
      utils.intestinal.getToday.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to delete health entry:", error);
    },
  });

  const { data: dayEntries = [], isLoading } = api.intestinal.getToday.useQuery(
    { date: getStartOfDay(selectedDate) },
    { enabled: !!session }
  );

  const onSubmit = (data: HealthFormData) => {
    // Convert local time to UTC for storage using shared utility
    const localDateTime = convertLocalToUTCForStorage(data.localDateTime);
    
    createHealthEntry.mutate({
      localDateTime: localDateTime, // Use the converted timestamp
      consistency: data.consistency,
      color: data.color,
      painLevel: data.painLevel,
      notes: data.notes,
      imageUrl: uploadedImageUrl,
    });
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (data: any) => {
    updateHealthEntry.mutate(data);
  };

  const handleDeleteEntry = () => {
    if (editingEntry) {
      deleteHealthEntry.mutate({ id: editingEntry.id });
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

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Health Monitoring</h1>
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
        {/* Add New Health Entry Form */}
        <Card>
          <CardHeader>
            <CardTitle>Log Health Entry</CardTitle>
            <CardDescription>
              Track your intestinal health using the Bristol Stool Scale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Success Display */}
              {showSuccess && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-green-600 text-sm">
                    <strong>Success!</strong> Your health entry has been logged.
                  </p>
                </div>
              )}

              {/* Error Display */}
              {createHealthEntry.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-600 text-sm">
                    <strong>Error:</strong> {createHealthEntry.error.message}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="localDateTime" className="block text-sm font-medium text-gray-700 mb-1">
                    When did this occur?
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
                {errors.painLevel && (
                  <p className="text-red-500 text-sm">{errors.painLevel.message}</p>
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

              {/* Image Upload */}
              <ImageUpload
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                currentImage={uploadedImageUrl}
                label="Health Photo (Optional)"
                disabled={createHealthEntry.isLoading}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createHealthEntry.isLoading}
              >
                {createHealthEntry.isLoading ? "Saving entry..." : "Save Health Entry"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Day's Entries */}
        <div className="space-y-6">
          {/* Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isToday ? "Today's" : format(selectedDate, "MMM d")} Summary
              </CardTitle>
              <CardDescription>Health entries overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{dayEntries.length}</div>
                  <div className="text-sm text-gray-600">Total Entries</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {dayEntries.length > 0 
                      ? Math.round(dayEntries.reduce((sum, entry) => sum + entry.painLevel, 0) / dayEntries.length)
                      : 0
                    }
                  </div>
                  <div className="text-sm text-gray-600">Avg Pain Level</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day's Entries List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isToday ? "Today's" : format(selectedDate, "MMM d")} Entries ({dayEntries.length})
              </CardTitle>
              <CardDescription>Your health logs for this date</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-gray-500">Loading...</p>
              ) : dayEntries.length === 0 ? (
                <p className="text-gray-500">No health entries logged for this date</p>
              ) : (
                <div className="space-y-4">
                  {dayEntries.map((entry) => (
                    <div key={entry.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="font-medium">
                                Bristol Scale Type {entry.consistency}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(convertUTCToLocalDisplay(entry.localDateTime), "h:mm a")}
                              </p>
                            </div>
                            {/* Display image if available */}
                            {entry.imageUrl && (
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                <Image
                                  src={entry.imageUrl}
                                  alt="Health entry photo"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Edit button */}
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
                      
                      {/* Bristol Scale Description */}
                      <div className="text-xs text-gray-600 mb-2">
                        {BRISTOL_SCALE.find(scale => scale.value === entry.consistency)?.label}
                      </div>

                      {/* Health details */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-right">
                          <div className="text-sm font-medium">{entry.color}</div>
                          <div className="text-xs text-gray-500">
                            Pain: {entry.painLevel}/10
                          </div>
                        </div>
                      </div>

                      {/* Pain Level Indicator */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div 
                          className={`h-2 rounded-full ${
                            entry.painLevel <= 3 ? 'bg-green-500' :
                            entry.painLevel <= 6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${(entry.painLevel / 10) * 100}%` }}
                        ></div>
                      </div>

                      {entry.notes && (
                        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bristol Scale Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Bristol Stool Scale Reference</CardTitle>
              <CardDescription>Quick reference guide</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {BRISTOL_SCALE.slice(0, 4).map((scale) => (
                  <div key={scale.value} className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700 mr-2">
                      {scale.value}
                    </div>
                    <span className="text-gray-700">{scale.label.replace(`Type ${scale.value}: `, '')}</span>
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-2">
                  Types 3-4 are considered normal
                </div>
              </div>
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
        type="health"
        isLoading={updateHealthEntry.isLoading || deleteHealthEntry.isLoading}
        error={updateHealthEntry.error || deleteHealthEntry.error}
      />
    </div>
  );
} 