"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const macroOrder: Array<keyof typeof macroIcons> = [
    "calories",
    "protein",
    "carbs",
    "fat",
    "water",
  ];

  const unitFor = (key: string) =>
    key === "water" ? "ml" : key === "calories" ? "cal" : "g";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("macroCalculationDetails")}</DialogTitle>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary strip: editorial numbers + micro labels */}
          <div className="grid grid-cols-5 gap-0 border-y border-hairline">
            {macroOrder.map((key, idx) => {
              const value = macros[key];
              return (
                <div
                  key={key}
                  className={
                    idx > 0
                      ? "border-l border-hairline px-3 py-4 text-center"
                      : "px-3 py-4 text-center"
                  }
                >
                  <div className="font-display tnum text-data-xl text-ink">
                    {Math.round(value)}
                  </div>
                  <div className="text-micro text-muted">
                    {macroLabels[key] || key}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-2">
                    {unitFor(key)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Explanations as typographic list */}
          <div className="space-y-4">
            <h3 className="font-display text-h2">
              {t("howEachMacroCalculated")}
            </h3>

            <ul className="divide-y divide-hairline border-y border-hairline">
              {macroOrder.map((key) => {
                const Icon = macroIcons[key];
                const explanation = explanations[key];
                return (
                  <li key={key} className="flex items-start gap-4 py-4">
                    <Icon
                      className="mt-1 h-4 w-4 flex-shrink-0 text-muted"
                      strokeWidth={1.5}
                    />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-micro text-ink">
                          {macroLabels[key] || key}
                        </h4>
                        <span className="font-mono tnum text-[11px] text-muted-2">
                          {Math.round(macros[key])} {unitFor(key)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {explanation}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Note */}
          <p className="border-t border-hairline pt-3 text-xs text-muted-2">
            {t("macroNote")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
