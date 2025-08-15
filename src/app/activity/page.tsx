"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Activity, Edit, Trash2, Clock, Flame } from "lucide-react";
import { ActivityEditModal } from "@/components/ui/activity-edit-modal";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage, getStartOfDay } from "@/utils/dateUtils";

interface ActivityFormData {
  activityType: string;
  description: string;
  duration: string;
  intensity: "low" | "moderate" | "high";
  localDateTime: string; // Single field for datetime-local input
  notes?: string;
  caloriesBurned?: string;
}

export default function ActivityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get date from URL parameter or default to today
  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();
  
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showSuccess, setShowSuccess] = useState(false);
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

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<ActivityFormData>({
    defaultValues: {
      localDateTime: dateParam ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      intensity: "moderate",
      activityType: "Weight Training",
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
  
  // Get available activity types
  const { data: activityTypes = [] } = api.activity.getActivityTypes.useQuery(
    undefined,
    { enabled: !!session }
  );

  const createActivityEntry = api.activity.create.useMutation({
    onSuccess: () => {
      reset({
        activityType: "",
        description: "",
        duration: "",
        intensity: "moderate",
        localDateTime: format(selectedDate, "yyyy-MM-dd'T'HH:mm"), // Reset timestamp to current date
        notes: "",
        caloriesBurned: "",
      });
      utils.activity.getToday.invalidate();
      utils.activity.getDailyCalorieBalance.invalidate();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Failed to create activity entry:", error);
    },
  });

  const updateActivityEntry = api.activity.update.useMutation({
    onSuccess: () => {
      utils.activity.getToday.invalidate();
      utils.activity.getDailyCalorieBalance.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to update activity entry:", error);
    },
  });

  const deleteActivityEntry = api.activity.delete.useMutation({
    onSuccess: () => {
      utils.activity.getToday.invalidate();
      utils.activity.getDailyCalorieBalance.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to delete activity entry:", error);
    },
  });

  const { data: dayActivities = [], isLoading } = api.activity.getToday.useQuery(
    { date: getStartOfDay(selectedDate) },
    { enabled: !!session }
  );

  const { data: calorieBalance } = api.activity.getDailyCalorieBalance.useQuery(
    { date: getStartOfDay(selectedDate) },
    { enabled: !!session }
  );

  const onSubmit = (data: ActivityFormData) => {
    // Convert local time to UTC for storage using shared utility
    const localDateTime = convertLocalToUTCForStorage(data.localDateTime);
    
    createActivityEntry.mutate({
      activityType: data.activityType,
      description: data.description,
      duration: parseInt(data.duration),
      intensity: data.intensity,
      localDateTime: localDateTime, // Use the converted timestamp
      notes: data.notes,
      caloriesBurned: data.caloriesBurned ? parseInt(data.caloriesBurned) : undefined,
    });
  };

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (data: any) => {
    updateActivityEntry.mutate(data);
  };

  const handleDeleteEntry = () => {
    if (editingEntry) {
      deleteActivityEntry.mutate({ id: editingEntry.id });
    }
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

  const totalCaloriesBurned = dayActivities.reduce((total: number, entry: any) => total + entry.caloriesBurned, 0);
  const totalDuration = dayActivities.reduce((total: number, entry: any) => total + entry.duration, 0);

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case "low": return "bg-green-100 text-green-800";
      case "moderate": return "bg-yellow-100 text-yellow-800";
      case "high": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Activity Tracking</h1>
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

      {/* Calorie Balance Card */}
      {calorieBalance && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flame className="h-4 w-4" />
              Daily Calorie Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">Consumed</div>
                  <div className="text-lg font-bold text-blue-600">{calorieBalance.caloriesConsumed}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">Burned</div>
                  <div className="text-lg font-bold text-orange-600">{calorieBalance.totalCaloriesBurned}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-600">Balance</div>
                  <div className={`text-lg font-bold ${calorieBalance.isDeficit ? 'text-green-600' : 'text-red-600'}`}>
                    {calorieBalance.isDeficit ? '-' : '+'}{Math.abs(calorieBalance.calorieBalance)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">
                  {calorieBalance.isDeficit ? "🎯 Deficit" : "⚠️ Surplus"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          Activity logged successfully! 🎉
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Log Activity Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Log Activity
            </CardTitle>
            <CardDescription>
              Track your physical activities and calories burned
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Date and Time */}
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
                  You can log activities for any date and time, not just today
                </p>
              </div>

              {/* Activity Type */}
              <div>
                <Label htmlFor="activityType">Activity Type</Label>
                <select
                  id="activityType"
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
                  id="description"
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
                    id="duration"
                    type="number"
                    min="1"
                    placeholder="30"
                    {...register("duration", { 
                      required: "Duration is required",
                      min: { value: 1, message: "Duration must be at least 1 minute" }
                    })}
                  />
                  {errors.duration && (
                    <p className="text-red-500 text-sm mt-1">{errors.duration.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="intensity">Intensity</Label>
                  <select
                    id="intensity"
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
                  id="notes"
                  placeholder="Any additional notes about your activity..."
                  {...register("notes")}
                />
              </div>

              {/* Calories Burned */}
              <div>
                <Label htmlFor="caloriesBurned">Calories Burned (optional)</Label>
                <Input
                  id="caloriesBurned"
                  type="number"
                  min="1"
                  placeholder="e.g., 300"
                  {...register("caloriesBurned", { 
                    min: { value: 1, message: "Calories must be at least 1" }
                  })}
                />
                {errors.caloriesBurned && (
                  <p className="text-red-500 text-sm mt-1">{errors.caloriesBurned.message}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Enter the calories burned from your fitness tracker or watch for more accuracy.
                  If left blank, it will be calculated based on your activity duration and intensity.
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createActivityEntry.isLoading}
              >
                {createActivityEntry.isLoading ? "Logging Activity..." : "Log Activity"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Activities Summary and List */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isToday ? "Today's" : format(selectedDate, "MMM d")} Activities
              </CardTitle>
              <CardDescription>Total activity summary</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{totalCaloriesBurned}</div>
                  <div className="text-sm text-gray-600">Calories Burned</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalDuration}</div>
                  <div className="text-sm text-gray-600">Minutes Active</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activities List */}
          <Card>
            <CardHeader>
              <CardTitle>Activities</CardTitle>
              <CardDescription>
                {dayActivities.length === 0 
                  ? "No activities logged yet" 
                  : `${dayActivities.length} activities logged`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">Loading activities...</div>
              ) : dayActivities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No activities logged for this day</p>
                  <p className="text-sm">Start by logging your first activity!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dayActivities.map((entry: any) => (
                    <div key={entry.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{entry.activityType}</h4>
                            <Badge className={getIntensityColor(entry.intensity)}>
                              {entry.intensity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{entry.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(convertUTCToLocalDisplay(entry.localDateTime), "h:mm a")}
                            </span>
                            <span>{entry.duration} min</span>
                            <span className="flex items-center gap-1">
                              <Flame className="h-3 w-3" />
                              {entry.caloriesBurned} cal
                              {entry.caloriesManuallyEntered && (
                                <span className="text-blue-600 font-medium">(tracker)</span>
                              )}
                            </span>
                          </div>
                          {entry.notes && (
                            <p className="text-xs text-gray-500 mt-1 italic">{entry.notes}</p>
                          )}
                        </div>
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <ActivityEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        entry={editingEntry}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEntry}
        activityTypes={activityTypes}
        isLoading={updateActivityEntry.isLoading || deleteActivityEntry.isLoading}
      />
    </div>
  );
} 