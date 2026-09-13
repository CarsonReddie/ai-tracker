"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Zap,
  Loader2,
} from "lucide-react";
import { type HazardAlert, type HazardRuleData } from "@/lib/hazard";

const EMPTY_RULES: HazardRuleData = {
  runawayEnabled: true,
  runawayMaxRequests: 50,
  runawayMaxTokens: 500000,
  highCostEnabled: true,
  highCostThreshold: 1.0,
  spikeEnabled: true,
  spikeFactor: 3.0,
};

const SEVERITY_STYLES = {
  critical: {
    container: "bg-red-50 border-red-400 dark:bg-red-900/30 dark:border-red-500",
    title: "text-red-800 dark:text-red-200",
    message: "text-red-700 dark:text-red-300",
    icon: "text-red-500",
  },
  warning: {
    container: "bg-orange-50 border-orange-400 dark:bg-orange-900/30 dark:border-orange-500",
    title: "text-orange-800 dark:text-orange-200",
    message: "text-orange-700 dark:text-orange-300",
    icon: "text-orange-500",
  },
} as const;

export function HazardAlerts() {
  const [alerts, setAlerts] = useState<HazardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<HazardRuleData>(EMPTY_RULES);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [alertsRes, rulesRes] = await Promise.all([
          fetch("/api/hazard-alerts"),
          fetch("/api/hazard-rules"),
        ]);
        const alertsData = await alertsRes.json();
        const rulesData = await rulesRes.json();
        if (cancelled) return;
        setAlerts(alertsData.alerts ?? []);
        setRules({
          runawayEnabled: rulesData.runawayEnabled,
          runawayMaxRequests: rulesData.runawayMaxRequests,
          runawayMaxTokens: rulesData.runawayMaxTokens,
          highCostEnabled: rulesData.highCostEnabled,
          highCostThreshold: rulesData.highCostThreshold,
          spikeEnabled: rulesData.spikeEnabled,
          spikeFactor: rulesData.spikeFactor,
        });
      } catch {
        // ignore load errors; UI falls back to empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    const res = await fetch("/api/hazard-alerts");
    const data = await res.json();
    setAlerts(data.alerts ?? []);
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      await fetch("/api/hazard-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rules }),
      });
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
        <div className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading alerts...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Detected alerts */}
      <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Hazard Alerts
            </h3>
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Zap className="w-4 h-4 mr-1" />
            Re-run detection
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
            <CheckCircle2 className="w-5 h-5 mr-2 text-green-500" />
            No hazardous usage detected. Check back later or re-run detection.
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert, index) => {
              const styles = SEVERITY_STYLES[alert.severity];
              return (
                <div
                  key={index}
                  className={`border-l-4 p-4 rounded ${styles.container}`}
                >
                  <div className="flex items-start">
                    <AlertTriangle className={`w-5 h-5 mr-2 mt-0.5 ${styles.icon}`} />
                    <div>
                      <h4 className={`text-sm font-medium ${styles.title}`}>
                        {alert.title}
                      </h4>
                      <p className={`mt-1 text-sm ${styles.message}`}>{alert.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rule configuration */}
      <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">
          Alert Rules
        </h3>

        <div className="space-y-6">
          {/* Runaway / loop detection */}
          <div className="p-4 border rounded-lg dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Runaway / loop detection
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Flag an unusually high request rate or token burst in a 5-minute window.
                </p>
              </div>
              <input
                type="checkbox"
                checked={rules.runawayEnabled}
                onChange={(e) =>
                  setRules({ ...rules, runawayEnabled: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Max requests / 5 min
                </label>
                <input
                  type="number"
                  min="1"
                  value={rules.runawayMaxRequests}
                  onChange={(e) =>
                    setRules({ ...rules, runawayMaxRequests: parseInt(e.target.value) || 1 })
                  }
                  disabled={!rules.runawayEnabled}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Max tokens / 5 min
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={rules.runawayMaxTokens}
                  onChange={(e) =>
                    setRules({ ...rules, runawayMaxTokens: parseInt(e.target.value) || 1000 })
                  }
                  disabled={!rules.runawayEnabled}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* High-cost single requests */}
          <div className="p-4 border rounded-lg dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  High-cost single requests
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Flag individual requests whose cost exceeds a threshold.
                </p>
              </div>
              <input
                type="checkbox"
                checked={rules.highCostEnabled}
                onChange={(e) =>
                  setRules({ ...rules, highCostEnabled: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
            <div className="mt-4 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cost threshold (USD)
              </label>
              <input
                type="number"
                min="0.0001"
                step="0.01"
                value={rules.highCostThreshold}
                onChange={(e) =>
                  setRules({
                    ...rules,
                    highCostThreshold: parseFloat(e.target.value) || 0.0001,
                  })
                }
                disabled={!rules.highCostEnabled}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Spike vs baseline */}
          <div className="p-4 border rounded-lg dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Unusual spikes vs baseline
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Flag when hourly spending is far above the trailing 7-day average.
                </p>
              </div>
              <input
                type="checkbox"
                checked={rules.spikeEnabled}
                onChange={(e) =>
                  setRules({ ...rules, spikeEnabled: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-900 dark:border-gray-600"
              />
            </div>
            <div className="mt-4 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Spike factor (x average)
              </label>
              <input
                type="number"
                min="1.1"
                step="0.1"
                value={rules.spikeFactor}
                onChange={(e) =>
                  setRules({ ...rules, spikeFactor: parseFloat(e.target.value) || 1.1 })
                }
                disabled={!rules.spikeEnabled}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveRules}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}