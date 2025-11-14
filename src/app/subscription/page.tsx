"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { api } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, Zap, Crown, ArrowLeft, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { env } from "@/env.js";
import { useTranslations } from "@/utils/useTranslations";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function SubscriptionPage() {
  const { data: session, status } = useSession();
  const router = useLocalizedRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslations("subscription");
  const { t: tCommon } = useTranslations("common");
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showCancelMessage, setShowCancelMessage] = useState(false);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);

  const { data: subscriptionStatus, isLoading, refetch } = api.subscription.getStatus.useQuery();
  const { data: stripeConfig } = api.subscription.getConfig.useQuery();

  // Handle URL parameters when returning from Stripe
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      setShowSuccessMessage(true);
      // Refresh subscription status to get latest data
      refetch();
      // Clean up URL after a delay
      setTimeout(() => {
        router.replace('/subscription', { scroll: false });
      }, 100);
    }
    
    if (canceled === 'true') {
      setShowCancelMessage(true);
      // Clean up URL after a delay
      setTimeout(() => {
        router.replace('/subscription', { scroll: false });
      }, 100);
    }
  }, [searchParams, refetch, router]);

  // Auto-hide success message after 10 seconds
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => {
        setShowSuccessMessage(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  // Auto-hide cancel message after 5 seconds
  useEffect(() => {
    if (showCancelMessage) {
      const timer = setTimeout(() => {
        setShowCancelMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showCancelMessage]);

  const createCheckoutSession = api.subscription.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    },
    onError: (error) => {
      console.error("Checkout error:", error);
      setIsCreatingCheckout(false);
    },
  });

  const createPortalSession = api.subscription.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      }
    },
    onError: (error) => {
      console.error("Portal error:", error);
      setIsCreatingPortal(false);
    },
  });

  // Redirect to sign-in if not authenticated
  if (status === "loading") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{tCommon("loading")}</div>
      </div>
    );
  }

  if (!session) {
    router.push("/auth/signin");
    return null;
  }

  const handleUpgrade = () => {
    if (!stripeConfig?.premiumPriceId) {
      console.error("No price ID available");
      return;
    }

    setIsCreatingCheckout(true);
    const currentUrl = typeof window !== "undefined" ? window.location.origin : "";
    
    createCheckoutSession.mutate({
      priceId: stripeConfig.premiumPriceId,
      successUrl: `${currentUrl}/subscription?success=true`,
      cancelUrl: `${currentUrl}/subscription?canceled=true`,
    });
  };

  const handleManageSubscription = () => {
    setIsCreatingPortal(true);
    const currentUrl = typeof window !== "undefined" ? window.location.origin : "";
    createPortalSession.mutate({
      returnUrl: `${currentUrl}/subscription`,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">{tCommon("loading")}</div>
      </div>
    );
  }

  const isUnlimited = subscriptionStatus?.hasUnlimitedAccess;
  const aiUsagePercent = subscriptionStatus?.limits.aiCalculations 
    ? (subscriptionStatus.monthlyAiUsage / subscriptionStatus.limits.aiCalculations) * 100 
    : 0;
  const uploadUsagePercent = subscriptionStatus?.limits.uploads
    ? (subscriptionStatus.monthlyUploads / subscriptionStatus.limits.uploads) * 100
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <LanguageSwitcher />
          <Button variant="ghost" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToDashboard")}
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("title")}</h1>
        <p className="text-gray-600">{t("subtitle")}</p>
      </div>

      {/* Success/Cancel Messages */}
      <div className="mb-6 space-y-4">
        {showSuccessMessage && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>{t("welcomeToPremium")}</strong> {t("subscriptionActivated")}
            </AlertDescription>
          </Alert>
        )}
        
        {showCancelMessage && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              <strong>{t("subscriptionCanceled")}</strong> {t("canUpgradeAnytime")}
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-6">
        {/* Current Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {isUnlimited ? (
                    <>
                      <Crown className="h-5 w-5 text-yellow-500" />
                      {t("premiumPlan")}
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 text-blue-500" />
                      {t("freePlan")}
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {isUnlimited 
                    ? t("unlimitedAccess")
                    : t("basicFeatures")
                  }
                </CardDescription>
              </div>
              <Badge variant={isUnlimited ? "default" : "secondary"}>
                {subscriptionStatus?.subscriptionStatus?.toUpperCase() || tCommon("free").toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isUnlimited ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span>{t("unlimitedAiCalculations")}</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span>{t("unlimitedImageUploads")}</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-4 w-4" />
                  <span>{t("prioritySupport")}</span>
                </div>
                
                {subscriptionStatus?.subscriptionStatus === "active" && (
                  <Button 
                    variant="outline" 
                    onClick={handleManageSubscription}
                    disabled={isCreatingPortal}
                  >
                    {isCreatingPortal ? t("openingPortal") : t("manageSubscription")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {/* AI Usage */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{t("aiMacroCalculations")}</span>
                    <span className="text-sm text-gray-500">
                      {subscriptionStatus?.monthlyAiUsage || 0} / {subscriptionStatus?.limits.aiCalculations}
                    </span>
                  </div>
                  <Progress value={aiUsagePercent} className="mb-2" />
                  <p className="text-xs text-gray-500">
                    {t("calculationsRemaining", { count: subscriptionStatus?.limits.aiCalculations! - (subscriptionStatus?.monthlyAiUsage || 0) })}
                  </p>
                </div>

                {/* Upload Usage */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">{t("imageUploads")}</span>
                    <span className="text-sm text-gray-500">
                      {subscriptionStatus?.monthlyUploads || 0} / {subscriptionStatus?.limits.uploads}
                    </span>
                  </div>
                  <Progress value={uploadUsagePercent} className="mb-2" />
                  <p className="text-xs text-gray-500">
                    {t("uploadsRemaining", { count: subscriptionStatus?.limits.uploads! - (subscriptionStatus?.monthlyUploads || 0) })}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        {!isUnlimited && (
          <Card>
            <CardHeader>
              <CardTitle>{t("upgradeToPremium")}</CardTitle>
              <CardDescription>{t("getUnlimitedAccess")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Free Plan */}
                <div className="border rounded-lg p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">{t("freePlan")}</h3>
                    <div className="text-2xl font-bold">$0<span className="text-sm font-normal">{t("perMonth")}</span></div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{t("freePlanAiCalculations")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{t("freePlanImageUploads")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{t("freePlanBasicTracking")}</span>
                    </li>
                  </ul>
                  <Button variant="outline" disabled className="w-full">
                    {t("currentPlan")}
                  </Button>
                </div>

                {/* Premium Plan */}
                <div className="border-2 border-blue-500 rounded-lg p-6 relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500">{t("mostPopular")}</Badge>
                  </div>
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">{t("premiumPlan")}</h3>
                    <div className="text-2xl font-bold">$7.99<span className="text-sm font-normal">{t("perMonth")}</span></div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{t("unlimitedAi")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{t("unlimitedImageUploads")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{t("allTrackingFeatures")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{t("prioritySupport")}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{t("futurePremiumFeatures")}</span>
                    </li>
                  </ul>
                  <Button 
                    onClick={handleUpgrade} 
                    className="w-full"
                    disabled={isCreatingCheckout}
                  >
                    {isCreatingCheckout ? t("redirecting") : t("upgradeNow")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FAQs */}
        <Card>
          <CardHeader>
            <CardTitle>{t("faqs")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">{t("howDoLimitsWork")}</h4>
              <p className="text-sm text-gray-600">
                {t("limitsExplanation")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t("canCancelAnytime")}</h4>
              <p className="text-sm text-gray-600">
                {t("cancelExplanation")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{t("whatHappensToData")}</h4>
              <p className="text-sm text-gray-600">
                {t("downgradeExplanation")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 