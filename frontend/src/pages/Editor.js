import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChefHat, ArrowLeft, Plus, Trash2, Wand2, Download, Save, Settings, Type, Palette, Layout, AlertTriangle } from 'lucide-react';
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

const FONTS = [
  { name: 'Playfair Display', value: 'Playfair Display, serif' },
  { name: 'DM Sans', value: 'DM Sans, sans-serif' },
  { name: 'Merriweather', value: 'Merriweather, serif' },
  { name: 'Inter', value: 'Inter, sans-serif' },
  { name: 'Lora', value: 'Lora, serif' },
  { name: 'Roboto', value: 'Roboto, sans-serif' },
  { name: 'Montserrat', value: 'Montserrat, sans-serif' },
  { name: 'Crimson Text', value: 'Crimson Text, serif' }
];

const PRESET_COLORS = [
  { name: 'Classic Black', primary: '#1a1a1a', secondary: '#666666', accent: '#000000' },
  { name: 'Elegant Navy', primary: '#1e3a5f', secondary: '#4a6fa5', accent: '#2c5282' },
  { name: 'Warm Terracotta', primary: '#e07a5f', secondary: '#f4a261', accent: '#d4623f' },
  { name: 'Forest Green', primary: '#2d6a4f', secondary: '#52b788', accent: '#1b4332' },
  { name: 'Royal Purple', primary: '#5a189a', secondary: '#9d4edd', accent: '#3c096c' },
  { name: 'Burgundy', primary: '#800020', secondary: '#a0153e', accent: '#660018' }
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
  const [showDesignPanel, setShowDesignPanel] = useState(true);

  // Design settings
  const [designSettings, setDesignSettings] = useState({
    titleFont: 'Playfair Display, serif',
    bodyFont: 'DM Sans, sans-serif',
    titleSize: 48,
    subtitleSize: 18,
    itemNameSize: 20,
    descriptionSize: 14,
    priceSize: 18,
    primaryColor: '#1a1a1a',
    secondaryColor: '#666666',
    accentColor: '#e07a5f',
    backgroundColor: '#ffffff',
    layout: 'single-column',
    spacing: 'normal',
    includeWarning: true,
    warningPosition: 'bottom'
  });

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Appetizers',
    image_url: ''
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
    } catch (error) {
      toast.error('Failed to load menu');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const createNewMenu = async () => {
    try {
      const newMenu = await api.createMenu('Untitled Menu');
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
        title: menu.title,
        items: menu.items,
        include_warning: designSettings.includeWarning
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
    setItemForm({
      name: '',
      description: '',
      price: '',
      category: 'Appetizers',
      image_url: ''
    });
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
      setMenu({
        ...menu,
        items: menu.items.map(item => item.id === editingItem.id ? newItem : item)
      });
      toast.success('Item updated');
    } else {
      setMenu({
        ...menu,
        items: [...(menu.items || []), newItem]
      });
      toast.success('Item added');
    }

    setShowItemDialog(false);
  };

  const handleDeleteItem = (itemId) => {
    setMenu({
      ...menu,
      items: menu.items.filter(item => item.id !== itemId)
    });
    toast.success('Item removed');
  };

  const handleGenerateDescription = async () => {
    if (!itemForm.name) {
      toast.error('Please enter a dish name first');
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await api.generateDescription(itemForm.name, '', 'professional');
      setItemForm({ ...itemForm, description: response.description });
      toast.success('Description generated!');
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setGeneratingAI(false);
    }
  };

  const applyPresetColor = (preset) => {
    setDesignSettings({
      ...designSettings,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent
    });
    toast.success(`Applied ${preset.name} color scheme`);
  };

  const handleExportPDF = async () => {
    const previewElement = document.getElementById('menu-preview');
    if (!previewElement) return;

    toast.info('Generating PDF...');
    
    try {
      const canvas = await html2canvas(previewElement, {
        scale: 2,
        backgroundColor: designSettings.backgroundColor
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${menu.title}.pdf`);
      toast.success('PDF downloaded!');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const groupedItems = (menu?.items || []).reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const spacingClass = {
    'compact': 'space-y-6',
    'normal': 'space-y-10',
    'spacious': 'space-y-16'
  }[designSettings.spacing];

  if (loading) {
    return (
      <div className="min-h-screen bg-paper grain flex items-center justify-center">
        <p className="text-neutral-600">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper grain">
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-full px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button onClick={() => navigate('/dashboard')} data-testid="back-button" variant="ghost" className="rounded-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Input
              value={menu?.title || ''}
              onChange={(e) => setMenu({ ...menu, title: e.target.value })}
              data-testid="menu-title-input"
              className="text-xl font-playfair font-bold border-2 focus:ring-0 max-w-md"
              placeholder="Menu Title"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowDesignPanel(!showDesignPanel)}
              variant="outline"
              className="border-sage text-sage hover:bg-sage/10 rounded-full"
              data-testid="toggle-design-panel"
            >
              <Settings className="w-4 h-4 mr-2" />
              Design
            </Button>
            <Button onClick={handleExportPDF} data-testid="export-pdf-button" variant="outline" className="border-charcoal text-charcoal hover:bg-neutral-50 rounded-full">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handleSave} data-testid="save-menu-button" disabled={saving} className="bg-charcoal text-white hover:bg-neutral-800 rounded-full">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Panel - Items List */}
        <div className="w-64 border-r border-neutral-200 bg-white p-4 overflow-y-auto">
          <Button onClick={handleAddItem} data-testid="add-item-button" className="w-full bg-terracotta text-white hover:bg-terracotta/90 rounded-full mb-4">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>

          <div className="space-y-2" data-testid="items-list">
            {(menu?.items || []).map((item) => (
              <div
                key={item.id}
                className="p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer group flex justify-between items-center"
                onClick={() => handleEditItem(item)}
                data-testid={`item-row-${item.id}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-charcoal text-sm truncate">{item.name}</p>
                  <p className="text-xs text-neutral-500">{item.category}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(item.id);
                  }}
                  data-testid={`delete-item-${item.id}`}
                  className="opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Design Panel */}
        {showDesignPanel && (
          <div className="w-80 border-r border-neutral-200 bg-white p-6 overflow-y-auto">
            <h3 className="font-playfair text-lg font-bold text-charcoal mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Design Settings
            </h3>

            <Tabs defaultValue="typography" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="typography"><Type className="w-4 h-4" /></TabsTrigger>
                <TabsTrigger value="colors"><Palette className="w-4 h-4" /></TabsTrigger>
                <TabsTrigger value="layout"><Layout className="w-4 h-4" /></TabsTrigger>
              </TabsList>

              <TabsContent value="typography" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Title Font</Label>
                  <Select value={designSettings.titleFont} onValueChange={(v) => setDesignSettings({ ...designSettings, titleFont: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONTS.map(f => <SelectItem key={f.value} value={f.value}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Body Font</Label>
                  <Select value={designSettings.bodyFont} onValueChange={(v) => setDesignSettings({ ...designSettings, bodyFont: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONTS.map(f => <SelectItem key={f.value} value={f.value}>{f.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Title Size: {designSettings.titleSize}px</Label>
                  <Slider value={[designSettings.titleSize]} onValueChange={(v) => setDesignSettings({ ...designSettings, titleSize: v[0] })} min={24} max={72} step={2} />
                </div>

                <div className="space-y-2">
                  <Label>Item Name Size: {designSettings.itemNameSize}px</Label>
                  <Slider value={[designSettings.itemNameSize]} onValueChange={(v) => setDesignSettings({ ...designSettings, itemNameSize: v[0] })} min={14} max={32} step={1} />
                </div>

                <div className="space-y-2">
                  <Label>Description Size: {designSettings.descriptionSize}px</Label>
                  <Slider value={[designSettings.descriptionSize]} onValueChange={(v) => setDesignSettings({ ...designSettings, descriptionSize: v[0] })} min={10} max={20} step={1} />
                </div>

                <div className="space-y-2">
                  <Label>Price Size: {designSettings.priceSize}px</Label>
                  <Slider value={[designSettings.priceSize]} onValueChange={(v) => setDesignSettings({ ...designSettings, priceSize: v[0] })} min={14} max={28} step={1} />
                </div>
              </TabsContent>

              <TabsContent value="colors" className="space-y-4 mt-4">
                <div className="space-y-3">
                  {PRESET_COLORS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => applyPresetColor(preset)}
                      className="w-full p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">{preset.name}</span>
                      <div className="flex gap-1">
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.primary }} />
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.secondary }} />
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.accent }} />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <Input type="color" value={designSettings.primaryColor} onChange={(e) => setDesignSettings({ ...designSettings, primaryColor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <Input type="color" value={designSettings.secondaryColor} onChange={(e) => setDesignSettings({ ...designSettings, secondaryColor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Accent Color</Label>
                    <Input type="color" value={designSettings.accentColor} onChange={(e) => setDesignSettings({ ...designSettings, accentColor: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <Input type="color" value={designSettings.backgroundColor} onChange={(e) => setDesignSettings({ ...designSettings, backgroundColor: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="layout" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Layout Style</Label>
                  <Select value={designSettings.layout} onValueChange={(v) => setDesignSettings({ ...designSettings, layout: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single-column">Single Column</SelectItem>
                      <SelectItem value="two-column">Two Column</SelectItem>
                      <SelectItem value="grid">Grid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Spacing</Label>
                  <Select value={designSettings.spacing} onValueChange={(v) => setDesignSettings({ ...designSettings, spacing: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="compact">Compact</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="spacious">Spacious</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between space-y-2">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    Food Safety Warning
                  </Label>
                  <Switch checked={designSettings.includeWarning} onCheckedChange={(v) => setDesignSettings({ ...designSettings, includeWarning: v })} />
                </div>

                {designSettings.includeWarning && (
                  <div className="space-y-2">
                    <Label>Warning Position</Label>
                    <Select value={designSettings.warningPosition} onValueChange={(v) => setDesignSettings({ ...designSettings, warningPosition: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top of Menu</SelectItem>
                        <SelectItem value="bottom">Bottom of Menu</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Center - Preview */}
        <div className="flex-1 bg-neutral-100 p-8 overflow-y-auto flex items-start justify-center">
          <div
            id="menu-preview"
            data-testid="menu-preview"
            className="shadow-2xl rounded-none w-[210mm] min-h-[297mm] p-12"
            style={{ 
              backgroundColor: designSettings.backgroundColor,
              fontFamily: designSettings.bodyFont 
            }}
          >
            {designSettings.includeWarning && designSettings.warningPosition === 'top' && (
              <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-800 leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span><strong>FOOD SAFETY WARNING:</strong> Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness, especially if you have certain medical conditions.</span>
                </p>
              </div>
            )}

            <div className="text-center mb-12 border-b-2 pb-8" style={{ borderColor: designSettings.primaryColor }}>
              <h1
                className="font-bold mb-2"
                style={{
                  fontFamily: designSettings.titleFont,
                  fontSize: `${designSettings.titleSize}px`,
                  color: designSettings.primaryColor
                }}
              >
                {menu?.title || 'Untitled Menu'}
              </h1>
              <p style={{ fontSize: `${designSettings.subtitleSize}px`, color: designSettings.secondaryColor }}>
                A curated selection
              </p>
            </div>

            {Object.keys(groupedItems).length === 0 ? (
              <div className="text-center py-20 text-neutral-400">
                <p>No items yet. Add your first menu item to get started.</p>
              </div>
            ) : (
              <div className={spacingClass}>
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category}>
                    <h2
                      className="font-bold mb-6 border-b pb-2"
                      style={{
                        fontFamily: designSettings.titleFont,
                        fontSize: `${designSettings.itemNameSize + 8}px`,
                        color: designSettings.primaryColor,
                        borderColor: designSettings.secondaryColor
                      }}
                    >
                      {category}
                    </h2>
                    <div className="space-y-6">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3
                              className="font-semibold mb-2"
                              style={{
                                fontFamily: designSettings.titleFont,
                                fontSize: `${designSettings.itemNameSize}px`,
                                color: designSettings.primaryColor
                              }}
                            >
                              {item.name}
                            </h3>
                            {item.description && (
                              <p
                                className="leading-relaxed"
                                style={{
                                  fontSize: `${designSettings.descriptionSize}px`,
                                  color: designSettings.secondaryColor
                                }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div
                            className="font-bold whitespace-nowrap"
                            style={{
                              fontFamily: designSettings.titleFont,
                              fontSize: `${designSettings.priceSize}px`,
                              color: designSettings.accentColor
                            }}
                          >
                            ${item.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {designSettings.includeWarning && designSettings.warningPosition === 'bottom' && (
              <div className="mt-12 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-xs text-orange-800 leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span><strong>FOOD SAFETY WARNING:</strong> Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness, especially if you have certain medical conditions.</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl" data-testid="item-dialog">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Dish Name *</Label>
              <Input
                id="item-name"
                data-testid="item-name-input"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g., Grilled Salmon"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="item-description">Description</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateDescription}
                  disabled={generatingAI}
                  data-testid="generate-ai-button"
                  className="rounded-full"
                >
                  <Wand2 className="w-3 h-3 mr-2" />
                  {generatingAI ? 'Generating...' : 'AI Generate'}
                </Button>
              </div>
              <Textarea
                id="item-description"
                data-testid="item-description-input"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Describe this delicious dish..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="item-price">Price *</Label>
                <Input
                  id="item-price"
                  data-testid="item-price-input"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="12.99"
                  type="number"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-category">Category</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(value) => setItemForm({ ...itemForm, category: value })}
                >
                  <SelectTrigger data-testid="item-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
              <Button
                variant="outline"
                onClick={() => setShowItemDialog(false)}
                data-testid="cancel-item-button"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveItem}
                data-testid="save-item-button"
                className="bg-charcoal text-white hover:bg-neutral-800"
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
