import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import {
  ChefHat,
  Upload,
  FolderOpen,
  CreditCard,
  TrendingUp,
  DollarSign,
  FileText,
  Plus,
  ArrowRight,
  LogOut,
  Loader2,
  Coins,
  BarChart3
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, token, logout, refreshUser } = useAuth();
  const [recentMenus, setRecentMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMenus: 0,
    totalItems: 0,
    avgProfit: 0
  });

  useEffect(() => {
    fetchMenus();
    refreshUser();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await axios.get(`${API}/menus`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const menus = response.data;
      setRecentMenus(menus.slice(0, 5));
      
      // Calculate stats
      const totalItems = menus.reduce((acc, m) => acc + (m.items?.length || 0), 0);
      const totalProfit = menus.reduce((acc, m) => acc + (m.total_profit || 0), 0);
      setStats({
        totalMenus: menus.length,
        totalItems,
        avgProfit: menus.length > 0 ? (totalProfit / menus.length).toFixed(2) : 0
      });
    } catch (error) {
      console.error("Error fetching menus:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-amber-500/20 text-amber-400",
      analyzing: "bg-blue-500/20 text-blue-400",
      completed: "bg-emerald-500/20 text-emerald-400",
      approved: "bg-violet-500/20 text-violet-400"
    };
    return colors[status] || colors.pending;
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white font-['Manrope']">MenuGenius</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/credits")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Coins className="w-4 h-4" />
              <span className="font-mono font-medium">{user?.credits || 0} credits</span>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-zinc-500">{user?.email}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-zinc-400 hover:text-white"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2 font-['Manrope']">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-zinc-400">
            Manage your menu analyses and optimize your pricing strategy.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Menus", value: stats.totalMenus, icon: FileText, color: "blue" },
            { label: "Items Analyzed", value: stats.totalItems, icon: TrendingUp, color: "emerald" },
            { label: "Avg. Profit/Menu", value: `$${stats.avgProfit}`, icon: DollarSign, color: "violet" },
            { label: "Credits Available", value: user?.credits || 0, icon: CreditCard, color: "amber" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/10 flex items-center justify-center`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white font-['JetBrains_Mono']">{stat.value}</p>
                  <p className="text-sm text-zinc-500">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card 
              data-testid="upload-menu-card"
              className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:border-blue-500/40 transition-all cursor-pointer group"
              onClick={() => navigate("/upload")}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-blue-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Upload Menu</h3>
                  <p className="text-sm text-zinc-400">Analyze a new menu</p>
                </div>
                <ArrowRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card 
              data-testid="saved-menus-card"
              className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer group"
              onClick={() => navigate("/menus")}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FolderOpen className="w-7 h-7 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Saved Menus</h3>
                  <p className="text-sm text-zinc-400">View all analyses</p>
                </div>
                <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card 
              data-testid="buy-credits-card"
              className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer group"
              onClick={() => navigate("/credits")}
            >
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="w-7 h-7 text-amber-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Buy Credits</h3>
                  <p className="text-sm text-zinc-400">Get more analyses</p>
                </div>
                <ArrowRight className="w-5 h-5 text-amber-400 group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Recent Menus */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white font-['Manrope']">Recent Analyses</h2>
            {recentMenus.length > 0 && (
              <Button 
                variant="ghost" 
                onClick={() => navigate("/menus")}
                className="text-zinc-400 hover:text-white"
              >
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : recentMenus.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800 border-dashed">
              <CardContent className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-zinc-600" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">No menus yet</h3>
                <p className="text-zinc-500 mb-6">Upload your first menu to get started with AI-powered analysis.</p>
                <Button 
                  onClick={() => navigate("/upload")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Upload Your First Menu
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {recentMenus.map((menu, index) => (
                <Card 
                  key={menu.id}
                  data-testid={`menu-item-${index}`}
                  className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
                  onClick={() => navigate(`/menu/${menu.id}`)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-white">{menu.name}</h3>
                        <p className="text-sm text-zinc-500">
                          {menu.items?.length || 0} items • {new Date(menu.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {menu.total_profit > 0 && (
                        <span className="font-mono text-emerald-400">
                          +${menu.total_profit?.toFixed(2)}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getStatusColor(menu.status)}`}>
                        {menu.status}
                      </span>
                      <ArrowRight className="w-4 h-4 text-zinc-600" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
