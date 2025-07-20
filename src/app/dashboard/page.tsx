"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WeightPrompt } from "@/components/ui/weight-prompt";
import { format } from "date-fns";
import Image from "next/image";
import { AlertTriangle, Crown, Zap } from "lucide-react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [today] = useState(new Date());
  const [showWeightPrompt, setShowWeightPrompt] = useState(false);

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/auth/signin");
      return;
    }
  }, [session, status, router]);

  // Fetch subscription status
  const { data: subscriptionStatus } = api.subscription.getStatus.useQuery(
    undefined,
    { enabled: !!session }
  );

  // Fetch today's data
  const { data: todayMacros = [], isLoading: macrosLoading } = api.macros.getToday.useQuery(
    { date: today },
    { enabled: !!session }
  );

  const { data: todayIntestinal = [], isLoading: intestinalLoading } = api.intestinal.getToday.useQuery(
    { date: today },
    { enabled: !!session }
  );

  // Fetch today's weight
  const { data: todayWeight, isLoading: weightLoading } = api.weight.getByDate.useQuery(
    { date: today },
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
    if (session && !weightLoading && !todayWeight && format(today, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")) {
      // Show prompt after a short delay to let the dashboard load first
      const timer = setTimeout(() => setShowWeightPrompt(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [session, weightLoading, todayWeight, today]);

  const handleSaveWeight = (weight: number) => {
    upsertWeight.mutate({
      date: today,
      weight,
    });
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-lg">Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to sign-in
  }

  // Calculate total macros for today
  const totalMacros = todayMacros.reduce(
    (acc: any, entry: any) => {
      if (entry.calculatedMacros) {
        acc.calories += entry.calculatedMacros.calories || 0;
        acc.protein += entry.calculatedMacros.protein || 0;
        acc.carbs += entry.calculatedMacros.carbs || 0;
        acc.fat += entry.calculatedMacros.fat || 0;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
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
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {session.user?.name || session.user?.email?.split('@')[0]}! 👋
              </h1>
              {subscriptionStatus && (
                <Badge variant={isUnlimited ? "default" : "secondary"} className="flex items-center gap-1">
                  {isUnlimited ? (
                    <>
                      <Crown className="h-3 w-3" />
                      Premium
                    </>
                  ) : (
                    <>
                      <Zap className="h-3 w-3" />
                      Free
                    </>
                  )}
                </Badge>
              )}
            </div>
            <p className="text-gray-600">
              {format(today, "EEEE, MMMM d, yyyy")} • Track your daily health
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/subscription">
              <Button variant="outline" size="sm">
                {isUnlimited ? "Manage Plan" : "Upgrade"}
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Sign Out
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
                    {limitReached ? 'Usage Limit Reached' : 'Usage Warning'}
                  </h3>
                  <p className={`text-sm mt-1 ${limitReached ? 'text-red-700' : 'text-amber-700'}`}>
                    {limitReached 
                      ? 'You\'ve reached your monthly limits. Upgrade to continue using AI features and image uploads.'
                      : 'You\'re approaching your monthly usage limits. Consider upgrading for unlimited access.'
                    }
                  </p>
                  <div className="mt-3 space-y-2">
                    {!isUnlimited && subscriptionStatus && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium w-20">AI Usage:</span>
                          <Progress value={aiUsagePercent} className="flex-1 h-2" />
                          <span className="text-xs w-16 text-right">
                            {subscriptionStatus.monthlyAiUsage}/{subscriptionStatus.limits.aiCalculations}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium w-20">Uploads:</span>
                          <Progress value={uploadUsagePercent} className="flex-1 h-2" />
                          <span className="text-xs w-16 text-right">
                            {subscriptionStatus.monthlyUploads}/{subscriptionStatus.limits.uploads}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Link href="/subscription">
                  <Button size="sm">
                    Upgrade Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Today's Stats - Big Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Today's Calories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800">{Math.round(totalMacros.calories)}</div>
            <p className="text-xs text-blue-600 mt-1">kcal consumed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Meals Logged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">{todayMacros.length}</div>
            <p className="text-xs text-green-600 mt-1">entries today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Health Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-800">{todayIntestinal.length}</div>
            <p className="text-xs text-purple-600 mt-1">logs today</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Current Weight</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-800">
              {displayWeight ? `${displayWeight}kg` : "—"}
            </div>
            <p className="text-xs text-orange-600 mt-1">
              {isLatestWeight 
                ? `from ${format(new Date(latestWeight!.date), "MMM d")}`
                : todayWeight 
                  ? "today's weight"
                  : "no data"
              }
            </p>
            {!todayWeight && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWeightPrompt(true)}
                className="mt-1 h-6 px-2 text-xs text-orange-600 hover:text-orange-700"
              >
                Add today's weight
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions - Prominent */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              🍽️ Log New Meal
            </CardTitle>
            <CardDescription>
              Add a meal and get AI-powered macro calculation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/food">
              <Button size="lg" className="w-full">
                Add Meal Now
              </Button>
            </Link>
            {todayMacros.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium">Today's Macros:</p>
                <p>P: {Math.round(totalMacros.protein)}g | C: {Math.round(totalMacros.carbs)}g | F: {Math.round(totalMacros.fat)}g</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              🏥 Log Health Entry
            </CardTitle>
            <CardDescription>
              Track intestinal health using Bristol Stool Scale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/health">
              <Button size="lg" className="w-full" variant="secondary">
                Log Health Now
              </Button>
            </Link>
            {todayIntestinal.length > 0 && (
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <p className="font-medium">Latest Entry:</p>
                <p>{format(new Date(todayIntestinal[todayIntestinal.length - 1].hour), "h:mm a")} • Pain: {todayIntestinal[todayIntestinal.length - 1].painLevel}/10</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Meals */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Meals</CardTitle>
              <Link href="/food">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <CardDescription>Your latest food entries</CardDescription>
          </CardHeader>
          <CardContent>
            {macrosLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : todayMacros.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-2">No meals logged today</p>
                <Link href="/food">
                  <Button size="sm">Log Your First Meal</Button>
                </Link>
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
                              {format(new Date(entry.hour), "h:mm a")}
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
                          <div className="grid grid-cols-4 gap-1 mt-2 text-xs">
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
                              <div className="text-[10px] text-green-600">protein</div>
                            </div>
                            <div className="text-center bg-yellow-50 px-1 py-1 rounded">
                              <div className="font-medium text-yellow-700">
                                {Math.round(entry.calculatedMacros.carbs)}g
                              </div>
                              <div className="text-[10px] text-yellow-600">carbs</div>
                            </div>
                            <div className="text-center bg-red-50 px-1 py-1 rounded">
                              <div className="font-medium text-red-700">
                                {Math.round(entry.calculatedMacros.fat)}g
                              </div>
                              <div className="text-[10px] text-red-600">fat</div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic mt-1">
                            Calculating macros...
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
              <CardTitle>Recent Health Entries</CardTitle>
              <Link href="/health">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <CardDescription>Your latest health logs</CardDescription>
          </CardHeader>
          <CardContent>
            {intestinalLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : todayIntestinal.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-2">No health entries today</p>
                <Link href="/health">
                  <Button size="sm" variant="secondary">Log First Entry</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayIntestinal.slice(-3).reverse().map((entry: any) => (
                  <div key={entry.id} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <p className="font-medium text-sm">Bristol Scale Type {entry.consistency}</p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(entry.hour), "h:mm a")}
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
                            <div className="text-[10px] text-gray-600">color</div>
                          </div>
                          <div className="text-center bg-red-50 px-2 py-1 rounded text-xs">
                            <div className="font-medium text-red-700">{entry.painLevel}/10</div>
                            <div className="text-[10px] text-red-600">pain</div>
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

      {/* Weight Prompt Modal */}
      <WeightPrompt
        isOpen={showWeightPrompt}
        onClose={() => setShowWeightPrompt(false)}
        onSave={handleSaveWeight}
        isLoading={upsertWeight.isLoading}
        date={today}
      />
    </div>
  );
} 