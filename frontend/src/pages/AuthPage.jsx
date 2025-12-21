import React, { useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../App";
import { toast } from "sonner";
import { ChefHat, Mail, Lock, User, Building, MapPin, ArrowLeft, Loader2 } from "lucide-react";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const [isLogin, setIsLogin] = useState(searchParams.get("mode") !== "register");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    business_name: "",
    location: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success("Welcome back!");
      } else {
        await register(formData);
        toast.success("Account created! You have 3 free credits to start.");
      }
      
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from);
    } catch (error) {
      const message = error.response?.data?.detail || "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Left Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 lg:px-16 py-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full mx-auto"
        >
          <button 
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white font-['Manrope']">MenuGenius</span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 font-['Manrope']">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-zinc-400 mb-8">
            {isLogin 
              ? "Sign in to manage your menu analysis" 
              : "Start optimizing your menu pricing today"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      id="name"
                      name="name"
                      data-testid="auth-name-input"
                      placeholder="John Smith"
                      value={formData.name}
                      onChange={handleChange}
                      required={!isLogin}
                      className="pl-11 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business_name" className="text-zinc-300">Business Name (Optional)</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      id="business_name"
                      name="business_name"
                      data-testid="auth-business-input"
                      placeholder="Your Restaurant"
                      value={formData.business_name}
                      onChange={handleChange}
                      className="pl-11 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-zinc-300">Location (Optional)</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <Input
                      id="location"
                      name="location"
                      data-testid="auth-location-input"
                      placeholder="City, State"
                      value={formData.location}
                      onChange={handleChange}
                      className="pl-11 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  data-testid="auth-email-input"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="pl-11 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  data-testid="auth-password-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="pl-11 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                />
              </div>
            </div>

            <Button
              type="submit"
              data-testid="auth-submit-btn"
              disabled={loading}
              className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 font-semibold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-zinc-400">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-emerald-600/20" />
        <img
          src="https://images.unsplash.com/photo-1713298324627-f2738016a25e?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2MzR8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwa2l0Y2hlbiUyMGJ1c3klMjBibHVyfGVufDB8fHx8MTc2NjMyMjAwMXww&ixlib=rb-4.1.0&q=85"
          alt="Restaurant kitchen"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent" />
        
        {/* Quote */}
        <div className="absolute bottom-12 left-12 right-12">
          <blockquote className="text-2xl text-white font-['Manrope'] font-semibold mb-4">
            MenuGenius helped us increase our profit margins by 18% in just one month.
          </blockquote>
          <cite className="text-zinc-400 not-italic">
            — Sarah Chen, Owner of The Blue Kitchen
          </cite>
        </div>
      </div>
    </div>
  );
}
