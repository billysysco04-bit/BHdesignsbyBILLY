import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ChefHat, ArrowLeft, Plus, Trash2, Wand2, Download, Save } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { api } from '../utils/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function Editor() {
  const { menuId } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

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
        items: menu.items
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

  const handleExportPDF = async () => {
    const previewElement = document.getElementById('menu-preview');
    if (!previewElement) return;

    toast.info('Generating PDF...');
    
    try {
      const canvas = await html2canvas(previewElement, {
        scale: 2,
        backgroundColor: '#ffffff'
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

  if (loading) {
    return (
      <div className="min-h-screen bg-paper grain flex items-center justify-center">
        <p className="text-neutral-600">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper grain">
      {/* Header */}
      <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-full px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/dashboard')}
              data-testid="back-button"
              variant="ghost"
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Input
              value={menu?.title || ''}
              onChange={(e) => setMenu({ ...menu, title: e.target.value })}
              data-testid="menu-title-input"
              className="text-xl font-playfair font-bold border-0 focus:ring-0 max-w-md"
              placeholder="Menu Title"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportPDF}
              data-testid="export-pdf-button"
              variant="outline"
              className="border-charcoal text-charcoal hover:bg-neutral-50 rounded-full"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button
              onClick={handleSave}
              data-testid="save-menu-button"
              disabled={saving}
              className="bg-charcoal text-white hover:bg-neutral-800 rounded-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 h-[calc(100vh-73px)]">
        {/* Left Panel - Controls */}
        <div className="col-span-3 border-r border-neutral-200 bg-white p-6 overflow-y-auto">
          <div className="mb-6">
            <h3 className="font-playfair text-lg font-bold text-charcoal mb-4">Menu Items</h3>
            <Button
              onClick={handleAddItem}
              data-testid="add-item-button"
              className="w-full bg-terracotta text-white hover:bg-terracotta/90 rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>

          <div className="space-y-2" data-testid="items-list">
            {(menu?.items || []).map((item) => (
              <div
                key={item.id}
                className="p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50 cursor-pointer group flex justify-between items-center"
                onClick={() => handleEditItem(item)}
                data-testid={`item-row-${item.id}`}
              >
                <div className="flex-1">
                  <p className="font-medium text-charcoal text-sm">{item.name}</p>
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
                  className="opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Preview */}
        <div className="col-span-9 bg-neutral-100 p-8 overflow-y-auto flex items-start justify-center">
          <div
            id="menu-preview"
            data-testid="menu-preview"
            className="bg-white shadow-2xl rounded-none w-[210mm] min-h-[297mm] p-12"
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            <div className="text-center mb-12 border-b-2 border-charcoal pb-8">
              <h1 className="font-playfair text-5xl font-bold text-charcoal mb-2">
                {menu?.title || 'Untitled Menu'}
              </h1>
              <p className="text-neutral-600 text-lg">A curated selection</p>
            </div>

            {Object.keys(groupedItems).length === 0 ? (
              <div className="text-center py-20 text-neutral-400">
                <p>No items yet. Add your first menu item to get started.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category}>
                    <h2 className="font-playfair text-3xl font-bold text-charcoal mb-6 border-b border-neutral-300 pb-2">
                      {category}
                    </h2>
                    <div className="space-y-6">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="font-playfair text-xl font-semibold text-charcoal mb-2">
                              {item.name}
                            </h3>
                            {item.description && (
                              <p className="text-neutral-600 leading-relaxed font-dm">
                                {item.description}
                              </p>
                            )}
                          </div>
                          <div className="font-playfair text-xl font-bold text-charcoal whitespace-nowrap">
                            ${item.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
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
