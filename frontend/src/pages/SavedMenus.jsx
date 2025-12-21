import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import {
  ChefHat,
  ArrowLeft,
  Loader2,
  FileText,
  Trash2,
  Eye,
  MoreVertical,
  Calendar,
  DollarSign,
  TrendingUp,
  Check,
  Search,
  Filter
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export default function SavedMenus() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    try {
      const response = await axios.get(`${API}/menus`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenus(response.data);
    } catch (error) {
      toast.error("Failed to load menus");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    try {
      await axios.delete(`${API}/menus/${deleteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMenus(menus.filter(m => m.id !== deleteId));
      toast.success("Menu deleted successfully");
    } catch (error) {
      toast.error("Failed to delete menu");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: "bg-amber-500/20 text-amber-400",
      analyzing: "bg-blue-500/20 text-blue-400",
      completed: "bg-emerald-500/20 text-emerald-400",
      approved: "bg-violet-500/20 text-violet-400"
    };
    return styles[status] || styles.pending;
  };

  const filteredMenus = menus.filter(menu => {
    const matchesSearch = menu.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || menu.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: menus.length,
    pending: menus.filter(m => m.status === "pending").length,
    completed: menus.filter(m => m.status === "completed").length,
    approved: menus.filter(m => m.status === "approved").length
  };

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
              <span className="text-xl font-bold text-white font-['Manrope']">Saved Menus</span>
            </div>
          </div>
          
          <Button onClick={() => navigate("/upload")} className="bg-blue-600 hover:bg-blue-700">
            Upload New Menu
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Menus", value: stats.total, color: "blue" },
            { label: "Pending", value: stats.pending, color: "amber" },
            { label: "Completed", value: stats.completed, color: "emerald" },
            { label: "Approved", value: stats.approved, color: "violet" }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-4">
                  <p className="text-2xl font-bold text-white font-['JetBrains_Mono']">{stat.value}</p>
                  <p className="text-sm text-zinc-500">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <Input
              placeholder="Search menus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
              data-testid="search-input"
            />
          </div>
          
          <div className="flex gap-2">
            {["all", "pending", "completed", "approved"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className={statusFilter === status 
                  ? "bg-zinc-700 text-white" 
                  : "border-zinc-700 text-zinc-400 hover:text-white"}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Menu List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredMenus.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery || statusFilter !== "all" ? "No menus found" : "No saved menus yet"}
              </h3>
              <p className="text-zinc-500 mb-6">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your search or filters" 
                  : "Upload your first menu to get started"}
              </p>
              {!searchQuery && statusFilter === "all" && (
                <Button onClick={() => navigate("/upload")} className="bg-blue-600 hover:bg-blue-700">
                  Upload Menu
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredMenus.map((menu, index) => (
              <motion.div
                key={menu.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className="bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-colors"
                  data-testid={`saved-menu-${index}`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex items-center gap-4 flex-1 cursor-pointer"
                        onClick={() => navigate(`/menu/${menu.id}`)}
                      >
                        <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-zinc-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">{menu.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(menu.created_at).toLocaleDateString()}
                            </span>
                            <span>{menu.items?.length || 0} items</span>
                            {menu.location && (
                              <span className="flex items-center gap-1">
                                📍 {menu.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {menu.total_food_cost > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">Food Cost</p>
                            <p className="font-mono text-amber-400">${menu.total_food_cost?.toFixed(2)}</p>
                          </div>
                        )}
                        
                        {menu.total_profit !== undefined && menu.total_profit !== null && (
                          <div className="text-right">
                            <p className="text-xs text-zinc-500">Profit</p>
                            <p className={`font-mono ${menu.total_profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              ${menu.total_profit?.toFixed(2)}
                            </p>
                          </div>
                        )}
                        
                        <span className={`px-2.5 py-1 rounded text-xs font-medium uppercase ${getStatusBadge(menu.status)}`}>
                          {menu.status}
                        </span>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                              <MoreVertical className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                            <DropdownMenuItem 
                              onClick={() => navigate(`/menu/${menu.id}`)}
                              className="text-zinc-300 hover:text-white focus:text-white cursor-pointer"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setDeleteId(menu.id)}
                              className="text-red-400 hover:text-red-300 focus:text-red-300 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Menu?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              This action cannot be undone. This will permanently delete the menu and all its analysis data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
