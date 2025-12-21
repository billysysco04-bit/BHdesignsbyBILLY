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
  Crown,
  Zap,
  Building2,
  Calendar,
  X
} from "lucide-react";

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token, user, refreshUser } = useAuth();
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
    
    const sessionId = searchParams.get("session_id");
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPlans(response.data);
    } catch (error) {
      console.error("Failed to load plans");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions/current`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentSub(response.data.subscription);
    } catch (error) {
      console.error("Failed to load subscription");
    }
  };

  const checkPaymentStatus = async (sessionId) => {
    setCheckingPayment(true);
    let attempts = 0;
    const maxAttempts = 5;

    const poll = async () => {
      try {
        const response = await axios.get(`${API}/subscriptions/status/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.status === "completed") {
          toast.success(`Subscription activated! +${response.data.credits_added} credits added`);
          await refreshUser();
          await fetchCurrentSubscription();
          navigate("/subscription", { replace: true });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          toast.info("Payment is being processed. Subscription will be activated shortly.");
          setCheckingPayment(false);
        }
      } catch (error) {
        setCheckingPayment(false);
      }
    };

    poll();
  };

  const handleSubscribe = async (planId) => {
    setPurchasing(planId);
    try {
      const response = await axios.post(
        `${API}/subscriptions/checkout?plan_id=${planId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      window.location.href = response.data.checkout_url;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create checkout");
      setPurchasing(null);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription?")) {
      return;
    }
    
    setCancelling(true);
    try {
      await axios.post(
        `${API}/subscriptions/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Subscription cancelled");
      await fetchCurrentSubscription();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const getPlanIcon = (id) => {
    switch (id) {
      case "basic": return Zap;
      case "pro": return Crown;
      case "business": return Building2;
      default: return Zap;
    }
  };

  const getPlanColor = (id) => {
    switch (id) {
      case "basic": return "blue";
      case "pro": return "emerald";
      case "business": return "violet";
      default: return "blue";
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white font-['Manrope']">Subscription</span>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/credits")}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Buy Credits Instead
          </Button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {checkingPayment && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="bg-violet-500/10 border-violet-500/20">
              <CardContent className="p-6 flex items-center gap-4">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
                <div>
                  <p className="font-medium text-white">Processing your subscription...</p>
                  <p className="text-sm text-zinc-400">Your plan will be activated shortly.</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Current Subscription Status */}
        {currentSub && currentSub.status === "active" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <Card className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 border-violet-500/30">
              <CardContent className="p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Crown className="w-6 h-6 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm text-violet-400">Active Subscription</p>
                        <h3 className="text-2xl font-bold text-white">{currentSub.plan_name}</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="text-zinc-500">Credits per month</p>
                        <p className="text-white font-semibold">{currentSub.credits_per_month}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Next renewal</p>
                        <p className="text-white font-semibold">{formatDate(currentSub.next_renewal)}</p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    {cancelling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Plans Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2 font-['Manrope']">
            {currentSub?.status === "active" ? "Change Your Plan" : "Choose a Subscription Plan"}
          </h2>
          <p className="text-zinc-400">
            Get monthly credits at a discounted rate. Cancel anytime.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, index) => {
              const Icon = getPlanIcon(plan.id);
              const color = getPlanColor(plan.id);
              const isPopular = plan.id === "pro";
              const isCurrentPlan = currentSub?.plan_id === plan.id && currentSub?.status === "active";

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className={`relative bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all ${
                      isPopular ? "ring-2 ring-emerald-500/50" : ""
                    } ${isCurrentPlan ? "ring-2 ring-violet-500/50" : ""}`}
                    data-testid={`plan-${plan.id}`}
                  >
                    {isPopular && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold">
                          Most Popular
                        </span>
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="px-3 py-1 rounded-full bg-violet-500 text-white text-xs font-semibold">
                          Current Plan
                        </span>
                      </div>
                    )}
                    
                    <CardContent className="p-6 text-center">
                      <div className={`w-14 h-14 rounded-xl bg-${color}-500/10 flex items-center justify-center mx-auto mb-4`}>
                        <Icon className={`w-7 h-7 text-${color}-400`} />
                      </div>
                      
                      <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                      <p className="text-4xl font-bold text-white font-['JetBrains_Mono'] my-4">
                        ${plan.price_per_month.toFixed(2)}
                        <span className="text-sm font-normal text-zinc-500">/mo</span>
                      </p>
                      
                      <p className="text-zinc-400 mb-6">
                        <span className="text-2xl font-bold text-white">{plan.credits_per_month}</span> credits/month
                      </p>
                      
                      <ul className="text-sm text-zinc-400 space-y-2 mb-6 text-left">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      <Button
                        onClick={() => handleSubscribe(plan.id)}
                        disabled={purchasing === plan.id || isCurrentPlan}
                        data-testid={`subscribe-${plan.id}-btn`}
                        className={`w-full ${
                          isCurrentPlan
                            ? "bg-zinc-700 cursor-not-allowed"
                            : isPopular 
                              ? "bg-emerald-600 hover:bg-emerald-700" 
                              : "bg-violet-600 hover:bg-violet-700"
                        }`}
                      >
                        {purchasing === plan.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isCurrentPlan ? (
                          "Current Plan"
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Subscribe
                          </>
                        )}
                      </Button>
                      
                      <p className="text-xs text-zinc-600 mt-3">
                        ${(plan.price_per_month / plan.credits_per_month).toFixed(2)} per credit
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
          <p>Secure payment powered by Stripe. Cancel anytime.</p>
          <p className="mt-2">
            Need one-time credits instead?{" "}
            <button 
              onClick={() => navigate("/credits")}
              className="text-violet-400 hover:text-violet-300"
            >
              Buy credit packs
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
