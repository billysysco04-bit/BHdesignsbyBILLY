import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, Upload, FileText, Image as ImageIcon, File, CheckCircle, ArrowRight, Loader2, ChevronLeft, ChevronRight, Layers, FileSpreadsheet, Check, LayoutGrid, Wand2, Sparkles, Edit3 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Page size configurations
const PAGE_SIZES = [
  { id: 'letter', name: 'Letter', label: '8.5" x 11"', width: 816, height: 1056, baseItems: 12 },
  { id: 'legal', name: 'Legal', label: '8.5" x 14"', width: 816, height: 1344, baseItems: 16 },
  { id: 'tabloid', name: 'Tabloid', label: '11" x 17"', width: 1056, height: 1632, baseItems: 24 },
  { id: 'digital', name: 'Digital', label: '1080 x 1920', width: 1080, height: 1920, baseItems: 20 },
  { id: 'half-letter', name: 'Half Letter', label: '5.5" x 8.5"', width: 528, height: 816, baseItems: 8 },
];

// Layout configurations
const LAYOUTS = [
  { id: 'single-column', name: 'Single Column', icon: '▌', columns: 1, multiplier: 1 },
  { id: 'two-column', name: 'Two Columns', icon: '▌▐', columns: 2, multiplier: 1.8 },
  { id: 'three-column', name: 'Three Columns', icon: '▌▐▐', columns: 3, multiplier: 2.5 },
  { id: 'grid', name: 'Grid (2x2)', icon: '▚', columns: 2, multiplier: 2 },
  { id: 'centered', name: 'Centered', icon: '◯', columns: 1, multiplier: 0.8 },
];

