import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { ChefHat, ArrowLeft, Plus, Trash2, Wand2, Download, Save, Type, Palette, Layout as LayoutIcon, Image as ImageIcon, Sparkles, Eye, Edit3, Upload, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { api } from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const FONTS = ['Playfair Display', 'DM Sans', 'Merriweather', 'Inter', 'Lora', 'Roboto', 'Montserrat', 'Crimson Text', 'Georgia', 'Times New Roman'];

const BACKGROUND_IMAGES = [
  { name: 'None', url: '' },
  { name: 'Elegant Texture', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800&q=80' },
  { name: 'Wood Grain', url: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80' },
  { name: 'Marble', url: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?w=800&q=80' },
  { name: 'Linen', url: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=800&q=80' },
  { name: 'Dark Slate', url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800&q=80' },
];

export default function Editor() {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  const [design, setDesign] = useState({
    // Title & Subtitle
    title: 'Restaurant Menu',
    subtitle: 'A curated selection',
    titleFont: 'Playfair Display',
    titleSize: 56,
    titleColor: '#1a1a1a',
    titleAlign: 'center',
    subtitleFont: 'DM Sans',
    subtitleSize: 18,
    subtitleColor: '#666666',
    
    // Items
    itemFont: 'DM Sans',
    itemNameSize: 22,
    itemNameColor: '#1a1a1a',
    descriptionSize: 15,
    descriptionColor: '#666666',
    priceFont: 'Playfair Display',
    priceSize: 22,
    priceColor: '#e07a5f',
    
    // Categories
    categoryFont: 'Playfair Display',
    categorySize: 32,
    categoryColor: '#1a1a1a',
    categoryUppercase: true,
    
    // Background
    backgroundColor: '#ffffff',
    backgroundImage: '',
    backgroundOpacity: 100,
    
    // Layout
    pageWidth: 800,
    padding: 60,
    itemSpacing: 32,
    categorySpacing: 48,
    
    // Borders
    showTitleBorder: true,
    titleBorderColor: '#1a1a1a',
    showCategoryBorder: true,
    categoryBorderColor: '#666666',
    
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
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: design.backgroundColor });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [design.pageWidth, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, design.pageWidth, canvas.height);
      pdf.save(`${design.title}.pdf`);
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  // Background image upload
  const onBackgroundDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    const file = acceptedFiles[0];
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setDesign({ ...design, backgroundImage: e.target.result });
      toast.success('Background image uploaded!');
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps: getBackgroundProps, getInputProps: getBackgroundInputProps } = useDropzone({
    onDrop: onBackgroundDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    multiple: false,
    maxSize: 5242880
  });

  const groupedItems = (menu?.items || []).reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center"><p className="text-white">Loading...</p></div>;

  return (
    <div className="h-screen flex flex-col bg-neutral-900">
      {/* Top Bar */}
      <div className="bg-neutral-800 border-b border-neutral-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm" className="text-white hover:bg-neutral-700">
            <ArrowLeft className="w-4 h-4 mr-2" />Back
          </Button>
          <div className="h-6 w-px bg-neutral-600" />
          <ChefHat className="w-5 h-5 text-white" />
          <span className="text-white font-semibold">MenuMaker Editor</span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700 text-white">
            <Save className="w-4 h-4 mr-2" />{saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handleExportPDF} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />Export PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Items */}
        <div className="w-72 bg-neutral-800 border-r border-neutral-700 flex flex-col">
          <div className="p-4 border-b border-neutral-700">
            <h3 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Menu Items</h3>
            <Button onClick={handleAddItem} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-2" />Add Menu Item
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {(menu?.items || []).length === 0 ? (
              <p className="text-neutral-400 text-xs text-center py-8">No items yet. Click Add Menu Item to start.</p>
            ) : (
              <div className="space-y-2">
                {(menu?.items || []).map((item) => (
                  <div key={item.id} onClick={() => handleEditItem(item)} className="bg-neutral-700 hover:bg-neutral-600 p-3 rounded-lg cursor-pointer group transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{item.name}</p>
                        <p className="text-emerald-400 text-xs font-semibold mt-1">${item.price}</p>
                        <p className="text-neutral-400 text-xs mt-1">{item.category}</p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-auto">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center - Preview */}
        <div className="flex-1 overflow-auto bg-neutral-900 p-8">
          <div className="max-w-5xl mx-auto">
            <div
              id="menu-preview"
              className="shadow-2xl mx-auto"
              style={{
                width: `${design.pageWidth}px`,
                minHeight: '1000px',
                backgroundColor: design.backgroundColor,
                backgroundImage: design.backgroundImage ? `url(${design.backgroundImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                padding: `${design.padding}px`,
                position: 'relative'
              }}
            >
              {design.backgroundImage && (
                <div style={{ position: 'absolute', inset: 0, backgroundColor: design.backgroundColor, opacity: (100 - design.backgroundOpacity) / 100 }} />
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>
                {/* Title Section */}
                <div className="mb-12" style={{ textAlign: design.titleAlign, borderBottom: design.showTitleBorder ? `2px solid ${design.titleBorderColor}` : 'none', paddingBottom: design.showTitleBorder ? '20px' : '0' }}>
                  <h1 style={{ fontFamily: design.titleFont, fontSize: `${design.titleSize}px`, color: design.titleColor, fontWeight: 'bold', lineHeight: 1.2, marginBottom: '12px' }}>
                    {design.title}
                  </h1>
                  <p style={{ fontFamily: design.subtitleFont, fontSize: `${design.subtitleSize}px`, color: design.subtitleColor, marginTop: '8px' }}>
                    {design.subtitle}
                  </p>
                </div>

                {/* Warning Top */}
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
                          borderBottom: design.showCategoryBorder ? `1px solid ${design.categoryBorderColor}` : 'none',
                          paddingBottom: design.showCategoryBorder ? '12px' : '0'
                        }}>
                          {category}
                        </h2>
                        <div>
                          {items.map((item, itemIdx) => (
                            <div key={item.id} style={{ marginBottom: itemIdx < items.length - 1 ? `${design.itemSpacing}px` : '0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                              <div style={{ flex: 1 }}>
                                <h3 style={{ fontFamily: design.itemFont, fontSize: `${design.itemNameSize}px`, color: design.itemNameColor, fontWeight: '600', marginBottom: item.description ? '8px' : '0' }}>
                                  {item.name}
                                </h3>
                                {item.description && (
                                  <p style={{ fontFamily: design.itemFont, fontSize: `${design.descriptionSize}px`, color: design.descriptionColor, lineHeight: '1.6' }}>
                                    {item.description}
                                  </p>
                                )}
                              </div>
                              <div style={{ fontFamily: design.priceFont, fontSize: `${design.priceSize}px`, color: design.priceColor, fontWeight: 'bold', flexShrink: 0 }}>
                                ${item.price}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Warning Bottom */}
                {design.showWarning && design.warningPosition === 'bottom' && (
                  <div className="mt-12 p-4 bg-orange-100 border-2 border-orange-400 rounded-lg">
                    <p className="text-orange-900 text-xs leading-relaxed font-medium">
                      <strong>FOOD SAFETY WARNING:</strong> Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Design Controls */}
        <div className="w-96 bg-neutral-800 border-l border-neutral-700 overflow-y-auto">
          <Tabs defaultValue="text" className="w-full">
            <TabsList className="w-full grid grid-cols-3 bg-neutral-700 p-1 m-2 rounded-lg">
              <TabsTrigger value="text" className="data-[state=active]:bg-neutral-600 text-white text-xs py-2">
                <Type className="w-4 h-4 mr-1" />Text
              </TabsTrigger>
              <TabsTrigger value="style" className="data-[state=active]:bg-neutral-600 text-white text-xs py-2">
                <Palette className="w-4 h-4 mr-1" />Style
              </TabsTrigger>
              <TabsTrigger value="layout" className="data-[state=active]:bg-neutral-600 text-white text-xs py-2">
                <LayoutIcon className="w-4 h-4 mr-1" />Layout
              </TabsTrigger>
            </TabsList>

            {/* TEXT TAB */}
            <TabsContent value="text" className="p-4 space-y-6">
              <div className="bg-neutral-700 p-4 rounded-lg space-y-4">
                <h4 className="text-white font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />Title & Subtitle
                </h4>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Menu Title</Label>
                  <Input value={design.title} onChange={(e) => setDesign({ ...design, title: e.target.value })} className="bg-neutral-600 border-neutral-500 text-white" placeholder="Restaurant Menu" />
                </div>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Subtitle (2nd Line)</Label>
                  <Input value={design.subtitle} onChange={(e) => setDesign({ ...design, subtitle: e.target.value })} className="bg-neutral-600 border-neutral-500 text-white" placeholder="A curated selection" />
                </div>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Title Font</Label>
                  <Select value={design.titleFont} onValueChange={(v) => setDesign({ ...design, titleFont: v })}>
                    <SelectTrigger className="bg-neutral-600 border-neutral-500 text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-700 border-neutral-600 text-white max-h-60">
                      {FONTS.map(f => <SelectItem key={f} value={f} className="hover:bg-neutral-600">{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Title Size: {design.titleSize}px</Label>
                  <Slider value={[design.titleSize]} onValueChange={(v) => setDesign({ ...design, titleSize: v[0] })} min={32} max={80} step={2} className="mt-2" />
                </div>
              </div>

              <div className="bg-neutral-700 p-4 rounded-lg space-y-4">
                <h4 className="text-white font-semibold text-sm uppercase tracking-wide">Menu Items</h4>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Item Font</Label>
                  <Select value={design.itemFont} onValueChange={(v) => setDesign({ ...design, itemFont: v })}>
                    <SelectTrigger className="bg-neutral-600 border-neutral-500 text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-700 border-neutral-600 text-white max-h-60">
                      {FONTS.map(f => <SelectItem key={f} value={f} className="hover:bg-neutral-600">{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Item Name Size: {design.itemNameSize}px</Label>
                  <Slider value={[design.itemNameSize]} onValueChange={(v) => setDesign({ ...design, itemNameSize: v[0] })} min={14} max={36} step={1} className="mt-2" />
                </div>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Description Size: {design.descriptionSize}px</Label>
                  <Slider value={[design.descriptionSize]} onValueChange={(v) => setDesign({ ...design, descriptionSize: v[0] })} min={10} max={22} step={1} className="mt-2" />
                </div>
              </div>
            </TabsContent>

            {/* STYLE TAB */}
            <TabsContent value="style" className="p-4 space-y-6">
              <div className="bg-neutral-700 p-4 rounded-lg space-y-4">
                <h4 className="text-white font-semibold text-sm uppercase tracking-wide">Colors</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-neutral-300 text-xs mb-2 block">Title Color</Label>
                    <Input type="color" value={design.titleColor} onChange={(e) => setDesign({ ...design, titleColor: e.target.value })} className="h-10 cursor-pointer" />
                  </div>
                  <div>
                    <Label className="text-neutral-300 text-xs mb-2 block">Price Color</Label>
                    <Input type="color" value={design.priceColor} onChange={(e) => setDesign({ ...design, priceColor: e.target.value })} className="h-10 cursor-pointer" />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-neutral-300 text-xs mb-2 block">Background Color</Label>
                    <Input type="color" value={design.backgroundColor} onChange={(e) => setDesign({ ...design, backgroundColor: e.target.value })} className="h-10 cursor-pointer" />
                  </div>
                </div>
              </div>

              <div className="bg-neutral-700 p-4 rounded-lg space-y-4">
                <h4 className="text-white font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />Background Image
                </h4>
                
                {/* Upload Button */}
                <div {...getBackgroundProps()} className="border-2 border-dashed border-neutral-500 rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500 transition-colors bg-neutral-600">
                  <input {...getBackgroundInputProps()} />
                  <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                  <p className="text-neutral-300 text-xs font-medium">Upload Your Image</p>
                  <p className="text-neutral-400 text-xs mt-1">Click or drag image (Max 5MB)</p>
                </div>

                {/* Preset Images */}
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Or Choose Preset</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {BACKGROUND_IMAGES.map(bg => (
                      <button
                        key={bg.name}
                        onClick={() => setDesign({ ...design, backgroundImage: bg.url })}
                        className="relative h-20 rounded-lg overflow-hidden border-2 transition-all hover:scale-105 group"
                        style={{ borderColor: design.backgroundImage === bg.url ? '#10b981' : '#525252' }}
                      >
                        {bg.url ? (
                          <img src={bg.url} alt={bg.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-neutral-600 flex items-center justify-center">
                            <span className="text-neutral-400 text-xs font-medium">None</span>
                          </div>
                        )}
                        {design.backgroundImage === bg.url && (
                          <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                            <div className="bg-emerald-500 rounded-full p-1.5">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                          <p className="text-white text-xs font-medium truncate">{bg.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {design.backgroundImage && (
                  <div>
                    <Label className="text-neutral-300 text-xs mb-2 block">Background Opacity: {design.backgroundOpacity}%</Label>
                    <Slider value={[design.backgroundOpacity]} onValueChange={(v) => setDesign({ ...design, backgroundOpacity: v[0] })} min={0} max={100} step={5} className="mt-2" />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* LAYOUT TAB */}
            <TabsContent value="layout" className="p-4 space-y-6">
              <div className="bg-neutral-700 p-4 rounded-lg space-y-4">
                <h4 className="text-white font-semibold text-sm uppercase tracking-wide">Spacing</h4>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Page Width: {design.pageWidth}px</Label>
                  <Slider value={[design.pageWidth]} onValueChange={(v) => setDesign({ ...design, pageWidth: v[0] })} min={600} max={1000} step={50} className="mt-2" />
                </div>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Page Padding: {design.padding}px</Label>
                  <Slider value={[design.padding]} onValueChange={(v) => setDesign({ ...design, padding: v[0] })} min={20} max={100} step={10} className="mt-2" />
                </div>
                <div>
                  <Label className="text-neutral-300 text-xs mb-2 block">Item Spacing: {design.itemSpacing}px</Label>
                  <Slider value={[design.itemSpacing]} onValueChange={(v) => setDesign({ ...design, itemSpacing: v[0] })} min={12} max={60} step={4} className="mt-2" />
                </div>
              </div>

              <div className="bg-neutral-700 p-4 rounded-lg space-y-4">
                <h4 className="text-white font-semibold text-sm uppercase tracking-wide">Borders</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300 text-xs">Title Border</Label>
                  <Switch checked={design.showTitleBorder} onCheckedChange={(v) => setDesign({ ...design, showTitleBorder: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300 text-xs">Category Border</Label>
                  <Switch checked={design.showCategoryBorder} onCheckedChange={(v) => setDesign({ ...design, showCategoryBorder: v })} />
                </div>
              </div>

              <div className="bg-neutral-700 p-4 rounded-lg space-y-4">
                <h4 className="text-white font-semibold text-sm uppercase tracking-wide">Food Safety Warning</h4>
                <div className="flex items-center justify-between">
                  <Label className="text-neutral-300 text-xs">Show Warning</Label>
                  <Switch checked={design.showWarning} onCheckedChange={(v) => setDesign({ ...design, showWarning: v })} />
                </div>
                {design.showWarning && (
                  <div>
                    <Label className="text-neutral-300 text-xs mb-2 block">Position</Label>
                    <Select value={design.warningPosition} onValueChange={(v) => setDesign({ ...design, warningPosition: v })}>
                      <SelectTrigger className="bg-neutral-600 border-neutral-500 text-white h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-neutral-700 border-neutral-600 text-white">
                        <SelectItem value="top" className="hover:bg-neutral-600">Top of Menu</SelectItem>
                        <SelectItem value="bottom" className="hover:bg-neutral-600">Bottom of Menu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl bg-neutral-800 border-neutral-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-neutral-300 text-sm">Dish Name *</Label>
              <Input value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white mt-1" placeholder="e.g., Grilled Salmon" />
            </div>
            <div>
              <Label className="text-neutral-300 text-sm">Key Ingredients (Optional)</Label>
              <Input value={itemForm.ingredients || ''} onChange={(e) => setItemForm({ ...itemForm, ingredients: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white mt-1" placeholder="e.g., Atlantic salmon, lemon butter, herbs" />
              <p className="text-neutral-400 text-xs mt-1">Help AI generate better descriptions</p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-neutral-300 text-sm">Description</Label>
                <Button type="button" size="sm" onClick={handleGenerateDescription} disabled={generatingAI} className="bg-purple-600 hover:bg-purple-700 text-white h-7 text-xs">
                  <Wand2 className="w-3 h-3 mr-1" />{generatingAI ? 'Generating...' : 'AI Chef Description'}
                </Button>
              </div>
              <Textarea value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white" placeholder="AI will generate a chef-inspired description..." rows={3} />
              <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI creates short, professional, chef-quality descriptions
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-neutral-300 text-sm">Price *</Label>
                <Input value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })} className="bg-neutral-700 border-neutral-600 text-white mt-1" placeholder="12.99" type="number" step="0.01" />
              </div>
              <div>
                <Label className="text-neutral-300 text-sm">Category</Label>
                <Select value={itemForm.category} onValueChange={(v) => setItemForm({ ...itemForm, category: v })}>
                  <SelectTrigger className="bg-neutral-700 border-neutral-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-700 border-neutral-600 text-white">
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
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowItemDialog(false)} className="border-neutral-600 text-white hover:bg-neutral-700">Cancel</Button>
              <Button onClick={handleSaveItem} className="bg-emerald-600 hover:bg-emerald-700 text-white">{editingItem ? 'Update' : 'Add Item'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
