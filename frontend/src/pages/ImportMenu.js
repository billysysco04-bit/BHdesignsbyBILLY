import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, Upload, FileText, Image as ImageIcon, File, CheckCircle, ArrowRight, Loader2, ChevronLeft, ChevronRight, Layers, Eye, FileSpreadsheet, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Page size configurations with items per page estimates
const PAGE_SIZES = [
  { id: 'letter', name: 'Letter (8.5" x 11")', width: 816, height: 1056, itemsPerPage: 12 },
  { id: 'legal', name: 'Legal (8.5" x 14")', width: 816, height: 1344, itemsPerPage: 16 },
  { id: 'tabloid', name: 'Tabloid (11" x 17")', width: 1056, height: 1632, itemsPerPage: 24 },
  { id: 'digital', name: 'Digital (1920 x 1080)', width: 1080, height: 1920, itemsPerPage: 20 },
  { id: 'half-letter', name: 'Half Letter (5.5" x 8.5")', width: 528, height: 816, itemsPerPage: 8 },
];

export default function ImportMenu() {
  const [uploading, setUploading] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [extractedText, setExtractedText] = useState('');
  const [extractedPages, setExtractedPages] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPagePreview, setCurrentPagePreview] = useState(0);
  const [step, setStep] = useState(1);
  const [selectedPageSize, setSelectedPageSize] = useState('letter');
  const { token } = useAuth();
  const navigate = useNavigate();

  // Calculate pages based on items and page size
  const calculatePages = (items, pageSizeId) => {
    const pageSize = PAGE_SIZES.find(p => p.id === pageSizeId) || PAGE_SIZES[0];
    const itemsPerPage = pageSize.itemsPerPage;
    const pages = [];
    
    for (let i = 0; i < items.length; i += itemsPerPage) {
      const pageItems = items.slice(i, i + itemsPerPage);
      pages.push({
        page_number: pages.length + 1,
        items: pageItems,
        text: `Page ${pages.length + 1}: ${pageItems.length} items`
      });
    }
    
    return pages;
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
      
      // Calculate pages based on selected page size
      const calculatedPages = calculatePages(allItems, selectedPageSize);
      setExtractedPages(calculatedPages);
      setTotalPages(calculatedPages.length);
      setCurrentPagePreview(0);
      setStep(2);
      
      toast.success(`Extracted ${allItems.length} items! Will create ${calculatedPages.length} page(s) for ${PAGE_SIZES.find(p => p.id === selectedPageSize)?.name}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process file(s)');
    } finally {
      setUploading(false);
    }
  };

  // Recalculate pages when page size changes
  const handlePageSizeChange = (sizeId) => {
    setSelectedPageSize(sizeId);
    if (extractedItems.length > 0) {
      const calculatedPages = calculatePages(extractedItems, sizeId);
      setExtractedPages(calculatedPages);
      setTotalPages(calculatedPages.length);
      setCurrentPagePreview(0);
      toast.info(`Recalculated: ${calculatedPages.length} page(s) for ${PAGE_SIZES.find(p => p.id === sizeId)?.name}`);
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
      
      // Create menu pages from extracted data with page size settings
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
          menuBorderStyle: 'none',
          menuBorderWidth: 2,
          menuBorderColor: '#1a1a1a',
          decorativeBorder: 'none',
          decorativeBorderColor: '#1a1a1a',
          layout: 'single-column'
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
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-charcoal text-white' : 'bg-neutral-200'}`}>2</div>
              <span className="font-medium">Review</span>
            </div>
            <ArrowRight className="w-5 h-5 text-neutral-300" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-charcoal' : 'text-neutral-300'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-charcoal text-white' : 'bg-neutral-200'}`}>3</div>
              <span className="font-medium">Create</span>
            </div>
          </div>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="text-center">
              <h1 className="font-playfair text-4xl md:text-5xl font-bold text-charcoal mb-4">Transform Your Menu</h1>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">Upload your existing menu or CSV spreadsheet and we'll extract the items for you!</p>
            </div>

            {/* Page Size Selection */}
            <div className="bg-white border border-neutral-200 rounded-xl p-6 max-w-2xl mx-auto">
              <Label className="text-charcoal font-semibold mb-4 block">Select Page Size (for multi-page menus)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PAGE_SIZES.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedPageSize(size.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedPageSize === size.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`font-medium ${selectedPageSize === size.id ? 'text-emerald-700' : 'text-charcoal'}`}>
                          {size.name.split(' (')[0]}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">{size.name.match(/\(([^)]+)\)/)?.[1]}</p>
                        <p className="text-xs text-neutral-400 mt-1">~{size.itemsPerPage} items/page</p>
                      </div>
                      {selectedPageSize === size.id && (
                        <Check className="w-5 h-5 text-emerald-500" />
                      )}
                    </div>
                  </button>
                ))}
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
                    <p className="text-xs text-neutral-400">Maximum total size: 20MB</p>
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
                Found {extractedItems.length} items → {totalPages} page(s) for {PAGE_SIZES.find(p => p.id === selectedPageSize)?.name}
              </p>
            </div>

            {/* Page Size Selector - can change after upload */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Layers className="w-6 h-6 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-emerald-800">Page Layout</p>
                    <p className="text-sm text-emerald-600">Change page size to adjust pages</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {PAGE_SIZES.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => handlePageSizeChange(size.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedPageSize === size.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {size.name.split(' (')[0]}
                    </button>
                  ))}
                </div>
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