export default function ImportMenu() {
  const [uploading, setUploading] = useState(false);
  const [generatingDescriptions, setGeneratingDescriptions] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [extractedPages, setExtractedPages] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPagePreview, setCurrentPagePreview] = useState(0);
  const [step, setStep] = useState(1); // 1: Upload, 2: AI Descriptions, 3: Review & Create
  const [selectedPageSize, setSelectedPageSize] = useState('letter');
  const [selectedLayout, setSelectedLayout] = useState('single-column');
  const [generateDescriptions, setGenerateDescriptions] = useState(true);
  const [editingItemId, setEditingItemId] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  // Calculate items per page
  const getItemsPerPage = (pageSizeId, layoutId) => {
    const pageSize = PAGE_SIZES.find(p => p.id === pageSizeId) || PAGE_SIZES[0];
    const layout = LAYOUTS.find(l => l.id === layoutId) || LAYOUTS[0];
    return Math.floor(pageSize.baseItems * layout.multiplier);
  };

  // Calculate pages
  const calculatePages = (items, pageSizeId, layoutId) => {
    const itemsPerPage = getItemsPerPage(pageSizeId, layoutId);
    const pages = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
      const pageItems = items.slice(i, i + itemsPerPage);
      pages.push({
        page_number: pages.length + 1,
        items: pageItems,
        text: `Page ${pages.length + 1}: ${pageItems.length} items`
      });
    }
    return pages.length > 0 ? pages : [{ page_number: 1, items: [], text: 'Empty page' }];
  };

  // Generate AI descriptions for all items
  const generateAIDescriptions = async (items) => {
    setGeneratingDescriptions(true);
    const updatedItems = [...items];
    let successCount = 0;
    
    toast.info(`Generating chef-inspired descriptions for ${items.length} items...`);
    
    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      // Skip if already has a description
      if (item.description && item.description.trim().length > 10) {
        successCount++;
        continue;
      }
      
      try {
        const response = await axios.post(
          `${API_URL}/generate-description`,
          { dish_name: item.name, ingredients: '', style: 'chef' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        updatedItems[i] = { ...item, description: response.data.description };
        successCount++;
        
        // Update progress
        if ((i + 1) % 5 === 0 || i === updatedItems.length - 1) {
          toast.info(`Generated ${i + 1}/${updatedItems.length} descriptions...`);
        }
      } catch (error) {
        console.error(`Failed to generate description for ${item.name}:`, error);
        // Keep item without description
      }
      
      // Small delay to avoid rate limiting
      if (i < updatedItems.length - 1) {
        await new Promise(r => setTimeout(r, 200));
      }
    }
    
    setGeneratingDescriptions(false);
    toast.success(`Generated descriptions for ${successCount} items!`);
    return updatedItems;
  };

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const totalSize = acceptedFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 20 * 1024 * 1024) {
      toast.error('Total file size must be less than 20MB');
      return;
    }

    setUploading(true);
    let allItems = [];

    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        toast.info(`Processing file ${i + 1} of ${acceptedFiles.length}: ${file.name}`);
        
        const formData = new FormData();
        formData.append('file', file);

        const response = await axios.post(`${API_URL}/import/upload`, formData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });

        allItems = [...allItems, ...response.data.items];
      }

      setExtractedItems(allItems);
      toast.success(`Extracted ${allItems.length} items!`);
      
      // Move to step 2 (AI descriptions)
      setStep(2);
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process file(s)');
    } finally {
      setUploading(false);
    }
  };

  // Handle AI description generation
  const handleGenerateDescriptions = async () => {
    const itemsWithDescriptions = await generateAIDescriptions(extractedItems);
    setExtractedItems(itemsWithDescriptions);
    
    // Calculate pages and move to review
    const calculatedPages = calculatePages(itemsWithDescriptions, selectedPageSize, selectedLayout);
    setExtractedPages(calculatedPages);
    setTotalPages(calculatedPages.length);
    setStep(3);
  };

  // Skip descriptions and go to review
  const handleSkipDescriptions = () => {
    const calculatedPages = calculatePages(extractedItems, selectedPageSize, selectedLayout);
    setExtractedPages(calculatedPages);
    setTotalPages(calculatedPages.length);
    setStep(3);
  };

  // Update item description manually
  const handleUpdateDescription = (itemId, newDescription) => {
    setExtractedItems(items => 
      items.map(item => item.id === itemId ? { ...item, description: newDescription } : item)
    );
  };

  // Recalculate pages when settings change
  const handlePageSizeChange = (sizeId) => {
    setSelectedPageSize(sizeId);
    if (step === 3 && extractedItems.length > 0) {
      const calculatedPages = calculatePages(extractedItems, sizeId, selectedLayout);
      setExtractedPages(calculatedPages);
      setTotalPages(calculatedPages.length);
      setCurrentPagePreview(0);
    }
  };

  const handleLayoutChange = (layoutId) => {
    setSelectedLayout(layoutId);
    if (step === 3 && extractedItems.length > 0) {
      const calculatedPages = calculatePages(extractedItems, selectedPageSize, layoutId);
      setExtractedPages(calculatedPages);
      setTotalPages(calculatedPages.length);
      setCurrentPagePreview(0);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    multiple: true,
    disabled: uploading
  });

  const handleCreateMenu = async () => {
    try {
      const pageSize = PAGE_SIZES.find(p => p.id === selectedPageSize) || PAGE_SIZES[0];
      
      // Recalculate pages with final items (including descriptions)
      const finalPages = calculatePages(extractedItems, selectedPageSize, selectedLayout);
      
      const menuPages = finalPages.map((page, idx) => ({
        id: `page-${Date.now()}-${idx}`,
        page_number: idx + 1,
        title: idx === 0 ? 'Menu' : '',
        subtitle: idx === 0 ? 'A Curated Selection' : '',
        items: page.items || [],
        design: {
          backgroundColor: '#ffffff',
          backgroundImage: '',
          backgroundImageType: 'none',
          backgroundOpacity: 100,
          titleFont: 'Playfair Display',
          titleSize: 48,
          titleColor: '#1a1a1a',
          titleAlign: 'center',
          subtitleFont: 'DM Sans',
          subtitleSize: 16,
          subtitleColor: '#666666',
          itemFont: 'DM Sans',
          itemNameSize: 18,
          itemNameColor: '#1a1a1a',
          descriptionSize: 13,
          descriptionColor: '#555555',
          priceFont: 'Playfair Display',
          priceSize: 18,
          priceColor: '#c45c3e',
          categoryFont: 'Playfair Display',
          categorySize: 24,
          categoryColor: '#1a1a1a',
          categoryUppercase: true,
          pageWidth: pageSize.width,
          pageHeight: pageSize.height,
          pageSizeId: selectedPageSize,
          layout: selectedLayout,
          padding: 50,
          itemSpacing: 20,
          categorySpacing: 35,
          menuBorderStyle: 'none',
          menuBorderWidth: 2,
          menuBorderColor: '#1a1a1a',
          decorativeBorder: 'none',
          decorativeBorderColor: '#1a1a1a',
          showTitleBorder: true,
          titleBorderStyle: 'solid',
          titleBorderColor: '#cccccc',
          showCategoryBorder: true,
          categoryBorderStyle: 'solid',
          categoryBorderColor: '#e0e0e0',
          showWarning: true,
          warningPosition: 'bottom'
        }
      }));

      const response = await axios.post(
        `${API_URL}/menus`,
        { title: 'Menu', pages: menuPages },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.put(
        `${API_URL}/menus/${response.data.id}`,
        { items: extractedItems, pages: menuPages },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Menu created with ${menuPages.length} page(s)!`);
      navigate(`/editor/${response.data.id}`);
    } catch (error) {
      toast.error('Failed to create menu');
    }
  };

  const currentItemsPerPage = getItemsPerPage(selectedPageSize, selectedLayout);

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
          <Button onClick={() => navigate('/dashboard')} variant="ghost" className="rounded-full">
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-charcoal' : 'text-neutral-300'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-charcoal text-white' : 'bg-neutral-200'}`}>1</div>
              <span className="font-medium">Upload</span>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-charcoal' : 'text-neutral-300'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-purple-600 text-white' : 'bg-neutral-200'}`}>
                <Wand2 className="w-5 h-5" />
              </div>
              <span className="font-medium">AI Descriptions</span>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-charcoal' : 'text-neutral-300'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-charcoal text-white' : 'bg-neutral-200'}`}>3</div>
              <span className="font-medium">Review & Create</span>
            </div>
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center">
              <h1 className="font-playfair text-4xl md:text-5xl font-bold text-charcoal mb-4">Import Your Menu</h1>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">Upload your menu file and we'll extract all items automatically</p>
            </div>

            {/* Page Size & Layout Selection */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <Label className="text-charcoal font-semibold mb-4 block flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />Page Size
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAGE_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => handlePageSizeChange(size.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedPageSize === size.id ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <p className={`font-medium text-sm ${selectedPageSize === size.id ? 'text-emerald-700' : 'text-charcoal'}`}>{size.name}</p>
                      <p className="text-xs text-neutral-500">{size.label}</p>
                      {selectedPageSize === size.id && <Check className="w-4 h-4 text-emerald-500 mt-1" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <Label className="text-charcoal font-semibold mb-4 block flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-emerald-600" />Layout Style
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {LAYOUTS.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => handleLayoutChange(layout.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedLayout === layout.id ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{layout.icon}</span>
                        <span className={`text-sm font-medium ${selectedLayout === layout.id ? 'text-emerald-700' : 'text-charcoal'}`}>{layout.name}</span>
                        {selectedLayout === layout.id && <Check className="w-4 h-4 text-emerald-500" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full">
                <Layers className="w-4 h-4" />
                <span className="font-medium">~{currentItemsPerPage} items per page</span>
              </div>
            </div>

            {/* Upload Area */}
            <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-terracotta bg-terracotta/5' : 'border-neutral-300 hover:border-charcoal hover:bg-neutral-50'
              }`}>
              <input {...getInputProps()} />
              <div className="space-y-6">
                {uploading ? (
                  <>
                    <Loader2 className="w-16 h-16 text-terracotta mx-auto animate-spin" />
                    <p className="text-xl font-medium text-charcoal">Processing your files...</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-charcoal mx-auto" />
                    <p className="text-xl font-medium text-charcoal mb-2">{isDragActive ? 'Drop files here' : 'Drag and drop files here'}</p>
                    <div className="flex items-center justify-center gap-4 flex-wrap text-neutral-500">
                      <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> PDF</span>
                      <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4" /> Images</span>
                      <span className="flex items-center gap-1"><File className="w-4 h-4" /> Word/TXT</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-medium"><FileSpreadsheet className="w-4 h-4" /> CSV</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2: AI Descriptions */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-10 h-10 text-purple-600" />
              </div>
              <h1 className="font-playfair text-4xl font-bold text-charcoal mb-4">AI-Powered Descriptions</h1>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
                Generate professional, chef-inspired descriptions for your {extractedItems.length} menu items
              </p>
            </div>

            {/* Preview of items */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 max-w-3xl mx-auto">
              <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                Items to Enhance ({extractedItems.length})
              </h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {extractedItems.slice(0, 10).map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-neutral-50 rounded-lg">
                    <div>
                      <p className="font-medium text-charcoal">{item.name}</p>
                      {item.description ? (
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Has description
                        </p>
                      ) : (
                        <p className="text-sm text-purple-600 flex items-center gap-1">
                          <Wand2 className="w-3 h-3" /> Will generate
                        </p>
                      )}
                    </div>
                    <span className="font-bold text-charcoal">${item.price}</span>
                  </div>
                ))}
                {extractedItems.length > 10 && (
                  <p className="text-center text-neutral-500 text-sm">
                    ...and {extractedItems.length - 10} more items
                  </p>
                )}
              </div>
            </div>

            {/* AI Generation Options */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6 max-w-3xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-purple-900 mb-2">Chef-Inspired AI Descriptions</h4>
                  <p className="text-purple-700 text-sm mb-4">
                    Our AI will create short, appetizing descriptions that highlight the key flavors and appeal of each dish. 
                    Perfect for making your menu look professional and enticing to customers.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <Check className="w-4 h-4" /> Short & professional
                    <Check className="w-4 h-4 ml-4" /> Appetizing language
                    <Check className="w-4 h-4 ml-4" /> Print-ready
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={handleSkipDescriptions} 
                variant="outline" 
                className="border-neutral-300 text-neutral-600 rounded-full px-8"
                disabled={generatingDescriptions}
              >
                Skip Descriptions
              </Button>
              <Button 
                onClick={handleGenerateDescriptions} 
                className="bg-purple-600 hover:bg-purple-700 text-white rounded-full px-8"
                disabled={generatingDescriptions}
              >
                {generatingDescriptions ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Descriptions
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Review & Create */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="font-playfair text-4xl font-bold text-charcoal mb-4">Review Your Menu</h1>
              <p className="text-xl text-neutral-600">
                {extractedItems.length} items → <span className="text-emerald-600 font-bold">{totalPages} page(s)</span>
              </p>
            </div>

            {/* Layout Settings */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6">
              <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-emerald-600" />
                Adjust Layout (pages will recalculate)
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-neutral-600 text-sm mb-2 block">Page Size</Label>
                  <div className="flex flex-wrap gap-2">
                    {PAGE_SIZES.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => handlePageSizeChange(size.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selectedPageSize === size.id ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {size.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-neutral-600 text-sm mb-2 block">Layout Style</Label>
                  <div className="flex flex-wrap gap-2">
                    {LAYOUTS.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => handleLayoutChange(layout.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                          selectedLayout === layout.id ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        <span>{layout.icon}</span> {layout.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setCurrentPagePreview(Math.max(0, currentPagePreview - 1))} disabled={currentPagePreview === 0}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-charcoal font-medium">Page {currentPagePreview + 1} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPagePreview(Math.min(totalPages - 1, currentPagePreview + 1))} disabled={currentPagePreview >= totalPages - 1}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Items List with Editable Descriptions */}
            <Tabs value={`page-${currentPagePreview}`} onValueChange={(v) => setCurrentPagePreview(parseInt(v.replace('page-', '')))}>
              {totalPages > 1 && (
                <TabsList className="w-full flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-lg mb-4">
                  {extractedPages.map((page, idx) => (
                    <TabsTrigger key={idx} value={`page-${idx}`} className="data-[state=active]:bg-white data-[state=active]:shadow flex-1 min-w-[80px]">
                      Page {idx + 1} ({page.items?.length || 0})
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}

              {extractedPages.map((page, idx) => (
                <TabsContent key={idx} value={`page-${idx}`}>
                  <div className="bg-white border border-neutral-200 rounded-xl p-6">
                    <h3 className="font-playfair text-2xl font-bold text-charcoal mb-4">
                      Page {idx + 1} ({page.items?.length || 0} items)
                    </h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {(page.items || []).map((item) => (
                        <div key={item.id} className="p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-charcoal">{item.name}</h4>
                                <span className="text-xs bg-neutral-100 px-2 py-1 rounded-full text-neutral-600">{item.category}</span>
                              </div>
                            </div>
                            <span className="font-bold text-lg text-terracotta">${item.price}</span>
                          </div>
                          
                          {/* Editable Description */}
                          {editingItemId === item.id ? (
                            <div className="mt-2">
                              <Textarea
                                value={item.description || ''}
                                onChange={(e) => handleUpdateDescription(item.id, e.target.value)}
                                className="text-sm"
                                rows={2}
                                placeholder="Enter item description..."
                              />
                              <Button size="sm" className="mt-2" onClick={() => setEditingItemId(null)}>
                                Done
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 mt-2">
                              <p className="text-sm text-neutral-600 flex-1 italic">
                                {item.description || <span className="text-neutral-400">No description</span>}
                              </p>
                              <button 
                                onClick={() => setEditingItemId(item.id)}
                                className="text-neutral-400 hover:text-charcoal p-1"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setStep(2)} variant="outline" className="border-charcoal text-charcoal rounded-full px-8">
                Back to Descriptions
              </Button>
              <Button onClick={handleCreateMenu} className="bg-terracotta text-white hover:bg-terracotta/90 rounded-full px-8">
                Create Menu ({totalPages} Page{totalPages > 1 ? 's' : ''})
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
