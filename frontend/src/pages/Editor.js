import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChefHat, ArrowLeft, Plus, Trash2, Wand2, Download, Save, Settings, Undo, Redo, Copy, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import { Slider } from '../components/ui/slider';
import { Separator } from '../components/ui/separator';
import { api } from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const FONTS = [
  'Playfair Display',
  'DM Sans',
  'Merriweather',
  'Inter',
  'Lora',
  'Roboto',
  'Montserrat',
  'Crimson Text'
];

const BACKGROUNDS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Cream', value: '#fdfbf7' },
  { name: 'Light Gray', value: '#f5f5f5' },
  { name: 'Beige', value: '#f5f5dc' },
  { name: 'Light Blue', value: '#f0f8ff' },
  { name: 'Light Green', value: '#f0fff0' },
];

const BORDER_STYLES = [
  { name: 'None', value: 'none' },
  { name: 'Solid', value: 'solid' },
  { name: 'Dashed', value: 'dashed' },
  { name: 'Dotted', value: 'dotted' },
  { name: 'Double', value: 'double' }
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
  const [activeTab, setActiveTab] = useState('text');

  const [designSettings, setDesignSettings] = useState({
    // Typography
    titleFont: 'Playfair Display',
    bodyFont: 'DM Sans',
    priceFont: 'Playfair Display',
    titleSize: 48,
    subtitleSize: 18,
    categorySize: 28,
    itemNameSize: 20,
    descriptionSize: 14,
    priceSize: 20,
    
    // Colors
    titleColor: '#1a1a1a',
    categoryColor: '#1a1a1a',
    itemNameColor: '#1a1a1a',
    descriptionColor: '#666666',
    priceColor: '#e07a5f',
    backgroundColor: '#ffffff',
    
    // Spacing & Layout
    pageWidth: '210mm',
    pageHeight: '297mm',
    paddingTop: 48,
    paddingSides: 48,
    paddingBottom: 48,
    itemSpacing: 24,
    categorySpacing: 40,
    
    // Borders & Decorations
    titleBorderBottom: true,
    titleBorderStyle: 'solid',
    titleBorderWidth: 2,
    titleBorderColor: '#1a1a1a',
    categoryBorderBottom: true,
    categoryBorderStyle: 'solid',
    categoryBorderWidth: 1,
    categoryBorderColor: '#666666',
    pageBorder: false,
    pageBorderWidth: 2,
    pageBorderColor: '#1a1a1a',
    
    // Text Alignment
    titleAlign: 'center',
    categoryAlign: 'left',
    itemAlign: 'left',
    pricePosition: 'right',
    
    // Effects
    titleUppercase: false,
    categoryUppercase: true,
    itemNameBold: true,
    priceDisplay: 'inline',
    
    // Warning
    includeWarning: true,
    warningPosition: 'bottom',
    warningSize: 11,
    
    // Logo
    logoUrl: '',
    logoSize: 80,
    logoPosition: 'top-center'
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
    if (window.confirm('Delete this item?')) {
      setMenu({
        ...menu,
        items: menu.items.filter(item => item.id !== itemId)
      });
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
      const response = await api.generateDescription(itemForm.name, '', 'professional');
      setItemForm({ ...itemForm, description: response.description });
      toast.success('Description generated!');
    } catch (error) {
      toast.error('Failed to generate description');
    } finally {
      setGeneratingAI(false);
    }
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

  const applyPreset = (preset) => {
    const presets = {
      classic: {
        titleFont: 'Playfair Display',
        bodyFont: 'DM Sans',
        titleColor: '#1a1a1a',
        backgroundColor: '#ffffff',
        titleSize: 48,
        itemNameSize: 20
      },
      modern: {
        titleFont: 'Montserrat',
        bodyFont: 'Inter',
        titleColor: '#2d3748',
        backgroundColor: '#f7fafc',
        titleSize: 44,
        itemNameSize: 18
      },
      elegant: {
        titleFont: 'Lora',
        bodyFont: 'Crimson Text',
        titleColor: '#1a202c',
        backgroundColor: '#fdfbf7',
        titleSize: 52,
        itemNameSize: 22
      }
    };
    
    setDesignSettings({ ...designSettings, ...presets[preset] });
    toast.success(`${preset.charAt(0).toUpperCase() + preset.slice(1)} preset applied`);
  };

  const groupedItems = (menu?.items || []).reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-paper grain flex items-center justify-center">
        <p className="text-neutral-600">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm" className="rounded-lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={menu?.title || ''}
            onChange={(e) => setMenu({ ...menu, title: e.target.value })}
            className="font-playfair font-bold text-lg border-2 w-64"
            placeholder="Menu Title"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving} size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-lg">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handleExportPDF} size="sm" variant="outline" className="rounded-lg">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Items */}
        <div className="w-64 bg-white border-r border-neutral-200 flex flex-col">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-semibold text-sm text-neutral-700 mb-3">Menu Items</h3>
            <Button onClick={handleAddItem} size="sm" className="w-full bg-terracotta hover:bg-terracotta/90 text-white rounded-lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {(menu?.items || []).length === 0 ? (
              <p className="text-xs text-neutral-400 text-center py-8">No items yet</p>
            ) : (
              <div className="space-y-1">
                {(menu?.items || []).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleEditItem(item)}
                    className="p-2 rounded-lg hover:bg-neutral-50 cursor-pointer group flex justify-between items-center"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">{item.name}</p>
                      <p className="text-xs text-neutral-500">${item.price}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 h-auto hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center - Preview */}
        <div className="flex-1 overflow-auto p-8 bg-neutral-100">
          <div className="max-w-4xl mx-auto">
            <div
              id="menu-preview"
              className="shadow-2xl bg-white"
              style={{
                width: designSettings.pageWidth,
                minHeight: designSettings.pageHeight,
                padding: `${designSettings.paddingTop}px ${designSettings.paddingSides}px ${designSettings.paddingBottom}px`,
                backgroundColor: designSettings.backgroundColor,
                border: designSettings.pageBorder ? `${designSettings.pageBorderWidth}px solid ${designSettings.pageBorderColor}` : 'none'
              }}
            >
              {/* Title Section */}
              <div
                className="mb-12"
                style={{
                  textAlign: designSettings.titleAlign,
                  borderBottom: designSettings.titleBorderBottom ? `${designSettings.titleBorderWidth}px ${designSettings.titleBorderStyle} ${designSettings.titleBorderColor}` : 'none',
                  paddingBottom: designSettings.titleBorderBottom ? '24px' : '0'
                }}
              >
                <h1
                  style={{
                    fontFamily: designSettings.titleFont,
                    fontSize: `${designSettings.titleSize}px`,
                    color: designSettings.titleColor,
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    textTransform: designSettings.titleUppercase ? 'uppercase' : 'none',
                    letterSpacing: designSettings.titleUppercase ? '2px' : 'normal'
                  }}
                >
                  {menu?.title || 'Untitled Menu'}
                </h1>
                <p
                  style={{
                    fontFamily: designSettings.bodyFont,
                    fontSize: `${designSettings.subtitleSize}px`,
                    color: designSettings.descriptionColor
                  }}
                >
                  A curated selection
                </p>
              </div>

              {/* Warning Top */}
              {designSettings.includeWarning && designSettings.warningPosition === 'top' && (
                <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p style={{ fontSize: `${designSettings.warningSize}px` }} className="text-orange-800 leading-relaxed">
                    <strong>FOOD SAFETY WARNING:</strong> Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness.
                  </p>
                </div>
              )}

              {/* Menu Items */}
              {Object.keys(groupedItems).length === 0 ? (
                <div className="text-center py-20 text-neutral-400">
                  <p>Add items to see your menu preview</p>
                </div>
              ) : (
                <div style={{ marginTop: `${designSettings.categorySpacing}px` }}>
                  {Object.entries(groupedItems).map(([category, items], catIndex) => (
                    <div
                      key={category}
                      style={{
                        marginBottom: catIndex < Object.keys(groupedItems).length - 1 ? `${designSettings.categorySpacing}px` : '0'
                      }}
                    >
                      <h2
                        style={{
                          fontFamily: designSettings.titleFont,
                          fontSize: `${designSettings.categorySize}px`,
                          color: designSettings.categoryColor,
                          fontWeight: 'bold',
                          marginBottom: `${designSettings.itemSpacing}px`,
                          textAlign: designSettings.categoryAlign,
                          textTransform: designSettings.categoryUppercase ? 'uppercase' : 'none',
                          letterSpacing: designSettings.categoryUppercase ? '1px' : 'normal',
                          borderBottom: designSettings.categoryBorderBottom ? `${designSettings.categoryBorderWidth}px ${designSettings.categoryBorderStyle} ${designSettings.categoryBorderColor}` : 'none',
                          paddingBottom: designSettings.categoryBorderBottom ? '12px' : '0'
                        }}
                      >
                        {category}
                      </h2>
                      <div>
                        {items.map((item, itemIndex) => (
                          <div
                            key={item.id}
                            style={{
                              marginBottom: itemIndex < items.length - 1 ? `${designSettings.itemSpacing}px` : '0',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '16px'
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <h3
                                style={{
                                  fontFamily: designSettings.bodyFont,
                                  fontSize: `${designSettings.itemNameSize}px`,
                                  color: designSettings.itemNameColor,
                                  fontWeight: designSettings.itemNameBold ? 'bold' : 'normal',
                                  marginBottom: item.description ? '8px' : '0'
                                }}
                              >
                                {item.name}
                              </h3>
                              {item.description && (
                                <p
                                  style={{
                                    fontFamily: designSettings.bodyFont,
                                    fontSize: `${designSettings.descriptionSize}px`,
                                    color: designSettings.descriptionColor,
                                    lineHeight: '1.6'
                                  }}
                                >
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <div
                              style={{
                                fontFamily: designSettings.priceFont,
                                fontSize: `${designSettings.priceSize}px`,
                                color: designSettings.priceColor,
                                fontWeight: 'bold',
                                flexShrink: 0
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

              {/* Warning Bottom */}
              {designSettings.includeWarning && designSettings.warningPosition === 'bottom' && (
                <div className="mt-12 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p style={{ fontSize: `${designSettings.warningSize}px` }} className="text-orange-800 leading-relaxed">
                    <strong>FOOD SAFETY WARNING:</strong> Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Design Controls */}
        <div className="w-80 bg-white border-l border-neutral-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-sm text-neutral-700 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Design Settings
            </h3>

            {/* Quick Presets */}
            <div className="mb-6">
              <Label className="text-xs font-medium text-neutral-600 mb-2 block">Quick Presets</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button onClick={() => applyPreset('classic')} size="sm" variant="outline" className="text-xs">Classic</Button>
                <Button onClick={() => applyPreset('modern')} size="sm" variant="outline" className="text-xs">Modern</Button>
                <Button onClick={() => applyPreset('elegant')} size="sm" variant="outline" className="text-xs">Elegant</Button>
              </div>
            </div>

            <Separator className="my-4" />

            {/* Design Tabs */}
            <div className="space-y-6">
              {/* Typography Section */}
              <div>
                <h4 className="font-medium text-sm text-neutral-800 mb-3">Typography</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Title Font</Label>
                    <Select value={designSettings.titleFont} onValueChange={(v) => setDesignSettings({ ...designSettings, titleFont: v })}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Body Font</Label>
                    <Select value={designSettings.bodyFont} onValueChange={(v) => setDesignSettings({ ...designSettings, bodyFont: v })}>
                      <SelectTrigger className="h-8 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {FONTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Title Size: {designSettings.titleSize}px</Label>
                    <Slider
                      value={[designSettings.titleSize]}
                      onValueChange={(v) => setDesignSettings({ ...designSettings, titleSize: v[0] })}
                      min={24}
                      max={72}
                      step={2}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Item Name Size: {designSettings.itemNameSize}px</Label>
                    <Slider
                      value={[designSettings.itemNameSize]}
                      onValueChange={(v) => setDesignSettings({ ...designSettings, itemNameSize: v[0] })}
                      min={14}
                      max={32}
                      step={1}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Description Size: {designSettings.descriptionSize}px</Label>
                    <Slider
                      value={[designSettings.descriptionSize]}
                      onValueChange={(v) => setDesignSettings({ ...designSettings, descriptionSize: v[0] })}
                      min={10}
                      max={20}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Colors Section */}
              <div>
                <h4 className="font-medium text-sm text-neutral-800 mb-3">Colors</h4>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        type="color"
                        value={designSettings.titleColor}
                        onChange={(e) => setDesignSettings({ ...designSettings, titleColor: e.target.value })}
                        className="h-8 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Price</Label>
                      <Input
                        type="color"
                        value={designSettings.priceColor}
                        onChange={(e) => setDesignSettings({ ...designSettings, priceColor: e.target.value })}
                        className="h-8 mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Background</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {BACKGROUNDS.map(bg => (
                        <button
                          key={bg.value}
                          onClick={() => setDesignSettings({ ...designSettings, backgroundColor: bg.value })}
                          className="h-8 rounded border-2 hover:border-neutral-400 transition-colors"
                          style={{
                            backgroundColor: bg.value,
                            borderColor: designSettings.backgroundColor === bg.value ? '#1a1a1a' : '#e5e5e5'
                          }}
                          title={bg.name}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Spacing Section */}
              <div>
                <h4 className="font-medium text-sm text-neutral-800 mb-3">Spacing</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Page Padding: {designSettings.paddingSides}px</Label>
                    <Slider
                      value={[designSettings.paddingSides]}
                      onValueChange={(v) => setDesignSettings({
                        ...designSettings,
                        paddingSides: v[0],
                        paddingTop: v[0],
                        paddingBottom: v[0]
                      })}
                      min={20}
                      max={80}
                      step={4}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Item Spacing: {designSettings.itemSpacing}px</Label>
                    <Slider
                      value={[designSettings.itemSpacing]}
                      onValueChange={(v) => setDesignSettings({ ...designSettings, itemSpacing: v[0] })}
                      min={8}
                      max={48}
                      step={4}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Borders Section */}
              <div>
                <h4 className="font-medium text-sm text-neutral-800 mb-3">Borders</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Title Border</Label>
                    <Switch
                      checked={designSettings.titleBorderBottom}
                      onCheckedChange={(v) => setDesignSettings({ ...designSettings, titleBorderBottom: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Category Border</Label>
                    <Switch
                      checked={designSettings.categoryBorderBottom}
                      onCheckedChange={(v) => setDesignSettings({ ...designSettings, categoryBorderBottom: v })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Page Border</Label>
                    <Switch
                      checked={designSettings.pageBorder}
                      onCheckedChange={(v) => setDesignSettings({ ...designSettings, pageBorder: v })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Warning Section */}
              <div>
                <h4 className="font-medium text-sm text-neutral-800 mb-3">Food Safety Warning</h4>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Include Warning</Label>
                    <Switch
                      checked={designSettings.includeWarning}
                      onCheckedChange={(v) => setDesignSettings({ ...designSettings, includeWarning: v })}
                    />
                  </div>

                  {designSettings.includeWarning && (
                    <div>
                      <Label className="text-xs">Position</Label>
                      <Select
                        value={designSettings.warningPosition}
                        onValueChange={(v) => setDesignSettings({ ...designSettings, warningPosition: v })}
                      >
                        <SelectTrigger className="h-8 text-xs mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Top</SelectItem>
                          <SelectItem value="bottom">Bottom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Item Edit Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-playfair text-2xl">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="item-name">Dish Name *</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g., Grilled Salmon"
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="item-description">Description</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateDescription}
                  disabled={generatingAI}
                  className="h-7 text-xs"
                >
                  <Wand2 className="w-3 h-3 mr-1" />
                  {generatingAI ? 'Generating...' : 'AI Generate'}
                </Button>
              </div>
              <Textarea
                id="item-description"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Describe this delicious dish..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="item-price">Price *</Label>
                <Input
                  id="item-price"
                  value={itemForm.price}
                  onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                  placeholder="12.99"
                  type="number"
                  step="0.01"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="item-category">Category</Label>
                <Select
                  value={itemForm.category}
                  onValueChange={(value) => setItemForm({ ...itemForm, category: value })}
                >
                  <SelectTrigger className="mt-1">
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
              <Button variant="outline" onClick={() => setShowItemDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveItem} className="bg-charcoal text-white hover:bg-neutral-800">
                {editingItem ? 'Update' : 'Add Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
