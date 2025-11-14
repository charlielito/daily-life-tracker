"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Activity, Utensils, Scale } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import { formatDate } from "@/utils/formatDate";
import Link from "next/link";
import { convertUTCToLocalDisplay } from "@/utils/dateUtils";
import { useTranslations } from "@/utils/useTranslations";
import { useDateLocale } from "@/utils/useDateLocale";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { LocalizedLink } from "@/components/ui/localized-link";


interface DayData {
  date: string;
  macroCount: number;
  activityCount: number;
  healthCount: number;
  weightCount: number;
  totalCalories?: number;
  totalCaloriesBurned?: number;
  entries: {
    macros: any[];
    activities: any[];
    health: any[];
    weight: any[];
  };
}

interface TimelineEntry {
  id: string;
  type: 'meal' | 'activity' | 'health' | 'weight';
  time: Date;
  title: string;
  description: string;
  details: any;
}

export default function CalendarPage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const { t } = useTranslations("calendar");
  const { t: tCommon } = useTranslations("common");
  const { t: tFood } = useTranslations("food");
  const { t: tActivity } = useTranslations("activity");
  const dateLocale = useDateLocale();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCalories, setShowCalories] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  // Fetch calendar data for current month
  const { data: monthData = [], isLoading } = api.calendar.getMonthData.useQuery(
    {
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    },
    { enabled: !!session }
  );

  // Fetch detailed day data when a day is selected
  const { data: dayDetails, isLoading: dayDetailsLoading } = api.calendar.getDayDetails.useQuery(
    { date: selectedDay! },
    { enabled: !!selectedDay }
  );

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Handle day click
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setIsModalOpen(true);
  };

  // Get calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Convert monthData array to a map for easier lookup
  const dayDataMap = monthData.reduce((acc, day) => {
    acc[day.date] = day;
    return acc;
  }, {} as Record<string, DayData>);

  // Get data for a specific day
  const getDayData = (day: Date): DayData | null => {
    const dateKey = format(day, 'yyyy-MM-dd');
    return dayDataMap[dateKey] || null;
  };

  // Get icon for timeline entry type
  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'meal':
        return <Utensils className="h-4 w-4" />;
      case 'activity':
        return <Activity className="h-4 w-4" />;
      case 'health':
        return <span className="text-base">🚽</span>;
      case 'weight':
        return <Scale className="h-4 w-4" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  // Get color for timeline entry type
  const getTimelineColor = (type: string) => {
    switch (type) {
      case 'meal':
        return 'text-green-600 bg-green-50';
      case 'activity':
        return 'text-blue-600 bg-blue-50';
      case 'health':
        return 'text-red-600 bg-red-50';
      case 'weight':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{tCommon("loading")}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("title")}</h1>
            <p className="text-gray-600">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <LanguageSwitcher />
            <LocalizedLink href="/dashboard">
              <Button variant="outline">{t("backToDashboard")}</Button>
            </LocalizedLink>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {formatDate(currentDate, 'MMMM yyyy', { locale: dateLocale })}
              </h2>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCalories}
                  onChange={(e) => setShowCalories(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t("showCalories")}</span>
              </label>
              <Button variant="outline" size="sm" onClick={goToToday}>
                {tCommon("today")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t("loadingCalendarData")}</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Day headers */}
              {[t("sun"), t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat")].map(day => (
                <div key={day} className="p-2 text-center font-medium text-gray-500 text-sm">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map(day => {
                const dayData = getDayData(day);
                const hasData = dayData && (
                  dayData.macroCount > 0 || 
                  dayData.activityCount > 0 || 
                  dayData.healthCount > 0 || 
                  dayData.weightCount > 0
                );
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`
                      p-2 min-h-[80px] border rounded-lg cursor-pointer transition-colors
                      ${isToday(day) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}
                      ${hasData ? 'hover:bg-gray-50' : 'hover:bg-gray-25'}
                      ${!isSameMonth(day, currentDate) ? 'opacity-50' : ''}
                    `}
                    onClick={() => handleDayClick(day)}
                  >
                    <div className="text-sm font-medium mb-1">
                      {format(day, 'd', { locale: dateLocale })}
                    </div>
                    
                    {hasData && (
                      <div className="space-y-1">
                        {dayData.macroCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Utensils className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">{dayData.macroCount}</span>
                          </div>
                        )}
                        {dayData.activityCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3 text-blue-600" />
                            <span className="text-xs text-blue-600">{dayData.activityCount}</span>
                          </div>
                        )}
                        {dayData.healthCount > 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">🚽</span>
                            <span className="text-xs text-red-600">{dayData.healthCount}</span>
                          </div>
                        )}
                        {dayData.weightCount > 0 && (
                          <div className="flex items-center gap-1">
                            <Scale className="h-3 w-3 text-purple-600" />
                            <span className="text-xs text-purple-600">{dayData.weightCount}</span>
                          </div>
                        )}
                        {/* Calories info - show if checkbox is enabled and data is available */}
                        {showCalories && (dayData.totalCalories || dayData.totalCaloriesBurned) && (
                          <div className="mt-1 pt-1 border-t border-gray-200 space-y-0.5">
                            {dayData.totalCalories && (
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">+{Math.round(dayData.totalCalories)}</span> {tFood("cal")}
                              </div>
                            )}
                            {dayData.totalCaloriesBurned && (
                              <div className="text-xs text-gray-600">
                                <span className="font-medium">-{dayData.totalCaloriesBurned}</span> {tFood("cal")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("legend")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-green-600" />
              <span className="text-sm">{t("meals")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-600" />
              <span className="text-sm">{t("activities")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">🚽</span>
              <span className="text-sm">{t("healthEntries")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-purple-600" />
              <span className="text-sm">{t("weight")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {selectedDay && t("dayDetails", { date: formatDate(selectedDay, 'EEEE, MMMM d, yyyy', { locale: dateLocale }) })}
            </DialogTitle>
          </DialogHeader>
          
          {dayDetailsLoading ? (
            <div className="text-center py-8">{t("loadingDayDetails")}</div>
          ) : dayDetails ? (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">{t("mealsLabel")}</span>
                    </div>
                    <div className="text-2xl font-bold">{dayDetails.summary.mealsCount}</div>
                    {dayDetails.summary.totalCalories > 0 && (
                      <div className="text-sm text-gray-600">{dayDetails.summary.totalCalories} {tFood("cal")}</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{t("activitiesLabel")}</span>
                    </div>
                    <div className="text-2xl font-bold">{dayDetails.summary.activitiesCount}</div>
                    {dayDetails.summary.totalCaloriesBurned > 0 && (
                      <div className="text-sm text-gray-600">{dayDetails.summary.totalCaloriesBurned} {t("calBurned")}</div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">🚽</span>
                      <span className="text-sm font-medium">{t("healthLabel")}</span>
                    </div>
                    <div className="text-2xl font-bold">{dayDetails.summary.healthEntriesCount}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Scale className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">{t("weightLabel")}</span>
                    </div>
                    <div className="text-2xl font-bold">{dayDetails.summary.weightEntriesCount}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Calorie Balance */}
              {(dayDetails.summary.totalCalories > 0 || dayDetails.summary.totalCaloriesBurned > 0) && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{t("calorieBalance")}</span>
                      <Badge variant={dayDetails.summary.calorieBalance < 0 ? "destructive" : "default"}>
                        {dayDetails.summary.calorieBalance > 0 ? '+' : ''}{dayDetails.summary.calorieBalance} {tFood("cal")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              {dayDetails.timeline.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t("timeline")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {dayDetails.timeline.map((entry: TimelineEntry) => {
                        // Translate entry title based on type
                        let translatedTitle = entry.title;
                        if (entry.title === 'Meal') {
                          translatedTitle = t("mealTitle");
                        } else if (entry.title === 'Health Entry') {
                          translatedTitle = t("healthEntryTitle");
                        } else if (entry.title === 'Weight') {
                          translatedTitle = t("weightTitle");
                        }

                        // Translate entry description based on type
                        let translatedDescription = entry.description;
                        if (entry.type === 'activity') {
                          // Description format: "description (duration min, caloriesBurned cal)"
                          // Handle both English and Spanish formats
                          const matchEn = entry.description.match(/^(.+?)\s*\((\d+)\s*min,\s*(\d+)\s*cal\)$/);
                          const matchEs = entry.description.match(/^(.+?)\s*\((\d+)\s*min,\s*(\d+)\s*cal\)$/);
                          if (matchEn || matchEs) {
                            const match = matchEn || matchEs;
                            const [, desc, duration, calories] = match!;
                            translatedDescription = `${desc} (${duration} ${t("min")}, ${calories} ${t("cal")})`;
                          }
                        } else if (entry.type === 'health') {
                          // Description format: "Bristol Scale X, Pain Level Y" or "Escala de Bristol X, Nivel de Dolor Y"
                          const matchEn = entry.description.match(/Bristol Scale\s+(\d+),\s*Pain Level\s+(\d+)/);
                          const matchEs = entry.description.match(/Escala de Bristol\s+(\d+),\s*Nivel de Dolor\s+(\d+)/);
                          if (matchEn || matchEs) {
                            const match = matchEn || matchEs;
                            const [, consistency, painLevel] = match!;
                            translatedDescription = `${t("bristolScale")} ${consistency}, ${t("painLevel")} ${painLevel}`;
                          }
                        } else if (entry.type === 'weight') {
                          // Description format: "X kg" (same in both languages)
                          const match = entry.description.match(/(\d+(?:\.\d+)?)\s*kg/);
                          if (match) {
                            const [, weight] = match;
                            translatedDescription = `${weight} ${t("kg")}`;
                          }
                        }

                        return (
                          <div key={entry.id} className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${getTimelineColor(entry.type)}`}>
                              {getTimelineIcon(entry.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">{translatedTitle}</span>
                                {entry.type !== 'weight' && (
                                  <span className="text-sm text-gray-500">
                                    {formatDate(convertUTCToLocalDisplay(entry.time), 'h:mm a', { locale: dateLocale })}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{translatedDescription}</p>
                              
                              {/* Additional details based on type */}
                              {entry.type === 'meal' && entry.details.calculatedMacros && (
                                <div className="mt-2 text-xs text-gray-500">
                                  {tFood("protein")}: {entry.details.calculatedMacros.protein}g | 
                                  {tFood("carbs")}: {entry.details.calculatedMacros.carbs}g | 
                                  {tFood("fat")}: {entry.details.calculatedMacros.fat}g
                                </div>
                              )}
                              
                              {entry.type === 'activity' && (
                                <div className="mt-2 text-xs text-gray-500">
                                  {t("intensity")}: {entry.details.intensity} | {t("duration")}: {entry.details.duration} {t("min")}
                                </div>
                              )}
                              
                              {entry.type === 'health' && (
                                <div className="mt-2 text-xs text-gray-500">
                                  {t("color")}: {entry.details.color}
                                  {entry.details.notes && ` | ${t("notes")}: ${entry.details.notes}`}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No data message */}
              {dayDetails.timeline.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {t("noEntriesRecorded")}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {t("noDataAvailable")}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
