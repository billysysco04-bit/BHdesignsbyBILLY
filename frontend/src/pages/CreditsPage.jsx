import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  CreditCard,
  Check,
  Coins,
  Sparkles,
  Zap
} from "lucide-react";

export default function CreditsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user, refreshUser } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    fetchPackages();
    
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, []);

  const fetchPackages = async () => {
    try {
      const response = await axios.get(`${API}/credits/packages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPackages(response.data);
    } catch (error) {
      console.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (sessionId) => {
    setCheckingPayment(true);
    let attempts = 0;
    const maxAttempts = 5;

    const poll = async () => {
      try {
        const response = await axios.get(`${API}/credits/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.status === "completed") {
          toast.success(`Credits added! +${response.data.credits_added} credits`);
          await refreshUser();
          navigate("/credits", { replace: true });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          toast.info("Payment is being processed. Credits will be added shortly.");
          setCheckingPayment(false);
        }
      } catch (error) {
        setCheckingPayment(false);
      }
    };

    poll();
  };

  const handlePurchase = async (packageId) => {
    setPurchasing(packageId);
    try {
      const response = await axios.post(
        `${API}/credits/checkout?package_id=${packageId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create checkout");
      setPurchasing(null);
    }
  };

  const getPackageIcon = (id) => {
    switch (id) {
      case "starter": return Coins;
      case "professional": return Zap;
      case "enterprise": return Sparkles;
      default: return Coins;
    }
  };

  const getPackageColor = (id) => {
    switch (id) {
      case "starter": return "blue";
      case "professional": return "emerald";
      case "enterprise": return "violet";
      default: return "blue";
    }
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
              <span className="text-xl font-bold text-white font-['Manrope']">Credits</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {checkingPayment && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardContent className="p-6 flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <div>
                  <p className="font-medium text-white">Processing your payment...</p>
                  <p className="text-sm text-zinc-400">Your credits will be added shortly.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Current Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-br from-zinc-900 to-zinc-900/50 border-zinc-800">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                <Coins className="w-10 h-10 text-emerald-400" />
              </div>
              <p className="text-zinc-400 mb-2">Your Current Balance</p>
              <p className="text-5xl font-bold text-white font-['JetBrains_Mono'] mb-2">
                {user?.credits || 0}
              </p>
              <p className="text-zinc-500">credits available</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Packages */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 font-['Manrope']">
            Purchase Credits
          </h2>
          <p className="text-zinc-400">
            Each credit allows you to analyze one menu
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg, index) => {
              const Icon = getPackageIcon(pkg.id);
              const color = getPackageColor(pkg.id);
              const isPopular = pkg.id === "professional";

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`relative bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all ${
                      isPopular ? "ring-2 ring-emerald-500/50" : ""
                    }`}
                    data-testid={`package-${pkg.id}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                          Most Popular
                        </span>
                      </div>
                    )}
                    
                    <CardContent className="p-6 text-center">
                      <div className={`w-14 h-14 rounded-xl bg-${color}-500/10 flex items-center justify-center mx-auto mb-4`}>
                        <Icon className={`w-7 h-7 text-${color}-400`} />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-white mb-1">{pkg.name}</h3>
                      <p className="text-4xl font-bold text-white font-['JetBrains_Mono'] my-4">
                        ${pkg.price.toFixed(2)}
                      </p>
                      
                      <p className="text-zinc-400 mb-6">
                        <span className="text-2xl font-bold text-white">{pkg.credits}</span> credits
                      </p>
                      
                      <ul className="text-sm text-zinc-400 space-y-2 mb-6">
                        <li className="flex items-center gap-2 justify-center">
                          <Check className="w-4 h-4 text-emerald-400" />
                          {pkg.credits} menu analyses
                        </li>
                        <li className="flex items-center gap-2 justify-center">
                          <Check className="w-4 h-4 text-emerald-400" />
                          AI-powered extraction
                        </li>
                        <li className="flex items-center gap-2 justify-center">
                          <Check className="w-4 h-4 text-emerald-400" />
                          Competitor analysis
                        </li>
                      </ul>
                      
                      <Button
                        onClick={() => handlePurchase(pkg.id)}
                        disabled={purchasing === pkg.id}
                        data-testid={`buy-${pkg.id}-btn`}
                        className={`w-full ${
                          isPopular 
                            ? "bg-emerald-600 hover:bg-emerald-700" 
                            : "bg-zinc-700 hover:bg-zinc-600"
                        }`}
                      >
                        {purchasing === pkg.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Purchase
                          </>
                        )}
                      </Button>
                      
                      <p className="text-xs text-zinc-600 mt-3">
                        ${(pkg.price / pkg.credits).toFixed(2)} per credit
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="mt-12 text-center text-sm text-zinc-500">
          <p>Secure payment powered by Stripe. Credits never expire.</p>
          <p className="mt-2">
            Want monthly credits?{" "}
            <button 
              onClick={() => navigate("/subscription")}
              className="text-violet-400 hover:text-violet-300"
            >
              View subscription plans
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
