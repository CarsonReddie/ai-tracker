"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useTheme } from "@/components/ThemeProvider";

interface DailyUsage {
  date: string;
  tokens: number;
  cost: number;
  requests: number;
}

interface UsageChartProps {
  data: DailyUsage[];
}

export function UsageChart({ data }: UsageChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const textColor = isDark ? "#cbd5e1" : "#6b7280";
  const gridColor = isDark ? "#374151" : "#e5e7eb";

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">Daily Usage</h3>
        <p className="text-gray-500 text-center py-8 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">
        Daily Usage (Last 30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: textColor }}
            stroke={textColor}
            tickFormatter={(value: string) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis tick={{ fontSize: 12, fill: textColor }} stroke={textColor} />
          <Tooltip
            labelFormatter={(label: React.ReactNode) => {
              if (label === undefined || label === null) return "";
              return new Date(String(label)).toLocaleDateString();
            }}
            contentStyle={{
              backgroundColor: isDark ? "#1f2937" : "#ffffff",
              color: isDark ? "#e5e7eb" : "#111827",
              border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
            }}
            labelStyle={{ color: isDark ? "#e5e7eb" : "#111827" }}
            itemStyle={{ color: isDark ? "#e5e7eb" : "#111827" }}
          />
          <Line
            type="monotone"
            dataKey="tokens"
            stroke="#8884d8"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}