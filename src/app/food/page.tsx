"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { EditEntryModal } from "@/components/ui/edit-entry-modal";
import { format } from "date-fns";
import {
  Edit,
  Bookmark,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import Image from "next/image";
import {
  convertUTCToLocalDisplay,
  convertLocalToUTCForStorage,
  getStartOfDay,
} from "@/utils/dateUtils";
import { MacroDetailsModal } from "@/components/ui/macro-details-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const dateParam = searchParams.get("date");
  const initialDate = dateParam ? new Date(dateParam + "T00:00:00") : new Date();

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
  const [processingSavedMealId, setProcessingSavedMealId] = useState<string | null>(
    null,
  );
  const [isSavedMealsExpanded, setIsSavedMealsExpanded] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<FoodFormData>({
    defaultValues: {
      localDateTime: dateParam
        ? format(initialDate, "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
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
      setUploadedImageUrl(undefined);
      utils.macros.getToday.invalidate();
      setSuccessMessage(t("successMessage"));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
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
      setSuccessMessage(t("mealSaved"));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    },
    onError: (error) => {
      console.error("Failed to save meal:", error);
    },
  });

  const { data: savedMeals = [] } = api.macros.getSavedMeals.useQuery(undefined, {
    enabled: !!session,
  });

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
      setSuccessMessage(t("mealLogged"));
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
    { enabled: !!session },
  );

  const onSubmit = (data: FoodFormData) => {
    const localDateTime = convertLocalToUTCForStorage(data.localDateTime);
    const description = data.description?.trim() || undefined;

    createMacroEntry.mutate({
      description: description,
      localDateTime: localDateTime,
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
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-16">
        <p className="text-muted italic font-display">{tCommon("loading")}</p>
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
    { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 },
  );

  const isToday =
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 md:py-14">
        {/* Page header */}
        <header className="flex flex-wrap items-end justify-between gap-6 pb-7 border-b border-hairline">
          <div>
            <p className="text-micro text-muted mb-3">{t("kicker")}</p>
            <h1 className="font-display text-h1 leading-[1] tracking-tight">
              {t("logA")}{" "}
              <em className="text-iron not-italic font-display italic">
                {t("mealAccent")}
              </em>
            </h1>
            <p className="mt-3 text-sm text-muted max-w-xl">
              {t("addNewMealDesc")}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-2 tnum hidden md:inline">
              {formatDate(selectedDate, "EEE, MMM d", { locale: dateLocale })}
              {!isToday && (
                <span className="ml-2 text-iron">{tCommon("pastDate")}</span>
              )}
            </span>
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {tCommon("backToDashboard")}
            </Button>
          </div>
        </header>

        {/* Success banner */}
        {showSuccess && (
          <div className="mt-6 border border-hairline bg-surface px-4 py-3 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-iron mt-0.5 shrink-0" strokeWidth={1.5} />
            <div>
              <div className="text-micro text-iron">{t("aiEstimate")}</div>
              <p className="text-sm text-ink mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Two-column layout */}
        <div className="mt-10 grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* LEFT — Log form + Today's meals */}
          <div>
            {/* Form */}
            <section>
              <div className="flex items-baseline justify-between pb-3 border-b border-hairline">
                <h2 className="font-display text-h2">{t("addNewMeal")}</h2>
                <span className="font-mono text-xs text-muted-2 tnum">
                  {formatDate(selectedDate, "yyyy-MM-dd HH:mm", {
                    locale: dateLocale,
                  })}
                </span>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-6">
                {/* Error banner */}
                {createMacroEntry.error && (
                  <div className="border border-hairline bg-surface px-4 py-3 flex items-start gap-3">
                    <AlertCircle
                      className="h-4 w-4 text-iron mt-0.5 shrink-0"
                      strokeWidth={1.5}
                    />
                    <div className="flex-1">
                      <div className="text-micro text-iron">
                        {t("macroCalculationError")}
                      </div>
                      <p className="text-sm text-ink mt-1">
                        {createMacroEntry.error.message}
                      </p>
                      {createMacroEntry.error.message.includes("limit") && (
                        <p className="text-xs text-muted mt-2">
                          {t("limitReachedHint")}
                        </p>
                      )}
                      {createMacroEntry.error.message.includes(
                        "detailed description",
                      ) && (
                        <p className="text-xs text-muted mt-2">
                          {t("detailedDescriptionHint")}
                        </p>
                      )}
                      {createMacroEntry.error.message.includes("network") && (
                        <p className="text-xs text-muted mt-2">{t("networkHint")}</p>
                      )}
                      {createMacroEntry.error.message.includes("timeout") && (
                        <p className="text-xs text-muted mt-2">{t("timeoutHint")}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("mealDescription")}{" "}
                    {uploadedImageUrl && (
                      <span className="normal-case tracking-normal text-muted-2 font-normal">
                        {t("mealDescriptionOptional")}
                      </span>
                    )}
                  </Label>
                  <Textarea
                    id="description"
                    rows={3}
                    placeholder={
                      uploadedImageUrl
                        ? t("mealDescriptionPlaceholderWithPhoto")
                        : t("mealDescriptionPlaceholder")
                    }
                    {...register("description", {
                      required: !uploadedImageUrl
                        ? t("mealDescriptionRequired")
                        : false,
                    })}
                  />
                  {errors.description && (
                    <p className="text-xs text-iron">{errors.description.message}</p>
                  )}
                  <p className="text-xs text-muted">
                    {uploadedImageUrl ? t("photoHint") : t("descriptionHint")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="localDateTime">{t("dateAndTime")}</Label>
                  <Input
                    {...register("localDateTime", {
                      required: t("dateAndTimeRequired"),
                    })}
                    type="datetime-local"
                    id="localDateTime"
                    className="font-mono tnum"
                  />
                  {errors.localDateTime && (
                    <p className="text-xs text-iron">{errors.localDateTime.message}</p>
                  )}
                  <p className="text-xs text-muted">{t("dateAndTimeHint")}</p>
                </div>

                {/* Image Upload (component owned by 2I) */}
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  onImageRemove={handleImageRemove}
                  currentImage={uploadedImageUrl}
                  label={t("foodPhoto") + " "}
                  disabled={createMacroEntry.isLoading}
                />

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={createMacroEntry.isLoading}
                  >
                    {createMacroEntry.isLoading ? t("addingMeal") : t("addMeal")}
                  </Button>
                </div>
              </form>
            </section>

            {/* Day's meals — typographic list */}
            <section className="mt-14">
              <div className="flex items-baseline justify-between pb-3 border-b border-hairline">
                <h2 className="font-display text-h2">
                  {isToday
                    ? t("todaysMeals")
                    : t("mealsForDate", {
                        date: formatDate(selectedDate, "MMM d", {
                          locale: dateLocale,
                        }),
                      })}
                </h2>
                <span className="font-mono text-xs text-muted-2 tnum">
                  {t("mealsCount", { count: dayMacros.length })}
                </span>
              </div>

              {isLoading ? (
                <p className="mt-6 font-display italic text-muted">
                  {tCommon("loading")}
                </p>
              ) : dayMacros.length === 0 ? (
                <p className="mt-6 font-display italic text-muted">
                  {t("noMealsLogged")}
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-hairline">
                  {dayMacros.map((entry) => (
                    <li key={entry.id} className="py-5">
                      <div className="flex items-start gap-4">
                        {/* Time */}
                        <div className="font-mono text-xs text-muted tnum w-14 shrink-0 pt-0.5">
                          {formatDate(
                            convertUTCToLocalDisplay(entry.localDateTime),
                            "HH:mm",
                            { locale: dateLocale },
                          )}
                        </div>

                        {/* Name + description */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-medium text-ink leading-snug">
                            {entry.description || t("untitledMeal")}
                          </p>
                          {entry.calculatedMacros ? (
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted-2 tnum">
                              <span>
                                <b className="text-ink font-medium">
                                  {Math.round(entry.calculatedMacros.protein)}
                                </b>
                                <span className="ml-0.5">{t("proteinShort")}</span>
                              </span>
                              <span>
                                <b className="text-ink font-medium">
                                  {Math.round(entry.calculatedMacros.carbs)}
                                </b>
                                <span className="ml-0.5">{t("carbsShort")}</span>
                              </span>
                              <span>
                                <b className="text-ink font-medium">
                                  {Math.round(entry.calculatedMacros.fat)}
                                </b>
                                <span className="ml-0.5">{t("fatShort")}</span>
                              </span>
                              <span>
                                <b className="text-ink font-medium">
                                  {Math.round(entry.calculatedMacros.water || 0)}
                                </b>
                                <span className="ml-0.5">ml</span>
                              </span>
                            </div>
                          ) : (
                            <p className="mt-1 font-display italic text-xs text-muted">
                              {t("macrosInProgress")}
                            </p>
                          )}

                          {/* AI explanation — editorial quote */}
                          {entry.calculatedMacros &&
                            entry.calculationExplanation && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDetailsEntry(entry);
                                  setIsDetailsModalOpen(true);
                                }}
                                className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
                              >
                                <Info className="h-3 w-3" strokeWidth={1.5} />
                                {t("viewCalculationDetails")}
                              </button>
                            )}
                        </div>

                        {/* Image */}
                        {entry.imageUrl && (
                          <div className="relative w-14 h-14 overflow-hidden border border-hairline shrink-0">
                            <Image
                              src={entry.imageUrl}
                              alt={t("mealPhoto")}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}

                        {/* Kcal */}
                        {entry.calculatedMacros && (
                          <div className="text-right shrink-0 w-20">
                            <div className="font-mono text-[15px] tnum text-ink">
                              {Math.round(entry.calculatedMacros.calories)}
                            </div>
                            <div className="font-mono text-[10px] text-muted-2 mt-0.5">
                              kcal
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-0.5 shrink-0">
                          {entry.calculatedMacros && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleSaveMeal(entry)}
                              title={t("saveMeal")}
                              className="h-8 w-8"
                            >
                              <Bookmark className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditEntry(entry)}
                            title={tCommon("edit")}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* RIGHT — Day's totals + Saved meals */}
          <div>
            {/* Totals panel — editorial */}
            <section>
              <div className="flex items-baseline justify-between pb-3 border-b border-hairline">
                <h2 className="font-display text-h2">
                  {isToday
                    ? t("todaysMacros")
                    : t("macrosForDate", {
                        date: formatDate(selectedDate, "MMM d", {
                          locale: dateLocale,
                        }),
                      })}
                </h2>
                <span className="font-mono text-xs text-muted-2 tnum">
                  {t("totalNutrition")}
                </span>
              </div>

              <div className="mt-6 border border-hairline bg-surface p-6 md:p-8">
                {/* Big numbers: kcal + water */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <div>
                    <div className="text-micro text-muted mb-2">
                      {t("calories")}
                    </div>
                    <div className="font-display tnum text-data-xl leading-none text-ink">
                      {Math.round(totalMacros.calories).toLocaleString()}
                      <span className="ml-1.5 font-sans text-sm text-muted font-normal">
                        kcal
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-micro text-muted mb-2">{t("water")}</div>
                    <div className="font-display tnum text-data-xl leading-none text-ink">
                      {Math.round(totalMacros.water).toLocaleString()}
                      <span className="ml-1.5 font-sans text-sm text-muted font-normal">
                        ml
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-hairline my-6" />

                {/* Macros mono row */}
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-micro text-muted mb-2">{t("protein")}</div>
                    <div className="font-mono tnum text-[18px] text-ink">
                      {Math.round(totalMacros.protein)}
                      <span className="ml-1 text-sm text-muted">g</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-micro text-muted mb-2">{t("carbs")}</div>
                    <div className="font-mono tnum text-[18px] text-ink">
                      {Math.round(totalMacros.carbs)}
                      <span className="ml-1 text-sm text-muted">g</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-micro text-muted mb-2">{t("fat")}</div>
                    <div className="font-mono tnum text-[18px] text-ink">
                      {Math.round(totalMacros.fat)}
                      <span className="ml-1 text-sm text-muted">g</span>
                    </div>
                  </div>
                </div>

                {/* AI footnote */}
                <p className="mt-6 font-display italic text-xs text-muted leading-relaxed">
                  {t("aiEstimateFootnote")}
                </p>
              </div>
            </section>

            {/* Saved meals — typographic list */}
            <section className="mt-14">
              <div className="flex items-baseline justify-between pb-3 border-b border-hairline">
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-h2">{t("savedMeals")}</h2>
                  <span className="font-mono text-xs text-muted-2 tnum">
                    {savedMeals.length === 0
                      ? t("noSavedMealsShort")
                      : `${savedMeals.length} ${
                          savedMeals.length === 1
                            ? t("savedMealSingular")
                            : t("savedMealsPlural")
                        }`}
                  </span>
                </div>
                {savedMeals.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSavedMealsExpanded(!isSavedMealsExpanded)}
                  >
                    {isSavedMealsExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" strokeWidth={1.5} />
                        {tCommon("hide")}
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" strokeWidth={1.5} />
                        {tCommon("show")}
                      </>
                    )}
                  </Button>
                )}
              </div>

              {savedMeals.length === 0 ? (
                <p className="mt-6 font-display italic text-muted">
                  {t("noSavedMeals")}
                </p>
              ) : (
                isSavedMealsExpanded && (
                  <ul className="mt-2 divide-y divide-hairline">
                    {savedMeals.map((savedMeal: any) => {
                      const isProcessing =
                        processingSavedMealId === savedMeal.id &&
                        createFromSavedMeal.isLoading;
                      return (
                        <li
                          key={savedMeal.id}
                          className={`py-4 transition-colors ${
                            isProcessing
                              ? "opacity-60 cursor-wait"
                              : "hover:bg-paper-2 cursor-pointer"
                          }`}
                          onClick={() =>
                            !isProcessing && handleUseSavedMeal(savedMeal)
                          }
                        >
                          <div className="flex items-start gap-4 px-1">
                            {/* Name + description */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-[15px] font-medium text-ink leading-snug truncate">
                                  {savedMeal.name}
                                </p>
                                {isProcessing && (
                                  <Loader2
                                    className="h-3.5 w-3.5 animate-spin text-muted"
                                    strokeWidth={1.5}
                                  />
                                )}
                              </div>
                              {savedMeal.description && (
                                <p className="mt-0.5 text-xs text-muted truncate">
                                  {savedMeal.description}
                                </p>
                              )}
                              {savedMeal.calculatedMacros && (
                                <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted-2 tnum">
                                  <span>
                                    <b className="text-ink font-medium">
                                      {Math.round(
                                        savedMeal.calculatedMacros.protein,
                                      )}
                                    </b>
                                    <span className="ml-0.5">
                                      {t("proteinShort")}
                                    </span>
                                  </span>
                                  <span>
                                    <b className="text-ink font-medium">
                                      {Math.round(savedMeal.calculatedMacros.carbs)}
                                    </b>
                                    <span className="ml-0.5">{t("carbsShort")}</span>
                                  </span>
                                  <span>
                                    <b className="text-ink font-medium">
                                      {Math.round(savedMeal.calculatedMacros.fat)}
                                    </b>
                                    <span className="ml-0.5">{t("fatShort")}</span>
                                  </span>
                                </div>
                              )}
                              {isProcessing && (
                                <p className="mt-1 font-display italic text-xs text-muted">
                                  {t("creatingEntry")}
                                </p>
                              )}
                            </div>

                            {/* Image */}
                            {savedMeal.imageUrl && (
                              <div className="relative w-12 h-12 overflow-hidden border border-hairline shrink-0">
                                <Image
                                  src={savedMeal.imageUrl}
                                  alt={savedMeal.name}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}

                            {/* Kcal */}
                            {savedMeal.calculatedMacros && (
                              <div className="text-right shrink-0 w-20">
                                <div className="font-mono text-[15px] tnum text-ink">
                                  {Math.round(savedMeal.calculatedMacros.calories)}
                                </div>
                                <div className="font-mono text-[10px] text-muted-2 mt-0.5">
                                  kcal
                                </div>
                              </div>
                            )}

                            {/* Delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSavedMeal(savedMeal.id);
                              }}
                              title={t("deleteSavedMeal")}
                              disabled={isProcessing}
                              className="h-8 w-8 shrink-0"
                            >
                              <X className="h-4 w-4" strokeWidth={1.5} />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )
              )}
            </section>
          </div>
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
            <DialogDescription>{savingEntry?.description}</DialogDescription>
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
                <p className="text-xs text-iron">{saveMeal.error.message}</p>
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
              variant="iron"
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
