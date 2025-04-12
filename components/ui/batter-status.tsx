// components/BatteryStatus.tsx
"use client";

import * as React from "react";
import {
  BatteryFull,
  BatteryMedium,
  BatteryLow
} from "lucide-react";

interface BatteryStatusProps {
  batteryLevel: number;
  lastUpdatedBattery?: string | Date;
}

export const BatteryStatus: React.FC<BatteryStatusProps> = ({
  batteryLevel
}) => {
  // Determine battery color
  const batteryColor =
    batteryLevel <= 20
      ? "text-red-500"
      : batteryLevel <= 50
        ? "text-amber-500"
        : "";

  // Determine icon
  let BatteryIcon = BatteryFull;
  if (batteryLevel <= 20) BatteryIcon = BatteryLow;
  else if (batteryLevel <= 50) BatteryIcon = BatteryMedium;

  return (
    <div className="flex items-center mb-2">
      <BatteryIcon className="h-5 w-5 mr-2 text-muted-foreground" />
      <span className={`text-lg font-medium ${batteryColor}`}>
        {batteryLevel}%
      </span>
    </div>
  );
};