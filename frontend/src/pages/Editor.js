import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { 
  ChefHat, ArrowLeft, Plus, Trash2, Wand2, Download, Save, 
  Type, Palette, Layout as LayoutIcon, Image as ImageIcon, 
  Sparkles, Check, Upload, Square, Circle, Minus, MoreHorizontal,
  Frame, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { ScrollArea } from '../components/ui/scroll-area';
import { api } from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ============= CONSTANTS =============
const FONTS = [
  { name: 'Playfair Display', style: 'serif' },
  { name: 'DM Sans', style: 'sans-serif' },
  { name: 'Merriweather', style: 'serif' },
  { name: 'Inter', style: 'sans-serif' },
  { name: 'Lora', style: 'serif' },
  { name: 'Roboto', style: 'sans-serif' },
  { name: 'Montserrat', style: 'sans-serif' },
  { name: 'Crimson Text', style: 'serif' },
  { name: 'Georgia', style: 'serif' },
  { name: 'Times New Roman', style: 'serif' }
];

const PRESET_BACKGROUNDS = [
  { id: 'none', name: 'None', url: '', thumbnail: null },
  { id: 'elegant', name: 'Elegant Texture', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=150&q=60' },
  { id: 'wood', name: 'Wood Grain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=150&q=60' },
  { id: 'marble', name: 'Marble', url: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?w=150&q=60' },
  { id: 'linen', name: 'Linen', url: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=150&q=60' },
  { id: 'dark', name: 'Dark Slate', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=80', thumbnail: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=150&q=60' },
];

const COLOR_PRESETS = {
  title: ['#1a1a1a', '#2d3748', '#744210', '#22543d', '#1a365d', '#553c9a', '#97266d', '#c53030'],
  price: ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#d62828', '#2a9d8f', '#e76f51', '#264653'],
  background: ['#ffffff', '#f8f5f0', '#faf3e0', '#e8e8e8', '#1a1a1a', '#2d3748', '#f0e6d3', '#e6f0e8']
};

// Simple border styles
const BORDER_STYLES = [
  { id: 'none', name: 'None', style: 'none', preview: null },
  { id: 'solid', name: 'Solid', style: 'solid', preview: '━━━━' },
  { id: 'dashed', name: 'Dashed', style: 'dashed', preview: '┄┄┄┄' },
  { id: 'dotted', name: 'Dotted', style: 'dotted', preview: '····' },
  { id: 'double', name: 'Double', style: 'double', preview: '═══' },
];

// Decorative border frames
const DECORATIVE_BORDERS = [
  { id: 'none', name: 'None', corners: null, sides: null },
  { id: 'elegant', name: 'Elegant', corners: '❧', sides: '─' },
  { id: 'ornate', name: 'Ornate', corners: '✦', sides: '═' },
  { id: 'classic', name: 'Classic', corners: '◆', sides: '─' },
  { id: 'floral', name: 'Floral', corners: '❀', sides: '·' },
  { id: 'art-deco', name: 'Art Deco', corners: '◇', sides: '═' },
  { id: 'vintage', name: 'Vintage', corners: '✿', sides: '─' },
];

// ============= SELECTION INDICATOR COMPONENT =============
const SelectionIndicator = ({ isSelected, className = '' }) => {
  if (!isSelected) return null;
  return (
    <div className={`absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 shadow-lg ${className}`}>
      <Check className="w-3 h-3 text-white" strokeWidth={3} />
    </div>
  );
};

// ============= COLOR PICKER WITH PRESETS =============
const ColorPickerWithPresets = ({ label, value, onChange, presets }) => {
  return (
    <div className="space-y-2">
      <Label className="text-neutral-300 text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-2 border-neutral-600 bg-transparent"
          />
          {value && (
            <div 
              className="absolute inset-1 rounded pointer-events-none"
              style={{ backgroundColor: value }}
            />
          )}
        </div>
        <div className="flex-1 grid grid-cols-8 gap-1">
          {presets.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={`w-6 h-6 rounded-md transition-all hover:scale-110 relative ${
                value === color ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-neutral-800' : 'hover:ring-1 hover:ring-neutral-500'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            >
              {value === color && (
                <Check className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-lg" strokeWidth={3} />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-neutral-500 text-xs">HEX:</span>
        <Input 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="h-7 text-xs bg-neutral-700 border-neutral-600 text-white font-mono"
          placeholder="#000000"
        />
      </div>
    </div>
  );
};

// ============= FONT SELECTOR =============
const FontSelector = ({ label, value, onChange }) => {
  return (
    <div className="space-y-2">
      <Label className="text-neutral-300 text-xs font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white h-10">
          <SelectValue>
            <span style={{ fontFamily: value }}>{value}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-neutral-800 border-neutral-700 max-h-64 z-50">
          {FONTS.map((font) => (
            <SelectItem 
              key={font.name} 
              value={font.name}
              className="text-white hover:bg-neutral-700 cursor-pointer"
            >
              <div className="flex items-center justify-between w-full gap-4">
                <span style={{ fontFamily: font.name }}>{font.name}</span>
                <span className="text-neutral-500 text-xs">{font.style}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// ============= SIZE SLIDER =============
const SizeSlider = ({ label, value, onChange, min, max, unit = 'px' }) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-neutral-300 text-xs font-medium">{label}</Label>
        <span className="text-emerald-400 text-xs font-mono bg-neutral-700 px-2 py-0.5 rounded">
          {value}{unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={min}
        max={max}
        step={1}
        className="cursor-pointer"
      />
    </div>
  );
};

// ============= MAIN EDITOR COMPONENT =============
export default function Editor() {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [customBackgroundPreview, setCustomBackgroundPreview] = useState(null);

  const [design, setDesign] = useState({
    // Title & Subtitle
    title: 'Restaurant Menu',
    subtitle: 'A curated selection',
    titleFont: 'Playfair Display',
    titleSize: 52,
    titleColor: '#1a1a1a',
    titleAlign: 'center',
    subtitleFont: 'DM Sans',
    subtitleSize: 18,
    subtitleColor: '#666666',
    
    // Items
    itemFont: 'DM Sans',
    itemNameSize: 20,
    itemNameColor: '#1a1a1a',
    descriptionSize: 14,
    descriptionColor: '#666666',
    priceFont: 'Playfair Display',
    priceSize: 20,
    priceColor: '#e07a5f',
    
    // Categories
    categoryFont: 'Playfair Display',
    categorySize: 28,
    categoryColor: '#1a1a1a',
    categoryUppercase: true,
    
    // Background
    backgroundColor: '#ffffff',
    backgroundImage: '',
    backgroundImageType: 'none', // 'none', 'preset', 'custom'
    backgroundOpacity: 100,
    
    // Layout
    pageWidth: 800,
    padding: 50,
    itemSpacing: 24,
    categorySpacing: 40,
    
    // Simple Borders
    menuBorderStyle: 'none',
    menuBorderWidth: 2,
    menuBorderColor: '#1a1a1a',
    
    // Decorative Borders
    decorativeBorder: 'none',
    decorativeBorderColor: '#1a1a1a',
    
    // Section Borders
    showTitleBorder: true,
    titleBorderStyle: 'solid',
    titleBorderColor: '#1a1a1a',
    showCategoryBorder: true,
    categoryBorderStyle: 'solid',
    categoryBorderColor: '#cccccc',
    
    // Warning
    showWarning: true,
    warningPosition: 'bottom'
  });

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Appetizers',
    image_url: '',
    ingredients: ''
  });

  // ============= DATA LOADING =============
  useEffect(() => {
    if (menuId) {
      loadMenu();
    } else {
      createNewMenu();
    }
  }, [menuId]);

  const loadMenu = async () => {
    try {
      const data = await api.getMenu(menuId);
      setMenu(data);
      if (data.title) {
        setDesign(prev => ({ ...prev, title: data.title }));
      }
    } catch (error) {
      toast.error('Failed to load menu');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const createNewMenu = async () => {
    try {
      const newMenu = await api.createMenu('Restaurant Menu');
      setMenu(newMenu);
      navigate(`/editor/${newMenu.id}`, { replace: true });
    } catch (error) {
      toast.error('Failed to create menu');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // ============= HANDLERS =============
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateMenu(menu.id, {
        title: design.title,
        items: menu.items,
        include_warning: design.showWarning
      });
      toast.success('Menu saved!');
    } catch (error) {
      toast.error('Failed to save menu');
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemForm({ name: '', description: '', price: '', category: 'Appetizers', image_url: '', ingredients: '' });
    setShowItemDialog(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemForm(item);
    setShowItemDialog(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.name || !itemForm.price) {
      toast.error('Name and price are required');
      return;
    }
    const newItem = { ...itemForm, id: editingItem?.id || `item-${Date.now()}` };
    if (editingItem) {
      setMenu({ ...menu, items: menu.items.map(item => item.id === editingItem.id ? newItem : item) });
      toast.success('Item updated');
    } else {
      setMenu({ ...menu, items: [...(menu.items || []), newItem] });
      toast.success('Item added');
    }
    setShowItemDialog(false);
  };

  const handleDeleteItem = (itemId) => {
    if (window.confirm('Delete this item?')) {
      setMenu({ ...menu, items: menu.items.filter(item => item.id !== itemId) });
      toast.success('Item removed');
    }
  };

  const handleGenerateDescription = async () => {
    if (!itemForm.name) {
      toast.error('Please enter a dish name first');
      return;
    }
    setGeneratingAI(true);
    try {
      const response = await api.generateDescription(itemForm.name, itemForm.ingredients || '', 'chef');
      setItemForm({ ...itemForm, description: response.description });
      toast.success('Chef-inspired description generated!');
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleExportPDF = async () => {
    toast.info('Generating PDF...');
    try {
      const element = document.getElementById('menu-preview');
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: design.backgroundColor, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [design.pageWidth, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, design.pageWidth, canvas.height);
      pdf.save(`${design.title}.pdf`);
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  // Background image upload handler
  const onBackgroundDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setDesign(prev => ({ 
        ...prev, 
        backgroundImage: e.target.result,
        backgroundImageType: 'custom'
      }));
      setCustomBackgroundPreview(e.target.result);
      toast.success('Background image uploaded!');
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onBackgroundDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
    maxSize: 5242880
  });

  const handlePresetBackgroundSelect = (preset) => {
    setDesign(prev => ({
      ...prev,
      backgroundImage: preset.url,
      backgroundImageType: preset.id === 'none' ? 'none' : 'preset'
    }));
  };

  const removeCustomBackground = () => {
    setDesign(prev => ({
      ...prev,
      backgroundImage: '',
      backgroundImageType: 'none'
    }));
    setCustomBackgroundPreview(null);
  };

  // Group items by category
  const groupedItems = (menu?.items || []).reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Get decorative border component
  const getDecorativeBorderStyle = () => {
    const border = DECORATIVE_BORDERS.find(b => b.id === design.decorativeBorder);
    if (!border || border.id === 'none') return null;
    return border;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="w-12 h-12 text-emerald-500 mx-auto mb-4 animate-pulse" />
          <p className="text-white">Loading editor...</p>
        </div>
      </div>
    );
  }

  const decorativeBorderData = getDecorativeBorderStyle();

  return (
    <div className="h-screen flex flex-col bg-neutral-900">
      {/* ============= TOP BAR ============= */}
      <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm" className="text-white hover:bg-neutral-700">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div className="h-6 w-px bg-neutral-600" />
          <ChefHat className="w-5 h-5 text-emerald-500" />
          <span className="text-white font-semibold">MenuMaker Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handleExportPDF} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />Export PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ============= LEFT SIDEBAR - ITEMS ============= */}
        <div className="w-72 bg-neutral-800 border-r border-neutral-700 flex flex-col shrink-0">
          <div className="p-4 border-b border-neutral-700">
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Menu Items</h3>
            <Button onClick={handleAddItem} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-2" />Add Menu Item
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3">
              {(menu?.items || []).length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-neutral-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-neutral-500" />
                  </div>
                  <p className="text-neutral-400 text-sm">No items yet</p>
                  <p className="text-neutral-500 text-xs mt-1">Click "Add Menu Item" to start</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(menu?.items || []).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => handleEditItem(item)} 
                      className="bg-neutral-700 hover:bg-neutral-650 p-3 rounded-lg cursor-pointer group transition-all border border-transparent hover:border-emerald-500/30"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{item.name}</p>
                          <p className="text-emerald-400 text-xs font-semibold mt-1">${item.price}</p>
                          <p className="text-neutral-400 text-xs mt-1 truncate">{item.category}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} 
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-auto transition-opacity"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ============= CENTER - PREVIEW ============= */}
        <div className="flex-1 overflow-auto bg-neutral-950 p-8">
          <div className="flex justify-center">
            <div
              id="menu-preview"
              className="shadow-2xl relative"
              style={{
                width: `${design.pageWidth}px`,
                minHeight: '900px',
                backgroundColor: design.backgroundColor,
                backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: design.menuBorderStyle !== 'none' 
                  ? `${design.menuBorderWidth}px ${design.menuBorderStyle} ${design.menuBorderColor}` 
                  : 'none',
              }}
            >
              {/* Background overlay for opacity */}
              {design.backgroundImage && design.backgroundOpacity < 100 && (
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: design.backgroundColor, opacity: (100 - design.backgroundOpacity) / 100 }} 
                />
              )}

              {/* Decorative Border Overlay */}
              {decorativeBorderData && (
                <div className="absolute inset-4 pointer-events-none" style={{ color: design.decorativeBorderColor }}>
                  {/* Corners */}
                  <span className="absolute top-0 left-0 text-2xl">{decorativeBorderData.corners}</span>
                  <span className="absolute top-0 right-0 text-2xl">{decorativeBorderData.corners}</span>
                  <span className="absolute bottom-0 left-0 text-2xl">{decorativeBorderData.corners}</span>
                  <span className="absolute bottom-0 right-0 text-2xl">{decorativeBorderData.corners}</span>
                  {/* Top border */}
                  <div className="absolute top-0 left-8 right-8 text-center overflow-hidden whitespace-nowrap text-sm tracking-[0.5em]">
                    {decorativeBorderData.sides.repeat(50)}
                  </div>
                  {/* Bottom border */}
                  <div className="absolute bottom-0 left-8 right-8 text-center overflow-hidden whitespace-nowrap text-sm tracking-[0.5em]">
                    {decorativeBorderData.sides.repeat(50)}
                  </div>
                  {/* Left border */}
                  <div className="absolute top-8 bottom-8 left-0 flex flex-col items-center justify-center overflow-hidden">
                    <div className="writing-vertical text-sm tracking-[0.3em]">{decorativeBorderData.sides.repeat(30)}</div>
                  </div>
                  {/* Right border */}
                  <div className="absolute top-8 bottom-8 right-0 flex flex-col items-center justify-center overflow-hidden">
                    <div className="writing-vertical text-sm tracking-[0.3em]">{decorativeBorderData.sides.repeat(30)}</div>
                  </div>
                </div>
              )}

              {/* Menu Content */}
              <div style={{ position: 'relative', zIndex: 1, padding: `${design.padding}px` }}>
                {/* Title Section */}
                <div 
                  className="mb-10"
                  style={{ 
                    textAlign: design.titleAlign,
                    borderBottom: design.showTitleBorder ? `2px ${design.titleBorderStyle} ${design.titleBorderColor}` : 'none',
                    paddingBottom: design.showTitleBorder ? '20px' : '0'
                  }}
                >
                  <h1 style={{ 
                    fontFamily: design.titleFont, 
                    fontSize: `${design.titleSize}px`, 
                    color: design.titleColor, 
                    fontWeight: 'bold', 
                    lineHeight: 1.2, 
                    marginBottom: '8px' 
                  }}>
                    {design.title}
                  </h1>
                  <p style={{ 
                    fontFamily: design.subtitleFont, 
                    fontSize: `${design.subtitleSize}px`, 
                    color: design.subtitleColor,
                    marginTop: '4px'
                  }}>
                    {design.subtitle}
                  </p>
                </div>

                {/* Warning - Top */}
                {design.showWarning && design.warningPosition === 'top' && (
                  <div className="mb-8 p-4 bg-orange-100 border-2 border-orange-400 rounded-lg">
                    <p className="text-orange-900 text-xs leading-relaxed font-medium">
                      <strong>FOOD SAFETY WARNING:</strong> Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness.
                    </p>
                  </div>
                )}

                {/* Menu Items */}
                {Object.keys(groupedItems).length === 0 ? (
                  <div className="text-center py-20" style={{ color: design.descriptionColor }}>
                    <p className="text-lg">Add menu items to see your design</p>
                    <p className="text-sm mt-2 opacity-60">Use the "Add Menu Item" button on the left</p>
                  </div>
                ) : (
                  <div>
                    {Object.entries(groupedItems).map(([category, items], idx) => (
                      <div key={category} style={{ marginBottom: idx < Object.keys(groupedItems).length - 1 ? `${design.categorySpacing}px` : '0' }}>
                        <h2 style={{
                          fontFamily: design.categoryFont,
                          fontSize: `${design.categorySize}px`,
                          color: design.categoryColor,
                          fontWeight: 'bold',
                          marginBottom: `${design.itemSpacing}px`,
                          textTransform: design.categoryUppercase ? 'uppercase' : 'none',
                          letterSpacing: design.categoryUppercase ? '2px' : 'normal',
                          borderBottom: design.showCategoryBorder ? `1px ${design.categoryBorderStyle} ${design.categoryBorderColor}` : 'none',
                          paddingBottom: design.showCategoryBorder ? '10px' : '0'
                        }}>
                          {category}
                        </h2>
                        <div>
                          {items.map((item, itemIdx) => (
                            <div 
                              key={item.id} 
                              style={{ 
                                marginBottom: itemIdx < items.length - 1 ? `${design.itemSpacing}px` : '0',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '16px'
                              }}
                            >
                              <div style={{ flex: 1 }}>
                                <h3 style={{ 
                                  fontFamily: design.itemFont, 
                                  fontSize: `${design.itemNameSize}px`, 
                                  color: design.itemNameColor, 
                                  fontWeight: '600',
                                  marginBottom: item.description ? '6px' : '0'
                                }}>
                                  {item.name}
                                </h3>
                                {item.description && (
                                  <p style={{ 
                                    fontFamily: design.itemFont, 
                                    fontSize: `${design.descriptionSize}px`, 
                                    color: design.descriptionColor, 
                                    lineHeight: '1.5'
                                  }}>
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div style={{ 
                                fontFamily: design.priceFont, 
                                fontSize: `${design.priceSize}px`, 
                                color: design.priceColor, 
                                fontWeight: 'bold',
                                flexShrink: 0
                              }}>
                                ${item.price}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warning - Bottom */}
                {design.showWarning && design.warningPosition === 'bottom' && (
                  <div className="mt-10 p-4 bg-orange-100 border-2 border-orange-400 rounded-lg">
                    <p className="text-orange-900 text-xs leading-relaxed font-medium">
                      <strong>FOOD SAFETY WARNING:</strong> Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============= RIGHT SIDEBAR - DESIGN CONTROLS ============= */}
        <div className="w-[380px] bg-neutral-800 border-l border-neutral-700 flex flex-col shrink-0">
          <Tabs defaultValue="style" className="flex flex-col h-full">
            <TabsList className="grid grid-cols-4 bg-neutral-700 p-1 m-3 rounded-lg shrink-0">
              <TabsTrigger value="text" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-neutral-300 text-xs py-2">
                <Type className="w-3.5 h-3.5 mr-1" />Text
              </TabsTrigger>
              <TabsTrigger value="style" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-neutral-300 text-xs py-2">
                <Palette className="w-3.5 h-3.5 mr-1" />Style
              </TabsTrigger>
              <TabsTrigger value="background" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-neutral-300 text-xs py-2">
                <ImageIcon className="w-3.5 h-3.5 mr-1" />BG
              </TabsTrigger>
              <TabsTrigger value="border" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-neutral-300 text-xs py-2">
                <Frame className="w-3.5 h-3.5 mr-1" />Border
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              {/* ============= TEXT TAB ============= */}
              <TabsContent value="text" className="p-4 space-y-4 mt-0">
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Type className="w-4 h-4 text-emerald-500" />Title & Subtitle
                  </h4>
                  <div>
                    <Label className="text-neutral-300 text-xs mb-2 block">Menu Title</Label>
                    <Input 
                      value={design.title} 
                      onChange={(e) => setDesign({ ...design, title: e.target.value })} 
                      className="bg-neutral-700 border-neutral-600 text-white"
                      placeholder="Restaurant Menu"
                    />
                  </div>
                  <div>
                    <Label className="text-neutral-300 text-xs mb-2 block">Subtitle</Label>
                    <Input 
                      value={design.subtitle} 
                      onChange={(e) => setDesign({ ...design, subtitle: e.target.value })} 
                      className="bg-neutral-700 border-neutral-600 text-white"
                      placeholder="A curated selection"
                    />
                  </div>
                  <FontSelector 
                    label="Title Font" 
                    value={design.titleFont} 
                    onChange={(v) => setDesign({ ...design, titleFont: v })} 
                  />
                  <SizeSlider 
                    label="Title Size" 
                    value={design.titleSize} 
                    onChange={(v) => setDesign({ ...design, titleSize: v })} 
                    min={28} max={80} 
                  />
                  <FontSelector 
                    label="Subtitle Font" 
                    value={design.subtitleFont} 
                    onChange={(v) => setDesign({ ...design, subtitleFont: v })} 
                  />
                  <SizeSlider 
                    label="Subtitle Size" 
                    value={design.subtitleSize} 
                    onChange={(v) => setDesign({ ...design, subtitleSize: v })} 
                    min={12} max={32} 
                  />
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm">Menu Items Typography</h4>
                  <FontSelector 
                    label="Item Font" 
                    value={design.itemFont} 
                    onChange={(v) => setDesign({ ...design, itemFont: v })} 
                  />
                  <SizeSlider 
                    label="Item Name Size" 
                    value={design.itemNameSize} 
                    onChange={(v) => setDesign({ ...design, itemNameSize: v })} 
                    min={14} max={32} 
                  />
                  <SizeSlider 
                    label="Description Size" 
                    value={design.descriptionSize} 
                    onChange={(v) => setDesign({ ...design, descriptionSize: v })} 
                    min={10} max={20} 
                  />
                  <SizeSlider 
                    label="Price Size" 
                    value={design.priceSize} 
                    onChange={(v) => setDesign({ ...design, priceSize: v })} 
                    min={14} max={32} 
                  />
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm">Categories</h4>
                  <FontSelector 
                    label="Category Font" 
                    value={design.categoryFont} 
                    onChange={(v) => setDesign({ ...design, categoryFont: v })} 
                  />
                  <SizeSlider 
                    label="Category Size" 
                    value={design.categorySize} 
                    onChange={(v) => setDesign({ ...design, categorySize: v })} 
                    min={18} max={48} 
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-neutral-300 text-xs">Uppercase Categories</Label>
                    <Switch 
                      checked={design.categoryUppercase} 
                      onCheckedChange={(v) => setDesign({ ...design, categoryUppercase: v })} 
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ============= STYLE TAB ============= */}
              <TabsContent value="style" className="p-4 space-y-4 mt-0">
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-500" />Colors
                  </h4>
                  <ColorPickerWithPresets 
                    label="Title Color" 
                    value={design.titleColor} 
                    onChange={(v) => setDesign({ ...design, titleColor: v })} 
                    presets={COLOR_PRESETS.title}
                  />
                  <ColorPickerWithPresets 
                    label="Price Color" 
                    value={design.priceColor} 
                    onChange={(v) => setDesign({ ...design, priceColor: v })} 
                    presets={COLOR_PRESETS.price}
                  />
                  <ColorPickerWithPresets 
                    label="Description Color" 
                    value={design.descriptionColor} 
                    onChange={(v) => setDesign({ ...design, descriptionColor: v })} 
                    presets={COLOR_PRESETS.title}
                  />
                  <ColorPickerWithPresets 
                    label="Category Color" 
                    value={design.categoryColor} 
                    onChange={(v) => setDesign({ ...design, categoryColor: v })} 
                    presets={COLOR_PRESETS.title}
                  />
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <LayoutIcon className="w-4 h-4 text-emerald-500" />Layout & Spacing
                  </h4>
                  <SizeSlider 
                    label="Page Width" 
                    value={design.pageWidth} 
                    onChange={(v) => setDesign({ ...design, pageWidth: v })} 
                    min={600} max={1000} 
                  />
                  <SizeSlider 
                    label="Page Padding" 
                    value={design.padding} 
                    onChange={(v) => setDesign({ ...design, padding: v })} 
                    min={20} max={100} 
                  />
                  <SizeSlider 
                    label="Item Spacing" 
                    value={design.itemSpacing} 
                    onChange={(v) => setDesign({ ...design, itemSpacing: v })} 
                    min={12} max={48} 
                  />
                  <SizeSlider 
                    label="Category Spacing" 
                    value={design.categorySpacing} 
                    onChange={(v) => setDesign({ ...design, categorySpacing: v })} 
                    min={24} max={80} 
                  />
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm">Food Safety Warning</h4>
                  <div className="flex items-center justify-between">
                    <Label className="text-neutral-300 text-xs">Show Warning</Label>
                    <Switch 
                      checked={design.showWarning} 
                      onCheckedChange={(v) => setDesign({ ...design, showWarning: v })} 
                    />
                  </div>
                  {design.showWarning && (
                    <div>
                      <Label className="text-neutral-300 text-xs mb-2 block">Position</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {['top', 'bottom'].map((pos) => (
                          <button
                            key={pos}
                            onClick={() => setDesign({ ...design, warningPosition: pos })}
                            className={`p-3 rounded-lg border-2 transition-all text-sm capitalize ${
                              design.warningPosition === pos
                                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                                : 'border-neutral-600 bg-neutral-700 text-neutral-300 hover:border-neutral-500'
                            }`}
                          >
                            {pos}
                            {design.warningPosition === pos && (
                              <Check className="w-3 h-3 inline ml-2" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ============= BACKGROUND TAB ============= */}
              <TabsContent value="background" className="p-4 space-y-4 mt-0">
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Palette className="w-4 h-4 text-emerald-500" />Background Color
                  </h4>
                  <ColorPickerWithPresets 
                    label="Background Color" 
                    value={design.backgroundColor} 
                    onChange={(v) => setDesign({ ...design, backgroundColor: v })} 
                    presets={COLOR_PRESETS.background}
                  />
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4 text-emerald-500" />Upload Custom Background
                  </h4>
                  
                  {/* Custom upload preview */}
                  {customBackgroundPreview && (
                    <div className="relative">
                      <img 
                        src={customBackgroundPreview} 
                        alt="Custom background" 
                        className="w-full h-32 object-cover rounded-lg border-2 border-emerald-500"
                      />
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                        <div className="bg-emerald-500 rounded-full p-2">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <button
                        onClick={removeCustomBackground}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 rounded-full p-1 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <p className="text-emerald-400 text-xs mt-2 text-center font-medium">✓ Custom image selected</p>
                    </div>
                  )}

                  {/* Upload dropzone */}
                  <div 
                    {...getRootProps()} 
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      isDragActive 
                        ? 'border-emerald-500 bg-emerald-500/10' 
                        : 'border-neutral-600 bg-neutral-700/50 hover:border-emerald-500/50 hover:bg-neutral-700'
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 bg-neutral-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Upload className="w-6 h-6 text-neutral-400" />
                    </div>
                    <p className="text-white text-sm font-medium">
                      {isDragActive ? 'Drop image here...' : 'Click or drag to upload'}
                    </p>
                    <p className="text-neutral-400 text-xs mt-1">JPG, PNG, WebP • Max 5MB</p>
                  </div>
                </div>

                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-emerald-500" />Preset Backgrounds
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => handlePresetBackgroundSelect(bg)}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${
                          design.backgroundImage === bg.url && design.backgroundImageType !== 'custom'
                            ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                            : 'border-neutral-600 hover:border-neutral-500'
                        }`}
                      >
                        {bg.thumbnail ? (
                          <img src={bg.thumbnail} alt={bg.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-neutral-600 flex items-center justify-center">
                            <X className="w-5 h-5 text-neutral-400" />
                          </div>
                        )}
                        {design.backgroundImage === bg.url && design.backgroundImageType !== 'custom' && (
                          <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                            <div className="bg-emerald-500 rounded-full p-1.5">
                              <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
                          <p className="text-white text-[10px] font-medium truncate text-center">{bg.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {design.backgroundImage && (
                  <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                    <h4 className="text-white font-semibold text-sm">Background Opacity</h4>
                    <SizeSlider 
                      label="Image Visibility" 
                      value={design.backgroundOpacity} 
                      onChange={(v) => setDesign({ ...design, backgroundOpacity: v })} 
                      min={10} max={100}
                      unit="%"
                    />
                  </div>
                )}
              </TabsContent>

              {/* ============= BORDER TAB ============= */}
              <TabsContent value="border" className="p-4 space-y-4 mt-0">
                {/* Simple Menu Border */}
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Square className="w-4 h-4 text-emerald-500" />Simple Menu Border
                  </h4>
                  <Label className="text-neutral-300 text-xs">Border Style</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {BORDER_STYLES.map((border) => (
                      <button
                        key={border.id}
                        onClick={() => setDesign({ ...design, menuBorderStyle: border.style })}
                        className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 ${
                          design.menuBorderStyle === border.style
                            ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                            : 'border-neutral-600 bg-neutral-700 text-neutral-300 hover:border-neutral-500'
                        }`}
                      >
                        <span className="text-[10px] font-medium">{border.name}</span>
                        {border.preview && (
                          <span className="text-xs opacity-70">{border.preview}</span>
                        )}
                        {design.menuBorderStyle === border.style && (
                          <Check className="w-3 h-3 absolute top-1 right-1" />
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {design.menuBorderStyle !== 'none' && (
                    <>
                      <SizeSlider 
                        label="Border Width" 
                        value={design.menuBorderWidth} 
                        onChange={(v) => setDesign({ ...design, menuBorderWidth: v })} 
                        min={1} max={10} 
                      />
                      <ColorPickerWithPresets 
                        label="Border Color" 
                        value={design.menuBorderColor} 
                        onChange={(v) => setDesign({ ...design, menuBorderColor: v })} 
                        presets={COLOR_PRESETS.title}
                      />
                    </>
                  )}
                </div>

                {/* Decorative Borders */}
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Frame className="w-4 h-4 text-emerald-500" />Decorative Frame
                  </h4>
                  <p className="text-neutral-400 text-xs">Add ornamental borders to your menu</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DECORATIVE_BORDERS.map((border) => (
                      <button
                        key={border.id}
                        onClick={() => setDesign({ ...design, decorativeBorder: border.id })}
                        className={`p-3 rounded-lg border-2 transition-all relative ${
                          design.decorativeBorder === border.id
                            ? 'border-emerald-500 bg-emerald-500/20'
                            : 'border-neutral-600 bg-neutral-700 hover:border-neutral-500'
                        }`}
                      >
                        <div className="text-center">
                          {border.corners ? (
                            <div className="flex items-center justify-center gap-1 text-lg mb-1">
                              <span>{border.corners}</span>
                              <span className="text-xs">{border.sides}{border.sides}{border.sides}</span>
                              <span>{border.corners}</span>
                            </div>
                          ) : (
                            <X className="w-5 h-5 mx-auto mb-1 text-neutral-500" />
                          )}
                          <span className={`text-xs font-medium ${
                            design.decorativeBorder === border.id ? 'text-emerald-400' : 'text-neutral-300'
                          }`}>
                            {border.name}
                          </span>
                        </div>
                        {design.decorativeBorder === border.id && (
                          <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {design.decorativeBorder !== 'none' && (
                    <ColorPickerWithPresets 
                      label="Frame Color" 
                      value={design.decorativeBorderColor} 
                      onChange={(v) => setDesign({ ...design, decorativeBorderColor: v })} 
                      presets={COLOR_PRESETS.title}
                    />
                  )}
                </div>

                {/* Section Borders */}
                <div className="bg-neutral-700/50 p-4 rounded-xl space-y-4">
                  <h4 className="text-white font-semibold text-sm">Section Dividers</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-neutral-300 text-xs">Title Divider</Label>
                      <Switch 
                        checked={design.showTitleBorder} 
                        onCheckedChange={(v) => setDesign({ ...design, showTitleBorder: v })} 
                      />
                    </div>
                    {design.showTitleBorder && (
                      <div className="pl-4 border-l-2 border-neutral-600 space-y-3">
                        <div>
                          <Label className="text-neutral-400 text-xs mb-2 block">Style</Label>
                          <div className="flex gap-1">
                            {['solid', 'dashed', 'dotted', 'double'].map((style) => (
                              <button
                                key={style}
                                onClick={() => setDesign({ ...design, titleBorderStyle: style })}
                                className={`px-2 py-1 rounded text-xs capitalize ${
                                  design.titleBorderStyle === style
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-neutral-600 text-neutral-300 hover:bg-neutral-500'
                                }`}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>
                        <ColorPickerWithPresets 
                          label="Color" 
                          value={design.titleBorderColor} 
                          onChange={(v) => setDesign({ ...design, titleBorderColor: v })} 
                          presets={COLOR_PRESETS.title}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 pt-3 border-t border-neutral-600">
                    <div className="flex items-center justify-between">
                      <Label className="text-neutral-300 text-xs">Category Divider</Label>
                      <Switch 
                        checked={design.showCategoryBorder} 
                        onCheckedChange={(v) => setDesign({ ...design, showCategoryBorder: v })} 
                      />
                    </div>
                    {design.showCategoryBorder && (
                      <div className="pl-4 border-l-2 border-neutral-600 space-y-3">
                        <div>
                          <Label className="text-neutral-400 text-xs mb-2 block">Style</Label>
                          <div className="flex gap-1">
                            {['solid', 'dashed', 'dotted', 'double'].map((style) => (
                              <button
                                key={style}
                                onClick={() => setDesign({ ...design, categoryBorderStyle: style })}
                                className={`px-2 py-1 rounded text-xs capitalize ${
                                  design.categoryBorderStyle === style
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-neutral-600 text-neutral-300 hover:bg-neutral-500'
                                }`}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>
                        <ColorPickerWithPresets 
                          label="Color" 
                          value={design.categoryBorderColor} 
                          onChange={(v) => setDesign({ ...design, categoryBorderColor: v })} 
                          presets={COLOR_PRESETS.title}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>

      {/* ============= ITEM DIALOG ============= */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl bg-neutral-800 border-neutral-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-emerald-500" />
              {editingItem ? 'Edit Menu Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-neutral-300 text-sm">Dish Name *</Label>
              <Input 
                value={itemForm.name} 
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} 
                className="bg-neutral-700 border-neutral-600 text-white mt-1" 
                placeholder="e.g., Grilled Salmon"
              />
            </div>
            <div>
              <Label className="text-neutral-300 text-sm">Key Ingredients (Optional)</Label>
              <Input 
                value={itemForm.ingredients || ''} 
                onChange={(e) => setItemForm({ ...itemForm, ingredients: e.target.value })} 
                className="bg-neutral-700 border-neutral-600 text-white mt-1" 
                placeholder="e.g., Atlantic salmon, lemon butter, herbs"
              />
              <p className="text-neutral-400 text-xs mt-1">Helps AI generate better descriptions</p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-neutral-300 text-sm">Description</Label>
                <Button 
                  type="button" 
                  size="sm" 
                  onClick={handleGenerateDescription} 
                  disabled={generatingAI} 
                  className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  {generatingAI ? 'Generating...' : 'AI Chef Description'}
                </Button>
              </div>
              <Textarea 
                value={itemForm.description} 
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} 
                className="bg-neutral-700 border-neutral-600 text-white" 
                placeholder="AI will generate a chef-inspired description..."
                rows={3}
              />
              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI creates short, professional, chef-quality descriptions
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-neutral-300 text-sm">Price *</Label>
                <Input 
                  value={itemForm.price} 
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} 
                  className="bg-neutral-700 border-neutral-600 text-white mt-1" 
                  placeholder="12.99"
                  type="number"
                  step="0.01"
                />
              </div>
              <div>
                <Label className="text-neutral-300 text-sm">Category</Label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                  <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-700 border-neutral-600 text-white z-50">
                    <SelectItem value="Appetizers">Appetizers</SelectItem>
                    <SelectItem value="Main Course">Main Course</SelectItem>
                    <SelectItem value="Desserts">Desserts</SelectItem>
                    <SelectItem value="Beverages">Beverages</SelectItem>
                    <SelectItem value="Salads">Salads</SelectItem>
                    <SelectItem value="Sides">Sides</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-700">
              <Button 
                variant="outline" 
                onClick={() => setShowItemDialog(false)} 
                className="border-neutral-600 text-neutral-300 hover:bg-neutral-700 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveItem} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {editingItem ? 'Update Item' : 'Add Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
