import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Checkbox } from "../components/ui/checkbox";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import {
  ChefHat,
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  GitCompare,
  Award
} from "lucide-react";

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, historyRes] = await Promise.all([
        axios.get(`${API}/analytics/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/analytics/price-history`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setSummary(summaryRes.data);
      setHistory(historyRes.data);
    } catch (error) {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (selectedSnapshots.length < 2) {
      toast.error("Select at least 2 snapshots to compare");
      return;
    }

    setComparing(true);
    try {
      const response = await axios.get(
        `${API}/analytics/compare?snapshot_ids=${selectedSnapshots.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComparison(response.data);
    } catch (error) {
      toast.error("Comparison failed");
    } finally {
      setComparing(false);
    }
  };

  const toggleSnapshot = (id) => {
    setSelectedSnapshots(prev => 
      prev.includes(id) 
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const formatCurrency = (value) => `$${(value || 0).toFixed(2)}`;
  const formatPercent = (value) => `${(value || 0).toFixed(1)}%`;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 shadow-xl">
          <p className="text-zinc-400 text-sm mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('margin') || entry.name.includes('%') 
                ? formatPercent(entry.value) 
                : formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white font-['Manrope']">Analytics & Comparison</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Snapshots", value: summary?.total_snapshots || 0, icon: Calendar, color: "blue" },
            { label: "Menus Analyzed", value: summary?.total_menus_analyzed || 0, icon: BarChart3, color: "violet" },
            { label: "Items Priced", value: summary?.total_items_priced || 0, icon: Target, color: "amber" },
            { label: "Total Profit", value: formatCurrency(summary?.total_profit_generated), icon: DollarSign, color: "emerald" },
            { label: "Avg Margin", value: formatPercent(summary?.avg_profit_margin), icon: TrendingUp, color: "cyan" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className={`w-4 h-4 text-${stat.color}-400`} />
                    <span className="text-xs text-zinc-500">{stat.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white font-['JetBrains_Mono']">
                    {stat.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="bg-zinc-900/50 border border-zinc-800">
            <TabsTrigger value="trends">Profit Trends</TabsTrigger>
            <TabsTrigger value="compare">Compare Snapshots</TabsTrigger>
            <TabsTrigger value="items">Top Items</TabsTrigger>
          </TabsList>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            {summary?.profit_trend?.length > 0 ? (
              <>
                {/* Profit Trend Chart */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      Profit Over Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={summary.profit_trend}>
                          <defs>
                            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#71717a"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                          />
                          <YAxis 
                            stroke="#71717a"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Area 
                            type="monotone" 
                            dataKey="profit" 
                            stroke="#10b981" 
                            fill="url(#profitGradient)"
                            strokeWidth={2}
                            name="Profit"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue vs Cost Chart */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      Revenue vs Food Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.revenue_trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis 
                            dataKey="date" 
                            stroke="#71717a"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                          />
                          <YAxis 
                            stroke="#71717a"
                            tick={{ fill: '#a1a1aa', fontSize: 12 }}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="revenue" fill="#3b82f6" name="Revenue" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="food_cost" fill="#f59e0b" name="Food Cost" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-8 h-8 text-zinc-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No data yet</h3>
                  <p className="text-zinc-500 mb-6">
                    Approve menu prices to start tracking your profit trends
                  </p>
                  <Button onClick={() => navigate("/upload")} className="bg-blue-600 hover:bg-blue-700">
                    Analyze a Menu
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="space-y-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <GitCompare className="w-5 h-5 text-violet-400" />
                    Select Snapshots to Compare
                  </CardTitle>
                  <Button
                    onClick={handleCompare}
                    disabled={selectedSnapshots.length < 2 || comparing}
                    className="bg-violet-600 hover:bg-violet-700"
                    data-testid="compare-btn"
                  >
                    {comparing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <GitCompare className="w-4 h-4 mr-2" />
                    )}
                    Compare ({selectedSnapshots.length})
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-zinc-500 text-center py-8">
                    No price history yet. Approve menu prices to create snapshots.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                    {history.map((snapshot, index) => (
                      <div
                        key={snapshot.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                          selectedSnapshots.includes(snapshot.id)
                            ? "bg-violet-500/10 border-violet-500/30"
                            : "bg-zinc-800/30 border-zinc-800 hover:border-zinc-700"
                        }`}
                        onClick={() => toggleSnapshot(snapshot.id)}
                        data-testid={`snapshot-${index}`}
                      >
                        <Checkbox
                          checked={selectedSnapshots.includes(snapshot.id)}
                          className="border-zinc-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-white">{snapshot.menu_name}</p>
                          <p className="text-sm text-zinc-500">
                            {new Date(snapshot.snapshot_date).toLocaleDateString()} • {snapshot.total_items} items
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-emerald-400">${snapshot.total_profit?.toFixed(2)}</p>
                          <p className="text-xs text-zinc-500">{snapshot.profit_margin?.toFixed(1)}% margin</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comparison Results */}
            {comparison && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Summary Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <p className="text-xs text-zinc-500 mb-1">Period</p>
                      <p className="text-sm text-white">{comparison.summary.period}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className={`border ${comparison.summary.profit_change >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                    <CardContent className="p-4">
                      <p className="text-xs text-zinc-400 mb-1">Profit Change</p>
                      <div className="flex items-center gap-2">
                        {comparison.summary.profit_change >= 0 ? (
                          <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-red-400" />
                        )}
                        <span className={`text-xl font-bold font-mono ${comparison.summary.profit_change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {comparison.summary.profit_change >= 0 ? "+" : ""}${comparison.summary.profit_change?.toFixed(2)}
                        </span>
                      </div>
                      <p className={`text-xs ${comparison.summary.profit_change >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                        {comparison.summary.profit_change_pct >= 0 ? "+" : ""}{comparison.summary.profit_change_pct?.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <p className="text-xs text-zinc-500 mb-1">Revenue Change</p>
                      <p className={`text-xl font-bold font-mono ${comparison.summary.revenue_change >= 0 ? "text-blue-400" : "text-red-400"}`}>
                        {comparison.summary.revenue_change >= 0 ? "+" : ""}${comparison.summary.revenue_change?.toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-zinc-900/50 border-zinc-800">
                    <CardContent className="p-4">
                      <p className="text-xs text-zinc-500 mb-1">Margin Change</p>
                      <p className={`text-xl font-bold font-mono ${comparison.summary.margin_change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {comparison.summary.margin_change >= 0 ? "+" : ""}{comparison.summary.margin_change?.toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Item Changes */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader>
                    <CardTitle className="text-white">Item Price Changes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {comparison.item_changes?.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30"
                        >
                          <div>
                            <p className="font-medium text-white">{item.name}</p>
                            <p className="text-sm text-zinc-500">
                              ${item.old_price?.toFixed(2)} → ${item.new_price?.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-mono ${item.price_change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {item.price_change >= 0 ? "+" : ""}${item.price_change?.toFixed(2)}
                            </p>
                            <p className={`text-xs ${item.profit_change >= 0 ? "text-emerald-400/70" : "text-red-400/70"}`}>
                              Profit: {item.profit_change >= 0 ? "+" : ""}${item.profit_change?.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          {/* Top Items Tab */}
          <TabsContent value="items">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Top Performing Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {summary?.top_performing_items?.length > 0 ? (
                  <div className="space-y-3">
                    {summary.top_performing_items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-4 rounded-lg bg-zinc-800/30"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? "bg-amber-500/20 text-amber-400" :
                          index === 1 ? "bg-zinc-400/20 text-zinc-300" :
                          index === 2 ? "bg-amber-700/20 text-amber-600" :
                          "bg-zinc-700/30 text-zinc-500"
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-sm text-zinc-500">
                            Appeared in {item.count} snapshot{item.count > 1 ? "s" : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-emerald-400 text-lg">
                            ${item.total_profit?.toFixed(2)}
                          </p>
                          <p className="text-xs text-zinc-500">total profit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-zinc-500 text-center py-8">
                    No item data yet. Approve menu prices to see top performers.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
