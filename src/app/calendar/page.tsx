"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { api } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UtensilsCrossed, Activity, HeartPulse, Scale } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from "date-fns";
import { formatDate } from "@/utils/formatDate";
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
  const dateLocale = useDateLocale();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // Calculate offset to align first day with Monday (0 = Monday, 6 = Sunday)
  const firstDayOfWeek = monthStart.getDay();
  const offset = (firstDayOfWeek - 1 + 7) % 7;

  // Trailing cells to complete the last week row
  const totalCellsUsed = offset + calendarDays.length;
  const trailing = (7 - (totalCellsUsed % 7)) % 7;

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

  // Get net calorie balance for a day: intake (positive surplus) minus burned, vs unknown? We'll
  // use totalCalories - totalCaloriesBurned as the net (positive = surplus).
  const getNetCalories = (data: DayData | null): number | null => {
    if (!data) return null;
    const intake = data.totalCalories ?? 0;
    const burned = data.totalCaloriesBurned ?? 0;
    if (intake === 0 && burned === 0) return null;
    return Math.round(intake - burned);
  };

  // Get icon for timeline entry type
  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'meal':
        return <UtensilsCrossed className="h-4 w-4" />;
      case 'activity':
        return <Activity className="h-4 w-4" />;
      case 'health':
        return <HeartPulse className="h-4 w-4" />;
      case 'weight':
        return <Scale className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (status === "loading" || !session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted">{tCommon("loading")}</div>
      </div>
    );
  }

  // Localized month name + year
  const monthName = formatDate(currentDate, 'MMMM', { locale: dateLocale });
  const yearStr = format(currentDate, 'yyyy');
  const prevMonthLabel = formatDate(subMonths(currentDate, 1), 'MMM', { locale: dateLocale });
  const nextMonthLabel = formatDate(addMonths(currentDate, 1), 'MMM', { locale: dateLocale });

  return (
    <div className="container mx-auto px-4 py-10 max-w-6xl">
      {/* Page hero */}
      <div className="mb-10 flex items-end justify-between gap-6 border-b border-hairline pb-6">
        <div>
          <p className="text-micro text-muted-2 mb-3">{t("title")}</p>
          <h1 className="font-display text-h1 leading-none tracking-tight">
            <span>{monthName}</span>{" "}
            <span className="font-mono text-muted">{yearStr}</span>
          </h1>
          <p className="mt-3 text-muted text-sm max-w-md">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LanguageSwitcher />
          <LocalizedLink href="/dashboard">
            <Button variant="outline" size="sm">{t("backToDashboard")}</Button>
          </LocalizedLink>
        </div>
      </div>

      {/* Month navigation — text only, mono 12px */}
      <div className="mb-4 flex items-center justify-end gap-3 font-mono text-xs text-muted">
        <button
          onClick={goToPreviousMonth}
          className="hover:text-ink transition-colors"
          aria-label={prevMonthLabel}
        >
          &larr; {prevMonthLabel}
        </button>
        <span className="text-muted-2">&middot;</span>
        <button
          onClick={goToToday}
          className="text-ink hover:underline underline-offset-4"
        >
          {tCommon("today")}
        </button>
        <span className="text-muted-2">&middot;</span>
        <button
          onClick={goToNextMonth}
          className="hover:text-ink transition-colors"
          aria-label={nextMonthLabel}
        >
          {nextMonthLabel} &rarr;
        </button>
      </div>

      {/* Calendar grid */}
      <div className="border border-hairline bg-surface">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 bg-paper-2 border-b border-hairline">
          {[t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat"), t("sun")].map((day, i) => (
            <div
              key={day}
              className={`px-3 py-2.5 text-micro text-muted ${i < 6 ? 'border-r border-hairline' : ''}`}
            >
              {day}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-muted font-mono text-xs">
            {t("loadingCalendarData")}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {/* Empty cells for offset (prev-month dim cells) */}
            {Array.from({ length: offset }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className={`aspect-[1.1/1] p-2.5 border-b border-hairline ${(index % 7) < 6 ? 'border-r' : ''}`}
              />
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, dayIndex) => {
              const cellIndex = offset + dayIndex;
              const dayData = getDayData(day);
              const hasMeals = !!dayData && dayData.macroCount > 0;
              const hasActivity = !!dayData && dayData.activityCount > 0;
              const hasHealth = !!dayData && dayData.healthCount > 0;
              const hasWeight = !!dayData && dayData.weightCount > 0;
              const hasAnyData = hasMeals || hasActivity || hasHealth || hasWeight;
              const net = getNetCalories(dayData);
              const dim = !isSameMonth(day, currentDate);
              const today = isToday(day);
              const isRightEdge = (cellIndex % 7) === 6;

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`
                    relative aspect-[1.1/1] p-2.5 text-left
                    border-b border-hairline
                    ${!isRightEdge ? 'border-r' : ''}
                    ${today ? 'bg-iron-soft' : 'bg-surface'}
                    ${hasAnyData && !today ? 'hover:bg-paper-2' : ''}
                    ${!hasAnyData && !today ? 'hover:bg-paper-2/60' : ''}
                    transition-colors focus:outline-none focus:bg-paper-2
                    flex flex-col justify-between
                  `}
                >
                  <div
                    className={`
                      font-display text-[18px] leading-none tracking-tight tnum
                      ${today ? 'text-iron' : dim ? 'text-muted-2' : 'text-ink'}
                    `}
                  >
                    {format(day, 'd')}
                  </div>

                  {hasAnyData && (
                    <div className="flex flex-col items-start gap-1">
                      {net !== null && (
                        <div
                          className={`
                            font-mono text-[10px] tnum
                            ${today ? 'text-iron' : 'text-muted-2'}
                          `}
                        >
                          {net > 0 ? '+' : net < 0 ? '−' : ''}{Math.abs(net)}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        {hasMeals && <span className="block w-1 h-1 rounded-full bg-ink-2" aria-hidden />}
                        {hasActivity && <span className="block w-1 h-1 rounded-full bg-ink-2" aria-hidden />}
                        {hasHealth && <span className="block w-1 h-1 rounded-full bg-ink-2" aria-hidden />}
                        {hasWeight && <span className="block w-1 h-1 rounded-full bg-ink-2" aria-hidden />}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}

            {/* Trailing cells to complete the last row */}
            {Array.from({ length: trailing }).map((_, index) => {
              const cellIndex = offset + calendarDays.length + index;
              const isRightEdge = (cellIndex % 7) === 6;
              return (
                <div
                  key={`trailing-${index}`}
                  className={`aspect-[1.1/1] p-2.5 border-b border-hairline bg-paper-2/40 ${!isRightEdge ? 'border-r' : ''}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Legend — ink dots + micro labels */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="block w-1 h-1 rounded-full bg-ink-2" aria-hidden />
          <span className="text-micro text-muted">{t("meals")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="block w-1 h-1 rounded-full bg-ink-2" aria-hidden />
          <span className="text-micro text-muted">{t("activities")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="block w-1 h-1 rounded-full bg-ink-2" aria-hidden />
          <span className="text-micro text-muted">{t("healthEntries")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="block w-1 h-1 rounded-full bg-ink-2" aria-hidden />
          <span className="text-micro text-muted">{t("weight")}</span>
        </div>
        <div className="ml-auto flex items-center gap-3 font-mono text-[10px] text-muted-2">
          <span><span className="text-ink">+N</span> {t("legendSurplus")}</span>
          <span className="text-muted-2">&middot;</span>
          <span><span className="text-ink">&minus;N</span> {t("legendDeficit")}</span>
        </div>
      </div>

      {/* Day Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <p className="text-micro text-muted-2 mb-1">{t("dayDetailsLabel")}</p>
            <DialogTitle>
              {selectedDay && formatDate(selectedDay, 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
            </DialogTitle>
          </DialogHeader>

          {dayDetailsLoading ? (
            <div className="py-12 text-center text-muted font-mono text-xs">
              {t("loadingDayDetails")}
            </div>
          ) : dayDetails ? (
            <div className="mt-2 space-y-8">
              {/* Summary pillars — editorial number + micro label */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-hairline border border-hairline">
                <div className="bg-surface p-4">
                  <p className="text-micro text-muted-2 mb-2">{t("mealsLabel")}</p>
                  <div className="font-display tnum text-data-md text-ink leading-none">
                    {dayDetails.summary.mealsCount}
                  </div>
                  {dayDetails.summary.totalCalories > 0 && (
                    <p className="mt-2 font-mono text-xs text-muted tnum">
                      {dayDetails.summary.totalCalories} {tFood("cal")}
                    </p>
                  )}
                </div>
                <div className="bg-surface p-4">
                  <p className="text-micro text-muted-2 mb-2">{t("activitiesLabel")}</p>
                  <div className="font-display tnum text-data-md text-ink leading-none">
                    {dayDetails.summary.activitiesCount}
                  </div>
                  {dayDetails.summary.totalCaloriesBurned > 0 && (
                    <p className="mt-2 font-mono text-xs text-muted tnum">
                      {dayDetails.summary.totalCaloriesBurned} {t("calBurned")}
                    </p>
                  )}
                </div>
                <div className="bg-surface p-4">
                  <p className="text-micro text-muted-2 mb-2">{t("healthLabel")}</p>
                  <div className="font-display tnum text-data-md text-ink leading-none">
                    {dayDetails.summary.healthEntriesCount}
                  </div>
                </div>
                <div className="bg-surface p-4">
                  <p className="text-micro text-muted-2 mb-2">{t("weightLabel")}</p>
                  <div className="font-display tnum text-data-md text-ink leading-none">
                    {dayDetails.summary.weightEntriesCount}
                  </div>
                </div>
              </div>

              {/* Calorie balance — single rule line */}
              {(dayDetails.summary.totalCalories > 0 || dayDetails.summary.totalCaloriesBurned > 0) && (
                <div className="flex items-baseline justify-between border-t border-b border-hairline py-4">
                  <span className="text-micro text-muted">{t("calorieBalance")}</span>
                  <span
                    className={`font-display tnum text-data-md leading-none ${dayDetails.summary.calorieBalance < 0 ? 'text-iron' : 'text-ink'}`}
                  >
                    {dayDetails.summary.calorieBalance > 0 ? '+' : ''}
                    {dayDetails.summary.calorieBalance}
                    <span className="ml-2 font-mono text-xs text-muted-2">{tFood("cal")}</span>
                  </span>
                </div>
              )}

              {/* Timeline */}
              {dayDetails.timeline.length > 0 && (
                <div>
                  <h3 className="font-display text-h2 mb-4">{t("timeline")}</h3>
                  <ol className="border-t border-hairline">
                    {dayDetails.timeline.map((entry: TimelineEntry) => {
                      let translatedTitle = entry.title;
                      if (entry.title === 'Meal') {
                        translatedTitle = t("mealTitle");
                      } else if (entry.title === 'Health Entry') {
                        translatedTitle = t("healthEntryTitle");
                      } else if (entry.title === 'Weight') {
                        translatedTitle = t("weightTitle");
                      }

                      let translatedDescription = entry.description;
                      if (entry.type === 'activity') {
                        const match = entry.description.match(/^(.+?)\s*\((\d+)\s*min,\s*(\d+)\s*cal\)$/);
                        if (match) {
                          const [, desc, duration, calories] = match;
                          translatedDescription = `${desc} (${duration} ${t("min")}, ${calories} ${t("cal")})`;
                        }
                      } else if (entry.type === 'health') {
                        const matchEn = entry.description.match(/Bristol Scale\s+(\d+),\s*Pain Level\s+(\d+)/);
                        const matchEs = entry.description.match(/Escala de Bristol\s+(\d+),\s*Nivel de Dolor\s+(\d+)/);
                        if (matchEn || matchEs) {
                          const match = matchEn || matchEs;
                          const [, consistency, painLevel] = match!;
                          translatedDescription = `${t("bristolScale")} ${consistency}, ${t("painLevel")} ${painLevel}`;
                        }
                      } else if (entry.type === 'weight') {
                        const match = entry.description.match(/(\d+(?:\.\d+)?)\s*kg/);
                        if (match) {
                          const [, weight] = match;
                          translatedDescription = `${weight} ${t("kg")}`;
                        }
                      }

                      const timeStr = entry.type !== 'weight'
                        ? formatDate(convertUTCToLocalDisplay(entry.time), 'HH:mm', { locale: dateLocale })
                        : '';

                      return (
                        <li
                          key={entry.id}
                          className="grid grid-cols-[64px_24px_1fr] gap-3 items-start border-b border-hairline py-3"
                        >
                          <div className="font-mono text-xs text-muted-2 tnum pt-0.5">
                            {timeStr || '—'}
                          </div>
                          <div className="text-muted pt-0.5">{getTimelineIcon(entry.type)}</div>
                          <div>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-micro text-muted">{translatedTitle}</span>
                            </div>
                            <p className="text-sm text-ink mt-0.5">{translatedDescription}</p>

                            {entry.type === 'meal' && entry.details.calculatedMacros && (
                              <p className="mt-1 font-mono text-xs text-muted-2 tnum">
                                {tFood("protein")} {entry.details.calculatedMacros.protein}g
                                {"  "}&middot;{"  "}
                                {tFood("carbs")} {entry.details.calculatedMacros.carbs}g
                                {"  "}&middot;{"  "}
                                {tFood("fat")} {entry.details.calculatedMacros.fat}g
                              </p>
                            )}

                            {entry.type === 'activity' && (
                              <p className="mt-1 font-mono text-xs text-muted-2">
                                <span className="tnum">{t("intensity")}: {entry.details.intensity}</span>
                                {"  "}&middot;{"  "}
                                <span className="tnum">{t("duration")}: {entry.details.duration} {t("min")}</span>
                              </p>
                            )}

                            {entry.type === 'health' && (
                              <p className="mt-1 font-mono text-xs text-muted-2">
                                {t("color")}: {entry.details.color}
                                {entry.details.notes && <> {"  "}&middot;{"  "} {t("notes")}: {entry.details.notes}</>}
                              </p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {dayDetails.timeline.length === 0 && (
                <div className="py-10 text-center text-muted text-sm">
                  {t("noEntriesRecorded")}
                </div>
              )}
            </div>
          ) : (
            <div className="py-10 text-center text-muted text-sm">
              {t("noDataAvailable")}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
