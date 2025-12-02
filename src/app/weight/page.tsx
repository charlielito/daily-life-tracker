"use client";

import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { useEffect, useState } from "react";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ui/image-upload";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Edit, Trash2, Camera, Calendar, X, ZoomIn } from "lucide-react";
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white text-gray-800"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="w-full h-full flex items-center justify-center">
          <Image
            src={imageUrl}
            alt={alt}
            width={800}
            height={600}
            className="max-w-full max-h-full object-contain rounded-lg"
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
  const { t: tCommon } = useTranslations("common");
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("editWeightEntry")}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="weight">{t("weightKg")}</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              min="20"
              max="300"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g., 70.5"
            />
          </div>

          <ImageUpload
            onImageUpload={handleImageUpload}
            onImageRemove={handleImageRemove}
            currentImage={uploadedImageUrl}
            label={t("weightPhoto")}
            disabled={isLoading}
          />

          <div className="flex gap-3 pt-4">
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
              <Trash2 className="h-4 w-4 mr-2" />
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
    setSelectedMonth(new Date());
  };

  // Create calendar days for the selected month
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Calculate offset to align first day with Monday (0 = Monday, 6 = Sunday)
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday (1) to be 0, so we convert: (dayOfWeek - 1 + 7) % 7
  const firstDayOfWeek = monthStart.getDay();
  const offset = (firstDayOfWeek - 1 + 7) % 7;

  // Create a map of weight entries by date for easy lookup
  const weightEntriesMap = new Map(
    weightEntries.map(entry => [
      format(convertUTCToLocalDisplay(new Date(entry.localDate)), "yyyy-MM-dd"),
      entry
    ])
  );

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("title")}</h1>
          <p className="text-gray-600 mt-2">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            {tCommon("backToDashboard")}
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Input
                  type="month"
                  value={format(selectedMonth, "yyyy-MM")}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-').map(Number);
                    const newDate = new Date(year, month - 1, 1);
                    setSelectedMonth(newDate);
                  }}
                  className="w-[180px]"
                />
              </div>
              
              <Button variant="ghost" size="sm" onClick={goToCurrentMonth}>
                {tCommon("today")}
              </Button>
            </div>
            
            <Button variant="outline" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardHeader>
          <CardTitle>{t("weightEntriesForMonth", { month: format(selectedMonth, "MMMM yyyy") })}</CardTitle>
          <CardDescription>
            {t("entriesThisMonth", { count: weightEntries.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t("loadingWeightEntries")}</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers - starting with Monday */}
              {[t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat"), t("sun")].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              
              {/* Empty cells for days before the first day of the month (to align with Monday) */}
              {Array.from({ length: offset }).map((_, index) => (
                <div key={`empty-${index}`} className="p-2 min-h-[80px]"></div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((day) => {
                const dayKey = format(day, "yyyy-MM-dd");
                const entry = weightEntriesMap.get(dayKey);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <div
                    key={dayKey}
                    className={`p-2 min-h-[80px] border border-gray-200 ${
                      isToday ? "bg-blue-50 border-blue-300" : ""
                    }`}
                  >
                    <div className="text-sm font-medium mb-1">
                      {format(day, "d")}
                    </div>
                    
                    {entry ? (
                      <div className="space-y-1">
                        <div className="text-xs font-semibold text-green-700">
                          {entry.weight}kg
                        </div>
                        
                        {(entry as any)?.imageUrl && (
                          <div 
                            className="relative w-full h-12 rounded overflow-hidden border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity group"
                            onClick={() => handleImageClick((entry as any).imageUrl, format(day, "MMM d, yyyy"))}
                          >
                            <Image
                              src={(entry as any).imageUrl}
                              alt={t("weightPhotoFor", { date: format(day, "MMM d, yyyy") })}
                              fill
                              className="object-cover pointer-events-none"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center pointer-events-none">
                              <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditEntry(entry)}
                          className="h-6 px-1 text-xs"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400">
                        {t("noEntry")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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