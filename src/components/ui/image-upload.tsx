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

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      onImageUpload(data.url);
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload image. Please try again.");
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
        <p className="text-red-500 text-sm">{error}</p>
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