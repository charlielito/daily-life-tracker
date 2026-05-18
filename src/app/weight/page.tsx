"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { useEffect, useState } from "react";
import { api } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Edit, Trash2, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { convertUTCToLocalDisplay } from "@/utils/dateUtils";
import { useTranslations } from "@/utils/useTranslations";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

interface WeightEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id: string; weight: number; imageUrl?: string | null }) => void;
  onDelete: () => void;
  entry: any;
  isLoading?: boolean;
}

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt: string;
}

function ImagePreviewModal({
  isOpen,
  onClose,
  imageUrl,
  alt,
}: ImagePreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink/80 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-surface/90 hover:bg-surface"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="w-full h-full flex items-center justify-center">
          <Image
            src={imageUrl}
            alt={alt}
            width={800}
            height={600}
            className="max-w-full max-h-full object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}

function WeightEditModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  entry,
  isLoading = false,
}: WeightEditModalProps) {
  const { t } = useTranslations("weight");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | undefined>(entry?.imageUrl);
  const [weight, setWeight] = useState(entry?.weight?.toString() || "");

  useEffect(() => {
    if (isOpen && entry) {
      setUploadedImageUrl(entry.imageUrl);
      setWeight(entry.weight?.toString() || "");
    }
  }, [isOpen, entry]);

  const handleSave = () => {
    const weightValue = parseFloat(weight);
    if (!isNaN(weightValue) && weightValue > 0) {
      onSave({
        id: entry.id,
        weight: weightValue,
        imageUrl: uploadedImageUrl || null, // Explicitly pass null when undefined
      });
    }
  };

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
  };

  const handleImageRemove = () => {
    setUploadedImageUrl(undefined);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-hairline rounded-modal max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-h2">{t("editWeightEntry")}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="weight" className="text-micro text-muted">
              {t("weightKg")}
            </Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="70.5"
              className="font-mono tnum"
            />
          </div>

          <ImageUpload
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            currentImage={uploadedImageUrl}
            label={t("weightPhoto")}
            disabled={isLoading}
          />

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleSave}
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? t("saving") : t("saveChanges")}
            </Button>

            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4" />
              {t("delete")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WeightPage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations("weight");
  const { t: tCommon } = useTranslations("common");

  // Get date from URL parameter or default to today
  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? new Date(dateParam + 'T00:00:00') : new Date();

  const [selectedMonth, setSelectedMonth] = useState(startOfMonth(initialDate));
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [imagePreviewModal, setImagePreviewModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    alt: string;
  }>({
    isOpen: false,
    imageUrl: "",
    alt: "",
  });

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  const utils = api.useContext();

  // Get weight entries for the selected month
  const { data: weightEntries = [], isLoading } = api.weight.getByMonth.useQuery(
    {
      year: selectedMonth.getFullYear(),
      month: selectedMonth.getMonth() + 1,
    },
    { enabled: !!session }
  );

  // Update weight entry mutation
  const updateWeight = api.weight.update.useMutation({
    onSuccess: () => {
      utils.weight.getByMonth.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to update weight entry:", error);
    },
  });

  // Delete weight entry mutation
  const deleteWeight = api.weight.deleteById.useMutation({
    onSuccess: () => {
      utils.weight.getByMonth.invalidate();
      setIsEditModalOpen(false);
      setEditingEntry(null);
    },
    onError: (error) => {
      console.error("Failed to delete weight entry:", error);
    },
  });

  const handleEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (data: { id: string; weight: number; imageUrl?: string | null }) => {
    updateWeight.mutate(data);
  };

  const handleDeleteEntry = () => {
    if (editingEntry) {
      deleteWeight.mutate({ id: editingEntry.id });
    }
  };

  const handleImageClick = (imageUrl: string, date: string) => {
    setImagePreviewModal({
      isOpen: true,
      imageUrl,
      alt: `Weight photo for ${date}`,
    });
  };

  const goToPreviousMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
  };

  const goToNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(startOfMonth(new Date()));
  };

  // Build a 6-week (42-day) grid that includes leading/trailing days from
  // adjacent months. This keeps the grid stable height-wise and gives us
  // muted "other-month" cells per the design spec.
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const firstDayOfWeek = monthStart.getDay();
  const offset = (firstDayOfWeek - 1 + 7) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - offset);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 41);
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Create a map of weight entries by date for easy lookup
  const weightEntriesMap = new Map(
    weightEntries.map(entry => [
      format(convertUTCToLocalDisplay(new Date(entry.localDate)), "yyyy-MM-dd"),
      entry
    ])
  );

  // Aggregates for the editorial header pillar
  const entriesCount = weightEntries.length;
  const latestEntry = weightEntries.length > 0
    ? [...weightEntries].sort((a, b) =>
        new Date(b.localDate).getTime() - new Date(a.localDate).getTime()
      )[0]
    : null;

  // Year picker range: current year +/- 5
  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) yearOptions.push(y);

  const monthOptions = Array.from({ length: 12 }, (_, i) => i);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-paper">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16">
          <p className="text-muted">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Top bar */}
      <header className="border-b border-hairline">
        <div className="max-w-6xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="font-display text-xl tracking-tight">
            Daily Life <em className="not-italic text-iron">Tracker</em>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
              {tCommon("backToDashboard")}
            </Button>
          </div>
        </div>
      </header>

      {/* Page header */}
      <section className="max-w-6xl mx-auto px-6 md:px-10 pt-12 md:pt-16 pb-10">
        <p className="text-micro text-muted mb-4">{t("subtitle")}</p>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <h1 className="font-display text-h1 tracking-tight max-w-2xl">
            {t("title")}
          </h1>
          <div className="flex items-end gap-10">
            <div>
              <p className="text-micro text-muted mb-1">{t("entriesLabel")}</p>
              <p className="font-display tnum text-data-xl leading-none">
                {entriesCount}
              </p>
            </div>
            {latestEntry && (
              <div>
                <p className="text-micro text-muted mb-1">{t("latestLabel")}</p>
                <p className="font-mono tnum text-data-md leading-none">
                  {latestEntry.weight}
                  <span className="text-muted text-base ml-1">kg</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 md:px-10 pb-24">
        {/* Month navigation */}
        <div className="border-t border-hairline pt-6 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousMonth}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <select
              value={selectedMonth.getMonth()}
              onChange={(e) => {
                const m = Number(e.target.value);
                setSelectedMonth(new Date(selectedMonth.getFullYear(), m, 1));
              }}
              className="h-10 rounded border border-hairline bg-surface px-3 text-sm font-display tracking-tight focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
              aria-label="Month"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {format(new Date(2000, m, 1), "MMMM")}
                </option>
              ))}
            </select>

            <select
              value={selectedMonth.getFullYear()}
              onChange={(e) => {
                const y = Number(e.target.value);
                setSelectedMonth(new Date(y, selectedMonth.getMonth(), 1));
              }}
              className="h-10 rounded border border-hairline bg-surface px-3 text-sm font-mono tnum focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-paper"
              aria-label="Year"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={goToCurrentMonth}>
            {tCommon("today")}
          </Button>
        </div>

        {/* Calendar grid */}
        <div className="border border-hairline bg-surface">
          {/* Section header strip */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-hairline">
            <h2 className="font-display text-h3">
              {t("weightEntriesForMonth", { month: format(selectedMonth, "MMMM yyyy") })}
            </h2>
            <p className="text-micro text-muted">
              {t("entriesThisMonth", { count: entriesCount })}
            </p>
          </div>

          {isLoading ? (
            <div className="px-5 py-16 text-center text-muted">
              {t("loadingWeightEntries")}
            </div>
          ) : (
            <>
              {/* Day-of-week header */}
              <div className="grid grid-cols-7 border-b border-hairline">
                {[t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat"), t("sun")].map(day => (
                  <div
                    key={day}
                    className="px-2 py-3 text-center text-micro text-muted"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7">
                {calendarDays.map((day, idx) => {
                  const dayKey = format(day, "yyyy-MM-dd");
                  const entry = weightEntriesMap.get(dayKey);
                  const isToday = isSameDay(day, new Date());
                  const inMonth = isSameMonth(day, selectedMonth);
                  const col = idx % 7;
                  const row = Math.floor(idx / 7);

                  return (
                    <div
                      key={dayKey}
                      className={[
                        "min-h-[96px] p-2 flex flex-col gap-1",
                        col < 6 ? "border-r border-hairline" : "",
                        row < 5 ? "border-b border-hairline" : "",
                        isToday ? "bg-iron-soft" : "",
                      ].filter(Boolean).join(" ")}
                    >
                      <div
                        className={[
                          "font-display text-lg leading-none",
                          isToday ? "text-iron" : inMonth ? "text-ink" : "text-muted-2",
                        ].join(" ")}
                      >
                        {format(day, "d")}
                      </div>

                      {inMonth && entry ? (
                        <div className="mt-1 flex flex-col gap-1.5">
                          <div className="font-mono tnum text-[11px] text-ink">
                            {entry.weight}
                            <span className="text-muted-2"> kg</span>
                          </div>

                          {(entry as any)?.imageUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                handleImageClick(
                                  (entry as any).imageUrl,
                                  format(day, "MMM d, yyyy")
                                )
                              }
                              className="group relative w-full aspect-square border border-hairline overflow-hidden focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 focus:ring-offset-surface"
                              aria-label={t("weightPhotoFor", { date: format(day, "MMM d, yyyy") })}
                            >
                              <Image
                                src={(entry as any).imageUrl}
                                alt={t("weightPhotoFor", { date: format(day, "MMM d, yyyy") })}
                                fill
                                className="object-cover pointer-events-none"
                              />
                              <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/30 transition-colors flex items-center justify-center pointer-events-none">
                                <ZoomIn className="h-4 w-4 text-paper opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleEditEntry(entry)}
                            className="self-start inline-flex items-center gap-1 text-micro text-muted hover:text-ink transition-colors"
                            aria-label={t("editWeightEntry")}
                          >
                            <Edit className="h-3 w-3" />
                            {t("editShort")}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Weight Edit Modal */}
      <WeightEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        onDelete={handleDeleteEntry}
        entry={editingEntry}
        isLoading={updateWeight.isLoading || deleteWeight.isLoading}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={imagePreviewModal.isOpen}
        onClose={() => setImagePreviewModal({ isOpen: false, imageUrl: "", alt: "" })}
        imageUrl={imagePreviewModal.imageUrl}
        alt={imagePreviewModal.alt}
      />
    </div>
  );
}
