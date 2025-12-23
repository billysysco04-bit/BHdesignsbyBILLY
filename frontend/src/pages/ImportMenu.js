import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, Upload, FileText, Image as ImageIcon, File, CheckCircle, ArrowRight, Loader2, ChevronLeft, ChevronRight, Layers, FileSpreadsheet, Check, LayoutGrid } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
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

// Layout configurations with column multipliers
const LAYOUTS = [
  { id: 'single-column', name: 'Single Column', icon: '▌', columns: 1, multiplier: 1 },
  { id: 'two-column', name: 'Two Columns', icon: '▌▐', columns: 2, multiplier: 1.8 },
  { id: 'three-column', name: 'Three Columns', icon: '▌▐▐', columns: 3, multiplier: 2.5 },
  { id: 'grid', name: 'Grid (2x2)', icon: '▚', columns: 2, multiplier: 2 },
  { id: 'centered', name: 'Centered', icon: '◯', columns: 1, multiplier: 0.8 },
];

export default function ImportMenu() {
  const [uploading, setUploading] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [extractedPages, setExtractedPages] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPagePreview, setCurrentPagePreview] = useState(0);
  const [step, setStep] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState('letter');
  const [selectedLayout, setSelectedLayout] = useState('single-column');
  const { token } = useAuth();
  const navigate = useNavigate();

  // Calculate items per page based on page size and layout
  const getItemsPerPage = (pageSizeId, layoutId) => {
    const pageSize = PAGE_SIZES.find(p => p.id === pageSizeId) || PAGE_SIZES[0];
    const layout = LAYOUTS.find(l => l.id === layoutId) || LAYOUTS[0];
    return Math.floor(pageSize.baseItems * layout.multiplier);
  };

  // Calculate pages based on items, page size, and layout
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
      
      // Calculate pages based on selected page size AND layout
      const calculatedPages = calculatePages(allItems, selectedPageSize, selectedLayout);
      setExtractedPages(calculatedPages);
      setTotalPages(calculatedPages.length);
      setCurrentPagePreview(0);
      setStep(2);
      
      const itemsPerPage = getItemsPerPage(selectedPageSize, selectedLayout);
      toast.success(`Extracted ${allItems.length} items! → ${calculatedPages.length} page(s) (${itemsPerPage} items/page)`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process file(s)');
    } finally {
      setUploading(false);
    }
  };

  // Recalculate pages when page size OR layout changes
  const handlePageSizeChange = (sizeId) => {
    setSelectedPageSize(sizeId);
    if (extractedItems.length > 0) {
      const calculatedPages = calculatePages(extractedItems, sizeId, selectedLayout);
      setExtractedPages(calculatedPages);
      setTotalPages(calculatedPages.length);
      setCurrentPagePreview(0);
      const itemsPerPage = getItemsPerPage(sizeId, selectedLayout);
      toast.info(`Recalculated: ${calculatedPages.length} page(s) (${itemsPerPage} items/page)`);
    }
  };

  const handleLayoutChange = (layoutId) => {
    setSelectedLayout(layoutId);
    if (extractedItems.length > 0) {
      const calculatedPages = calculatePages(extractedItems, selectedPageSize, layoutId);
      setExtractedPages(calculatedPages);
      setTotalPages(calculatedPages.length);
      setCurrentPagePreview(0);
      const itemsPerPage = getItemsPerPage(selectedPageSize, layoutId);
      toast.info(`Recalculated: ${calculatedPages.length} page(s) (${itemsPerPage} items/page)`);
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
      const layout = LAYOUTS.find(l => l.id === selectedLayout) || LAYOUTS[0];
      
      // Create menu pages with page size and layout settings
      const menuPages = extractedPages.map((page, idx) => ({
        id: `page-${Date.now()}-${idx}`,
        page_number: idx + 1,
        title: idx === 0 ? 'Imported Menu' : `Page ${idx + 1}`,
        subtitle: '',
        items: page.items || [],
        design: {
          backgroundColor: '#ffffff',
          backgroundImage: '',
          backgroundOpacity: 100,
          titleFont: 'Playfair Display',
          titleSize: 42,
          titleColor: '#1a1a1a',
          itemFont: 'DM Sans',
          pageWidth: pageSize.width,
          pageHeight: pageSize.height,
          pageSizeId: selectedPageSize,
          layout: selectedLayout,
          menuBorderStyle: 'none',
          menuBorderWidth: 2,
          menuBorderColor: '#1a1a1a',
          decorativeBorder: 'none',
          decorativeBorderColor: '#1a1a1a'
        }
      }));

      const response = await axios.post(
        `${API_URL}/menus`,
        { 
          title: 'Imported Menu',
          pages: menuPages
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const menuId = response.data.id;

      await axios.put(
        `${API_URL}/menus/${menuId}`,
        { 
          items: extractedItems,
          pages: menuPages
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Menu created with ${menuPages.length} page(s)!`);
      navigate(`/editor/${menuId}`);
    } catch (error) {
      toast.error('Failed to create menu');
    }
  };

  // Get current items per page for display
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
              <span className="font-medium">Setup & Upload</span>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-charcoal' : 'text-neutral-300'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-charcoal text-white' : 'bg-neutral-200'}`}>2</div>
              <span className="font-medium">Review & Create</span>
            </div>
          </div>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center">
              <h1 className="font-playfair text-4xl md:text-5xl font-bold text-charcoal mb-4">Import Your Menu</h1>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">Select your page size and layout, then upload your menu file</p>
            </div>

            {/* Page Size & Layout Selection - BEFORE UPLOAD */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Page Size */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <Label className="text-charcoal font-semibold mb-4 block flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-600" />
                  Page Size
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {PAGE_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => handlePageSizeChange(size.id)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedPageSize === size.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`font-medium text-sm ${selectedPageSize === size.id ? 'text-emerald-700' : 'text-charcoal'}`}>
                            {size.name}
                          </p>
                          <p className="text-xs text-neutral-500">{size.label}</p>
                        </div>
                        {selectedPageSize === size.id && (
                          <Check className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Style */}
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <Label className="text-charcoal font-semibold mb-4 block flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-emerald-600" />
                  Layout Style
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {LAYOUTS.map((layout) => (
                    <button
                      key={layout.id}
                      onClick={() => handleLayoutChange(layout.id)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedLayout === layout.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{layout.icon}</span>
                          <span className={`text-sm font-medium ${selectedLayout === layout.id ? 'text-emerald-700' : 'text-charcoal'}`}>
                            {layout.name}
                          </span>
                        </div>
                        {selectedLayout === layout.id && (
                          <Check className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Items per page indicator */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full">
                <Layers className="w-4 h-4" />
                <span className="font-medium">~{currentItemsPerPage} items per page</span>
                <span className="text-emerald-600">with current settings</span>
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
                    <div>
                      <p className="text-xl font-medium text-charcoal mb-2">{isDragActive ? 'Drop your files here' : 'Drag and drop files here'}</p>
                      <p className="text-neutral-500">or click to browse - <span className="text-emerald-600 font-medium">Select multiple files!</span></p>
                    </div>
                    <div className="flex items-center justify-center gap-4 flex-wrap text-neutral-500">
                      <div className="flex items-center gap-2"><FileText className="w-5 h-5" /><span className="text-sm">PDF</span></div>
                      <div className="flex items-center gap-2"><ImageIcon className="w-5 h-5" /><span className="text-sm">JPEG/PNG</span></div>
                      <div className="flex items-center gap-2"><File className="w-5 h-5" /><span className="text-sm">Word/TXT</span></div>
                      <div className="flex items-center gap-2 text-emerald-600 font-medium"><FileSpreadsheet className="w-5 h-5" /><span className="text-sm">CSV Spreadsheet</span></div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-center">
              <Button onClick={() => navigate('/templates')} variant="outline" className="border-charcoal text-charcoal hover:bg-neutral-50 rounded-full">Or start with a template instead</Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="font-playfair text-4xl font-bold text-charcoal mb-4">Items Extracted!</h1>
              <p className="text-xl text-neutral-600">
                Found {extractedItems.length} items → <span className="text-emerald-600 font-bold">{totalPages} page(s)</span>
              </p>
            </div>

            {/* Adjustable Settings - Can still change after upload */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6">
              <h3 className="font-semibold text-charcoal mb-4 flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-emerald-600" />
                Adjust Page Layout (pages will recalculate)
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Page Size */}
                <div>
                  <Label className="text-neutral-600 text-sm mb-2 block">Page Size</Label>
                  <div className="flex flex-wrap gap-2">
                    {PAGE_SIZES.map((size) => (
                      <button
                        key={size.id}
                        onClick={() => handlePageSizeChange(size.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selectedPageSize === size.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        {size.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout */}
                <div>
                  <Label className="text-neutral-600 text-sm mb-2 block">Layout Style</Label>
                  <div className="flex flex-wrap gap-2">
                    {LAYOUTS.map((layout) => (
                      <button
                        key={layout.id}
                        onClick={() => handleLayoutChange(layout.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                          selectedLayout === layout.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                        }`}
                      >
                        <span>{layout.icon}</span>
                        {layout.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-center">
                <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-2 rounded-full text-sm">
                  <Check className="w-4 h-4" />
                  {currentItemsPerPage} items/page × {totalPages} pages = {extractedItems.length} items
                </span>
              </div>
            </div>

            {/* Page Navigation */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPagePreview(Math.max(0, currentPagePreview - 1))}
                  disabled={currentPagePreview === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-charcoal font-medium">
                  Page {currentPagePreview + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPagePreview(Math.min(totalPages - 1, currentPagePreview + 1))}
                  disabled={currentPagePreview >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Page Tabs */}
            {totalPages > 1 ? (
              <Tabs value={`page-${currentPagePreview}`} onValueChange={(v) => setCurrentPagePreview(parseInt(v.replace('page-', '')))}>
                <TabsList className="w-full flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-lg mb-4">
                  {extractedPages.map((page, idx) => (
                    <TabsTrigger 
                      key={idx} 
                      value={`page-${idx}`}
                      className="data-[state=active]:bg-white data-[state=active]:shadow flex-1 min-w-[80px]"
                    >
                      Page {idx + 1} ({page.items?.length || 0})
                    </TabsTrigger>
                  ))}
                </TabsList>

                {extractedPages.map((page, idx) => (
                  <TabsContent key={idx} value={`page-${idx}`}>
                    <div className="bg-white border border-neutral-200 rounded-xl p-6">
                      <h3 className="font-playfair text-2xl font-bold text-charcoal mb-4">
                        Page {idx + 1} ({page.items?.length || 0} items)
                      </h3>
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {(page.items || []).map((item) => (
                          <div key={item.id} className="flex justify-between items-start p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-charcoal">{item.name}</h4>
                                <span className="text-xs bg-neutral-100 px-2 py-1 rounded-full text-neutral-600">{item.category}</span>
                              </div>
                              {item.description && <p className="text-sm text-neutral-600">{item.description}</p>}
                            </div>
                            <div className="font-bold text-charcoal whitespace-nowrap ml-4">${item.price}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h3 className="font-playfair text-2xl font-bold text-charcoal mb-4">All Items ({extractedItems.length})</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {extractedItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start p-3 border border-neutral-200 rounded-lg hover:bg-neutral-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-charcoal">{item.name}</h4>
                          <span className="text-xs bg-neutral-100 px-2 py-1 rounded-full text-neutral-600">{item.category}</span>
                        </div>
                        {item.description && <p className="text-sm text-neutral-600">{item.description}</p>}
                      </div>
                      <div className="font-bold text-charcoal whitespace-nowrap ml-4">${item.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <Button onClick={() => { setStep(1); setExtractedItems([]); setExtractedPages([]); setTotalPages(1); }} variant="outline" className="border-charcoal text-charcoal rounded-full px-8">
                Upload Different File
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
