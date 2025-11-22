"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Flame, Droplets, Beef, Wheat, Zap } from "lucide-react";
import { useTranslations } from "@/utils/useTranslations";

interface MacroDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    water: number;
  } | null;
  explanations: {
    calories: string;
    protein: string;
    carbs: string;
    fat: string;
    water: string;
  } | null;
  description: string;
}

const macroIcons = {
  calories: Flame,
  protein: Beef,
  carbs: Wheat,
  fat: Zap,
  water: Droplets,
};

const macroColors = {
  calories: "bg-orange-50 text-orange-700 border-orange-200",
  protein: "bg-green-50 text-green-700 border-green-200",
  carbs: "bg-yellow-50 text-yellow-700 border-yellow-200",
  fat: "bg-red-50 text-red-700 border-red-200",
  water: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

export function MacroDetailsModal({
  isOpen,
  onClose,
  macros,
  explanations,
  description,
}: MacroDetailsModalProps) {
  const { t } = useTranslations("food");
  
  if (!macros || !explanations) {
    return null;
  }

  const macroLabels: Record<string, string> = {
    calories: t("caloriesLabel"),
    protein: t("proteinLabel"),
    carbs: t("carbsLabel"),
    fat: t("fatLabel"),
    water: t("waterLabel"),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t("macroCalculationDetails")}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(macros).map(([key, value]) => {
              const Icon = macroIcons[key as keyof typeof macroIcons];
              const colorClass = macroColors[key as keyof typeof macroColors];
              const unit = key === "water" ? "ml" : key === "calories" ? "cal" : "g";
              
              return (
                <Card key={key} className={`${colorClass} border`}>
                  <CardContent className="p-3 text-center">
                    <Icon className="h-4 w-4 mx-auto mb-1" />
                    <div className="font-bold text-lg">
                      {Math.round(value)}
                    </div>
                    <div className="text-xs font-medium">
                      {macroLabels[key] || key} ({unit})
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detailed Explanations */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{t("howEachMacroCalculated")}</h3>
            
            {Object.entries(explanations).map(([key, explanation]) => {
              const Icon = macroIcons[key as keyof typeof macroIcons];
              const colorClass = macroColors[key as keyof typeof macroColors];
              
              return (
                <Card key={key} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${colorClass} flex-shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{macroLabels[key] || key}</h4>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(macros[key as keyof typeof macros])}
                            {key === "water" ? "ml" : key === "calories" ? "cal" : "g"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {explanation}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {t("macroNote")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 