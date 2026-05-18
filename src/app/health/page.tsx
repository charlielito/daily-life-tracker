"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { api } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { EditEntryModal } from "@/components/ui/edit-entry-modal";
import { format } from "date-fns";
import { Edit, HeartPulse } from "lucide-react";
import Image from "next/image";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage, getStartOfDay } from "@/utils/dateUtils";
import { useTranslations } from "@/utils/useTranslations";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useDateLocale } from "@/utils/useDateLocale";
import { formatDate } from "@/utils/formatDate";

interface HealthFormData {
  localDateTime: string; // Single field for datetime-local input
  consistency: string;
  color: string;
  painLevel: number;
  notes?: string;
}

function getCommonColors(t: (key: string) => string) {
  return [
    { value: "Brown", label: t("colorBrown") },
    { value: "Light Brown", label: t("colorLightBrown") },
    { value: "Dark Brown", label: t("colorDarkBrown") },
    { value: "Yellow", label: t("colorYellow") },
    { value: "Green", label: t("colorGreen") },
    { value: "Red", label: t("colorRed") },
    { value: "Black", label: t("colorBlack") },
    { value: "Other", label: t("colorOther") },
  ];
}

function getBristolScale(t: (key: string) => string) {
  return [
    { value: "1", label: t("bristolType1"), short: t("bristolType1Short") },
    { value: "2", label: t("bristolType2"), short: t("bristolType2Short") },
    { value: "3", label: t("bristolType3"), short: t("bristolType3Short") },
    { value: "4", label: t("bristolType4"), short: t("bristolType4Short") },
    { value: "5", label: t("bristolType5"), short: t("bristolType5Short") },
    { value: "6", label: t("bristolType6"), short: t("bristolType6Short") },
    { value: "7", label: t("bristolType7"), short: t("bristolType7Short") },
  ];
}

