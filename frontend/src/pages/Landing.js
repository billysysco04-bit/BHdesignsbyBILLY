import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChefHat, Sparkles, Download, Share2, Wand2 } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-paper grain">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-charcoal" />
            <div className="flex flex-col">
              <span className="font-playfair text-2xl font-bold text-charcoal leading-tight">MenuMaker</span>
              <span className="text-xs text-neutral-500 -mt-1">by BHdesignsbyBILLY</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              data-testid="header-login-button"
              className="rounded-full"
            >
              Log In
            </Button>
            <Button
              onClick={() => navigate('/auth')}
              data-testid="header-signup-button"
              className="bg-charcoal text-white hover:bg-neutral-800 rounded-full px-6"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h1 className="font-playfair text-5xl md:text-6xl lg:text-7xl font-bold text-charcoal leading-tight">
              Create stunning menus in minutes
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 leading-relaxed">
              Professional menu creation platform with AI-powered descriptions, beautiful templates, and instant exports. Perfect for restaurants, cafes, and food businesses.
            </p>
            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => navigate('/auth')}
                data-testid="hero-get-started-button"
                className="bg-charcoal text-white hover:bg-neutral-800 rounded-full px-8 py-6 text-lg"
              >
                Get Started Free
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/templates')}
                data-testid="hero-browse-templates-button"
                className="border-charcoal text-charcoal hover:bg-neutral-50 rounded-full px-8 py-6 text-lg"
              >
                Browse Templates
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-neutral-200">
              <img
                src="https://images.unsplash.com/photo-1750943024048-a4c9912b1425?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxnb3VybWV0JTIwZm9vZCUyMHBsYXRpbmclMjBoaWdoJTIwZW5kfGVufDB8fHx8MTc2NjM2MDAxNnww&ixlib=rb-4.1.0&q=85"
                alt="Gourmet food"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20 md:py-32 border-y border-neutral-200">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-playfair text-4xl md:text-5xl font-bold text-charcoal mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Professional tools to create, customize, and share your menus
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-paper border border-neutral-200 rounded-xl p-8 hover:shadow-lg transition-shadow"
              data-testid="feature-ai-descriptions"
            >
              <div className="w-12 h-12 bg-terracotta/10 rounded-full flex items-center justify-center mb-4">
                <Wand2 className="w-6 h-6 text-terracotta" />
              </div>
              <h3 className="font-playfair text-2xl font-bold text-charcoal mb-3">
                AI-Powered Descriptions
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Generate mouth-watering menu descriptions instantly with our AI assistant. Professional, creative, or casual - you choose the style.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-paper border border-neutral-200 rounded-xl p-8 hover:shadow-lg transition-shadow"
              data-testid="feature-templates"
            >
              <div className="w-12 h-12 bg-sage/20 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-sage" />
              </div>
              <h3 className="font-playfair text-2xl font-bold text-charcoal mb-3">
                Beautiful Templates
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Choose from 10+ professionally designed templates. From classic elegance to modern minimal, find the perfect style for your brand.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-paper border border-neutral-200 rounded-xl p-8 hover:shadow-lg transition-shadow"
              data-testid="feature-export"
            >
              <div className="w-12 h-12 bg-charcoal/10 rounded-full flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-charcoal" />
              </div>
              <h3 className="font-playfair text-2xl font-bold text-charcoal mb-3">
                Export & Share
              </h3>
              <p className="text-neutral-600 leading-relaxed">
                Export your menu as PDF or high-quality image. Share with your team or print directly. Your menu, your way.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="font-playfair text-4xl md:text-5xl font-bold text-charcoal">
              Ready to create your professional menu?
            </h2>
            <p className="text-xl text-neutral-600">
              Join restaurants and cafes creating beautiful menus every day
            </p>
            <Button
              onClick={() => navigate('/auth')}
              data-testid="cta-get-started-button"
              className="bg-terracotta text-white hover:bg-terracotta/90 rounded-full px-10 py-6 text-lg"
            >
              Get Started Free
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-neutral-600">
          <p>&copy; 2025 MenuMaker by BHdesignsbyBILLY. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
