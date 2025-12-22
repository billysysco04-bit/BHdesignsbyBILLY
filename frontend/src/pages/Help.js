import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChefHat, HelpCircle, BookOpen, MessageCircle, Mail, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function Help() {
  const navigate = useNavigate();

  const faqs = [
    { q: "How do I create a new menu?", a: "Click 'New Menu' from your dashboard, choose a template or start from scratch, then add your menu items." },
    { q: "Can I import my existing menu?", a: "Yes! Use the 'Import Menu' feature to upload PDF, Word, TXT, or image files. Our AI will extract the items for you." },
    { q: "How do I add the foodborne illness warning?", a: "The warning is automatically included on each page of your menu. You can toggle it on/off in the editor settings." },
    { q: "What file formats can I export to?", a: "You can export your menu as PDF or high-quality images. Simply click 'Export PDF' in the editor." },
    { q: "How does AI description generation work?", a: "Enter your dish name and click 'AI Generate'. Our GPT-5.1 system creates professional, appetizing descriptions instantly." },
    { q: "Can I customize the menu templates?", a: "Yes! All templates are fully customizable. Adjust colors, fonts, layouts, and more to match your brand." },
    { q: "Is my data secure?", a: "Absolutely. All data is encrypted and stored securely. We never share your information with third parties." },
    { q: "How do I update my restaurant profile?", a: "Go to Settings from your dashboard to update your restaurant name, contact info, and other details." }
  ];

  return (
    <div className="min-h-screen bg-paper grain">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-charcoal" />
            <div className="flex flex-col">
              <span className="font-playfair text-2xl font-bold text-charcoal leading-tight">MenuMaker</span>
              <span className="text-xs text-neutral-500 -mt-1">by BHdesignsbyBILLY</span>
            </div>
          </div>
          <Button onClick={() => navigate('/dashboard')} variant="ghost" className="rounded-full">Back to Dashboard</Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
          <div className="text-center">
            <HelpCircle className="w-16 h-16 text-terracotta mx-auto mb-4" />
            <h1 className="font-playfair text-4xl md:text-5xl font-bold text-charcoal mb-4">Help & Support</h1>
            <p className="text-xl text-neutral-600">Get the most out of MenuMaker with our guides and resources</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div whileHover={{ y: -5 }} className="bg-white border border-neutral-200 rounded-xl p-6 text-center cursor-pointer" onClick={() => window.open('https://docs.menumaker.app', '_blank')}>
              <BookOpen className="w-12 h-12 text-terracotta mx-auto mb-3" />
              <h3 className="font-playfair text-xl font-bold text-charcoal mb-2">Documentation</h3>
              <p className="text-neutral-600 text-sm">Comprehensive guides and tutorials</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white border border-neutral-200 rounded-xl p-6 text-center cursor-pointer" onClick={() => navigate('/feedback')}>
              <MessageCircle className="w-12 h-12 text-sage mx-auto mb-3" />
              <h3 className="font-playfair text-xl font-bold text-charcoal mb-2">Send Feedback</h3>
              <p className="text-neutral-600 text-sm">Share your thoughts and suggestions</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white border border-neutral-200 rounded-xl p-6 text-center cursor-pointer" onClick={() => window.location.href = 'mailto:support@bhdesignsbybilly.com'}>
              <Mail className="w-12 h-12 text-charcoal mx-auto mb-3" />
              <h3 className="font-playfair text-xl font-bold text-charcoal mb-2">Contact Support</h3>
              <p className="text-neutral-600 text-sm">Get help from our team</p>
            </motion.div>
          </div>

          <div className="bg-white border border-neutral-200 rounded-xl p-8">
            <h2 className="font-playfair text-3xl font-bold text-charcoal mb-6 flex items-center gap-2">
              <FileText className="w-8 h-8" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }} className="border-b border-neutral-200 pb-6 last:border-0">
                  <h3 className="font-medium text-charcoal mb-2 text-lg">{faq.q}</h3>
                  <p className="text-neutral-600">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-terracotta/10 border border-terracotta/20 rounded-xl p-8 text-center">
            <h3 className="font-playfair text-2xl font-bold text-charcoal mb-3">Still need help?</h3>
            <p className="text-neutral-600 mb-6">Our support team is here to assist you</p>
            <Button onClick={() => window.location.href = 'mailto:support@bhdesignsbybilly.com'} className="bg-terracotta text-white hover:bg-terracotta/90 rounded-full px-8">
              Contact Support Team
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
