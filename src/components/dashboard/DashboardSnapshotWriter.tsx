"use client";

import { useEffect } from "react";
import { saveDashboardSnapshot } from "@/features/dashboard/snapshot";

export function DashboardSnapshotWriter({
  coffeeId,
  coffeeName,
  roaster,
  lastAttemptNo,
  lastAttemptRating,
}: {
  coffeeId: string;
  coffeeName: string;
  roaster: string;
  lastAttemptNo?: number;
  lastAttemptRating?: number;
}) {
  useEffect(() => {
    saveDashboardSnapshot({
      coffeeId,
      coffeeName,
      roaster,
      lastAttemptNo,
      lastAttemptRating,
      savedAt: Date.now(),
    });
  }, [coffeeId, coffeeName, roaster, lastAttemptNo, lastAttemptRating]);

  return null;
}
