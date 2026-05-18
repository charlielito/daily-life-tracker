"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useLocalizedRouter } from "@/utils/useLocalizedRouter";
import { api } from "@/utils/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
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
      refetch();
      setTimeout(() => {
        router.replace('/subscription', { scroll: false });
      }, 100);
    }

    if (canceled === 'true') {
      setShowCancelMessage(true);
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
      <div className="min-h-screen bg-paper text-ink">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-16">
          <p className="text-muted">{tCommon("loading")}</p>
        </div>
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
      <div className="min-h-screen bg-paper text-ink">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-16">
          <p className="text-muted">{tCommon("loading")}</p>
        </div>
      </div>
    );
  }

  const isUnlimited = subscriptionStatus?.hasUnlimitedAccess;
  const planStatusRaw =
    subscriptionStatus?.subscriptionStatus?.toUpperCase() || tCommon("free").toUpperCase();
  const aiUsagePercent = subscriptionStatus?.limits.aiCalculations
    ? (subscriptionStatus.monthlyAiUsage / subscriptionStatus.limits.aiCalculations) * 100
    : 0;
  const uploadUsagePercent = subscriptionStatus?.limits.uploads
    ? (subscriptionStatus.monthlyUploads / subscriptionStatus.limits.uploads) * 100
    : 0;

  const freeFeatures = [
    t("freePlanAiCalculations"),
    t("freePlanImageUploads"),
    t("freePlanBasicTracking"),
  ];

  const premiumFeatures = [
    t("unlimitedAi"),
    t("unlimitedImageUploads"),
    t("allTrackingFeatures"),
    t("prioritySupport"),
    t("futurePremiumFeatures"),
  ];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-12">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToDashboard")}
          </Button>
          <LanguageSwitcher />
        </div>

        {/* Header */}
        <header className="mb-14">
          <p className="text-micro text-muted mb-4">{t("title")}</p>
          <h1 className="font-display text-h1 mb-3">
            {isUnlimited ? t("premiumPlan") : t("freePlan")}
          </h1>
          <p className="text-muted text-base leading-relaxed max-w-2xl">
            {isUnlimited ? t("unlimitedAccess") : t("basicFeatures")}
          </p>
          <div className="mt-6">
            <Badge variant={isUnlimited ? "iron" : "outline"}>
              {planStatusRaw}
            </Badge>
          </div>
        </header>

        {/* Success / Cancel notices */}
        {(showSuccessMessage || showCancelMessage) && (
          <div className="mb-10 space-y-4">
            {showSuccessMessage && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  <strong className="font-medium">{t("welcomeToPremium")}</strong>{" "}
                  {t("subscriptionActivated")}
                </AlertDescription>
              </Alert>
            )}
            {showCancelMessage && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong className="font-medium">{t("subscriptionCanceled")}</strong>{" "}
                  {t("canUpgradeAnytime")}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Current usage (only on free plan) */}
        {!isUnlimited && (
          <section className="border-t border-hairline pt-10 mb-16">
            <p className="text-micro text-muted mb-8">{t("currentUsage")}</p>
            <div className="grid md:grid-cols-2 gap-x-16 gap-y-10">
              <div>
                <p className="text-micro text-muted mb-3">{t("aiMacroCalculations")}</p>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-display tnum text-data-xl leading-none">
                    {subscriptionStatus?.monthlyAiUsage || 0}
                  </span>
                  <span className="font-mono tnum text-sm text-muted">
                    / {subscriptionStatus?.limits.aiCalculations}
                  </span>
                </div>
                <Progress value={aiUsagePercent} className="mb-3" />
                <p className="font-mono tnum text-xs text-muted">
                  {t("calculationsRemaining", {
                    count:
                      subscriptionStatus?.limits.aiCalculations! -
                      (subscriptionStatus?.monthlyAiUsage || 0),
                  })}
                </p>
              </div>

              <div>
                <p className="text-micro text-muted mb-3">{t("imageUploads")}</p>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="font-display tnum text-data-xl leading-none">
                    {subscriptionStatus?.monthlyUploads || 0}
                  </span>
                  <span className="font-mono tnum text-sm text-muted">
                    / {subscriptionStatus?.limits.uploads}
                  </span>
                </div>
                <Progress value={uploadUsagePercent} className="mb-3" />
                <p className="font-mono tnum text-xs text-muted">
                  {t("uploadsRemaining", {
                    count:
                      subscriptionStatus?.limits.uploads! -
                      (subscriptionStatus?.monthlyUploads || 0),
                  })}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Manage subscription (only on active premium) */}
        {isUnlimited && subscriptionStatus?.subscriptionStatus === "active" && (
          <section className="border-t border-hairline pt-10 mb-16">
            <p className="text-micro text-muted mb-4">{t("billing")}</p>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <p className="text-base text-muted max-w-md">
                {t("manageSubscriptionDesc")}
              </p>
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={isCreatingPortal}
              >
                {isCreatingPortal ? t("openingPortal") : t("manageSubscription")}
              </Button>
            </div>
          </section>
        )}

        {/* Plans comparison — only show when not unlimited */}
        {!isUnlimited && (
          <section className="border-t border-hairline pt-10 mb-16">
            <p className="text-micro text-muted mb-2">{t("plans")}</p>
            <h2 className="font-display text-h1 mb-10 max-w-2xl">
              {t("upgradeToPremium")}
            </h2>

            <div className="grid md:grid-cols-2 md:divide-x divide-hairline">
              {/* Free plan column */}
              <div className="pb-8 md:pb-0 md:pr-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-h2">{t("freePlan")}</h3>
                  <Badge variant="outline">{tCommon("free").toUpperCase()}</Badge>
                </div>
                <div className="mb-8">
                  <span className="font-display tnum text-data-xl leading-none">$0</span>
                  <span className="font-mono tnum text-sm text-muted ml-2">
                    {t("perMonth")}
                  </span>
                </div>
                <ul className="border-t border-hairline">
                  {freeFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="py-3 border-b border-hairline text-sm text-ink"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button variant="outline" disabled className="w-full">
                    {t("currentPlan")}
                  </Button>
                </div>
              </div>

              {/* Premium plan column */}
              <div className="pt-8 md:pt-0 border-t border-hairline md:border-t-0 md:pl-10">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-h2">{t("premiumPlan")}</h3>
                  <Badge variant="iron">{t("mostPopular")}</Badge>
                </div>
                <div className="mb-8">
                  <span className="font-display tnum text-data-xl leading-none">$7.99</span>
                  <span className="font-mono tnum text-sm text-muted ml-2">
                    {t("perMonth")}
                  </span>
                </div>
                <ul className="border-t border-hairline">
                  {premiumFeatures.map((feature) => (
                    <li
                      key={feature}
                      className="py-3 border-b border-hairline text-sm text-ink"
                    >
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button
                    variant="iron"
                    onClick={handleUpgrade}
                    className="w-full"
                    disabled={isCreatingCheckout}
                  >
                    {isCreatingCheckout ? t("redirecting") : t("upgradeNow")}
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* FAQs */}
        <section className="border-t border-hairline pt-10">
          <p className="text-micro text-muted mb-2">{t("faqs")}</p>
          <h2 className="font-display text-h2 mb-8">{t("faqsHeading")}</h2>
          <div className="border-t border-hairline">
            <div className="py-6 border-b border-hairline">
              <h3 className="font-medium text-ink mb-2">{t("howDoLimitsWork")}</h3>
              <p className="text-muted text-sm leading-relaxed max-w-2xl">
                {t("limitsExplanation")}
              </p>
            </div>
            <div className="py-6 border-b border-hairline">
              <h3 className="font-medium text-ink mb-2">{t("canCancelAnytime")}</h3>
              <p className="text-muted text-sm leading-relaxed max-w-2xl">
                {t("cancelExplanation")}
              </p>
            </div>
            <div className="py-6 border-b border-hairline">
              <h3 className="font-medium text-ink mb-2">{t("whatHappensToData")}</h3>
              <p className="text-muted text-sm leading-relaxed max-w-2xl">
                {t("downgradeExplanation")}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
