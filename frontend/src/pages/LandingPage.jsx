import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import { 
  Upload, 
  ChefHat, 
  DollarSign, 
  TrendingUp, 
  FileText, 
  Zap,
  ArrowRight,
  Check,
  BarChart3,
  Target,
  Shield,
  Loader2
} from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [adminLoading, setAdminLoading] = useState(false);

  const handleAdminLogin = async () => {
    setAdminLoading(true);
    try {
      const response = await axios.get(`${API}/auth/admin-login`);
      const { access_token, user } = response.data;
      localStorage.setItem("token", access_token);
      window.location.href = "/dashboard"; // Force reload to update auth state
    } catch (error) {
      toast.error("Admin login failed");
    } finally {
      setAdminLoading(false);
    }
  };

  const features = [
    {
      icon: Upload,
      title: "Easy Menu Import",
      description: "Upload menus via photos, PDFs, or drag-and-drop. Our AI handles the rest."
    },
    {
      icon: Zap,
      title: "AI-Powered Analysis",
      description: "Extract item names, prices, and descriptions automatically with advanced AI."
    },
    {
      icon: BarChart3,
      title: "Ingredient Costing",
      description: "Get detailed ingredient breakdowns with industry-standard pricing."
    },
    {
      icon: Target,
      title: "Competitor Insights",
      description: "Analyze pricing from competitors within 60 miles of your location."
    },
    {
      icon: TrendingUp,
      title: "Smart Pricing",
      description: "Receive data-driven pricing suggestions to maximize profitability."
    },
    {
      icon: FileText,
      title: "Export & Save",
      description: "Save jobs and export to PDF, print, or email for future reference."
    }
  ];

  const pricingFeatures = [
    "Unlimited menu uploads",
    "AI-powered item extraction",
    "Food cost calculations",
    "Competitor price analysis",
    "Custom pricing approval",
    "Export to multiple formats"
  ];

  return (
    <div className="min-h-screen bg-[#09090b] overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <ChefHat className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white font-['Manrope']">MenuGenius</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user ? (
              <Button 
                data-testid="nav-dashboard-btn"
                onClick={() => navigate("/dashboard")}
                className="bg-white text-zinc-900 hover:bg-zinc-100"
              >
                Dashboard
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  data-testid="nav-login-btn"
                  onClick={() => navigate("/auth")}
                  className="text-zinc-300 hover:text-white"
                >
                  Sign In
                </Button>
                <Button 
                  data-testid="nav-signup-btn"
                  onClick={() => navigate("/auth?mode=register")}
                  className="bg-white text-zinc-900 hover:bg-zinc-100"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
                <Zap className="w-4 h-4" />
                AI-Powered Menu Management
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6 font-['Manrope'] tracking-tight">
                Transform Your Menu Into a
                <span className="text-gradient"> Profit Machine</span>
              </h1>
              
              <p className="text-xl text-zinc-400 mb-8 leading-relaxed">
                Upload any menu and let AI analyze food costs, suggest optimal pricing, 
                and provide competitor insights—all in minutes.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg"
                  data-testid="hero-get-started-btn"
                  onClick={() => navigate(user ? "/upload" : "/auth?mode=register")}
                  className="bg-white text-zinc-900 hover:bg-zinc-100 h-12 px-8 text-base font-semibold"
                >
                  Start Free Analysis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  data-testid="hero-learn-more-btn"
                  className="border-zinc-700 text-white hover:bg-zinc-800 h-12 px-8 text-base"
                >
                  See How It Works
                </Button>
              </div>
              
              <div className="mt-8 flex items-center gap-6 text-sm text-zinc-500">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  3 Free Credits
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" />
                  No Credit Card Required
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1621494547944-5ddbc84514b2?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2Mzl8MHwxfHNlYXJjaHwyfHxjaGVmJTIwcGxhdGluZyUyMGZvb2QlMjBkYXJrJTIwYmFja2dyb3VuZHxlbnwwfHx8fDE3NjYzMjIwMDB8MA&ixlib=rb-4.1.0&q=85"
                  alt="Chef preparing food"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/90 via-zinc-900/20 to-transparent" />
                
                {/* Floating card */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute bottom-6 left-6 right-6 glass-card rounded-xl p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-400">Menu Analysis Complete</p>
                      <p className="text-lg font-semibold text-white">12 items analyzed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-zinc-400">Profit Potential</p>
                      <p className="text-lg font-semibold text-emerald-400 font-mono">+23.5%</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-['Manrope']">
              Everything You Need to Optimize Pricing
            </h2>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              From menu import to final approval, MenuGenius handles every step of your pricing strategy.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-6 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 font-['Manrope']">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-zinc-900/30 border-y border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-['Manrope']">
              How It Works
            </h2>
            <p className="text-lg text-zinc-400">
              Three simple steps to optimize your menu pricing
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Upload Your Menu", desc: "Drag and drop your menu as a photo or PDF" },
              { step: "02", title: "AI Analysis", desc: "Our AI extracts items, calculates costs, and analyzes competitors" },
              { step: "03", title: "Approve & Export", desc: "Review suggestions, approve prices, and export your optimized menu" }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                <div className="text-6xl font-bold text-zinc-800 font-['JetBrains_Mono'] mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 font-['Manrope']">
                  {item.title}
                </h3>
                <p className="text-zinc-400">
                  {item.desc}
                </p>
                {index < 2 && (
                  <ArrowRight className="hidden md:block absolute top-8 -right-4 w-8 h-8 text-zinc-700" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-['Manrope']">
              Ready to Maximize Your Menu Profits?
            </h2>
            <p className="text-lg text-zinc-400 mb-8">
              Join restaurant owners who are using AI to price their menus smarter.
            </p>
            <Button 
              size="lg"
              data-testid="cta-get-started-btn"
              onClick={() => navigate(user ? "/upload" : "/auth?mode=register")}
              className="bg-white text-zinc-900 hover:bg-zinc-100 h-14 px-10 text-lg font-semibold"
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <p className="mt-4 text-sm text-zinc-500">
              3 free menu analyses • No credit card required
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-zinc-800/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-zinc-400">
              © 2024 MenuGenius by Billy Harman, BHdesignsbyBILLY. All Rights Reserved.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
