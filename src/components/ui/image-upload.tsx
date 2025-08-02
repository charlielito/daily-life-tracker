"use client";

import { useState, useRef } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Camera, Upload, X, ImageIcon } from "lucide-react";
import Image from "next/image";

interface ImageUploadProps {
  onImageUpload: (imageUrl: string) => void;
  onImageRemove: () => void;
  currentImage?: string;
  label?: string;
  disabled?: boolean;
}

export function ImageUpload({
  onImageUpload,
  onImageRemove,
  currentImage,
  label = "Add Photo",
  disabled = false,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Parse specific error messages from the API
        let errorMessage = "Upload failed";
        
        if (data.error) {
          errorMessage = data.error;
        } else {
          // Handle different HTTP status codes
          switch (response.status) {
            case 401:
              errorMessage = "Please sign in to upload images";
              break;
            case 403:
              errorMessage = "Upload limit reached. Please upgrade your plan to continue.";
              break;
            case 400:
              errorMessage = "Invalid file. Please check the file format and size.";
              break;
            case 413:
              errorMessage = "File too large. Please select a smaller image.";
              break;
            case 408:
              errorMessage = "Upload timed out. Please try again with a smaller image.";
              break;
            case 500:
              errorMessage = "Server error. Please try again later.";
              break;
            default:
              errorMessage = `Upload failed (${response.status}): ${response.statusText}`;
          }
        }
        
        throw new Error(errorMessage);
      }

      onImageUpload(data.url);
    } catch (error) {
      console.error("Upload error:", error);
      
      // Display the specific error message
      const errorMessage = error instanceof Error ? error.message : "Failed to upload image. Please try again.";
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file");
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      uploadFile(file);
    }
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    onImageRemove();
    setError(null);
    // Reset file inputs
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {/* Current Image Display */}
      {currentImage && (
        <div className="relative inline-block">
          <div className="relative w-48 h-36 rounded-lg overflow-hidden border border-gray-200">
            <Image
              src={currentImage}
              alt="Uploaded image"
              fill
              className="object-cover"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 rounded-full p-1 h-6 w-6"
            onClick={handleRemoveImage}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Upload Controls */}
      {!currentImage && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleFileUpload}
            disabled={disabled || isUploading}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {isUploading ? "Uploading..." : "Upload Photo"}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleCameraCapture}
            disabled={disabled || isUploading}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Camera
          </Button>
        </div>
      )}

      {/* Hidden file inputs */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment" // Use rear camera by default
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">Upload Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              {error.includes("limit") && (
                <p className="text-xs text-red-600 mt-2">
                  💡 Consider upgrading your plan for unlimited uploads
                </p>
              )}
              {error.includes("sign in") && (
                <p className="text-xs text-red-600 mt-2">
                  💡 Please refresh the page and try again
                </p>
              )}
              {error.includes("timed out") && (
                <p className="text-xs text-red-600 mt-2">
                  💡 Try selecting a smaller image or using a better internet connection
                </p>
              )}
              {error.includes("too large") && (
                <p className="text-xs text-red-600 mt-2">
                  💡 Try selecting a smaller image or reducing the image quality in your camera settings
                </p>
              )}
              {error.includes("Invalid image") && (
                <p className="text-xs text-red-600 mt-2">
                  💡 Try taking a new photo or selecting a different image from your gallery
                </p>
              )}
              {error.includes("processing failed") && (
                <p className="text-xs text-red-600 mt-2">
                  💡 Try a different image format (JPEG or PNG) or take a new photo
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      {!currentImage && !error && (
        <p className="text-xs text-gray-500">
          Upload from device or take a photo with camera. Max file size: 10MB
        </p>
      )}
    </div>
  );
} 