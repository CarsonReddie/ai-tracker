"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Coins,
  Hash,
  Activity,
  TrendingUp,
  Settings,
  LogOut,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { AlertsBanner } from "@/components/AlertsBanner";
import { ProviderChart } from "@/components/ProviderChart";
import { UsageChart } from "@/components/UsageChart";

interface DashboardData {
  currentMonth: {
    tokens: number;
    cost: number;
    requests: number;
    promptTokens: number;
    completionTokens: number;
  };
  lastMonth: {
    tokens: number;
    cost: number;
    requests: number;
  };
  providers: {
    name: string;
    tokens: number;
    cost: number;
    requests: number;
  }[];
  dailyUsage: {
    date: string;
    tokens: number;
    cost: number;
    requests: number;
  }[];
  alerts: {
    provider: string;
    currentCost: number;
    limit: number;
    usage: number;
  }[];
}

interface Request {
  id: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  promptPreview: string | null;
  timestamp: string;
  provider: {
    name: string;
  };
}

interface Provider {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

interface Budget {
  id: string;
  monthlyLimit: number;
  alertThreshold: number;
  provider: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "requests" | "settings">("dashboard");

  // Filters
  const [providerFilter, setProviderFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Add provider modal
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderKey, setNewProviderKey] = useState("");
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [newBudgetLimit, setNewBudgetLimit] = useState("");
  const [newBudgetProvider, setNewBudgetProvider] = useState("");
  const [newBudgetThreshold, setNewBudgetThreshold] = useState("80");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

   
  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      const data = await res.json();
      setProviders(data);
    } catch (error) {
      console.error("Failed to fetch providers:", error);
    }
  }, []);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await fetch("/api/budgets");
      const data = await res.json();
      setBudgets(data);
    } catch (error) {
      console.error("Failed to fetch budgets:", error);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });
      if (providerFilter) params.set("provider", providerFilter);
      if (modelFilter) params.set("model", modelFilter);

      const res = await fetch(`/api/requests?${params}`);
      const data = await res.json();
      setRequests(data.requests);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
    }
  }, [currentPage, providerFilter, modelFilter]);

  // Data fetching in effects is intentional here - fetch on session state change
  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
      fetchProviders();
      fetchBudgets();
    }
  }, [status, fetchDashboardData, fetchProviders, fetchBudgets]);

  useEffect(() => {
    if (activeTab === "requests") {
      fetchRequests();
    }
  }, [activeTab, fetchRequests]);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProviderName, apiKey: newProviderKey }),
      });

      if (res.ok) {
        setShowAddProvider(false);
        setNewProviderName("");
        setNewProviderKey("");
        fetchProviders();
      }
    } catch (error) {
      console.error("Failed to add provider:", error);
    }
  };

  const handleDeleteProvider = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider?")) return;

    try {
      await fetch("/api/providers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchProviders();
    } catch (error) {
      console.error("Failed to delete provider:", error);
    }
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlyLimit: parseFloat(newBudgetLimit),
          alertThreshold: parseFloat(newBudgetThreshold) / 100,
          provider: newBudgetProvider || null,
        }),
      });

      if (res.ok) {
        setShowAddBudget(false);
        setNewBudgetLimit("");
        setNewBudgetProvider("");
        setNewBudgetThreshold("80");
        fetchBudgets();
        fetchDashboardData();
      }
    } catch (error) {
      console.error("Failed to add budget:", error);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm("Are you sure you want to delete this budget?")) return;

    try {
      await fetch("/api/budgets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchBudgets();
      fetchDashboardData();
    } catch (error) {
      console.error("Failed to delete budget:", error);
    }
  };

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(2)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">AI Tracker</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{session.user?.email}</span>
              <button
                onClick={() => signOut()}
                className="text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "dashboard"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("requests")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "requests"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Settings className="w-4 h-4 inline mr-1" />
              Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {dashboardData?.alerts && <AlertsBanner alerts={dashboardData.alerts} />}

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && dashboardData && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Cost"
                value={`$${dashboardData.currentMonth.cost.toFixed(2)}`}
                icon={Coins}
                trend={{
                  value: dashboardData.lastMonth.cost
                    ? Math.round(
                        ((dashboardData.currentMonth.cost - dashboardData.lastMonth.cost) /
                          dashboardData.lastMonth.cost) *
                          100
                      )
                    : 0,
                  isPositive: dashboardData.currentMonth.cost >= dashboardData.lastMonth.cost,
                }}
              />
              <StatsCard
                title="Total Tokens"
                value={formatTokens(dashboardData.currentMonth.tokens)}
                icon={Hash}
                trend={{
                  value: dashboardData.lastMonth.tokens
                    ? Math.round(
                        ((dashboardData.currentMonth.tokens - dashboardData.lastMonth.tokens) /
                          dashboardData.lastMonth.tokens) *
                          100
                      )
                    : 0,
                  isPositive: dashboardData.currentMonth.tokens >= dashboardData.lastMonth.tokens,
                }}
              />
              <StatsCard
                title="Requests"
                value={dashboardData.currentMonth.requests}
                icon={Activity}
                trend={{
                  value: dashboardData.lastMonth.requests
                    ? Math.round(
                        ((dashboardData.currentMonth.requests - dashboardData.lastMonth.requests) /
                          dashboardData.lastMonth.requests) *
                          100
                      )
                    : 0,
                  isPositive:
                    dashboardData.currentMonth.requests >= dashboardData.lastMonth.requests,
                }}
              />
              <StatsCard
                title="Avg Tokens/Request"
                value={
                  dashboardData.currentMonth.requests
                    ? formatTokens(
                        Math.round(
                          dashboardData.currentMonth.tokens / dashboardData.currentMonth.requests
                        )
                      )
                    : "0"
                }
                icon={TrendingUp}
              />
            </div>

            {/* Token Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Token Breakdown</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Prompt Tokens</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatTokens(dashboardData.currentMonth.promptTokens)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Completion Tokens</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatTokens(dashboardData.currentMonth.completionTokens)}
                  </p>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UsageChart data={dashboardData.dailyUsage} />
              <ProviderChart data={dashboardData.providers} />
            </div>

            {/* Provider Summary */}
            {dashboardData.providers.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Provider Summary</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Provider
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requests
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tokens
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {dashboardData.providers.map((provider) => (
                        <tr key={provider.name}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {provider.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {provider.requests}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTokens(provider.tokens)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${provider.cost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <select
                    value={providerFilter}
                    onChange={(e) => {
                      setProviderFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">All Providers</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Model</label>
                  <input
                    type="text"
                    value={modelFilter}
                    onChange={(e) => {
                      setModelFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Filter by model..."
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setProviderFilter("");
                      setModelFilter("");
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tokens
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prompt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {requests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          No requests found. Add a provider and start tracking!
                        </td>
                      </tr>
                    ) : (
                      requests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(req.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {req.provider.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {req.model}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTokens(req.totalTokens)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${req.cost.toFixed(4)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {req.promptPreview || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Page <span className="font-medium">{currentPage}</span> of{" "}
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">API Providers</h3>
                <button
                  onClick={() => setShowAddProvider(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Provider
                </button>
              </div>

              {providers.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No providers configured. Add one to start tracking your API usage.
                </p>
              ) : (
                <div className="space-y-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{provider.name}</p>
                        <p className="text-sm text-gray-500">
                          Added {formatDate(provider.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            provider.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {provider.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => handleDeleteProvider(provider.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Budgets */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Budget Alerts</h3>
                <button
                  onClick={() => setShowAddBudget(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Budget
                </button>
              </div>

              {budgets.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No budgets configured. Set a monthly spending limit to get notified when you
                  approach it.
                </p>
              ) : (
                <div className="space-y-4">
                  {budgets.map((budget) => (
                    <div
                      key={budget.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          <span className="font-semibold">${budget.monthlyLimit.toFixed(2)}</span>
                          {budget.provider ? ` / ${budget.provider}` : " / all providers"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Alert at {Math.round(budget.alertThreshold * 100)}% of limit
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBudget(budget.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add Provider Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add Provider</h3>
              <button
                onClick={() => setShowAddProvider(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddProvider} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Provider Name</label>
                <select
                  value={newProviderName}
                  onChange={(e) => setNewProviderName(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                >
                  <option value="">Select a provider</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="open-source">Open Source (Custom)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">API Key</label>
                <input
                  type="password"
                  value={newProviderKey}
                  onChange={(e) => setNewProviderKey(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddProvider(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Add Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddBudget && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Add Budget</h3>
              <button
                onClick={() => setShowAddBudget(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddBudget} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Monthly Limit (USD)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newBudgetLimit}
                  onChange={(e) => setNewBudgetLimit(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Provider (optional)
                </label>
                <select
                  value={newBudgetProvider}
                  onChange={(e) => setNewBudgetProvider(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">All providers</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newBudgetThreshold}
                  onChange={(e) => setNewBudgetThreshold(e.target.value)}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Get alerted when monthly usage reaches this percentage of your limit.
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddBudget(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Add Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
