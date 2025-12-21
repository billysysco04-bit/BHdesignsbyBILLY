import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, Shield } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { Checkbox } from '../components/ui/checkbox';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showAdminSecret, setShowAdminSecret] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    adminSecret: ''
  });

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        const adminSecret = showAdminSecret && formData.adminSecret ? formData.adminSecret : null;
        await register(formData.name, formData.email, formData.password, adminSecret);
        toast.success('Account created successfully!');
      }
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper grain flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <ChefHat className="w-10 h-10 text-charcoal" />
            <div className="flex flex-col">
              <span className="font-playfair text-3xl font-bold text-charcoal leading-tight">MenuMaker</span>
              <span className="text-xs text-neutral-500 -mt-1">by BHdesignsbyBILLY</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="font-playfair text-3xl font-bold text-charcoal mb-2">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-neutral-600">
              {isLogin ? 'Log in to access your menus' : 'Sign up to start creating beautiful menus'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6" data-testid="auth-form">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-charcoal font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  data-testid="auth-name-input"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required={!isLogin}
                  className="border-neutral-300 focus:border-charcoal"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-charcoal font-medium">
                Email
              </Label>
              <Input
                id="email"
                data-testid="auth-email-input"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="border-neutral-300 focus:border-charcoal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-charcoal font-medium">
                Password
              </Label>
              <Input
                id="password"
                data-testid="auth-password-input"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="border-neutral-300 focus:border-charcoal"
              />
            </div>

            {!isLogin && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="admin-check"
                    checked={showAdminSecret}
                    onCheckedChange={setShowAdminSecret}
                    data-testid="admin-checkbox"
                  />
                  <label htmlFor="admin-check" className="text-sm text-neutral-600 cursor-pointer flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Register as Admin
                  </label>
                </div>
                {showAdminSecret && (
                  <div className="space-y-2">
                    <Label htmlFor="adminSecret" className="text-charcoal font-medium">
                      Admin Secret
                    </Label>
                    <Input
                      id="adminSecret"
                      data-testid="auth-admin-secret-input"
                      type="password"
                      placeholder="Enter admin secret"
                      value={formData.adminSecret}
                      onChange={(e) => setFormData({ ...formData, adminSecret: e.target.value })}
                      className="border-terracotta focus:border-terracotta"
                    />
                    <p className="text-xs text-neutral-500">Contact admin for secret key</p>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              data-testid="auth-submit-button"
              disabled={loading}
              className="w-full bg-charcoal text-white hover:bg-neutral-800 rounded-full py-6 text-lg"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Sign Up')}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <button
              type="button"
              data-testid="auth-toggle-button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-neutral-600 hover:text-charcoal transition-colors"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
            </button>
          </div>

          {/* Copyright */}
          <div className="mt-6 text-center text-xs text-neutral-400">
            &copy; 2025 MenuMaker. All rights reserved.<br/>
            Owned and operated by BHdesignsbyBILLY - Billy Harman
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-neutral-600 hover:text-charcoal transition-colors"
          >
            ← Back to home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
