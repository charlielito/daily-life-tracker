import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { env } from "@/env.js";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = headers().get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

        if (!customerId) break;

        // Find user by customer ID
        const user = await db.user.findFirst({
          where: { customerId },
        });

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              subscriptionId: subscription.id,
              subscriptionStatus: subscription.status === "active" ? "active" : "cancelled",
              subscriptionEndDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;

        if (!customerId) break;

        const user = await db.user.findFirst({
          where: { customerId },
        });

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: "cancelled",
              subscriptionId: null,
            },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (!customerId) break;

        if (invoice.subscription) {
          const user = await db.user.findFirst({
            where: { customerId },
          });

          if (user) {
            await db.user.update({
              where: { id: user.id },
              data: {
                subscriptionStatus: "active",
              },
            });
          }
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as any;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;

        if (!customerId) break;

        const user = await db.user.findFirst({
          where: { customerId },
        });

        if (user) {
          await db.user.update({
            where: { id: user.id },
            data: {
              subscriptionStatus: "cancelled",
            },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
} 