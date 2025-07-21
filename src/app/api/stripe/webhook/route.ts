import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { env } from "@/env.js";

// This is important for webhook signatures - we need the raw body
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body - this is crucial for webhook signature verification
    const body = await request.text();
    const signature = headers().get("stripe-signature");

    console.log("Webhook received:");
    console.log("- Body length:", body.length);
    console.log("- Signature present:", !!signature);
    console.log("- Webhook secret configured:", !!env.STRIPE_WEBHOOK_SECRET);

    if (!signature) {
      console.error("No Stripe signature found in headers");
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(
        body, 
        signature, 
        env.STRIPE_WEBHOOK_SECRET
      );
      console.log("Webhook signature verified successfully");
      console.log("Event type:", event.type);
      console.log("Event ID:", event.id);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      console.error("Raw error details:", {
        message: err instanceof Error ? err.message : 'Unknown error',
        signature,
        bodyPreview: body.substring(0, 100) + "...",
        bodyLength: body.length,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + "...",
        errorType: err instanceof Error ? err.constructor.name : 'Unknown',
        stripeApiVersion: "2025-06-30.basil",
      });
      
      // Additional debugging for signature format
      const signatureParts = signature.split(',');
      console.error("Signature analysis:", {
        fullSignature: signature,
        signatureParts: signatureParts,
        hasTimestamp: signatureParts.some(part => part.startsWith('t=')),
        hasV1: signatureParts.some(part => part.startsWith('v1=')),
      });
      
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Process the event
    try {
      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          console.log("Processing subscription event:", event.type);
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === "string" 
            ? subscription.customer 
            : subscription.customer?.id;

          if (!customerId) {
            console.log("No customer ID found in subscription event");
            break;
          }

          // Find user by customer ID
          const user = await db.user.findFirst({
            where: { customerId },
          });

          if (user) {
            console.log("Updating user subscription:", user.id);
            await db.user.update({
              where: { id: user.id },
              data: {
                subscriptionId: subscription.id,
                subscriptionStatus: subscription.status === "active" ? "active" : "cancelled",
                subscriptionEndDate: (subscription as any).current_period_end 
                  ? new Date((subscription as any).current_period_end * 1000) 
                  : null,
              },
            });
            console.log("User subscription updated successfully");
          } else {
            console.log("No user found for customer ID:", customerId);
          }
          break;
        }

        case "customer.subscription.deleted": {
          console.log("Processing subscription deletion");
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = typeof subscription.customer === "string" 
            ? subscription.customer 
            : subscription.customer?.id;

          if (!customerId) {
            console.log("No customer ID found in subscription deletion event");
            break;
          }

          const user = await db.user.findFirst({
            where: { customerId },
          });

          if (user) {
            console.log("Cancelling user subscription:", user.id);
            await db.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "cancelled",
                subscriptionId: null,
              },
            });
            console.log("User subscription cancelled successfully");
          } else {
            console.log("No user found for customer ID:", customerId);
          }
          break;
        }

        case "invoice.payment_succeeded": {
          console.log("Processing successful payment");
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" 
            ? invoice.customer 
            : (invoice.customer as Stripe.Customer)?.id;

          if (!customerId) {
            console.log("No customer ID found in invoice event");
            break;
          }

          if ((invoice as any).subscription) {
            const user = await db.user.findFirst({
              where: { customerId },
            });

            if (user) {
              console.log("Activating user subscription after payment:", user.id);
              await db.user.update({
                where: { id: user.id },
                data: {
                  subscriptionStatus: "active",
                },
              });
              console.log("User subscription activated successfully");
            } else {
              console.log("No user found for customer ID:", customerId);
            }
          }
          break;
        }

        case "invoice.payment_failed": {
          console.log("Processing failed payment");
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === "string" 
            ? invoice.customer 
            : (invoice.customer as Stripe.Customer)?.id;

          if (!customerId) {
            console.log("No customer ID found in failed payment event");
            break;
          }

          const user = await db.user.findFirst({
            where: { customerId },
          });

          if (user) {
            console.log("Cancelling user subscription after failed payment:", user.id);
            await db.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "cancelled",
              },
            });
            console.log("User subscription cancelled after failed payment");
          } else {
            console.log("No user found for customer ID:", customerId);
          }
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      console.log("Webhook processed successfully");
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Webhook handler error:", error);
      return NextResponse.json(
        { error: "Webhook handler failed" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Fatal webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 