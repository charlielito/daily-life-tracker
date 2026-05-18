"use client";

import { useState, useRef } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Camera, Upload, X, AlertCircle } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/utils/useTranslations";

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
  label,
  disabled = false,
}: ImageUploadProps) {
  const { t } = useTranslations("common");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const displayLabel = label || t("addPhoto");

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
        let errorMessage = t("uploadFailed");

        if (data.error) {
          errorMessage = data.error;
        } else {
          // Handle different HTTP status codes
          switch (response.status) {
            case 401:
              errorMessage = t("signInToUpload");
              break;
            case 403:
              errorMessage = t("uploadLimitReached");
              break;
            case 400:
              errorMessage = t("invalidFile");
              break;
            case 413:
              errorMessage = t("fileTooLarge");
              break;
            case 408:
              errorMessage = t("uploadTimedOut");
              break;
            case 500:
              errorMessage = t("serverError");
              break;
            default:
              errorMessage = t("uploadFailedWithStatus", {
                status: response.status.toString(),
                statusText: response.statusText,
              });
          }
        }

        throw new Error(errorMessage);
      }

      onImageUpload(data.url);
    } catch (error) {
      console.error("Upload error:", error);

      // Display the specific error message
      const errorMessage = error instanceof Error ? error.message : t("failedToUpload");
      setError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const validateAndUpload = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError(t("selectImageFile"));
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(t("fileSizeLimit"));
      return;
    }

    uploadFile(file);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      validateAndUpload(file);
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

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndUpload(file);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-micro text-muted">{displayLabel}</Label>

      {/* Current Image Display */}
      {currentImage && (
        <div className="relative inline-block">
          <div className="relative w-48 h-36 overflow-hidden border border-hairline">
            <Image
              src={currentImage}
              alt={t("uploadedImage")}
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
            aria-label={t("uploadedImage")}
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      )}

      {/* Drop zone + Upload Controls */}
      {!currentImage && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border border-dashed border-hairline-strong p-6 text-center text-muted transition-colors",
            isDragOver && "border-ink bg-paper-2 text-ink",
            (disabled || isUploading) && "opacity-50"
          )}
        >
          <Camera
            className="mx-auto mb-3 h-5 w-5 text-muted-2"
            strokeWidth={1.5}
          />
          <p className="text-sm">
            {isUploading ? t("uploading") : t("uploadHelpText")}
          </p>
          <p className="mt-1 font-mono text-[11px] text-muted-2">
            JPEG, PNG &middot; max 10MB
          </p>

          <div className="mt-4 flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFileUpload}
              disabled={disabled || isUploading}
            >
              <Upload className="h-4 w-4" strokeWidth={1.5} />
              {isUploading ? t("uploading") : t("uploadPhoto")}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCameraCapture}
              disabled={disabled || isUploading}
            >
              <Camera className="h-4 w-4" strokeWidth={1.5} />
              {t("camera")}
            </Button>
          </div>
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
        <div className="border border-hairline bg-iron-soft/40 p-3">
          <div className="flex items-start gap-2">
            <AlertCircle
              className="h-4 w-4 flex-shrink-0 text-iron"
              strokeWidth={1.5}
            />
            <div className="flex-1">
              <p className="text-sm font-medium text-ink">{t("uploadError")}</p>
              <p className="mt-1 text-sm text-muted">{error}</p>
              {error.includes("limit") && (
                <p className="mt-2 text-xs text-muted-2">
                  {t("upgradeForUnlimited")}
                </p>
              )}
              {(error.includes("sign in") || error.includes("inicia sesión")) && (
                <p className="mt-2 text-xs text-muted-2">
                  {t("refreshAndTryAgain")}
                </p>
              )}
              {(error.includes("timed out") || error.includes("tiempo agotado")) && (
                <p className="mt-2 text-xs text-muted-2">
                  {t("trySmallerImage")}
                </p>
              )}
              {(error.includes("too large") || error.includes("demasiado grande")) && (
                <p className="mt-2 text-xs text-muted-2">
                  {t("reduceImageQuality")}
                </p>
              )}
              {(error.includes("Invalid image") || error.includes("inválido")) && (
                <p className="mt-2 text-xs text-muted-2">
                  {t("tryNewPhoto")}
                </p>
              )}
              {(error.includes("processing failed") ||
                error.includes("procesamiento falló")) && (
                <p className="mt-2 text-xs text-muted-2">
                  {t("tryDifferentFormat")}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