export default function HealthPage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations("health");
  const { t: tCommon } = useTranslations("common");
  const dateLocale = useDateLocale();
  const BRISTOL_SCALE = getBristolScale(t);
  const COMMON_COLORS = getCommonColors(t);

  // Get date from URL parameter or default to today
  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();

  const [selectedDate, setSelectedDate] = useState(initialDate);
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
      localDateTime: dateParam ? format(initialDate, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
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

  const selectedConsistency = watch("consistency");
  const selectedPainLevel = Number(watch("painLevel") ?? 0);

  // Register consistency so we can drive it manually from card clicks
  const consistencyField = register("consistency", { required: t("selectConsistency") });

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
      <div className="min-h-screen bg-paper text-ink">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16 text-muted">{tCommon("loading")}</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isToday = format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  const avgPain = dayEntries.length > 0
    ? Math.round(dayEntries.reduce((sum, entry) => sum + entry.painLevel, 0) / dayEntries.length)
    : 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Header */}
      <header className="border-b border-hairline">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-muted" strokeWidth={1.5} />
            <span className="font-display text-xl tracking-tight">
              {t("title")}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {tCommon("backToDashboard")}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-20">
        {/* Page hero */}
        <div className="mb-12 md:mb-16 max-w-3xl">
          <p className="text-micro text-muted mb-4">{t("kicker")}</p>
          <h1 className="font-display text-h1 leading-[1.05] tracking-[-0.015em] mb-4">
            {t("hero")}
          </h1>
          <p className="text-muted leading-relaxed">
            {formatDate(selectedDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })}
            {!isToday && (
              <span className="ml-3 text-iron">{tCommon("pastDate")}</span>
            )}
          </p>
        </div>

        {/* Summary pillars */}
        <section className="border-t border-hairline grid grid-cols-2 md:grid-cols-3">
          <div className="border-b md:border-b-0 md:border-r border-hairline py-6 md:py-8 pr-6">
            <p className="text-micro text-muted mb-3">{t("totalEntries")}</p>
            <div className="font-display tnum text-data-xl leading-none">
              {dayEntries.length}
            </div>
            <p className="mt-3 text-sm text-muted">
              {isToday ? t("today") : formatDate(selectedDate, "MMM d", { locale: dateLocale })}
            </p>
          </div>
          <div className="border-b md:border-b-0 md:border-r border-hairline py-6 md:py-8 px-0 md:px-6">
            <p className="text-micro text-muted mb-3">{t("avgPainLevel")}</p>
            <div className="font-display tnum text-data-xl leading-none">
              {avgPain}
              <span className="font-sans text-muted-2 text-h3 ml-1">/10</span>
            </div>
            <p className="mt-3 text-sm text-muted">{t("acrossAllEntries")}</p>
          </div>
          <div className="col-span-2 md:col-span-1 py-6 md:py-8 px-0 md:px-6">
            <p className="text-micro text-muted mb-3">{t("mostCommonType")}</p>
            <div className="font-display tnum text-data-xl leading-none">
              {dayEntries.length > 0 ? mostCommonConsistency(dayEntries) : "—"}
            </div>
            <p className="mt-3 text-sm text-muted">{t("bristolType")}</p>
          </div>
        </section>

        <div className="mt-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16">
          {/* Add New Health Entry Form */}
          <section>
            <div className="mb-6">
              <p className="text-micro text-muted mb-2">{t("newEntry")}</p>
              <h2 className="font-display text-h2 mb-1">{t("logHealthEntry")}</h2>
              <p className="text-sm text-muted">{t("logHealthEntryDesc")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Success Display */}
              {showSuccess && (
                <div className="border border-hairline bg-paper-2 p-4">
                  <p className="text-sm text-ink">
                    <strong className="font-medium">{tCommon("success")}</strong> {t("successMessage")}
                  </p>
                </div>
              )}

              {/* Error Display */}
              {createHealthEntry.error && (
                <div className="border border-hairline-strong bg-iron-soft p-4">
                  <p className="text-sm text-iron">
                    <strong className="font-medium">{tCommon("error")}:</strong> {createHealthEntry.error.message}
                  </p>
                </div>
              )}

              {/* When */}
              <div className="space-y-2">
                <Label htmlFor="localDateTime" className="text-micro text-muted">
                  {t("whenOccurred")}
                </Label>
                <input
                  {...register("localDateTime", { required: t("dateAndTimeRequired") })}
                  type="datetime-local"
                  id="localDateTime"
                  className="flex h-10 w-full rounded border border-hairline bg-surface px-3.5 py-2 font-mono tnum text-sm text-ink focus:outline-none focus:border-ink"
                />
                {errors.localDateTime && (
                  <p className="text-xs text-iron mt-1">{errors.localDateTime.message}</p>
                )}
              </div>

              {/* Bristol Stool Scale — horizontal numbered sequence */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <Label className="text-micro text-muted">{t("bristolStoolScale")}</Label>
                  <span className="font-mono tnum text-xs text-muted-2">
                    {t("selected")}: {selectedConsistency}
                  </span>
                </div>
                {/* Hidden native input keeps RHF + native validation behaviour */}
                <input
                  type="hidden"
                  {...consistencyField}
                />
                <div className="grid grid-cols-7 gap-px bg-hairline border border-hairline">
                  {BRISTOL_SCALE.map((scale) => {
                    const isSelected = selectedConsistency === scale.value;
                    return (
                      <button
                        key={scale.value}
                        type="button"
                        onClick={() => setValue("consistency", scale.value, { shouldValidate: true })}
                        className={`group flex flex-col items-center justify-between p-3 transition-colors text-center ${
                          isSelected
                            ? "bg-iron-soft"
                            : "bg-surface hover:bg-paper-2"
                        }`}
                        aria-pressed={isSelected}
                        aria-label={scale.label}
                      >
                        <span
                          className={`font-display text-h2 leading-none ${
                            isSelected ? "text-iron" : "text-muted"
                          }`}
                        >
                          {scale.value}
                        </span>
                        <BristolDiagram value={scale.value} selected={isSelected} />
                        <span className={`text-[10px] leading-tight ${
                          isSelected ? "text-ink" : "text-muted"
                        }`}>
                          {scale.short}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.consistency && (
                  <p className="text-xs text-iron">{errors.consistency.message}</p>
                )}
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label htmlFor="color" className="text-micro text-muted">{t("color")}</Label>
                <select
                  id="color"
                  className="flex h-10 w-full rounded border border-hairline bg-surface px-3.5 py-2 text-[15px] text-ink focus:outline-none focus:border-ink"
                  {...register("color", { required: t("selectColor") })}
                >
                  {COMMON_COLORS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
                {errors.color && (
                  <p className="text-xs text-iron">{errors.color.message}</p>
                )}
              </div>

              {/* Pain level */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="painLevel" className="text-micro text-muted">
                    {t("painLevel")}
                  </Label>
                  <span className="font-mono tnum text-xs text-muted-2">
                    0 – 10
                  </span>
                </div>

                {/* Custom slider track with ticks */}
                <div className="relative pt-6 pb-1">
                  {/* The native range input is positioned over the visual track */}
                  <input
                    id="painLevel"
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    {...register("painLevel", { valueAsNumber: true })}
                    className="health-pain-slider absolute inset-x-0 top-6 w-full h-4 appearance-none bg-transparent cursor-pointer"
                  />
                  {/* Visual track */}
                  <div className="pointer-events-none">
                    <div className="relative h-px bg-hairline-strong">
                      {/* 11 tick marks */}
                      <div className="absolute inset-x-0 -top-1.5 flex justify-between">
                        {Array.from({ length: 11 }).map((_, i) => (
                          <span
                            key={i}
                            className={`block w-px h-3 ${
                              i === selectedPainLevel ? "bg-ink" : "bg-hairline-strong"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-end justify-between pt-2">
                  <div>
                    <p className="font-display tnum text-data-xl leading-none">
                      {selectedPainLevel}
                    </p>
                    <p className="text-micro text-muted mt-2">{t("currentLevel")}</p>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <p className="text-xs text-muted">{t("noPain")}</p>
                    <p className="text-xs text-muted">{t("severePain")}</p>
                  </div>
                </div>

                {errors.painLevel && (
                  <p className="text-xs text-iron">{errors.painLevel.message}</p>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-micro text-muted">{t("additionalNotes")}</Label>
                <Textarea
                  id="notes"
                  placeholder={t("notesPlaceholder")}
                  {...register("notes")}
                />
              </div>

              {/* Image Upload */}
              <ImageUpload
                onImageUpload={handleImageUpload}
                onImageRemove={handleImageRemove}
                currentImage={uploadedImageUrl}
                label={t("healthPhoto")}
                disabled={createHealthEntry.isLoading}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={createHealthEntry.isLoading}
              >
                {createHealthEntry.isLoading ? t("savingEntry") : t("saveHealthEntry")}
              </Button>
            </form>
          </section>

          {/* Day's Entries + Reference */}
          <section className="space-y-12">
            {/* Recent entries list (meal-row pattern) */}
            <div>
              <div className="mb-4 flex items-baseline justify-between border-b border-hairline pb-3">
                <div>
                  <p className="text-micro text-muted mb-1">
                    {isToday ? t("today") : formatDate(selectedDate, "MMM d", { locale: dateLocale })}
                  </p>
                  <h2 className="font-display text-h2">
                    {t("entries")}
                  </h2>
                </div>
                <span className="font-mono tnum text-sm text-muted">
                  {dayEntries.length}
                </span>
              </div>

              {isLoading ? (
                <p className="text-sm text-muted py-4">{tCommon("loading")}</p>
              ) : dayEntries.length === 0 ? (
                <p className="text-sm text-muted py-4">{t("noHealthEntries")}</p>
              ) : (
                <ul>
                  {dayEntries.map((entry) => {
                    const scaleLabel = BRISTOL_SCALE.find((s) => s.value === entry.consistency)?.short;
                    return (
                      <li
                        key={entry.id}
                        className="border-b border-hairline last:border-b-0 py-4"
                      >
                        <div className="flex items-start gap-4">
                          <HeartPulse className="w-4 h-4 text-muted mt-1 flex-shrink-0" strokeWidth={1.5} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-3">
                              <span className="font-mono tnum text-sm text-muted">
                                {formatDate(convertUTCToLocalDisplay(entry.localDateTime), "HH:mm", { locale: dateLocale })}
                              </span>
                              <span className="font-medium text-ink">
                                {t("bristolScaleType", { type: entry.consistency })}
                              </span>
                            </div>
                            {scaleLabel && (
                              <p className="mt-1 text-sm text-muted leading-relaxed">
                                {scaleLabel}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                              <span className="text-micro text-muted">
                                {t("colorLabel")} <span className="text-ink normal-case tracking-normal">{entry.color}</span>
                              </span>
                              <span className="text-micro text-muted">
                                {t("painLabel")}{" "}
                                <span className="font-mono tnum text-ink normal-case tracking-normal">
                                  {entry.painLevel}/10
                                </span>
                              </span>
                            </div>
                            {entry.notes && (
                              <p className="mt-2 text-sm text-muted leading-relaxed border-l border-hairline pl-3">
                                {entry.notes}
                              </p>
                            )}
                          </div>

                          {/* Photo + edit */}
                          <div className="flex items-start gap-2 flex-shrink-0">
                            {entry.imageUrl && (
                              <div className="relative w-12 h-12 border border-hairline overflow-hidden">
                                <Image
                                  src={entry.imageUrl}
                                  alt={t("healthEntryPhoto")}
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleEditEntry(entry)}
                              className="w-8 h-8 inline-flex items-center justify-center text-muted hover:text-ink border border-transparent hover:border-hairline rounded"
                              aria-label={t("editHealthEntry")}
                            >
                              <Edit className="h-4 w-4" strokeWidth={1.5} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Bristol Scale Reference */}
            <div>
              <div className="mb-4 border-b border-hairline pb-3">
                <p className="text-micro text-muted mb-1">{t("reference")}</p>
                <h2 className="font-display text-h2">{t("bristolStoolScaleReference")}</h2>
              </div>
              <ul>
                {BRISTOL_SCALE.map((scale) => (
                  <li
                    key={scale.value}
                    className="flex items-baseline gap-4 border-b border-hairline last:border-b-0 py-3"
                  >
                    <span className="font-display text-h3 text-muted tnum w-6 leading-none">
                      {scale.value}
                    </span>
                    <span className="text-sm text-ink leading-relaxed flex-1">
                      {scale.short}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">{t("typesNormal")}</p>
            </div>
          </section>
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

      {/* Slider styling — scoped to this page via a class name */}
      <style jsx global>{`
        .health-pain-slider {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .health-pain-slider::-webkit-slider-runnable-track {
          height: 4px;
          background: transparent;
        }
        .health-pain-slider::-moz-range-track {
          height: 4px;
          background: transparent;
        }
        .health-pain-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: hsl(var(--ink));
          border: 0;
          border-radius: 0;
          margin-top: -6px;
          cursor: pointer;
        }
        .health-pain-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: hsl(var(--ink));
          border: 0;
          border-radius: 0;
          cursor: pointer;
        }
        .health-pain-slider:focus {
          outline: none;
        }
        .health-pain-slider:focus::-webkit-slider-thumb {
          outline: 1px solid hsl(var(--ink));
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}

/**
 * Tiny, low-contrast diagram for each Bristol type.
 * Pure SVG, neutral gray, strip → grayscale where possible.
 */
function BristolDiagram({ value, selected }: { value: string; selected: boolean }) {
  const stroke = selected ? "hsl(var(--iron))" : "hsl(var(--muted))";
  const fill = selected ? "hsl(var(--iron))" : "hsl(var(--muted-2))";
  switch (value) {
    case "1":
      // Separate hard lumps — three small circles
      return (
        <svg width="40" height="16" viewBox="0 0 40 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="3" fill={fill} />
          <circle cx="20" cy="8" r="3" fill={fill} />
          <circle cx="32" cy="8" r="3" fill={fill} />
        </svg>
      );
    case "2":
      // Sausage-shaped but lumpy — bumpy rectangle
      return (
        <svg width="40" height="16" viewBox="0 0 40 16" fill="none" aria-hidden="true">
          <path
            d="M4 8 q2 -5 6 0 t6 0 t6 0 t6 0 t6 0 q2 5 -2 5 h-22 q-4 0 -6 -5z"
            fill={fill}
          />
        </svg>
      );
    case "3":
      // Sausage-shaped with cracks
      return (
        <svg width="40" height="16" viewBox="0 0 40 16" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="34" height="6" rx="3" fill={fill} />
          <line x1="12" y1="5" x2="12" y2="11" stroke="hsl(var(--paper))" strokeWidth="1" />
          <line x1="22" y1="5" x2="22" y2="11" stroke="hsl(var(--paper))" strokeWidth="1" />
          <line x1="30" y1="5" x2="30" y2="11" stroke="hsl(var(--paper))" strokeWidth="1" />
        </svg>
      );
    case "4":
      // Smooth and soft — clean rounded rectangle
      return (
        <svg width="40" height="16" viewBox="0 0 40 16" fill="none" aria-hidden="true">
          <rect x="3" y="5" width="34" height="6" rx="3" fill={fill} />
        </svg>
      );
    case "5":
      // Soft blobs with clear-cut edges
      return (
        <svg width="40" height="16" viewBox="0 0 40 16" fill="none" aria-hidden="true">
          <ellipse cx="10" cy="8" rx="5" ry="3.5" fill={fill} />
          <ellipse cx="22" cy="8" rx="5" ry="3.5" fill={fill} />
          <ellipse cx="33" cy="8" rx="4" ry="3" fill={fill} />
        </svg>
      );
    case "6":
      // Fluffy pieces with ragged edges
      return (
        <svg width="40" height="16" viewBox="0 0 40 16" fill="none" aria-hidden="true">
          <path
            d="M5 8 q3 -4 6 -1 t6 -1 t6 1 t6 -1 t6 2"
            stroke={stroke}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case "7":
      // Watery
      return (
        <svg width="40" height="16" viewBox="0 0 40 16" fill="none" aria-hidden="true">
          <path
            d="M3 7 q4 -3 8 0 t8 0 t8 0 t8 0"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M3 11 q4 -3 8 0 t8 0 t8 0 t8 0"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </svg>
      );
    default:
      return null;
  }
}

function mostCommonConsistency(entries: Array<{ consistency: string }>): string {
  const counts: Record<string, number> = {};
  for (const e of entries) {
    counts[e.consistency] = (counts[e.consistency] || 0) + 1;
  }
  let best: string | null = null;
  let bestCount = -1;
  for (const k of Object.keys(counts)) {
    if (counts[k] > bestCount) {
      bestCount = counts[k];
      best = k;
    }
  }
  return best ?? "—";
}
