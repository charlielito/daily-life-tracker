"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { api } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WeightPrompt } from "@/components/ui/weight-prompt";
import { Input } from "@/components/ui/input";
import { format, addDays, subDays } from "date-fns";
import { formatDate } from "@/utils/formatDate";
import Image from "next/image";
import {
  AlertTriangle,
  Crown,
  Zap,
  User,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage } from "@/utils/dateUtils";
import { MacroDetailsModal } from "@/components/ui/macro-details-modal";
import { calculateAge } from "@/utils/ageUtils";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslations } from "@/utils/useTranslations";
import { useDateLocale } from "@/utils/useDateLocale";
import { LocalizedLink } from "@/components/ui/localized-link";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const { t } = useTranslations("dashboard");
  const { t: tCommon } = useTranslations("common");
  const dateLocale = useDateLocale();
  const [detailsEntry, setDetailsEntry] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  // Date selection state - starts with today
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  const [showWeightPrompt, setShowWeightPrompt] = useState(false);

  const goToPreviousDay = () => setSelectedDate((d) => subDays(d, 1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => setSelectedDate(today);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
  };

  const isSelectedDateToday = selectedDate.getTime() === today.getTime();

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  const { data: subscriptionStatus, isLoading: subscriptionLoading } = api.subscription.getStatus.useQuery(
    undefined,
    { enabled: !!session }
  );

  const { data: todayMacros = [], isLoading: macrosLoading } = api.macros.getToday.useQuery(
    { date: selectedDate },
    { enabled: !!session }
  );

  const { data: todayIntestinal = [], isLoading: intestinalLoading } = api.intestinal.getToday.useQuery(
    { date: selectedDate },
    { enabled: !!session }
  );

  const { data: todayActivities = [], isLoading: activitiesLoading } = api.activity.getToday.useQuery(
    { date: selectedDate },
    { enabled: !!session }
  );

  const { data: calorieBalance } = api.activity.getDailyCalorieBalance.useQuery(
    { date: selectedDate },
    { enabled: !!session }
  );

  const { data: userProfile } = api.activity.getUserProfile.useQuery(
    undefined,
    { enabled: !!session }
  );

  const { data: todayWeight, isLoading: weightLoading } = api.weight.getByDate.useQuery(
    { localDate: convertLocalToUTCForStorage(selectedDate) },
    { enabled: !!session }
  );

  const { data: latestWeight } = api.weight.getLatest.useQuery(
    undefined,
    { enabled: !!session && !todayWeight }
  );

  const utils = api.useContext();

  const upsertWeight = api.weight.upsert.useMutation({
    onSuccess: () => {
      utils.weight.getByDate.invalidate();
      utils.weight.getLatest.invalidate();
      setShowWeightPrompt(false);
    },
    onError: (error) => {
      console.error("Failed to save weight:", error);
    },
  });

  useEffect(() => {
    const currentDate = new Date();
    const todayLocal = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    if (session && !weightLoading && !todayWeight && selectedDate.getTime() === todayLocal.getTime()) {
      const timer = setTimeout(() => setShowWeightPrompt(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [session, weightLoading, todayWeight, selectedDate]);

  const handleSaveWeight = (weight: number, imageUrl?: string | null) => {
    upsertWeight.mutate({
      localDate: convertLocalToUTCForStorage(selectedDate),
      weight,
      imageUrl: imageUrl || undefined,
    });
  };

  const isCriticalDataLoading = subscriptionLoading;
  const isOtherDataLoading = macrosLoading || intestinalLoading || weightLoading;

  if (status === "loading" || isCriticalDataLoading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-micro text-muted">{t("loadingDashboard")}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Compute totals & flags (must come before the partial-loading branch so the header pillars
  // can render even while secondary queries finish.)
  const totalMacros = todayMacros.reduce(
    (acc: any, entry: any) => {
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

  const displayWeight = todayWeight?.weight || latestWeight?.weight;
  const isLatestWeight = !todayWeight && latestWeight;

  const isUnlimited = subscriptionStatus?.hasUnlimitedAccess;
  const aiUsagePercent = subscriptionStatus?.limits.aiCalculations
    ? (subscriptionStatus.monthlyAiUsage / subscriptionStatus.limits.aiCalculations) * 100
    : 0;
  const uploadUsagePercent = subscriptionStatus?.limits.uploads
    ? (subscriptionStatus.monthlyUploads / subscriptionStatus.limits.uploads) * 100
    : 0;

  const showUsageWarning = !isUnlimited && (aiUsagePercent > 80 || uploadUsagePercent > 80);
  const limitReached = !isUnlimited && (aiUsagePercent >= 100 || uploadUsagePercent >= 100);

  const userName = session.user?.name || session.user?.email?.split("@")[0] || "User";

  // Pillar values
  const caloriesIn = Math.round(calorieBalance?.caloriesConsumed ?? totalMacros.calories);
  const caloriesOut = Math.round(calorieBalance?.totalCaloriesBurned ?? 0);
  const netBalance = calorieBalance
    ? (calorieBalance.isDeficit ? -Math.abs(calorieBalance.calorieBalance) : Math.abs(calorieBalance.calorieBalance))
    : caloriesIn - caloriesOut;

  const subscriptionBadge = subscriptionStatus ? (
    subscriptionStatus.subscriptionStatus === "free" ? (
      <Badge variant="secondary" className="inline-flex items-center gap-1.5">
        <Zap className="h-3 w-3" />
        {t("freePlan")}
      </Badge>
    ) : subscriptionStatus.isUnlimited ? (
      <Badge variant="iron" className="inline-flex items-center gap-1.5">
        <Crown className="h-3 w-3" />
        {t("unlimited")}
      </Badge>
    ) : (
      <Badge variant="iron" className="inline-flex items-center gap-1.5">
        <Crown className="h-3 w-3" />
        {t("premium")}
      </Badge>
    )
  ) : null;

  const pageHeader = (
    <header className="flex flex-wrap items-end justify-between gap-6 pb-7 mb-8 border-b border-hairline">
      <div className="min-w-0">
        <p className="text-micro text-muted mb-3">{t("trackDailyHealth")}</p>
        <h1 className="font-display text-h1 leading-[1] tracking-tight text-ink">
          {formatDate(selectedDate, "EEEE,", { locale: dateLocale })}{" "}
          <em className="text-iron not-italic font-display italic">
            {formatDate(selectedDate, "MMMM d", { locale: dateLocale })}.
          </em>
        </h1>
        <p className="mt-3 text-sm text-muted">
          {t("welcomeBack", { name: userName })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {subscriptionBadge}
        <LanguageSwitcher />
        <LocalizedLink href="/calendar">
          <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t("calendar")}</span>
          </Button>
        </LocalizedLink>
        <LocalizedLink href="/subscription">
          <Button variant="outline" size="sm">
            <span className="hidden sm:inline">{isUnlimited ? t("managePlan") : t("upgrade")}</span>
            <span className="sm:hidden">{isUnlimited ? t("plan") : t("upgrade")}</span>
          </Button>
        </LocalizedLink>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
          {t("signOut")}
        </Button>
      </div>
    </header>
  );

  if (isOtherDataLoading) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
          {pageHeader}
          <div className="flex items-center justify-center py-24">
            <p className="text-micro text-muted">{t("loadingHealthData")}</p>
          </div>
        </div>
      </div>
    );
  }

  const dateNav = (
    <div className="flex items-center justify-between border-y border-hairline py-3 mb-10">
      <Button variant="outline" size="sm" onClick={goToPreviousDay} aria-label="Previous day">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="flex items-center gap-3">
        <Calendar className="h-4 w-4 text-muted" />
        <Input
          type="date"
          value={format(selectedDate, "yyyy-MM-dd")}
          onChange={handleDateInputChange}
          className="w-[160px] font-mono tnum text-sm"
        />
        {!isSelectedDateToday && (
          <Button variant="ghost" size="sm" onClick={goToToday} className="text-micro">
            {tCommon("today")}
          </Button>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={goToNextDay} aria-label="Next day">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
        {pageHeader}

        {/* Usage warning */}
        {(showUsageWarning || limitReached) && (
          <div
            className={cn(
              "mb-10 border p-6",
              limitReached ? "border-iron bg-iron-soft" : "border-hairline-strong bg-paper-2"
            )}
          >
            <div className="flex items-start gap-4">
              <AlertTriangle className={cn("h-5 w-5 mt-0.5", limitReached ? "text-iron" : "text-ink")} />
              <div className="flex-1">
                <h3 className={cn("font-display text-h3", limitReached ? "text-iron" : "text-ink")}>
                  {limitReached ? t("usageLimitReached") : t("usageWarning")}
                </h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">
                  {limitReached ? t("limitReachedMessage") : t("usageWarningMessage")}
                </p>
                <div className="mt-4 space-y-2">
                  {!isUnlimited && subscriptionStatus && (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="text-micro text-muted w-24">{t("aiUsage")}</span>
                        <Progress value={aiUsagePercent} className="flex-1 h-1.5" />
                        <span className="font-mono tnum text-xs text-ink w-20 text-right">
                          {subscriptionStatus.monthlyAiUsage}/{subscriptionStatus.limits.aiCalculations}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-micro text-muted w-24">{t("uploads")}</span>
                        <Progress value={uploadUsagePercent} className="flex-1 h-1.5" />
                        <span className="font-mono tnum text-xs text-ink w-20 text-right">
                          {subscriptionStatus.monthlyUploads}/{subscriptionStatus.limits.uploads}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <LocalizedLink href="/subscription">
                <Button size="sm" variant={limitReached ? "iron" : "default"}>
                  {t("upgradeNow")}
                </Button>
              </LocalizedLink>
            </div>
          </div>
        )}

        {dateNav}

        {/* Pillar strip — the SaaS-killer row */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-y border-hairline mb-10">
          <Pillar label={t("caloriesIn")} value={caloriesIn} unit="kcal" />
          <Pillar label={t("caloriesOut")} value={caloriesOut} unit="kcal" />
          <Pillar
            label={t("balance")}
            value={netBalance}
            unit="kcal"
            accent={netBalance < 0}
            signed
          />
          <Pillar
            label={t("weight")}
            value={displayWeight ?? "—"}
            unit={displayWeight ? "kg" : undefined}
          />
        </div>

        {/* BMR / TDEE footnote */}
        {calorieBalance && (
          <p className="text-micro text-muted-2 mb-12 font-mono tnum normal-case tracking-normal text-[11px]">
            {t("bmrTdeeInfo", { bmr: calorieBalance.bmr, tdee: calorieBalance.tdee })}
          </p>
        )}

        {/* Profile setup prompt */}
        {userProfile && (!(userProfile as any).birthDate || !(userProfile as any).gender || !(userProfile as any).heightCm) && (
          <div className="mb-10 border border-hairline bg-paper-2 p-6">
            <div className="flex items-start gap-3 mb-3">
              <User className="h-4 w-4 text-ink mt-0.5" />
              <div>
                <h3 className="font-display text-h3 text-ink">{t("completeProfile")}</h3>
                <p className="text-sm text-muted mt-1 leading-relaxed">{t("completeProfileDesc")}</p>
              </div>
            </div>
            <LocalizedLink href="/profile">
              <Button size="sm">{t("completeProfileButton")}</Button>
            </LocalizedLink>
          </div>
        )}

        {/* Profile card */}
        {userProfile && (
          <div className="mb-10 border border-hairline bg-surface">
            <div className="flex items-center justify-between p-5 border-b border-hairline">
              <div className="inline-flex items-center gap-2">
                <User className="h-4 w-4 text-muted" />
                <h3 className="text-micro text-ink">{t("yourProfile")}</h3>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                  className="text-micro"
                >
                  {isProfileExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      {t("hide")}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {t("show")}
                    </>
                  )}
                </Button>
                <LocalizedLink href="/profile">
                  <Button variant="ghost" size="sm" className="text-micro">
                    {t("edit")}
                  </Button>
                </LocalizedLink>
              </div>
            </div>
            {isProfileExpanded && (
              <div className="p-5 space-y-2.5 text-sm">
                {userProfile.birthDate && (
                  <ProfileRow label={t("age")} value={`${calculateAge(userProfile.birthDate)} ${t("years")}`} />
                )}
                {userProfile.gender && (
                  <ProfileRow label={t("gender")} value={userProfile.gender} valueClass="capitalize" />
                )}
                {userProfile.heightCm && (
                  <ProfileRow label={t("height")} value={`${userProfile.heightCm} cm`} />
                )}
                {userProfile.activityLevel && (
                  <ProfileRow
                    label={t("activity")}
                    value={userProfile.activityLevel.replace(/_/g, " ")}
                    valueClass="capitalize"
                  />
                )}
                {(!userProfile.birthDate || !userProfile.gender || !userProfile.heightCm || !userProfile.activityLevel) && (
                  <p className="text-micro text-iron mt-3">{t("completeProfileWarning")}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Macro detail strip */}
        <section className="mb-12">
          <div className="flex items-end justify-between pb-4 border-b border-hairline mb-0">
            <h2 className="font-display text-h2 text-ink">
              {isSelectedDateToday
                ? t("todaysTotalMacros")
                : t("totalMacrosForDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
            </h2>
          </div>
          <div className="grid grid-cols-5 border-b border-hairline">
            <MacroCell label={t("calories")} value={Math.round(totalMacros.calories)} />
            <MacroCell label={t("protein")} value={Math.round(totalMacros.protein)} unit="g" />
            <MacroCell label={t("carbs")} value={Math.round(totalMacros.carbs)} unit="g" />
            <MacroCell label={t("fat")} value={Math.round(totalMacros.fat)} unit="g" />
            <MacroCell label={t("water")} value={Math.round(totalMacros.water)} unit="ml" />
          </div>
        </section>

        {/* Quick-log row */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
          <QuickLog
            label={t("mealsLogged")}
            count={todayMacros.length}
            detail={
              isSelectedDateToday
                ? t("entriesToday")
                : t("entriesOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })
            }
            cta={t("logMeal")}
            href={isSelectedDateToday ? "/food" : `/food?date=${format(selectedDate, "yyyy-MM-dd")}`}
          />
          <QuickLog
            label={t("healthEntries")}
            count={todayIntestinal.length}
            detail={
              isSelectedDateToday
                ? t("logsToday")
                : t("logsOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })
            }
            cta={t("logHealth")}
            href={isSelectedDateToday ? "/health" : `/health?date=${format(selectedDate, "yyyy-MM-dd")}`}
          />
          <QuickLog
            label={t("activities")}
            count={todayActivities.length}
            detail={
              isSelectedDateToday
                ? t("exercisesToday")
                : t("exercisesOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })
            }
            cta={t("logActivity")}
            href={isSelectedDateToday ? "/activity" : `/activity?date=${format(selectedDate, "yyyy-MM-dd")}`}
          />
          <div className="flex flex-col">
            <div className="text-micro text-muted mb-3">{t("currentWeight")}</div>
            <div className="font-display tnum text-data-md text-ink leading-none">
              {displayWeight ? (
                <>
                  {displayWeight}
                  <span className="ml-1.5 font-sans text-sm text-muted font-normal">kg</span>
                </>
              ) : (
                "—"
              )}
            </div>
            <p className="text-xs text-muted mt-2 leading-snug">
              {isLatestWeight
                ? `${t("from")} ${formatDate(convertUTCToLocalDisplay(new Date(latestWeight!.localDate)), "MMM d", { locale: dateLocale })}`
                : todayWeight
                  ? isSelectedDateToday
                    ? t("todaysWeight")
                    : t("weightOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })
                  : t("noData")}
            </p>
            <div className="flex flex-col gap-1 mt-3">
              {!todayWeight && isSelectedDateToday && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWeightPrompt(true)}
                  className="text-micro justify-start px-0"
                >
                  {t("addTodaysWeight")}
                </Button>
              )}
              <LocalizedLink href={isSelectedDateToday ? "/weight" : `/weight?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                <Button variant="ghost" size="sm" className="text-micro justify-start px-0">
                  {t("viewAllEntries")}
                </Button>
              </LocalizedLink>
            </div>
          </div>
        </section>

        {/* Recent activity — two columns, typographic differentiation */}
        <section className="grid md:grid-cols-2 gap-12">
          {/* Recent meals */}
          <div>
            <div className="flex items-end justify-between pb-4 border-b border-hairline mb-0">
              <div>
                <h2 className="font-display text-h2 text-ink">{t("recentMeals")}</h2>
                <p className="text-sm text-muted mt-1">{t("yourLatestFoodEntries")}</p>
              </div>
              <LocalizedLink href={isSelectedDateToday ? "/food" : `/food?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                <Button variant="ghost" size="sm" className="text-micro">
                  {t("viewAll")}
                </Button>
              </LocalizedLink>
            </div>
            {macrosLoading ? (
              <p className="text-micro text-muted py-8">{t("loading")}</p>
            ) : todayMacros.length === 0 ? (
              <div className="py-10 border-b border-hairline">
                <p className="text-sm text-muted mb-4">
                  {isSelectedDateToday
                    ? t("noMealsLoggedToday")
                    : t("noMealsLoggedOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
                </p>
                <LocalizedLink href={isSelectedDateToday ? "/food" : `/food?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                  <Button size="sm">{t("logYourFirstMeal")}</Button>
                </LocalizedLink>
              </div>
            ) : (
              <ul>
                {todayMacros.slice(-3).reverse().map((entry: any) => (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[64px_1fr_auto] gap-4 py-4 border-b border-hairline items-start"
                  >
                    <div className="font-mono tnum text-xs text-muted pt-0.5">
                      {format(convertUTCToLocalDisplay(entry.localDateTime), "h:mm a")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink leading-snug truncate">{entry.description}</p>
                          {entry.calculatedMacros ? (
                            <p className="font-mono tnum text-[11px] text-muted-2 mt-1.5 leading-snug">
                              <span className="text-ink">{Math.round(entry.calculatedMacros.protein)}g</span>{" "}
                              {t("protein").toLowerCase()}
                              {"  ·  "}
                              <span className="text-ink">{Math.round(entry.calculatedMacros.carbs)}g</span>{" "}
                              {t("carbs").toLowerCase()}
                              {"  ·  "}
                              <span className="text-ink">{Math.round(entry.calculatedMacros.fat)}g</span>{" "}
                              {t("fat").toLowerCase()}
                              {entry.calculatedMacros.water ? (
                                <>
                                  {"  ·  "}
                                  <span className="text-ink">{Math.round(entry.calculatedMacros.water)}ml</span>{" "}
                                  {t("water").toLowerCase()}
                                </>
                              ) : null}
                            </p>
                          ) : (
                            <p className="text-xs text-muted italic mt-1">{t("calculatingMacros")}</p>
                          )}
                          {entry.calculationExplanation && entry.calculatedMacros && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDetailsEntry(entry);
                                setIsDetailsModalOpen(true);
                              }}
                              className="text-micro px-0 h-auto mt-1.5"
                            >
                              <Info className="h-3 w-3 mr-1" />
                              {t("details")}
                            </Button>
                          )}
                        </div>
                        {entry.imageUrl && (
                          <div className="relative w-12 h-12 overflow-hidden border border-hairline flex-shrink-0">
                            <Image src={entry.imageUrl} alt="Meal" fill className="object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="font-mono tnum text-sm text-ink text-right whitespace-nowrap pt-0.5">
                      {entry.calculatedMacros ? Math.round(entry.calculatedMacros.calories) : "—"}
                      <span className="ml-1 text-[10px] text-muted">kcal</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent health entries */}
          <div>
            <div className="flex items-end justify-between pb-4 border-b border-hairline mb-0">
              <div>
                <h2 className="font-display text-h2 text-ink">{t("recentHealthEntries")}</h2>
                <p className="text-sm text-muted mt-1">{t("yourLatestHealthLogs")}</p>
              </div>
              <LocalizedLink href={isSelectedDateToday ? "/health" : `/health?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                <Button variant="ghost" size="sm" className="text-micro">
                  {t("viewAll")}
                </Button>
              </LocalizedLink>
            </div>
            {intestinalLoading ? (
              <p className="text-micro text-muted py-8">{t("loading")}</p>
            ) : todayIntestinal.length === 0 ? (
              <div className="py-10 border-b border-hairline">
                <p className="text-sm text-muted mb-4">
                  {isSelectedDateToday
                    ? t("noHealthEntriesToday")
                    : t("noHealthEntriesOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
                </p>
                <LocalizedLink href={isSelectedDateToday ? "/health" : `/health?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                  <Button size="sm" variant="outline">
                    {t("logFirstEntry")}
                  </Button>
                </LocalizedLink>
              </div>
            ) : (
              <ul>
                {todayIntestinal.slice(-3).reverse().map((entry: any) => (
                  <li
                    key={entry.id}
                    className="grid grid-cols-[64px_1fr_auto] gap-4 py-4 border-b border-hairline items-start"
                  >
                    <div className="font-mono tnum text-xs text-muted pt-0.5">
                      {format(convertUTCToLocalDisplay(entry.localDateTime), "h:mm a")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink leading-snug">
                            {t("bristolScaleType", { type: entry.consistency })}
                          </p>
                          <p className="font-mono tnum text-[11px] text-muted-2 mt-1.5 leading-snug">
                            <span className="text-ink">{entry.color}</span>{" "}
                            {t("color").toLowerCase()}
                            {"  ·  "}
                            <span className="text-ink">{entry.painLevel}/10</span>{" "}
                            {t("pain").toLowerCase()}
                          </p>
                        </div>
                        {entry.imageUrl && (
                          <div className="relative w-12 h-12 overflow-hidden border border-hairline flex-shrink-0">
                            <Image src={entry.imageUrl} alt="Health entry" fill className="object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="w-2" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Weight Prompt Modal */}
      <WeightPrompt
        isOpen={showWeightPrompt}
        onClose={() => setShowWeightPrompt(false)}
        onSave={handleSaveWeight}
        isLoading={upsertWeight.isLoading}
        date={selectedDate}
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

function Pillar({
  label,
  value,
  unit,
  accent = false,
  signed = false,
}: {
  label: string;
  value: number | string;
  unit?: string;
  accent?: boolean;
  signed?: boolean;
}) {
  const displayValue =
    signed && typeof value === "number" && value < 0
      ? `−${Math.abs(value).toLocaleString()}`
      : signed && typeof value === "number" && value > 0
        ? `+${value.toLocaleString()}`
        : typeof value === "number"
          ? value.toLocaleString()
          : value;

  return (
    <div className="p-6 md:p-8 border-r border-hairline last:border-r-0 [&:nth-child(2)]:border-r-0 md:[&:nth-child(2)]:border-r [&:nth-child(-n+2)]:border-b md:[&:nth-child(-n+2)]:border-b-0">
      <div className="text-micro text-muted mb-3">{label}</div>
      <div
        className={cn(
          "font-display tnum text-data-xl leading-none",
          accent ? "text-iron" : "text-ink"
        )}
      >
        {displayValue}
        {unit && <span className="ml-1.5 font-sans text-sm text-muted font-normal">{unit}</span>}
      </div>
    </div>
  );
}

function MacroCell({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="p-5 border-r border-hairline last:border-r-0">
      <div className="text-micro text-muted mb-2">{label}</div>
      <div className="font-display tnum text-data-md text-ink leading-none">
        {value.toLocaleString()}
        {unit && <span className="ml-1 font-sans text-xs text-muted font-normal">{unit}</span>}
      </div>
    </div>
  );
}

function QuickLog({
  label,
  count,
  detail,
  cta,
  href,
}: {
  label: string;
  count: number;
  detail: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-micro text-muted mb-3">{label}</div>
      <div className="font-display tnum text-data-md text-ink leading-none">{count}</div>
      <p className="text-xs text-muted mt-2 leading-snug">{detail}</p>
      <div className="mt-3">
        <LocalizedLink href={href}>
          <Button size="sm" variant="outline" className="w-full">
            {cta}
          </Button>
        </LocalizedLink>
      </div>
    </div>
  );
}

function ProfileRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-micro text-muted">{label}</span>
      <span className={cn("text-sm text-ink", valueClass)}>{value}</span>
    </div>
  );
}
