import { useEffect, useState } from "react";
import { estimatePromiseDate } from "@/services/promiseDate.service";

/**
 * Fetches shop scheduling context once, then derives a suggested promise date
 * from the currently-selected tasks + rush flag. The estimate recomputes on
 * every render (the estimator is a cheap pure function), so it tracks task and
 * rush changes without extra effect wiring.
 */
export default function usePromiseDateEstimate({ tasks = [], isRush = false, isWholesale = false }) {
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/repairs/estimate-context");
        if (!res.ok) throw new Error("Failed to load scheduling context");
        const data = await res.json();
        if (active) setContext(data);
      } catch (e) {
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const estimate = context
    ? estimatePromiseDate({
        tasks,
        isRush,
        isWholesale,
        openWorkloadHours: context.openWorkloadHours,
        avgTurnaroundDays: context.avgTurnaroundDays,
        dailyCapacityHours: context.dailyCapacityHours,
        deliveryDays: context.deliveryDays,
      })
    : null;

  return { estimate, context, loading, error };
}
