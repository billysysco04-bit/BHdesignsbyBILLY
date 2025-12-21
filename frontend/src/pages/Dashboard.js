import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, FileText, Trash2, ChefHat, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';

export default function Dashboard() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      const data = await api.getMenus();
      setMenus(data);
    } catch (error) {
      toast.error('Failed to load menus');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (menuId) => {
    if (!window.confirm('Are you sure you want to delete this menu?')) return;

    try {
      await api.deleteMenu(menuId);
      toast.success('Menu deleted');
      loadMenus();
    } catch (error) {
      toast.error('Failed to delete menu');
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    setTimeout(() => navigate('/'), 100);
  };

  return (
    <div className="min-h-screen bg-paper grain">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-charcoal" />
            <span className="font-playfair text-2xl font-bold text-charcoal">Menu Maker</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-neutral-600">Hi, {user?.name}</span>
            <Button
              variant="ghost"
              onClick={handleLogout}
              data-testid="logout-button"
              className="rounded-full"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-playfair text-4xl font-bold text-charcoal mb-2">My Menus</h1>
            <p className="text-neutral-600">Manage and edit your menu creations</p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => navigate('/templates')}
              data-testid="browse-templates-button"
              variant="outline"
              className="border-charcoal text-charcoal hover:bg-neutral-50 rounded-full"
            >
              Browse Templates
            </Button>
            <Button
              onClick={() => navigate('/editor')}
              data-testid="create-new-menu-button"
              className="bg-charcoal text-white hover:bg-neutral-800 rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Menu
            </Button>
          </div>
        </div>

        {/* Menus Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">Loading your menus...</p>
          </div>
        ) : menus.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
            data-testid="empty-state"
          >
            <FileText className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="font-playfair text-2xl font-bold text-charcoal mb-2">
              No menus yet
            </h3>
            <p className="text-neutral-600 mb-6">
              Create your first menu to get started
            </p>
            <Button
              onClick={() => navigate('/templates')}
              data-testid="empty-state-create-button"
              className="bg-charcoal text-white hover:bg-neutral-800 rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Menu
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="menus-grid">
            {menus.map((menu, index) => (
              <motion.div
                key={menu.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer group"
                onClick={() => navigate(`/editor/${menu.id}`)}
                data-testid={`menu-card-${menu.id}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-playfair text-xl font-bold text-charcoal mb-1">
                      {menu.title}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      {menu.items?.length || 0} items
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(menu.id);
                    }}
                    data-testid={`delete-menu-${menu.id}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-xs text-neutral-500">
                  Updated {new Date(menu.updated_at).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
