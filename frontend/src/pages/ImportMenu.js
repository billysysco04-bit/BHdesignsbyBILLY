/**
 * MenuMaker - Import Menu Feature
 * Copyright (c) 2025 BHdesignsbyBILLY - Billy Harman
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { ChefHat, Upload, FileText, Image as ImageIcon, File, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function ImportMenu() {
  const [uploading, setUploading] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [extractedText, setExtractedText] = useState('');
  const [step, setStep] = useState(1); // 1: upload, 2: review, 3: create
  const { token } = useAuth();
  const navigate = useNavigate();

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/import/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setExtractedItems(response.data.items);
      setExtractedText(response.data.extracted_text);
      setStep(2);
      toast.success(`Successfully extracted ${response.data.items_found} items!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process file');
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
      'image/png': ['.png']
    },
    multiple: false,
    disabled: uploading
  });

  const handleCreateMenu = async () => {
    try {
      const response = await axios.post(
        `${API_URL}/menus`,
        { title: 'Imported Menu' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const menuId = response.data.id;

      // Update menu with extracted items
      await axios.put(
        `${API_URL}/menus/${menuId}`,
        { items: extractedItems },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Menu created successfully!');
      navigate(`/editor/${menuId}`);
    } catch (error) {
      toast.error('Failed to create menu');
    }
  };

  return (
    <div className="min-h-screen bg-paper grain">
      {/* Header */}
      <header className=\"border-b border-neutral-200 bg-white/80 backdrop-blur-md sticky top-0 z-50\">
        <div className=\"max-w-7xl mx-auto px-6 py-4 flex justify-between items-center\">
          <div className=\"flex items-center gap-2\">
            <ChefHat className=\"w-8 h-8 text-charcoal\" />
            <div className=\"flex flex-col\">
              <span className=\"font-playfair text-2xl font-bold text-charcoal leading-tight\">MenuMaker</span>
              <span className=\"text-xs text-neutral-500 -mt-1\">by BHdesignsbyBILLY</span>
            </div>
          </div>
          <Button
            onClick={() => navigate('/dashboard')}
            variant=\"ghost\"
            className=\"rounded-full\"
          >
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className=\"max-w-5xl mx-auto px-6 py-12\">
        {/* Progress Steps */}
        <div className=\"flex items-center justify-center mb-12\">
          <div className=\"flex items-center gap-4\">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-charcoal' : 'text-neutral-300'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-charcoal text-white' : 'bg-neutral-200'}`}>
                1
              </div>
              <span className=\"font-medium\">Upload</span>
            </div>
            <ArrowRight className=\"w-5 h-5 text-neutral-300\" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-charcoal' : 'text-neutral-300'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-charcoal text-white' : 'bg-neutral-200'}`}>
                2
              </div>
              <span className=\"font-medium\">Review</span>
            </div>
            <ArrowRight className=\"w-5 h-5 text-neutral-300\" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-charcoal' : 'text-neutral-300'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-charcoal text-white' : 'bg-neutral-200'}`}>
                3
              </div>
              <span className=\"font-medium\">Create</span>
            </div>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className=\"space-y-8\"
          >
            <div className=\"text-center\">
              <h1 className=\"font-playfair text-4xl md:text-5xl font-bold text-charcoal mb-4\">
                Transform Your Old Menu
              </h1>
              <p className=\"text-xl text-neutral-600 max-w-2xl mx-auto\">
                Upload your existing menu in PDF, JPEG, or Word format and we'll extract the items for you!
              </p>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                isDragActive
                  ? 'border-terracotta bg-terracotta/5'
                  : 'border-neutral-300 hover:border-charcoal hover:bg-neutral-50'
              }`}
              data-testid=\"file-dropzone\"
            >
              <input {...getInputProps()} data-testid=\"file-input\" />
              <div className=\"space-y-6\">
                {uploading ? (
                  <>
                    <Loader2 className=\"w-16 h-16 text-terracotta mx-auto animate-spin\" />
                    <p className=\"text-xl font-medium text-charcoal\">Processing your upload...</p>
                    <p className=\"text-neutral-500\">Please wait while we extract your menu items</p>
                  </>
                ) : (
                  <>
                    <Upload className=\"w-16 h-16 text-charcoal mx-auto\" />
                    <div>
                      <p className=\"text-xl font-medium text-charcoal mb-2\">
                        {isDragActive ? 'Drop your file here' : 'Drag and drop your file here'}
                      </p>
                      <p className=\"text-neutral-500\">or click to browse</p>
                    </div>
                    <div className=\"flex items-center justify-center gap-6 text-neutral-500\">
                      <div className=\"flex items-center gap-2\">
                        <FileText className=\"w-5 h-5\" />
                        <span className=\"text-sm\">PDF</span>
                      </div>
                      <div className=\"flex items-center gap-2\">
                        <ImageIcon className=\"w-5 h-5\" />
                        <span className=\"text-sm\">JPEG/PNG</span>
                      </div>
                      <div className=\"flex items-center gap-2\">
                        <File className=\"w-5 h-5\" />
                        <span className=\"text-sm\">Word</span>
                      </div>
                    </div>
                    <p className=\"text-xs text-neutral-400\">Maximum file size: 10MB</p>
                  </>
                )}
              </div>
            </div>

            <div className=\"text-center\">
              <Button
                onClick={() => navigate('/templates')}
                variant=\"outline\"
                className=\"border-charcoal text-charcoal hover:bg-neutral-50 rounded-full\"
              >
                Or start with a template instead
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className=\"space-y-8\"
          >
            <div className=\"text-center\">
              <CheckCircle className=\"w-16 h-16 text-green-500 mx-auto mb-4\" />
              <h1 className=\"font-playfair text-4xl font-bold text-charcoal mb-4\">
                Items Extracted Successfully!
              </h1>
              <p className=\"text-xl text-neutral-600\">
                We found {extractedItems.length} items. Review them below before creating your menu.
              </p>
            </div>

            {/* Extracted Items */}
            <div className=\"bg-white border border-neutral-200 rounded-xl p-6\">
              <h3 className=\"font-playfair text-2xl font-bold text-charcoal mb-4\">
                Extracted Items ({extractedItems.length})
              </h3>
              <div className=\"space-y-4 max-h-96 overflow-y-auto\">
                {extractedItems.map((item) => (
                  <div
                    key={item.id}
                    className=\"flex justify-between items-start p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50\"
                    data-testid={`extracted-item-${item.id}`}
                  >
                    <div className=\"flex-1\">
                      <div className=\"flex items-center gap-2 mb-1\">
                        <h4 className=\"font-medium text-charcoal\">{item.name}</h4>
                        <span className=\"text-xs bg-neutral-100 px-2 py-1 rounded-full text-neutral-600\">
                          {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <p className=\"text-sm text-neutral-600\">{item.description}</p>
                      )}
                    </div>
                    <div className=\"font-bold text-charcoal whitespace-nowrap ml-4\">
                      ${item.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extracted Text Preview */}
            {extractedText && (
              <div className=\"bg-neutral-50 border border-neutral-200 rounded-xl p-6\">
                <h3 className=\"font-medium text-charcoal mb-2\">Extracted Text Preview</h3>
                <p className=\"text-sm text-neutral-600 font-mono whitespace-pre-wrap\">{extractedText}</p>
              </div>
            )}

            <div className=\"flex gap-4 justify-center\">
              <Button
                onClick={() => {
                  setStep(1);
                  setExtractedItems([]);
                  setExtractedText('');
                }}
                variant=\"outline\"
                className=\"border-charcoal text-charcoal hover:bg-neutral-50 rounded-full px-8\"
              >
                Upload Different File
              </Button>
              <Button
                onClick={handleCreateMenu}
                data-testid=\"create-menu-button\"
                className=\"bg-terracotta text-white hover:bg-terracotta/90 rounded-full px-8\"
              >
                Create Menu with These Items
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
