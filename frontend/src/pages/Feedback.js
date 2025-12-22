import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, MessageSquare, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function Feedback() {
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('general');
  const [loading, setLoading] = useState(false);
  const { token } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      toast.error('Please enter your feedback');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/feedback`,
        { feedback_text: feedback, rating, category },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Thank you for your feedback!');
      setFeedback('');
      setRating(5);
      navigate('/dashboard');
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

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

      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 text-terracotta mx-auto mb-4" />
            <h1 className="font-playfair text-4xl font-bold text-charcoal mb-4">We Value Your Input!</h1>
            <p className="text-xl text-neutral-600">Help us improve MenuMaker. Share your thoughts, suggestions, or report issues.</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border border-neutral-200 rounded-xl p-8 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="category" className="text-charcoal font-medium">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="feedback-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Feedback</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="improvement">Improvement Suggestion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rating" className="text-charcoal font-medium">Rating</Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="transition-transform hover:scale-110"
                    data-testid={`rating-${value}`}
                  >
                    <Star
                      className={`w-8 h-8 ${value <= rating ? 'fill-terracotta text-terracotta' : 'text-neutral-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback" className="text-charcoal font-medium">Your Feedback</Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us what you think..."
                rows={6}
                className="border-neutral-300 focus:border-charcoal"
                data-testid="feedback-text"
                required
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-terracotta text-white hover:bg-terracotta/90 rounded-full py-6 text-lg" data-testid="submit-feedback">
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
