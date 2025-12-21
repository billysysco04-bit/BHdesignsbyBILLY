import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import {
  ChefHat,
  ArrowLeft,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
  MapPin,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Utensils,
  Target,
  BarChart3
} from "lucide-react";

export default function MenuAnalysis() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzingCompetitors, setAnalyzingCompetitors] = useState(false);
  const [approving, setApproving] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [priceDecisions, setPriceDecisions] = useState({});
  const [customPrices, setCustomPrices] = useState({});

  useEffect(() => {
    fetchMenu();
  }, [jobId]);

  const fetchMenu = async () => {
    try {
      const response = await axios.get(`${API}/menus/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenu(response.data);
      
      // Initialize price decisions from existing data
      const decisions = {};
      const customs = {};
      response.data.items?.forEach(item => {
        if (item.price_decision) {
          decisions[item.id] = item.price_decision;
        }
        if (item.approved_price) {
          customs[item.id] = item.approved_price;
        }
      });
      setPriceDecisions(decisions);
      setCustomPrices(customs);
    } catch (error) {
      toast.error("Failed to load menu");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleReanalyze = async () => {
    setAnalyzing(true);
    try {
      await axios.post(`${API}/menus/${jobId}/analyze`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Re-analysis complete!");
      fetchMenu();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCompetitorAnalysis = async () => {
    setAnalyzingCompetitors(true);
    try {
      await axios.post(`${API}/menus/${jobId}/competitor-analysis`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Competitor analysis complete!");
      fetchMenu();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Competitor analysis failed");
    } finally {
      setAnalyzingCompetitors(false);
    }
  };

  const handleApprove = async () => {
    const approvals = Object.entries(priceDecisions).map(([itemId, decision]) => ({
      item_id: itemId,
      decision,
      custom_price: decision === "custom" ? customPrices[itemId] : null
    }));

    if (approvals.length === 0) {
      toast.error("Please make pricing decisions for at least one item");
      return;
    }

    setApproving(true);
    try {
      await axios.post(`${API}/menus/${jobId}/approve`, approvals, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Prices approved successfully!");
      fetchMenu();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API}/menus/${jobId}/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let content, filename, mimeType;
      
      if (format === "json") {
        content = JSON.stringify(response.data, null, 2);
        filename = `${(menu.name || 'menu').replace(/[^a-z0-9]/gi, '_')}_export.json`;
        mimeType = "application/json";
      } else if (format === "csv") {
        content = response.data.csv_data;
        filename = response.data.filename || `${(menu.name || 'menu').replace(/[^a-z0-9]/gi, '_')}_export.csv`;
        mimeType = "text/csv;charset=utf-8";
      }
      
      // Create blob
      const blob = new Blob(["\ufeff" + content], { type: mimeType }); // BOM for Excel compatibility
      
      // Create download URL
      const url = URL.createObjectURL(blob);
      
      // Create and configure link
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.visibility = "hidden";
      link.style.position = "absolute";
      link.style.left = "-9999px";
      
      // Add to DOM
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup after a delay
      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 1000);
      
      toast.success(`${format.toUpperCase()} file downloading...`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Export failed: " + (error.message || "Unknown error"));
    }
  };

  const toggleExpand = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const setDecision = (itemId, decision) => {
    setPriceDecisions(prev => ({
      ...prev,
      [itemId]: decision
    }));
  };

  // Real-time calculation of totals based on pricing decisions
  const calculateTotals = () => {
    if (!menu?.items) return { totalFoodCost: 0, totalProfit: 0, totalRevenue: 0, avgFoodCostPct: 0 };
    
    let totalFoodCost = 0;
    let totalProfit = 0;
    let totalRevenue = 0;
    
    menu.items.forEach(item => {
      const foodCost = item.food_cost || 0;
      totalFoodCost += foodCost;
      
      // Use approved price, or calculate from decision, or use current price
      let price = item.current_price || 0;
      if (item.approved_price) {
        price = item.approved_price;
      } else if (priceDecisions[item.id]) {
        price = parseFloat(calculateApprovedPrice(item, priceDecisions[item.id])) || item.current_price;
      }
      
      totalRevenue += price;
      totalProfit += (price - foodCost);
    });
    
    const avgFoodCostPct = totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0;
    
    return {
      totalFoodCost: totalFoodCost.toFixed(2),
      totalProfit: totalProfit.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      avgFoodCostPct: avgFoodCostPct.toFixed(1)
    };
  };

  const totals = calculateTotals();

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      analyzing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      approved: "bg-violet-500/20 text-violet-400 border-violet-500/30"
    };
    return styles[status] || styles.pending;
  };

  const getProfitColor = (profit) => {
    if (profit > 0) return "text-emerald-400";
    if (profit < 0) return "text-red-400";
    return "text-zinc-400";
  };

  const calculateApprovedPrice = (item, decision) => {
    switch (decision) {
      case "maintain": return item.current_price;
      case "increase": return item.suggested_price;
      case "decrease": return (item.suggested_price * 0.9).toFixed(2);
      case "custom": return customPrices[item.id] || item.current_price;
      default: return item.current_price;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!menu) return null;

  const totalItems = menu.items?.length || 0;
  const decidedItems = Object.keys(priceDecisions).length;

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
              <div>
                <h1 className="text-lg font-bold text-white font-['Manrope']">{menu.name}</h1>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadge(menu.status)}>
                    {menu.status}
                  </Badge>
                  {menu.location && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {menu.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select onValueChange={handleExport}>
              <SelectTrigger className="w-32 bg-zinc-900 border-zinc-800" data-testid="export-select">
                <Download className="w-4 h-4 mr-2" />
                Export
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
            
            {menu.status === "completed" && (
              <Button
                onClick={handleApprove}
                disabled={approving || decidedItems === 0}
                data-testid="approve-all-btn"
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {approving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Approve Prices ({decidedItems}/{totalItems})
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Overview - Real-time updates */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-400">Total Items</span>
              </div>
              <p className="text-2xl font-bold text-white font-['JetBrains_Mono']">
                {totalItems}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-zinc-400">Total Food Cost</span>
              </div>
              <p className="text-2xl font-bold text-amber-400 font-['JetBrains_Mono']">
                ${totals.totalFoodCost}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-400">Avg Food Cost %</span>
              </div>
              <p className="text-2xl font-bold text-amber-400 font-['JetBrains_Mono']">
                {totals.avgFoodCostPct}%
              </p>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400">Total Profit</span>
              </div>
              <p className={`text-2xl font-bold font-['JetBrains_Mono'] ${getProfitColor(parseFloat(totals.totalProfit))}`}>
                ${totals.totalProfit}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-zinc-400">Decisions</span>
              </div>
              <p className="text-2xl font-bold text-white font-['JetBrains_Mono']">
                {decidedItems}/{totalItems}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Button
            onClick={handleReanalyze}
            disabled={analyzing}
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800"
            data-testid="reanalyze-btn"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Re-analyze Menu
          </Button>

          <Button
            onClick={handleCompetitorAnalysis}
            disabled={analyzingCompetitors || menu.items?.length === 0}
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800"
            data-testid="competitor-analysis-btn"
          >
            {analyzingCompetitors ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4 mr-2" />
            )}
            Analyze Competitors
          </Button>
        </div>

        {/* Menu Items */}
        {menu.items?.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-12 text-center">
              <p className="text-zinc-400">No items found. Try re-analyzing the menu.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {menu.items?.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors"
                  data-testid={`menu-item-${index}`}
                >
                  <CardContent className="p-6">
                    {/* Item Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{item.name}</h3>
                        {item.description && (
                          <p className="text-sm text-zinc-400">{item.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors"
                      >
                        {expandedItems[item.id] ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {/* Price Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-zinc-800/50">
                        <p className="text-xs text-zinc-500 mb-1">Current Price</p>
                        <p className="text-lg font-mono font-semibold text-white">
                          ${item.current_price?.toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-400 mb-1">Food Cost $</p>
                        <p className="text-lg font-mono font-semibold text-amber-400">
                          ${item.food_cost?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-400 mb-1">Food Cost %</p>
                        <p className="text-lg font-mono font-semibold text-amber-400">
                          {item.current_price > 0 
                            ? ((item.food_cost / item.current_price) * 100).toFixed(1) 
                            : "0.0"}%
                        </p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-xs text-blue-400 mb-1">Suggested Price</p>
                        <p className="text-lg font-mono font-semibold text-blue-400">
                          ${item.suggested_price?.toFixed(2) || item.current_price?.toFixed(2)}
                        </p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-zinc-800/50">
                        <p className="text-xs text-zinc-500 mb-1">Profit/Plate</p>
                        <p className={`text-lg font-mono font-semibold ${getProfitColor(item.profit_per_plate)}`}>
                          ${item.profit_per_plate?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                      
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs text-emerald-400 mb-1">Approved Price</p>
                        <p className="text-lg font-mono font-semibold text-emerald-400">
                          {item.approved_price ? `$${item.approved_price.toFixed(2)}` : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Pricing Decision */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-zinc-800/30 border border-zinc-800">
                      <span className="text-sm text-zinc-400 mr-2">Your decision:</span>
                      
                      <Button
                        size="sm"
                        variant={priceDecisions[item.id] === "maintain" ? "default" : "outline"}
                        onClick={() => setDecision(item.id, "maintain")}
                        className={priceDecisions[item.id] === "maintain" 
                          ? "bg-zinc-700 text-white" 
                          : "border-zinc-700 text-zinc-400 hover:text-white"}
                        data-testid={`maintain-btn-${index}`}
                      >
                        <Minus className="w-4 h-4 mr-1" />
                        Maintain
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={priceDecisions[item.id] === "increase" ? "default" : "outline"}
                        onClick={() => setDecision(item.id, "increase")}
                        className={priceDecisions[item.id] === "increase" 
                          ? "bg-emerald-600 text-white" 
                          : "border-zinc-700 text-zinc-400 hover:text-white"}
                        data-testid={`increase-btn-${index}`}
                      >
                        <TrendingUp className="w-4 h-4 mr-1" />
                        Increase
                      </Button>
                      
                      <Button
                        size="sm"
                        variant={priceDecisions[item.id] === "decrease" ? "default" : "outline"}
                        onClick={() => setDecision(item.id, "decrease")}
                        className={priceDecisions[item.id] === "decrease" 
                          ? "bg-amber-600 text-white" 
                          : "border-zinc-700 text-zinc-400 hover:text-white"}
                        data-testid={`decrease-btn-${index}`}
                      >
                        <TrendingDown className="w-4 h-4 mr-1" />
                        Decrease
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={priceDecisions[item.id] === "custom" ? "default" : "outline"}
                          onClick={() => setDecision(item.id, "custom")}
                          className={priceDecisions[item.id] === "custom" 
                            ? "bg-violet-600 text-white" 
                            : "border-zinc-700 text-zinc-400 hover:text-white"}
                          data-testid={`custom-btn-${index}`}
                        >
                          Custom
                        </Button>
                        
                        {priceDecisions[item.id] === "custom" && (
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={customPrices[item.id] || ""}
                            onChange={(e) => setCustomPrices(prev => ({
                              ...prev,
                              [item.id]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-24 h-8 bg-zinc-900 border-zinc-700 text-white font-mono"
                            data-testid={`custom-price-input-${index}`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedItems[item.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 pt-4 border-t border-zinc-800"
                      >
                        <Tabs defaultValue="ingredients" className="w-full">
                          <TabsList className="bg-zinc-800/50 mb-4">
                            <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                            <TabsTrigger value="competitors">Competitor Prices</TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="ingredients">
                            {item.ingredients?.length > 0 ? (
                              <div className="grid md:grid-cols-2 gap-2">
                                {item.ingredients.map((ing, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                                    <div>
                                      <p className="text-sm text-white">{ing.name}</p>
                                      <p className="text-xs text-zinc-500">{ing.portion}</p>
                                    </div>
                                    <p className="font-mono text-amber-400">${ing.estimated_cost?.toFixed(2)}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-zinc-500">No ingredient data available</p>
                            )}
                          </TabsContent>
                          
                          <TabsContent value="competitors">
                            {item.competitor_prices?.length > 0 ? (
                              <div className="space-y-2">
                                {item.competitor_prices.map((comp, i) => (
                                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30">
                                    <div>
                                      <p className="text-sm text-white">{comp.restaurant}</p>
                                      <p className="text-xs text-zinc-500">{comp.distance_miles} miles away</p>
                                    </div>
                                    <p className="font-mono text-blue-400">${comp.price?.toFixed(2)}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-sm text-zinc-500 mb-3">No competitor data yet</p>
                                <Button
                                  size="sm"
                                  onClick={handleCompetitorAnalysis}
                                  disabled={analyzingCompetitors}
                                  variant="outline"
                                  className="border-zinc-700"
                                >
                                  {analyzingCompetitors ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <BarChart3 className="w-4 h-4 mr-2" />
                                  )}
                                  Run Competitor Analysis
                                </Button>
                              </div>
                            )}
                          </TabsContent>
                        </Tabs>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
