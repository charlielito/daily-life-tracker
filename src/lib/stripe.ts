import Stripe from "stripe";
import { env } from "@/env.js";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-06-30.basil",
  typescript: true,
});

export const STRIPE_CONFIG = {
  // Usage limits for free tier
  FREE_LIMITS: {
    AI_CALCULATIONS: 20, // AI macro calculations per month
    UPLOADS: 5, // Image uploads per month
  },
  
  // Pricing
  PREMIUM_PRICE_ID: env.STRIPE_PREMIUM_PRICE_ID, // Get from environment variable
  
  // Trial period (days)
  TRIAL_PERIOD_DAYS: 7,
} as const; 