import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, ArrowRight, Store, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    restaurant_name: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!profile.restaurant_name) {
      toast.error('Restaurant name is required');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/profile/restaurant`,
        profile,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Profile setup complete!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper grain flex items-center justify-center px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-8">
          <div className="flex items-center justify-center gap-2 mb-8">
            <ChefHat className="w-10 h-10 text-charcoal" />
            <div className="flex flex-col">
              <span className="font-playfair text-3xl font-bold text-charcoal leading-tight">MenuMaker</span>
              <span className="text-xs text-neutral-500 -mt-1">by BHdesignsbyBILLY</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="font-playfair text-3xl font-bold text-charcoal mb-2">Welcome, {user?.name}!</h1>
            <p className="text-neutral-600">Let's set up your restaurant profile to get started</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="restaurant_name" className="flex items-center gap-2 text-charcoal font-medium">
                <Store className="w-4 h-4" />
                Restaurant Name *
              </Label>
              <Input
                id="restaurant_name"
                value={profile.restaurant_name}
                onChange={(e) => setProfile({ ...profile, restaurant_name: e.target.value })}
                placeholder="e.g., La Bella Italia"
                className="border-neutral-300 focus:border-charcoal"
                data-testid="restaurant-name-input"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 text-charcoal font-medium">
                  <Phone className="w-4 h-4" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="border-neutral-300 focus:border-charcoal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-charcoal font-medium">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="contact@restaurant.com"
                  className="border-neutral-300 focus:border-charcoal"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2 text-charcoal font-medium">
                <MapPin className="w-4 h-4" />
                Address
              </Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="123 Main Street, City, State 12345"
                className="border-neutral-300 focus:border-charcoal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-2 text-charcoal font-medium">
                <Globe className="w-4 h-4" />
                Website
              </Label>
              <Input
                id="website"
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                placeholder="https://www.yourrestaurant.com"
                className="border-neutral-300 focus:border-charcoal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-charcoal font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={profile.description}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                placeholder="Tell us about your restaurant..."
                rows={3}
                className="border-neutral-300 focus:border-charcoal"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="flex-1 border-charcoal text-charcoal hover:bg-neutral-50 rounded-full"
              >
                Skip for Now
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                data-testid="complete-setup-button"
                className="flex-1 bg-terracotta text-white hover:bg-terracotta/90 rounded-full"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-neutral-400">
          &copy; 2025 MenuMaker. Owned and operated by BHdesignsbyBILLY - Billy Harman
        </div>
      </motion.div>
    </div>
  );
}
