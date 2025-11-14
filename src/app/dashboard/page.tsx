"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WeightPrompt } from "@/components/ui/weight-prompt";
import { Input } from "@/components/ui/input";
import { format, addDays, subDays } from "date-fns";
import { formatDate } from "@/utils/formatDate";
import Image from "next/image";
import { AlertTriangle, Crown, Zap, Flame, User, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { convertUTCToLocalDisplay, convertLocalToUTCForStorage } from "@/utils/dateUtils";
import { MacroDetailsModal } from "@/components/ui/macro-details-modal";
import { calculateAge } from "@/utils/ageUtils";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { useTranslations } from "@/utils/useTranslations";
import { useDateLocale } from "@/utils/useDateLocale";
import { LocalizedLink } from "@/components/ui/localized-link";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const { t } = useTranslations("dashboard");
  const dateLocale = useDateLocale();
  const [detailsEntry, setDetailsEntry] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  
  // Date selection state - starts with today
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    // Create a date that represents today in local time, normalized to start of day
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  // Helper to get today for comparison
  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);

  // Date navigation functions
  const goToPreviousDay = () => {
    setSelectedDate(prevDate => subDays(prevDate, 1));
  };

  const goToNextDay = () => {
    setSelectedDate(prevDate => addDays(prevDate, 1));
  };

  const goToToday = () => {
    setSelectedDate(today);
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value);
    setSelectedDate(newDate);
  };

  // Check if selected date is today
  const isSelectedDateToday = selectedDate.getTime() === today.getTime();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  // Fetch subscription status - this is critical for the dashboard
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = api.subscription.getStatus.useQuery(
    undefined,
    { enabled: !!session }
  );

  // Fetch today's data
  const { data: todayMacros = [], isLoading: macrosLoading } = api.macros.getToday.useQuery(
    { date: selectedDate },
    { enabled: !!session }
  );

  const { data: todayIntestinal = [], isLoading: intestinalLoading } = api.intestinal.getToday.useQuery(
    { date: selectedDate },
    { enabled: !!session }
  );

  // Fetch today's activity data
  const { data: todayActivities = [], isLoading: activitiesLoading } = api.activity.getToday.useQuery(
    { date: selectedDate },
    { enabled: !!session }
  );

  // Fetch daily calorie balance
  const { data: calorieBalance } = api.activity.getDailyCalorieBalance.useQuery(
    { date: selectedDate },
    { enabled: !!session }
  );

  // Fetch user profile for setup prompts
  const { data: userProfile } = api.activity.getUserProfile.useQuery(
    undefined,
    { enabled: !!session }
  );

  // Fetch today's weight
  const { data: todayWeight, isLoading: weightLoading } = api.weight.getByDate.useQuery(
    { localDate: convertLocalToUTCForStorage(selectedDate) },
    { enabled: !!session }
  );

  // Fetch latest weight for fallback
  const { data: latestWeight } = api.weight.getLatest.useQuery(
    undefined,
    { enabled: !!session && !todayWeight }
  );


  const utils = api.useContext();

  // Weight upsert mutation
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

  // Check if we should show weight prompt (only for today, and only if no weight exists)
  useEffect(() => {
    const currentDate = new Date();
    const todayLocal = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
    if (session && !weightLoading && !todayWeight && selectedDate.getTime() === todayLocal.getTime()) {
      // Show prompt after a short delay to let the dashboard load first
      const timer = setTimeout(() => setShowWeightPrompt(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [session, weightLoading, todayWeight, selectedDate]);

  const handleSaveWeight = (weight: number, imageUrl?: string | null) => {
    upsertWeight.mutate({
      localDate: convertLocalToUTCForStorage(selectedDate),
      weight,
      imageUrl: imageUrl || undefined, // Convert null to undefined for API
    });
  };

  // Check if any critical data is still loading
  // Prioritize subscription status as it affects the entire UI layout
  const isCriticalDataLoading = subscriptionLoading;
  const isOtherDataLoading = macrosLoading || intestinalLoading || weightLoading;

  if (status === "loading" || isCriticalDataLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">{t("loadingDashboard")}</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to sign-in
  }

  // If subscription is loaded but other data is still loading, show partial content
  if (isOtherDataLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header with subscription info */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t("welcomeBack", { name: session.user?.name || session.user?.email?.split('@')[0] || "User" })} 👋
              </h1>
            </div>
            <p className="text-sm md:text-base text-gray-600">
              {formatDate(selectedDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })} • {t("trackDailyHealth")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Subscription Badge */}
            {subscriptionStatus && (
              <div className="flex items-center gap-2">
                {subscriptionStatus.subscriptionStatus === 'free' ? (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {t("freePlan")}
                  </Badge>
                ) : subscriptionStatus.isUnlimited ? (
                  <Badge variant="default" className="flex items-center gap-1 bg-purple-600">
                    <Crown className="h-3 w-3" />
                    {t("unlimited")}
                  </Badge>
                ) : (
                  <Badge variant="default" className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500">
                    <Crown className="h-3 w-3" />
                    {t("premium")}
                  </Badge>
                )}
              </div>
            )}
            <Button variant="outline" onClick={() => signOut()}>
              {t("signOut")}
            </Button>
          </div>
        </div>

        {/* Loading content */}
        <div className="flex items-center justify-center py-16">
          <div className="text-lg text-gray-600">{t("loadingHealthData")}</div>
        </div>
      </div>
    );
  }

  // Calculate total macros for today
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

  // Display weight (today's weight or latest weight)
  const displayWeight = todayWeight?.weight || latestWeight?.weight;
  const isLatestWeight = !todayWeight && latestWeight;

  // Usage warnings
  const isUnlimited = subscriptionStatus?.hasUnlimitedAccess;
  const aiUsagePercent = subscriptionStatus?.limits.aiCalculations 
    ? (subscriptionStatus.monthlyAiUsage / subscriptionStatus.limits.aiCalculations) * 100 
    : 0;
  const uploadUsagePercent = subscriptionStatus?.limits.uploads
    ? (subscriptionStatus.monthlyUploads / subscriptionStatus.limits.uploads) * 100
    : 0;

  const showUsageWarning = !isUnlimited && (aiUsagePercent > 80 || uploadUsagePercent > 80);
  const limitReached = !isUnlimited && (aiUsagePercent >= 100 || uploadUsagePercent >= 100);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Sign Out */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t("welcomeBack", { name: session.user?.name || session.user?.email?.split('@')[0] || "User" })} 👋
              </h1>
              {subscriptionStatus && (
                <Badge variant={isUnlimited ? "default" : "secondary"} className="flex items-center gap-1">
                  {isUnlimited ? (
                    <>
                      <Crown className="h-3 w-3" />
                      {t("premium")}
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3" />
                      {t("free")}
                    </>
                  )}
                </Badge>
              )}
            </div>
            <p className="text-sm md:text-base text-gray-600">
              {formatDate(selectedDate, "EEEE, MMMM d, yyyy", { locale: dateLocale })} • {t("trackDailyHealth")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LanguageSwitcher />
            <LocalizedLink href="/calendar">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              {t("signOut")}
            </Button>
          </div>
        </div>

        {/* Usage Warning Banner */}
        {(showUsageWarning || limitReached) && (
          <Card className={`mb-6 ${limitReached ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${limitReached ? 'text-red-500' : 'text-amber-500'}`} />
                <div className="flex-1">
                  <h3 className={`font-semibold ${limitReached ? 'text-red-800' : 'text-amber-800'}`}>
                    {limitReached ? t("usageLimitReached") : t("usageWarning")}
                  </h3>
                  <p className={`text-sm mt-1 ${limitReached ? 'text-red-700' : 'text-amber-700'}`}>
                    {limitReached 
                      ? t("limitReachedMessage")
                      : t("usageWarningMessage")
                    }
                  </p>
                  <div className="mt-3 space-y-2">
                    {!isUnlimited && subscriptionStatus && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium w-20">{t("aiUsage")}</span>
                          <Progress value={aiUsagePercent} className="flex-1 h-2" />
                          <span className="text-xs w-16 text-right">
                            {subscriptionStatus.monthlyAiUsage}/{subscriptionStatus.limits.aiCalculations}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium w-20">{t("uploads")}</span>
                          <Progress value={uploadUsagePercent} className="flex-1 h-2" />
                          <span className="text-xs w-16 text-right">
                            {subscriptionStatus.monthlyUploads}/{subscriptionStatus.limits.uploads}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <LocalizedLink href="/subscription">
                  <Button size="sm">
                    {t("upgradeNow")}
                  </Button>
                </LocalizedLink>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Date Navigation */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={goToPreviousDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-600" />
                <Input
                  type="date"
                  value={format(selectedDate, "yyyy-MM-dd")}
                  onChange={handleDateInputChange}
                  className="w-[160px]"
                />
              </div>
              
              {!isSelectedDateToday && (
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  {t("today")}
                </Button>
              )}
            </div>
            
            <Button variant="outline" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Content */}
      <div className="space-y-6">
        {/* Profile Setup Prompt */}
        {userProfile && (!(userProfile as any).birthDate || !(userProfile as any).gender || !(userProfile as any).heightCm) && (
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("completeProfile")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-orange-600 mb-2">
                {t("completeProfileDesc")}
              </p>
              <LocalizedLink href="/profile">
                <Button size="sm" className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                  {t("completeProfileButton")}
                </Button>
                  </LocalizedLink>
            </CardContent>
          </Card>
        )}

        {/* Calorie Balance Card - Prominent Feature */}
        {calorieBalance && (
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <Flame className="h-6 w-6" />
                {t("dailyCalorieBalance")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6">
                {/* Calorie Balance */}
                <div>
                  <div className="grid grid-cols-4 gap-2 md:gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-xl md:text-2xl font-bold text-blue-600">{calorieBalance.caloriesConsumed}</div>
                      <div className="text-xs text-gray-600">{t("consumed")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl md:text-2xl font-bold text-orange-600">{calorieBalance.totalCaloriesBurned}</div>
                      <div className="text-xs text-gray-600">{t("burnedTotal")}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl md:text-2xl font-bold text-purple-600">{calorieBalance.caloriesBurnedFromActivity}</div>
                      <div className="text-xs text-gray-600">{t("fromExercise")}</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-xl md:text-2xl font-bold ${calorieBalance.isDeficit ? 'text-green-600' : 'text-red-600'}`}>
                        {calorieBalance.isDeficit ? '-' : '+'}{Math.abs(calorieBalance.calorieBalance)}
                      </div>
                      <div className="text-xs text-gray-600">
                        {calorieBalance.isDeficit ? t("deficit") : t("surplus")}
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      calorieBalance.isDeficit 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {calorieBalance.isDeficit 
                        ? t("calorieDeficit")
                        : t("calorieSurplus")}
                    </div>
                  </div>
                  <div className="text-center mt-3">
                    <div className="text-xs text-gray-500">
                      {t("bmrTdeeInfo", { bmr: calorieBalance.bmr, tdee: calorieBalance.tdee })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Card - Separate from Calorie Balance */}
        {userProfile && (
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-800 text-sm">
                  <User className="h-4 w-4" />
                  {t("yourProfile")}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                    className="text-blue-600 hover:text-blue-700 text-xs h-7 px-2"
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
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 text-xs h-7 px-2">
                      {t("edit")}
                    </Button>
                  </LocalizedLink>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              {isProfileExpanded ? (
                <div className="space-y-1">
                  {userProfile.birthDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">{t("age")}:</span>
                      <span className="font-medium text-xs">{calculateAge(userProfile.birthDate)} {t("years")}</span>
                    </div>
                  )}
                  {userProfile.gender && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">{t("gender")}:</span>
                      <span className="font-medium text-xs capitalize">{userProfile.gender}</span>
                    </div>
                  )}
                  {userProfile.heightCm && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">{t("height")}:</span>
                      <span className="font-medium text-xs">{userProfile.heightCm} cm</span>
                    </div>
                  )}
                  {userProfile.activityLevel && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-xs">{t("activity")}:</span>
                      <span className="font-medium text-xs capitalize">{userProfile.activityLevel.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                  {(!userProfile.birthDate || !userProfile.gender || !userProfile.heightCm || !userProfile.activityLevel) && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-1.5 rounded mt-1">
                      {t("completeProfileWarning")}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-600 text-xs">
                  
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's Total Macros Card */}
        <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="flex items-center gap-2 text-emerald-800 text-sm">
              🍽️ {isSelectedDateToday ? t("todaysTotalMacros") : t("totalMacrosForDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-3">
            <div className="grid grid-cols-5 gap-2">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{Math.round(totalMacros.calories)}</div>
                <div className="text-xs text-gray-600">{t("calories")}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{Math.round(totalMacros.protein)}g</div>
                <div className="text-xs text-gray-600">{t("protein")}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{Math.round(totalMacros.carbs)}g</div>
                <div className="text-xs text-gray-600">{t("carbs")}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{Math.round(totalMacros.fat)}g</div>
                <div className="text-xs text-gray-600">{t("fat")}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-cyan-600">{Math.round(totalMacros.water)}ml</div>
                <div className="text-xs text-gray-600">{t("water")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Overview Cards - Optimized for mobile (2 per row) */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-700">{t("mealsLogged")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-green-800">{todayMacros.length}</div>
              <p className="text-xs text-green-600 mt-1">
                {isSelectedDateToday ? t("entriesToday") : t("entriesOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
              </p>
              <div className="mt-3">
                <LocalizedLink href={isSelectedDateToday ? "/food" : `/food?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                    {t("logMeal")}
                  </Button>
                </LocalizedLink>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">{t("healthEntries")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-purple-800">{todayIntestinal.length}</div>
              <p className="text-xs text-purple-600 mt-1">
                {isSelectedDateToday ? t("logsToday") : t("logsOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
              </p>
              <div className="mt-3">
                <LocalizedLink href={isSelectedDateToday ? "/health" : `/health?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                  <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    {t("logHealth")}
                  </Button>
                </LocalizedLink>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">{t("activities")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-amber-800">{todayActivities.length}</div>
              <p className="text-xs text-amber-600 mt-1">
                {isSelectedDateToday ? t("exercisesToday") : t("exercisesOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
              </p>
              <div className="mt-3">
                <LocalizedLink href={isSelectedDateToday ? "/activity" : `/activity?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                  <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white">
                    {t("logActivity")}
                  </Button>
                </LocalizedLink>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">{t("currentWeight")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl md:text-3xl font-bold text-orange-800">
                {displayWeight ? `${displayWeight}kg` : "—"}
              </div>
              <p className="text-xs text-orange-600 mt-1">
                {isLatestWeight 
                  ? `${t("from")} ${formatDate(convertUTCToLocalDisplay(new Date(latestWeight!.localDate)), "MMM d", { locale: dateLocale })}`
                  : todayWeight 
                    ? isSelectedDateToday ? t("todaysWeight") : t("weightOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })
                    : t("noData")
                }
              </p>
              <div className="flex flex-col gap-1 mt-2">
                {!todayWeight && isSelectedDateToday && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWeightPrompt(true)}
                    className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700"
                  >
                    {t("addTodaysWeight")}
                  </Button>
                )}
                <LocalizedLink href={isSelectedDateToday ? "/weight" : `/weight?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-orange-600 hover:text-orange-700"
                  >
                    {t("viewAllEntries")}
                  </Button>
                </LocalizedLink>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Meals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("recentMeals")}</CardTitle>
                <LocalizedLink href={isSelectedDateToday ? "/food" : `/food?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                  <Button variant="ghost" size="sm">{t("viewAll")}</Button>
                </LocalizedLink>
              </div>
              <CardDescription>{t("yourLatestFoodEntries")}</CardDescription>
            </CardHeader>
            <CardContent>
              {macrosLoading ? (
                <p className="text-gray-500">{t("loading")}</p>
              ) : todayMacros.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-2">
                    {isSelectedDateToday ? t("noMealsLoggedToday") : t("noMealsLoggedOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
                  </p>
                  <LocalizedLink href={isSelectedDateToday ? "/food" : `/food?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                    <Button size="sm">{t("logYourFirstMeal")}</Button>
                  </LocalizedLink>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayMacros.slice(-3).reverse().map((entry: any) => (
                    <div key={entry.id} className="border-b pb-3 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{entry.description}</p>
                              <p className="text-xs text-gray-500">
                                {format(convertUTCToLocalDisplay(entry.localDateTime), "h:mm a")}
                              </p>
                            </div>
                            {/* Small image thumbnail */}
                            {entry.imageUrl && (
                              <div className="relative w-10 h-10 rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                                <Image
                                  src={entry.imageUrl}
                                  alt="Meal"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                          {/* Macros display */}
                          {entry.calculatedMacros ? (
                            <div className="space-y-2">
                              <div className="grid grid-cols-5 gap-1 mt-2 text-xs">
                                <div className="text-center bg-blue-50 px-1 py-1 rounded">
                                  <div className="font-medium text-blue-700">
                                    {Math.round(entry.calculatedMacros.calories)}
                                  </div>
                                  <div className="text-[10px] text-blue-600">cal</div>
                                </div>
                                <div className="text-center bg-green-50 px-1 py-1 rounded">
                                  <div className="font-medium text-green-700">
                                    {Math.round(entry.calculatedMacros.protein)}g
                                  </div>
                                  <div className="text-[10px] text-green-600">{t("protein")}</div>
                                </div>
                                <div className="text-center bg-yellow-50 px-1 py-1 rounded">
                                  <div className="font-medium text-yellow-700">
                                    {Math.round(entry.calculatedMacros.carbs)}g
                                  </div>
                                  <div className="text-[10px] text-yellow-600">{t("carbs")}</div>
                                </div>
                                <div className="text-center bg-red-50 px-1 py-1 rounded">
                                  <div className="font-medium text-red-700">
                                    {Math.round(entry.calculatedMacros.fat)}g
                                  </div>
                                  <div className="text-[10px] text-red-600">{t("fat")}</div>
                                </div>
                                <div className="text-center bg-cyan-50 px-1 py-1 rounded">
                                  <div className="font-medium text-cyan-700">
                                    {Math.round(entry.calculatedMacros.water || 0)}ml
                                  </div>
                                  <div className="text-[10px] text-cyan-600">{t("water")}</div>
                                </div>
                              </div>
                              
                              {/* Details Button */}
                              {entry.calculationExplanation && (
                                <div className="flex justify-center">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setDetailsEntry(entry);
                                      setIsDetailsModalOpen(true);
                                    }}
                                    className="text-[10px] h-6 px-2"
                                  >
                                    <Info className="h-3 w-3 mr-1" />
                                    {t("details")}
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-gray-500 italic mt-1">
                              {t("calculatingMacros")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Health Entries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("recentHealthEntries")}</CardTitle>
                <LocalizedLink href={isSelectedDateToday ? "/health" : `/health?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                  <Button variant="ghost" size="sm">{t("viewAll")}</Button>
                </LocalizedLink>
              </div>
              <CardDescription>{t("yourLatestHealthLogs")}</CardDescription>
            </CardHeader>
            <CardContent>
              {intestinalLoading ? (
                <p className="text-gray-500">{t("loading")}</p>
              ) : todayIntestinal.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-2">
                    {isSelectedDateToday ? t("noHealthEntriesToday") : t("noHealthEntriesOnDate", { date: formatDate(selectedDate, "MMM d", { locale: dateLocale }) })}
                  </p>
                  <LocalizedLink href={isSelectedDateToday ? "/health" : `/health?date=${format(selectedDate, "yyyy-MM-dd")}`}>
                    <Button size="sm" variant="secondary">{t("logFirstEntry")}</Button>
                  </LocalizedLink>
                </div>
              ) : (
                <div className="space-y-3">
                  {todayIntestinal.slice(-3).reverse().map((entry: any) => (
                    <div key={entry.id} className="border-b pb-3 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{t("bristolScaleType", { type: entry.consistency })}</p>
                              <p className="text-xs text-gray-500">
                                {format(convertUTCToLocalDisplay(entry.localDateTime), "h:mm a")}
                              </p>
                            </div>
                            {/* Small image thumbnail */}
                            {entry.imageUrl && (
                              <div className="relative w-10 h-10 rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                                <Image
                                  src={entry.imageUrl}
                                  alt="Health entry"
                                  fill
                                  className="object-cover"
                                />
                              </div>
                            )}
                          </div>
                          {/* Health details */}
                          <div className="flex gap-2 mt-2">
                            <div className="text-center bg-gray-50 px-2 py-1 rounded text-xs">
                              <div className="font-medium text-gray-700">{entry.color}</div>
                              <div className="text-[10px] text-gray-600">{t("color")}</div>
                            </div>
                            <div className="text-center bg-red-50 px-2 py-1 rounded text-xs">
                              <div className="font-medium text-red-700">{entry.painLevel}/10</div>
                              <div className="text-[10px] text-red-600">{t("pain")}</div>
                            </div>
                          </div>
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