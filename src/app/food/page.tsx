"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
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
import { Edit, Trash2, Bookmark, X, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage, getStartOfDay } from "@/utils/dateUtils";
import { MacroDetailsModal } from "@/components/ui/macro-details-modal";
import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useTranslations } from "@/utils/useTranslations";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { useDateLocale } from "@/utils/useDateLocale";
import { formatDate } from "@/utils/formatDate";

interface FoodFormData {
  description?: string;
  localDateTime: string; // Single field for datetime-local input
}

export default function FoodPage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations("food");
  const { t: tCommon } = useTranslations("common");
  const dateLocale = useDateLocale();
  
  // Get date from URL parameter or default to today
  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();
  
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>();
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [detailsEntry, setDetailsEntry] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [savingEntry, setSavingEntry] = useState<any>(null);
  const [isSaveMealModalOpen, setIsSaveMealModalOpen] = useState(false);
  const [mealName, setMealName] = useState("");
  const [processingSavedMealId, setProcessingSavedMealId] = useState<string | null>(null);
  const [isSavedMealsExpanded, setIsSavedMealsExpanded] = useState(false);

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
      localDateTime: dateParam ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
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
      setSuccessMessage(t("successMessage")); // "Your meal has been logged and macros calculated."
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

  const saveMeal = api.macros.saveMeal.useMutation({
    onSuccess: () => {
      utils.macros.getSavedMeals.invalidate();
      setIsSaveMealModalOpen(false);
      setSavingEntry(null);
      setMealName("");
      setSuccessMessage(t("mealSaved")); // "Meal saved successfully"
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Failed to save meal:", error);
    },
  });

  const { data: savedMeals = [] } = api.macros.getSavedMeals.useQuery(
    undefined,
    { enabled: !!session }
  );

  const deleteSavedMeal = api.macros.deleteSavedMeal.useMutation({
    onSuccess: () => {
      utils.macros.getSavedMeals.invalidate();
    },
    onError: (error) => {
      console.error("Failed to delete saved meal:", error);
    },
  });

  const createFromSavedMeal = api.macros.createFromSavedMeal.useMutation({
    onSuccess: () => {
      utils.macros.getToday.invalidate();
      setProcessingSavedMealId(null);
      setSuccessMessage(t("mealLogged")); // Need to add this translation
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Failed to create entry from saved meal:", error);
      setProcessingSavedMealId(null);
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

  const handleSaveMeal = (entry: any) => {
    setSavingEntry(entry);
    setIsSaveMealModalOpen(true);
  };

  const handleSaveMealSubmit = () => {
    if (!mealName.trim() || !savingEntry) return;
    saveMeal.mutate({
      entryId: savingEntry.id,
      name: mealName.trim(),
    });
  };

  const handleUseSavedMeal = (savedMeal: any) => {
    if (processingSavedMealId || createFromSavedMeal.isLoading) return;
    
    setProcessingSavedMealId(savedMeal.id);
    const currentDateTime = format(selectedDate, "yyyy-MM-dd'T'HH:mm");
    const localDateTime = convertLocalToUTCForStorage(currentDateTime);
    
    createFromSavedMeal.mutate({
      savedMealId: savedMeal.id,
      localDateTime: localDateTime,
    });
  };

  const handleDeleteSavedMeal = (savedMealId: string) => {
    if (window.confirm(t("confirmDeleteSavedMeal"))) {
      deleteSavedMeal.mutate({ id: savedMealId });
    }
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{tCommon("loading")}</div>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("title")}</h1>
            <p className="text-gray-600">
              {formatDate(selectedDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })}
              {!isToday && <span className="ml-2 text-amber-600 font-medium">{tCommon("pastDate")}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {tCommon("backToDashboard")}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Add New Meal Form */}
          <Card>
          <CardHeader>
            <CardTitle>{t("addNewMeal")}</CardTitle>
            <CardDescription>
              {t("addNewMealDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Success Display */}
              {showSuccess && (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="text-green-600 text-sm">
                    <strong>{tCommon("success")}</strong> {successMessage}
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
                      <p className="text-sm text-red-800 font-medium">{t("macroCalculationError")}</p>
                      <p className="text-sm text-red-700 mt-1">{createMacroEntry.error.message}</p>
                      {createMacroEntry.error.message.includes("limit") && (
                        <p className="text-xs text-red-600 mt-2">
                          {t("limitReachedHint")}
                        </p>
                      )}
                      {createMacroEntry.error.message.includes("detailed description") && (
                        <p className="text-xs text-red-600 mt-2">
                          {t("detailedDescriptionHint")}
                        </p>
                      )}
                      {createMacroEntry.error.message.includes("network") && (
                        <p className="text-xs text-red-600 mt-2">
                          {t("networkHint")}
                        </p>
                      )}
                      {createMacroEntry.error.message.includes("timeout") && (
                        <p className="text-xs text-red-600 mt-2">
                          {t("timeoutHint")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="localDateTime">{t("dateAndTime")}</Label>
                <Input
                  {...register("localDateTime", { required: t("dateAndTimeRequired") })}
                  type="datetime-local"
                  id="localDateTime"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.localDateTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.localDateTime.message}</p>
                )}
                <p className="text-xs text-gray-500">
                  {t("dateAndTimeHint")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  {t("mealDescription")} {uploadedImageUrl && <span className="text-gray-500 font-normal">{t("mealDescriptionOptional")}</span>}
                </Label>
                <Textarea
                  id="description"
                  placeholder={uploadedImageUrl ? t("mealDescriptionPlaceholderWithPhoto") : t("mealDescriptionPlaceholder")}
                  {...register("description", { 
                    required: !uploadedImageUrl ? t("mealDescriptionRequired") : false 
                  })}
                />
                {errors.description && (
                  <p className="text-red-500 text-sm">{errors.description.message}</p>
                )}
                {uploadedImageUrl && (
                  <p className="text-xs text-gray-500">
                    {t("photoHint")}
                  </p>
                )}
              </div>

              {/* Image Upload */}
              <ImageUpload
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                currentImage={uploadedImageUrl}
                label={t("foodPhoto") + " "}
                disabled={createMacroEntry.isLoading}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createMacroEntry.isLoading}
              >
                {createMacroEntry.isLoading ? t("addingMeal") : t("addMeal")}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Saved Meals Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("savedMeals")}</CardTitle>
                <CardDescription>
                  {savedMeals.length === 0 
                    ? t("noSavedMeals").split(".")[0]
                    : `${savedMeals.length} ${savedMeals.length === 1 ? t("savedMealSingular") : t("savedMealsPlural")}`
                  }
                </CardDescription>
              </div>
              {savedMeals.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSavedMealsExpanded(!isSavedMealsExpanded)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  {isSavedMealsExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      {tCommon("hide")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      {tCommon("show")}
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          {isSavedMealsExpanded && savedMeals.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {savedMeals.map((savedMeal: any) => {
                  const isProcessing = processingSavedMealId === savedMeal.id && createFromSavedMeal.isLoading;
                  return (
                  <div
                    key={savedMeal.id}
                    className={`border rounded-lg p-3 transition-colors ${
                      isProcessing 
                        ? "bg-gray-100 cursor-wait opacity-60" 
                        : "hover:bg-gray-50 cursor-pointer"
                    }`}
                    onClick={() => !isProcessing && handleUseSavedMeal(savedMeal)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{savedMeal.name}</p>
                              {isProcessing && (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{savedMeal.description}</p>
                            {isProcessing && (
                              <p className="text-xs text-blue-600 mt-1">{t("creatingEntry")}</p>
                            )}
                          </div>
                          {savedMeal.imageUrl && (
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                              <Image
                                src={savedMeal.imageUrl}
                                alt={savedMeal.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSavedMeal(savedMeal.id);
                        }}
                        className="ml-2"
                        title={t("deleteSavedMeal")}
                        disabled={isProcessing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    {savedMeal.calculatedMacros && (
                      <div className="grid grid-cols-5 gap-2 mt-2 text-xs">
                        <div className="text-center bg-blue-50 p-1.5 rounded">
                          <div className="font-medium text-blue-700">
                            {Math.round(savedMeal.calculatedMacros.calories)}
                          </div>
                          <div className="text-blue-600">{t("cal")}</div>
                        </div>
                        <div className="text-center bg-green-50 p-1.5 rounded">
                          <div className="font-medium text-green-700">
                            {Math.round(savedMeal.calculatedMacros.protein)}g
                          </div>
                          <div className="text-green-600">{t("protein").toLowerCase()}</div>
                        </div>
                        <div className="text-center bg-yellow-50 p-1.5 rounded">
                          <div className="font-medium text-yellow-700">
                            {Math.round(savedMeal.calculatedMacros.carbs)}g
                          </div>
                          <div className="text-yellow-600">{t("carbs").toLowerCase()}</div>
                        </div>
                        <div className="text-center bg-red-50 p-1.5 rounded">
                          <div className="font-medium text-red-700">
                            {Math.round(savedMeal.calculatedMacros.fat)}g
                          </div>
                          <div className="text-red-600">{t("fat").toLowerCase()}</div>
                        </div>
                        <div className="text-center bg-cyan-50 p-1.5 rounded">
                          <div className="font-medium text-cyan-700">
                            {Math.round(savedMeal.calculatedMacros.water || 0)}ml
                          </div>
                          <div className="text-cyan-600">{t("water").toLowerCase()}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
        </div>

        {/* Right Column - Day's Summary */}
        <div className="space-y-6">
          {/* Macro Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isToday ? t("todaysMacros") : t("macrosForDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
              </CardTitle>
              <CardDescription>{t("totalNutrition")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{Math.round(totalMacros.calories)}</div>
                  <div className="text-sm text-gray-600">{t("calories")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{Math.round(totalMacros.protein)}g</div>
                  <div className="text-sm text-gray-600">{t("protein")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{Math.round(totalMacros.carbs)}g</div>
                  <div className="text-sm text-gray-600">{t("carbs")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{Math.round(totalMacros.fat)}g</div>
                  <div className="text-sm text-gray-600">{t("fat")}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-600">{Math.round(totalMacros.water)}ml</div>
                  <div className="text-sm text-gray-600">{t("water")}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Day's Meals */}
          <Card>
            <CardHeader>
              <CardTitle>
                {isToday ? t("todaysMeals") : t("mealsForDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}{" "}
                {t("mealsCount", { count: dayMacros.length })}
              </CardTitle>
              <CardDescription>{t("yourFoodEntries")}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-gray-500">{tCommon("loading")}</p>
              ) : dayMacros.length === 0 ? (
                <p className="text-gray-500">{t("noMealsLogged")}</p>
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
                                {formatDate(convertUTCToLocalDisplay(entry.localDateTime), "h:mm a", { locale: dateLocale })}
                              </p>
                            </div>
                            {/* Display image if available */}
                            {entry.imageUrl && (
                              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                <Image
                                  src={entry.imageUrl}
                                  alt={t("mealPhoto")}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Edit/Save buttons */}
                        <div className="flex gap-1 ml-2">
                          {entry.calculatedMacros && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveMeal(entry)}
                              title={t("saveMeal")}
                            >
                              <Bookmark className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditEntry(entry)}
                            title={tCommon("edit")}
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
                              <div className="text-xs text-blue-600">{t("cal")}</div>
                            </div>
                            <div className="text-center bg-green-50 p-2 rounded">
                              <div className="font-medium text-green-700">
                                {Math.round(entry.calculatedMacros.protein)}g
                              </div>
                              <div className="text-xs text-green-600">{t("protein").toLowerCase()}</div>
                            </div>
                            <div className="text-center bg-yellow-50 p-2 rounded">
                              <div className="font-medium text-yellow-700">
                                {Math.round(entry.calculatedMacros.carbs)}g
                              </div>
                              <div className="text-xs text-yellow-600">{t("carbs").toLowerCase()}</div>
                            </div>
                            <div className="text-center bg-red-50 p-2 rounded">
                              <div className="font-medium text-red-700">
                                {Math.round(entry.calculatedMacros.fat)}g
                              </div>
                              <div className="text-xs text-red-600">{t("fat").toLowerCase()}</div>
                            </div>
                            <div className="text-center bg-cyan-50 p-2 rounded">
                              <div className="font-medium text-cyan-700">
                                {Math.round(entry.calculatedMacros.water || 0)}ml
                              </div>
                              <div className="text-xs text-cyan-600">{t("water").toLowerCase()}</div>
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
                                {t("viewCalculationDetails")}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">
                          {t("macrosInProgress")}
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

      {/* Save Meal Dialog */}
      <Dialog open={isSaveMealModalOpen} onOpenChange={setIsSaveMealModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saveMealAs")}</DialogTitle>
            <DialogDescription>
              {savingEntry?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mealName">{t("mealName")}</Label>
              <Input
                id="mealName"
                placeholder={t("mealNamePlaceholder")}
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && mealName.trim()) {
                    handleSaveMealSubmit();
                  }
                }}
              />
              {saveMeal.error && (
                <p className="text-red-500 text-sm">{saveMeal.error.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSaveMealModalOpen(false);
                setMealName("");
                setSavingEntry(null);
              }}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              onClick={handleSaveMealSubmit}
              disabled={!mealName.trim() || saveMeal.isLoading}
            >
              {saveMeal.isLoading ? t("savingMeal") : t("saveMeal")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 