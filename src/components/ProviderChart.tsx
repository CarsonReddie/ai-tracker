"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useTheme } from "@/components/ThemeProvider";

interface ProviderData {
  name: string;
  tokens: number;
  cost: number;
  requests: number;
}

interface ProviderChartProps {
  data: ProviderData[];
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function ProviderChart({ data }: ProviderChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const textColor = isDark ? "#cbd5e1" : "#6b7280";

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">
          Usage by Provider
        </h3>
        <p className="text-gray-500 text-center py-8 dark:text-gray-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-800 dark:border dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white">
        Usage by Provider
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="cost"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: unknown) => [`$${Number(value).toFixed(4)}`, "Cost"]}
            contentStyle={{
              backgroundColor: isDark ? "#1f2937" : "#ffffff",
              color: isDark ? "#e5e7eb" : "#111827",
              border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
            }}
            itemStyle={{ color: isDark ? "#e5e7eb" : "#111827" }}
            labelStyle={{ color: isDark ? "#e5e7eb" : "#111827" }}
          />
          <Legend
            formatter={(value) => <span style={{ color: textColor }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}