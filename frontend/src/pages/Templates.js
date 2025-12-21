import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { api } from '../utils/api';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (templateId) => {
    try {
      const menu = await api.createMenu(`New Menu from Template`, templateId);
      toast.success('Menu created!');
      navigate(`/editor/${menu.id}`);
    } catch (error) {
      toast.error('Failed to create menu');
    }
  };

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
          <Button
            onClick={() => navigate('/dashboard')}
            data-testid="back-to-dashboard-button"
            variant="ghost"
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-charcoal mb-4">
            Choose a Template
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Browse our extensive library of professionally designed templates to kickstart your menu
          </p>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-neutral-600">Loading templates...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-testid="templates-grid">
            {templates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden hover:shadow-xl transition-all group"
                data-testid={`template-card-${template.id}`}
              >
                <div className="aspect-video overflow-hidden">
                  <img
                    src={template.preview_image}
                    alt={template.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="mb-3">
                    <span className="inline-block text-xs font-medium text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">
                      {template.category}
                    </span>
                  </div>
                  <h3 className="font-playfair text-xl font-bold text-charcoal mb-2">
                    {template.name}
                  </h3>
                  <p className="text-neutral-600 mb-4">
                    {template.description}
                  </p>
                  <Button
                    onClick={() => handleSelectTemplate(template.id)}
                    data-testid={`select-template-${template.id}`}
                    className="w-full bg-charcoal text-white hover:bg-neutral-800 rounded-full"
                  >
                    Use This Template
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Start from Scratch */}
        <div className="mt-12 text-center">
          <p className="text-neutral-600 mb-4">Or</p>
          <Button
            onClick={async () => {
              try {
                const menu = await api.createMenu('Untitled Menu');
                navigate(`/editor/${menu.id}`);
                toast.success('Blank menu created!');
              } catch (error) {
                toast.error('Failed to create menu');
              }
            }}
            data-testid="start-from-scratch-button"
            variant="outline"
            className="border-charcoal text-charcoal hover:bg-neutral-50 rounded-full px-8"
          >
            Start from Scratch
          </Button>
        </div>
      </div>
    </div>
  );
}
