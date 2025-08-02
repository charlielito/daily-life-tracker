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

    // Enhanced file validation for mobile devices
    console.log("File details:", {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    // Validate file type - be more lenient for mobile devices
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Please select a JPEG, PNG, GIF, or WebP image.` },
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

    // Additional validation for very small files (likely corrupted)
    if (file.size < 100) {
      return NextResponse.json(
        { error: "File appears to be corrupted or empty. Please try selecting a different image." },
        { status: 400 }
      );
    }

    // Convert file to buffer with better error handling
    let buffer: Buffer;
    try {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      
      // Additional validation of buffer
      if (buffer.length === 0) {
        return NextResponse.json(
          { error: "File appears to be empty. Please try selecting a different image." },
          { status: 400 }
        );
      }
    } catch (bufferError) {
      console.error("Buffer conversion error:", bufferError);
      return NextResponse.json(
        { error: "Failed to process image file. Please try selecting a different image." },
        { status: 400 }
      );
    }

    // Upload to Cloudinary with enhanced error handling
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: "daily-life-tracker",
          transformation: [
            { width: 800, height: 600, crop: "limit" },
            { quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error details:", {
              message: error.message,
              http_code: error.http_code,
              name: error.name,
              fileType: file.type,
              fileSize: file.size
            });
            
            // Provide specific error messages based on the error type
            if (error.http_code === 400) {
              reject(new Error("Invalid image format. Please try a different image."));
            } else if (error.http_code === 413) {
              reject(new Error("Image too large. Please select a smaller image."));
            } else if (error.http_code === 500) {
              reject(new Error("Cloud storage temporarily unavailable. Please try again in a few minutes."));
            } else if (error.message.includes("JSON")) {
              reject(new Error("Image processing failed. Please try a different image or format."));
            } else {
              reject(new Error("Failed to upload image. Please try again."));
            }
          } else {
            resolve(result);
          }
        }
      );

      // Add timeout for mobile uploads
      const timeout = setTimeout(() => {
        uploadStream.destroy();
        reject(new Error("Upload timed out. Please try again with a smaller image."));
      }, 30000); // 30 second timeout

      uploadStream.on('end', () => {
        clearTimeout(timeout);
      });

      uploadStream.end(buffer);
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
      } else if (error.message.includes("timed out")) {
        errorMessage = error.message;
        statusCode = 408;
      } else if (error.message.includes("Invalid image")) {
        errorMessage = error.message;
        statusCode = 400;
      } else if (error.message.includes("too large")) {
        errorMessage = error.message;
        statusCode = 413;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
} 