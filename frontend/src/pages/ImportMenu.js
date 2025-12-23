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
];

export default function ImportMenu() {
  const [uploading, setUploading] = useState(false);
  const [generatingDescriptions, setGeneratingDescriptions] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [extractedItems, setExtractedItems] = useState([]);
  const [extractedPages, setExtractedPages] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPagePreview, setCurrentPagePreview] = useState(0);
  const [step, setStep] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState('letter');
  const [selectedLayout, setSelectedLayout] = useState('single-column');
  const [editingItemId, setEditingItemId] = useState(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  const getItemsPerPage = (pageSizeId, layoutId) => {
    const pageSize = PAGE_SIZES.find(p => p.id === pageSizeId) || PAGE_SIZES[0];
    const layout = LAYOUTS.find(l => l.id === layoutId) || LAYOUTS[0];
    return Math.floor(pageSize.baseItems * layout.multiplier);
  };

  const calculatePages = (items, pageSizeId, layoutId) => {
    const itemsPerPage = getItemsPerPage(pageSizeId, layoutId);
    const pages = [];
    for (let i = 0; i < items.length; i += itemsPerPage) {
      pages.push({
        page_number: pages.length + 1,
        items: items.slice(i, i + itemsPerPage)
      });
    }
    return pages.length > 0 ? pages : [{ page_number: 1, items: [] }];
  };

  // Generate AI descriptions - FIXED endpoint path
  const generateAIDescriptions = async (items) => {
    setGeneratingDescriptions(true);
    setGenerationProgress(0);
    const updatedItems = [...items];
    let successCount = 0;
    
    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      setGenerationProgress(Math.round(((i + 1) / updatedItems.length) * 100));
      
      // Skip if already has description
      if (item.description && item.description.trim().length > 5) {
        successCount++;
        continue;
      }
      
      try {
        // FIXED: Correct endpoint path
        const response = await axios.post(
          `${API_URL}/ai/generate-description`,
          { dish_name: item.name, ingredients: item.ingredients || '', style: 'chef' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data && response.data.description) {
          updatedItems[i] = { ...item, description: response.data.description };
          successCount++;
        }
      } catch (error) {
        console.error(`Failed for ${item.name}:`, error.response?.data || error.message);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    }
    
    setGeneratingDescriptions(false);
    setGenerationProgress(100);
    toast.success(`Generated ${successCount} descriptions!`);
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
        toast.info(`Processing: ${file.name}`);
        
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
      setStep(2);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to process file');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateDescriptions = async () => {
    const itemsWithDescriptions = await generateAIDescriptions(extractedItems);
    setExtractedItems(itemsWithDescriptions);
    const calculatedPages = calculatePages(itemsWithDescriptions, selectedPageSize, selectedLayout);
    setExtractedPages(calculatedPages);
    setTotalPages(calculatedPages.length);
    setStep(3);
  };

  const handleSkipDescriptions = () => {
    const calculatedPages = calculatePages(extractedItems, selectedPageSize, selectedLayout);
    setExtractedPages(calculatedPages);
    setTotalPages(calculatedPages.length);
    setStep(3);
  };

  const handleUpdateDescription = (itemId, newDescription) => {
    setExtractedItems(items => 
      items.map(item => item.id === itemId ? { ...item, description: newDescription } : item)
    );
  };

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

  // FIXED: Accept ALL file types including images
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls', '.csv']
    },
    multiple: true,
    disabled: uploading
  });

  const handleCreateMenu = async () => {
    try {
      const pageSize = PAGE_SIZES.find(p => p.id === selectedPageSize) || PAGE_SIZES[0];
      const layout = LAYOUTS.find(l => l.id === selectedLayout) || LAYOUTS[0];
      const finalPages = calculatePages(extractedItems, selectedPageSize, selectedLayout);
      
      const menuPages = finalPages.map((page, idx) => ({
        id: `page-${Date.now()}-${idx}`,
        page_number: idx + 1,
        title: idx === 0 ? 'MENU' : '',
        subtitle: '',
        items: page.items || [],
        design: {
          backgroundColor: '#ffffff',
          backgroundImage: '',
          backgroundImageType: 'none',
          backgroundOpacity: 100,
          titleFont: 'Playfair Display',
          titleSize: 56,
          titleColor: '#1a1a1a',
          titleAlign: 'center',
          subtitleFont: 'DM Sans',
          subtitleSize: 16,
          subtitleColor: '#666666',
          itemFont: 'DM Sans',
          itemNameSize: 16,
          itemNameColor: '#1a1a1a',
          descriptionSize: 12,
          descriptionColor: '#666666',
          priceFont: 'DM Sans',
          priceSize: 16,
          priceColor: '#1a1a1a',
          categoryFont: 'Playfair Display',
          categorySize: 20,
          categoryColor: '#1a1a1a',
          categoryUppercase: true,
          pageWidth: pageSize.width,
          pageHeight: pageSize.height,
          pageSizeId: selectedPageSize,
          layout: selectedLayout,
          layoutColumns: layout.columns,
          padding: 60,
          itemSpacing: 16,
          categorySpacing: 32,
          menuBorderStyle: 'none',
          menuBorderWidth: 1,
          menuBorderColor: '#000000',
          decorativeBorder: 'none',
          decorativeBorderColor: '#000000',
          showTitleBorder: true,
          titleBorderStyle: 'double',
          titleBorderColor: '#1a1a1a',
          showCategoryBorder: true,
          categoryBorderStyle: 'solid',
          categoryBorderColor: '#cccccc',
          showWarning: true,
          warningPosition: 'bottom'
        }
      }));

      const response = await axios.post(
        `${API_URL}/menus`,
        { title: 'MENU', pages: menuPages },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await axios.put(
        `${API_URL}/menus/${response.data.id}`,
        { items: extractedItems, pages: menuPages },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Menu created!`);
      navigate(`/editor/${response.data.id}`);
    } catch (error) {
      toast.error('Failed to create menu');
    }
  };

  const currentItemsPerPage = getItemsPerPage(selectedPageSize, selectedLayout);

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-neutral-800" />
            <span className="font-playfair text-2xl font-bold text-neutral-800">MenuMaker</span>
          </div>
          <Button onClick={() => navigate('/dashboard')} variant="outline">Back to Dashboard</Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Progress */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-3">
            {[
              { num: 1, label: 'Upload' },
              { num: 2, label: 'AI Enhance' },
              { num: 3, label: 'Create' }
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <div className={`flex items-center gap-2 ${step >= s.num ? 'text-neutral-800' : 'text-neutral-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= s.num ? 'bg-neutral-800 text-white' : 'bg-neutral-200'
                  }`}>{s.num}</div>
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                {i < 2 && <ArrowRight className="w-4 h-4 text-neutral-300" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-neutral-800 mb-2">Import Your Menu</h1>
              <p className="text-neutral-600">Upload PDF, images, Word docs, or CSV spreadsheets</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <div className="bg-white border rounded-lg p-4">
                <Label className="font-medium mb-3 block">Page Size</Label>
                <div className="space-y-2">
                  {PAGE_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => handlePageSizeChange(size.id)}
                      className={`w-full p-2 rounded border text-left text-sm flex justify-between items-center ${
                        selectedPageSize === size.id ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      <span>{size.name} <span className="text-neutral-500">({size.label})</span></span>
                      {selectedPageSize === size.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4">
                <Label className="font-medium mb-3 block">Layout</Label>
                <div className="space-y-2">
                  {LAYOUTS.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => handleLayoutChange(layout.id)}
                      className={`w-full p-2 rounded border text-left text-sm flex justify-between items-center ${
                        selectedLayout === layout.id ? 'border-neutral-800 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'
                      }`}
                    >
                      <span>{layout.icon} {layout.name}</span>
                      {selectedLayout === layout.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-neutral-500 mt-2">~{currentItemsPerPage} items per page</p>
              </div>
            </div>

            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all max-w-3xl mx-auto ${
                isDragActive ? 'border-neutral-800 bg-neutral-100' : 'border-neutral-300 hover:border-neutral-500'
              }`}>
              <input {...getInputProps()} />
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-neutral-600 mx-auto animate-spin" />
                  <p className="text-neutral-600">Processing...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 text-neutral-500 mx-auto" />
                  <p className="text-neutral-700 font-medium">Drop files here or click to browse</p>
                  <div className="flex justify-center gap-4 text-sm text-neutral-500">
                    <span>PDF</span>
                    <span>•</span>
                    <span>Images (JPG, PNG)</span>
                    <span>•</span>
                    <span>Word</span>
                    <span>•</span>
                    <span>CSV</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* STEP 2: AI Descriptions */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center mb-8">
              <Wand2 className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h1 className="text-3xl font-bold text-neutral-800 mb-2">Enhance with AI</h1>
              <p className="text-neutral-600">Generate professional descriptions for {extractedItems.length} items</p>
            </div>

            <div className="bg-white border rounded-lg p-6 max-w-2xl mx-auto">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {extractedItems.map((item, i) => (
                  <div key={item.id} className="flex justify-between items-center p-2 bg-neutral-50 rounded text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-neutral-600">${item.price}</span>
                  </div>
                ))}
              </div>
            </div>

            {generatingDescriptions && (
              <div className="max-w-2xl mx-auto">
                <div className="h-2 bg-neutral-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-neutral-600 mt-2">
                  Generating descriptions... {generationProgress}%
                </p>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={handleSkipDescriptions} variant="outline" disabled={generatingDescriptions}>
                Skip
              </Button>
              <Button onClick={handleGenerateDescriptions} disabled={generatingDescriptions} className="bg-purple-600 hover:bg-purple-700">
                {generatingDescriptions ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Generate Descriptions
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Review */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h1 className="text-3xl font-bold text-neutral-800 mb-2">Review Your Menu</h1>
              <p className="text-neutral-600">{extractedItems.length} items → {totalPages} page(s)</p>
            </div>

            <div className="bg-white border rounded-lg p-4 max-w-3xl mx-auto">
              <div className="flex flex-wrap gap-2 mb-4">
                <Label className="w-full text-sm text-neutral-600 mb-1">Adjust layout:</Label>
                {LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    onClick={() => handleLayoutChange(layout.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      selectedLayout === layout.id ? 'bg-neutral-800 text-white' : 'bg-neutral-100 hover:bg-neutral-200'
                    }`}
                  >
                    {layout.icon} {layout.name}
                  </button>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Button size="sm" variant="outline" onClick={() => setCurrentPagePreview(p => Math.max(0, p - 1))} disabled={currentPagePreview === 0}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">Page {currentPagePreview + 1} of {totalPages}</span>
                  <Button size="sm" variant="outline" onClick={() => setCurrentPagePreview(p => Math.min(totalPages - 1, p + 1))} disabled={currentPagePreview >= totalPages - 1}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-3 max-h-80 overflow-y-auto">
                {(extractedPages[currentPagePreview]?.items || []).map((item) => (
                  <div key={item.id} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-neutral-500">{item.category}</p>
                      </div>
                      <span className="font-bold">${item.price}</span>
                    </div>
                    {editingItemId === item.id ? (
                      <div className="mt-2">
                        <Textarea
                          value={item.description || ''}
                          onChange={(e) => handleUpdateDescription(item.id, e.target.value)}
                          rows={2}
                          className="text-sm"
                        />
                        <Button size="sm" className="mt-1" onClick={() => setEditingItemId(null)}>Done</Button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 mt-1">
                        <p className="text-sm text-neutral-600 italic flex-1">
                          {item.description || <span className="text-neutral-400">No description</span>}
                        </p>
                        <button onClick={() => setEditingItemId(item.id)} className="text-neutral-400 hover:text-neutral-600">
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={() => setStep(2)} variant="outline">Back</Button>
              <Button onClick={handleCreateMenu} className="bg-neutral-800 hover:bg-neutral-900">
                Create Menu
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
