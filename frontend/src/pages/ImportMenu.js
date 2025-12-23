import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, Upload, FileText, Image as ImageIcon, File, CheckCircle, ArrowRight, Loader2, ChevronLeft, ChevronRight, Layers, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function ImportMenu() {
  const [uploading, setUploading] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [extractedText, setExtractedText] = useState('');
  const [extractedPages, setExtractedPages] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPagePreview, setCurrentPagePreview] = useState(0);
  const [step, setStep] = useState(1);
  const { token } = useAuth();
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    // Check total size
    const totalSize = acceptedFiles.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 20 * 1024 * 1024) {
      toast.error('Total file size must be less than 20MB');
      return;
    }

    setUploading(true);
    let allItems = [];
    let allPages = [];
    let totalPagesCount = 0;

    try {
      // Process each file
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

        // Add items from this file
        allItems = [...allItems, ...response.data.items];
        
        // Add pages from this file
        if (response.data.pages && response.data.pages.length > 0) {
          response.data.pages.forEach((page, pageIdx) => {
            allPages.push({
              ...page,
              page_number: totalPagesCount + pageIdx + 1,
              source_file: file.name
            });
          });
          totalPagesCount += response.data.pages.length;
        } else {
          // Single page file
          allPages.push({
            page_number: totalPagesCount + 1,
            text: response.data.extracted_text,
            items: response.data.items,
            source_file: file.name
          });
          totalPagesCount += 1;
        }
      }

      setExtractedItems(allItems);
      setExtractedPages(allPages);
      setTotalPages(totalPagesCount);
      setCurrentPagePreview(0);
      setStep(2);
      
      toast.success(`Extracted ${allItems.length} items from ${acceptedFiles.length} file(s) (${totalPagesCount} total pages)!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process file(s)');
    } finally {
      setUploading(false);
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
      'text/plain': ['.txt']
    },
    multiple: true,
    disabled: uploading
  });

  const handleCreateMenu = async () => {
    try {
      // Create menu pages from extracted data
      const menuPages = extractedPages.length > 0 
        ? extractedPages.map((page, idx) => ({
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
              titleSize: 52,
              titleColor: '#1a1a1a',
              itemFont: 'DM Sans',
              menuBorderStyle: 'none',
              menuBorderWidth: 2,
              menuBorderColor: '#1a1a1a',
              decorativeBorder: 'none',
              decorativeBorderColor: '#1a1a1a'
            }
          }))
        : [{
            id: `page-${Date.now()}-0`,
            page_number: 1,
            title: 'Imported Menu',
            subtitle: '',
            items: extractedItems,
            design: {
              backgroundColor: '#ffffff',
              backgroundImage: '',
              backgroundOpacity: 100,
              titleFont: 'Playfair Display',
              titleSize: 52,
              titleColor: '#1a1a1a',
              itemFont: 'DM Sans',
              menuBorderStyle: 'none',
              menuBorderWidth: 2,
              menuBorderColor: '#1a1a1a',
              decorativeBorder: 'none',
              decorativeBorderColor: '#1a1a1a'
            }
          }];

      const response = await axios.post(
        `${API_URL}/menus`,
        { 
          title: 'Imported Menu',
          pages: menuPages
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const menuId = response.data.id;

      // Also update with flat items for backward compatibility
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

  // Get items for current page preview
  const getCurrentPageItems = () => {
    if (extractedPages.length > 0 && extractedPages[currentPagePreview]) {
      return extractedPages[currentPagePreview].items || [];
    }
    return extractedItems;
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
              <h1 className="font-playfair text-4xl md:text-5xl font-bold text-charcoal mb-4">Transform Your Old Menu</h1>
              <p className="text-xl text-neutral-600 max-w-2xl mx-auto">Upload your existing menu in PDF, Word, TXT, or image format and we'll extract the items for you!</p>
              <p className="text-sm text-emerald-600 mt-2 flex items-center justify-center gap-2">
                <Layers className="w-4 h-4" />
                Multi-page PDFs fully supported - all pages will be imported!
              </p>
            </div>

            <div {...getRootProps()} className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-terracotta bg-terracotta/5' : 'border-neutral-300 hover:border-charcoal hover:bg-neutral-50'
              }`} data-testid="file-dropzone">
              <input {...getInputProps()} data-testid="file-input" />
              <div className="space-y-6">
                {uploading ? (
                  <>
                    <Loader2 className="w-16 h-16 text-terracotta mx-auto animate-spin" />
                    <p className="text-xl font-medium text-charcoal">Processing your upload...</p>
                    <p className="text-neutral-500">Extracting items from all pages</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-16 h-16 text-charcoal mx-auto" />
                    <div>
                      <p className="text-xl font-medium text-charcoal mb-2">{isDragActive ? 'Drop your file here' : 'Drag and drop your file here'}</p>
                      <p className="text-neutral-500">or click to browse</p>
                    </div>
                    <div className="flex items-center justify-center gap-6 text-neutral-500">
                      <div className="flex items-center gap-2"><FileText className="w-5 h-5" /><span className="text-sm">PDF (multi-page)</span></div>
                      <div className="flex items-center gap-2"><ImageIcon className="w-5 h-5" /><span className="text-sm">JPEG/PNG</span></div>
                      <div className="flex items-center gap-2"><File className="w-5 h-5" /><span className="text-sm">Word/TXT</span></div>
                    </div>
                    <p className="text-xs text-neutral-400">Maximum file size: 10MB</p>
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
              <h1 className="font-playfair text-4xl font-bold text-charcoal mb-4">Items Extracted Successfully!</h1>
              <p className="text-xl text-neutral-600">
                We found {extractedItems.length} items
                {totalPages > 1 && ` across ${totalPages} pages`}. 
                Review them below before creating your menu.
              </p>
            </div>

            {/* Multi-page indicator and navigation */}
            {totalPages > 1 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers className="w-6 h-6 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-emerald-800">Multi-Page Menu Detected</p>
                      <p className="text-sm text-emerald-600">{totalPages} pages will be created in your menu</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPagePreview(Math.max(0, currentPagePreview - 1))}
                      disabled={currentPagePreview === 0}
                      className="border-emerald-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-emerald-800 font-medium px-3">
                      Page {currentPagePreview + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPagePreview(Math.min(totalPages - 1, currentPagePreview + 1))}
                      disabled={currentPagePreview >= totalPages - 1}
                      className="border-emerald-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Page tabs for multi-page view */}
            {totalPages > 1 ? (
              <Tabs value={`page-${currentPagePreview}`} onValueChange={(v) => setCurrentPagePreview(parseInt(v.replace('page-', '')))}>
                <TabsList className="w-full flex flex-wrap gap-1 bg-neutral-100 p-1 rounded-lg mb-4">
                  {extractedPages.map((page, idx) => (
                    <TabsTrigger 
                      key={idx} 
                      value={`page-${idx}`}
                      className="data-[state=active]:bg-white data-[state=active]:shadow flex-1 min-w-[80px]"
                    >
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Page {idx + 1}
                        <span className="text-xs text-neutral-500 ml-1">({page.items?.length || 0})</span>
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {extractedPages.map((page, idx) => (
                  <TabsContent key={idx} value={`page-${idx}`}>
                    <div className="bg-white border border-neutral-200 rounded-xl p-6">
                      <h3 className="font-playfair text-2xl font-bold text-charcoal mb-4">
                        Page {idx + 1} Items ({page.items?.length || 0})
                      </h3>
                      <div className="space-y-4 max-h-80 overflow-y-auto">
                        {(page.items || []).map((item) => (
                          <div key={item.id} className="flex justify-between items-start p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50">
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
                        {(!page.items || page.items.length === 0) && (
                          <p className="text-neutral-500 text-center py-8">No items extracted from this page</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-xl p-6">
                <h3 className="font-playfair text-2xl font-bold text-charcoal mb-4">Extracted Items ({extractedItems.length})</h3>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {extractedItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-start p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50" data-testid={`extracted-item-${item.id}`}>
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

            {extractedText && (
              <details className="bg-neutral-50 border border-neutral-200 rounded-xl">
                <summary className="p-4 cursor-pointer font-medium text-charcoal hover:bg-neutral-100 rounded-xl">
                  View Extracted Text Preview
                </summary>
                <div className="p-4 pt-0">
                  <p className="text-sm text-neutral-600 font-mono whitespace-pre-wrap">{extractedText}</p>
                </div>
              </details>
            )}

            <div className="flex gap-4 justify-center">
              <Button onClick={() => { setStep(1); setExtractedItems([]); setExtractedText(''); setExtractedPages([]); setTotalPages(1); }} variant="outline" className="border-charcoal text-charcoal hover:bg-neutral-50 rounded-full px-8">Upload Different File</Button>
              <Button onClick={handleCreateMenu} data-testid="create-menu-button" className="bg-terracotta text-white hover:bg-terracotta/90 rounded-full px-8">
                Create Menu {totalPages > 1 && `(${totalPages} Pages)`}
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
