import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { env } from "@/env.js";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { STRIPE_CONFIG } from "@/lib/stripe";

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

// Helper function to check upload limits
async function checkUploadLimit(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      monthlyUploads: true,
      isUnlimited: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user has unlimited access
  if (user.isUnlimited || user.subscriptionStatus === "active") {
    return { canUpload: true, user };
  }

  // Check usage limits for free users
  const canUpload = user.monthlyUploads < STRIPE_CONFIG.FREE_LIMITS.UPLOADS;
  if (!canUpload) {
    throw new Error(`Monthly upload limit reached (${STRIPE_CONFIG.FREE_LIMITS.UPLOADS}). Please upgrade to continue.`);
  }

  return { canUpload, user };
}

// Helper function to increment upload usage
async function incrementUploadUsage(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      isUnlimited: true,
      subscriptionStatus: true,
    },
  });

  // Don't increment for unlimited users
  if (user?.isUnlimited || user?.subscriptionStatus === "active") {
    return;
  }

  await db.user.update({
    where: { id: userId },
    data: {
      monthlyUploads: { increment: 1 },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to upload images." },
        { status: 401 }
      );
    }

    // Check upload limits
    try {
      await checkUploadLimit(session.user.id);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided. Please select an image to upload." },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Please select an image file (JPEG, PNG, GIF, etc.)." },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Please select an image smaller than 10MB." },
        { status: 413 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "daily-life-tracker", // Organize uploads in a folder
          transformation: [
            { width: 800, height: 600, crop: "limit" }, // Limit max size
            { quality: "auto" }, // Auto quality optimization
          ],
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(new Error("Failed to upload to cloud storage. Please try again."));
          } else {
            resolve(result);
          }
        }
      ).end(buffer);
    });

    // Increment usage counter after successful upload
    await incrementUploadUsage(session.user.id);

    return NextResponse.json({
      url: (result as any).secure_url,
      publicId: (result as any).public_id,
    });
  } catch (error) {
    console.error("Upload API error:", error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = "Upload failed. Please try again.";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes("cloud storage")) {
        errorMessage = error.message;
      } else if (error.message.includes("limit")) {
        errorMessage = error.message;
        statusCode = 403;
      } else if (error.message.includes("Authentication")) {
        errorMessage = error.message;
        statusCode = 401;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 