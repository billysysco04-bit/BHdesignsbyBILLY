import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, ArrowLeft, Users, FileText, Trash2, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [menus, setMenus] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.is_admin) {
      toast.error('Access denied - Admin privileges required');
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, usersRes, menusRes] = await Promise.all([
        axios.get(`${API_URL}/admin/stats`, { headers }),
        axios.get(`${API_URL}/admin/users`, { headers }),
        axios.get(`${API_URL}/admin/menus`, { headers })
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
      setMenus(menusRes.data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure? This will delete the user and all their menus.')) return;
    
    try {
      await axios.delete(`${API_URL}/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('User deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleDeleteMenu = async (menuId) => {
    if (!window.confirm('Are you sure you want to delete this menu?')) return;
    
    try {
      await axios.delete(`${API_URL}/admin/menus/${menuId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Menu deleted');
      loadData();
    } catch (error) {
      toast.error('Failed to delete menu');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper grain flex items-center justify-center">
        <p className="text-neutral-600">Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper grain">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/dashboard')}
              data-testid="back-to-dashboard"
              variant="ghost"
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-terracotta" />
            <span className="font-playfair text-xl font-bold text-charcoal">Admin Panel</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-neutral-200 rounded-xl p-6"
                data-testid="stat-users"
              >
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-8 h-8 text-terracotta" />
                  <span className="text-3xl font-playfair font-bold text-charcoal">
                    {stats?.total_users || 0}
                  </span>
                </div>
                <p className="text-neutral-600">Total Users</p>
                <p className="text-sm text-neutral-500 mt-1">
                  {stats?.admin_users || 0} admins
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-neutral-200 rounded-xl p-6"
                data-testid="stat-menus"
              >
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-8 h-8 text-sage" />
                  <span className="text-3xl font-playfair font-bold text-charcoal">
                    {stats?.total_menus || 0}
                  </span>
                </div>
                <p className="text-neutral-600">Total Menus</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white border border-neutral-200 rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <ChefHat className="w-8 h-8 text-charcoal" />
                  <span className="text-3xl font-playfair font-bold text-charcoal">
                    {users.length > 0 ? (stats?.total_menus / stats?.total_users).toFixed(1) : 0}
                  </span>
                </div>
                <p className="text-neutral-600">Avg Menus/User</p>
              </motion.div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-neutral-200">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-charcoal text-charcoal'
                    : 'text-neutral-500 hover:text-charcoal'
                }`}
                data-testid="tab-overview"
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  activeTab === 'users'
                    ? 'border-b-2 border-charcoal text-charcoal'
                    : 'text-neutral-500 hover:text-charcoal'
                }`}
                data-testid="tab-users"
              >
                All Users ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('menus')}
                className={`pb-3 px-4 font-medium transition-colors ${
                  activeTab === 'menus'
                    ? 'border-b-2 border-charcoal text-charcoal'
                    : 'text-neutral-500 hover:text-charcoal'
                }`}
                data-testid="tab-menus"
              >
                All Menus ({menus.length})
              </button>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-playfair text-2xl font-bold text-charcoal">All Users</h2>
              <Button
                onClick={() => setActiveTab('overview')}
                variant="ghost"
              >
                Back to Overview
              </Button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden" data-testid="users-table">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left p-4 font-medium text-charcoal">Name</th>
                    <th className="text-left p-4 font-medium text-charcoal">Email</th>
                    <th className="text-left p-4 font-medium text-charcoal">Role</th>
                    <th className="text-left p-4 font-medium text-charcoal">Joined</th>
                    <th className="text-right p-4 font-medium text-charcoal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="p-4">{u.name}</td>
                      <td className="p-4 text-neutral-600">{u.email}</td>
                      <td className="p-4">
                        {u.is_admin ? (
                          <span className="inline-block bg-terracotta/10 text-terracotta px-3 py-1 rounded-full text-xs font-medium">
                            Admin
                          </span>
                        ) : (
                          <span className="text-neutral-500 text-sm">User</span>
                        )}
                      </td>
                      <td className="p-4 text-neutral-600 text-sm">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        {!u.is_admin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(u.id)}
                            data-testid={`delete-user-${u.id}`}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Menus Tab */}
        {activeTab === 'menus' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-playfair text-2xl font-bold text-charcoal">All Menus</h2>
              <Button
                onClick={() => setActiveTab('overview')}
                variant="ghost"
              >
                Back to Overview
              </Button>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden" data-testid="menus-table">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="text-left p-4 font-medium text-charcoal">Title</th>
                    <th className="text-left p-4 font-medium text-charcoal">Owner</th>
                    <th className="text-left p-4 font-medium text-charcoal">Items</th>
                    <th className="text-left p-4 font-medium text-charcoal">Created</th>
                    <th className="text-right p-4 font-medium text-charcoal">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menus.map((menu) => {
                    const owner = users.find(u => u.id === menu.user_id);
                    return (
                      <tr key={menu.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                        <td className="p-4 font-medium">{menu.title}</td>
                        <td className="p-4 text-neutral-600">{owner?.name || 'Unknown'}</td>
                        <td className="p-4 text-neutral-600">{menu.items?.length || 0}</td>
                        <td className="p-4 text-neutral-600 text-sm">
                          {new Date(menu.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMenu(menu.id)}
                            data-testid={`delete-menu-${menu.id}`}
                            className="hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
