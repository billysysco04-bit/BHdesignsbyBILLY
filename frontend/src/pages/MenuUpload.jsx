import React, { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { useAuth, API } from "../App";
import { toast } from "sonner";
import {
  ChefHat,
  Upload,
  FileImage,
  FileText,
  X,
  ArrowLeft,
  Loader2,
  MapPin,
  Sparkles,
  CheckCircle,
  Plus,
  Trash2
} from "lucide-react";

export default function MenuUpload() {
  const navigate = useNavigate();
  const { token, user, refreshUser } = useAuth();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [menuName, setMenuName] = useState("");
  const [location, setLocation] = useState(user?.location || "");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  const processFiles = useCallback((newFiles) => {
    setError(null);
    const validFiles = [];
    const newPreviews = [];

    for (const file of newFiles) {
      // Check type
      if (!validTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}. Please upload PNG, JPG, JPEG, WebP, or PDF.`);
        continue;
      }
      // Check size
      if (file.size > maxSize) {
        setError(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }
      validFiles.push(file);

      // Create preview for images
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviews(prev => [...prev, { name: file.name, url: e.target.result }]);
        };
        reader.readAsDataURL(file);
      } else {
        newPreviews.push({ name: file.name, url: null });
      }
    }

    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      if (!menuName && validFiles[0]) {
        const name = validFiles[0].name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setMenuName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  }, [menuName]);

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the dropzone entirely
    if (e.currentTarget === dropZoneRef.current && !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  // Manual file selection
  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      processFiles(selectedFiles);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setFiles([]);
    setPreviews([]);
    setMenuName("");
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      setError("Please select at least one file to upload");
      return;
    }

    if (user?.credits < 1) {
      toast.error("Insufficient credits. Please purchase more to continue.");
      navigate("/credits");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create a combined form data with all files
      const formData = new FormData();
      
      // For multiple files, we'll upload the first one and include info about others
      // Or combine PDFs/images on the server side
      files.forEach((file, index) => {
        formData.append("file", file);
      });
      formData.append("name", menuName || "Uploaded Menu");
      if (location) formData.append("location", location);

      console.log("Uploading", files.length, "file(s)");
      
      const response = await axios.post(`${API}/menus/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
        timeout: 60000 // 60 second timeout for larger uploads
      });

      console.log("Upload response:", response.data);
      await refreshUser();
      toast.success("Menu uploaded successfully!");
      
      // Start analysis
      handleAnalyze(response.data.job_id);
    } catch (error) {
      console.error("Upload error:", error);
      const message = error.response?.data?.detail || error.message || "Upload failed";
      toast.error(message);
      setError(message);
      setUploading(false);
    }
  };

  const handleAnalyze = async (jobId) => {
    setAnalyzing(true);
    setUploading(false);

    try {
      await axios.post(`${API}/menus/${jobId}/analyze`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 120000 // 2 minute timeout for analysis
      });

      toast.success("Analysis complete!");
      navigate(`/menu/${jobId}`);
    } catch (error) {
      const message = error.response?.data?.detail || "Analysis failed";
      toast.error(message);
      // Still navigate to view partial results
      navigate(`/menu/${jobId}`);
    }
  };

  const getFileIcon = (file) => {
    return file.type === "application/pdf" ? FileText : FileImage;
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white font-['Manrope']">Upload Menu</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-zinc-400">
            <span className="font-mono">{user?.credits || 0}</span>
            <span>credits remaining</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2 font-['Manrope']">
              Upload Your Menu
            </h1>
            <p className="text-zinc-400">
              Upload photos or PDFs of your menu for AI-powered analysis. You can add multiple pages.
            </p>
          </div>

          {/* Drag & Drop Zone */}
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            data-testid="dropzone"
            className={`
              border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300
              ${isDragging 
                ? "border-blue-400 bg-blue-500/10 scale-[1.02]" 
                : "border-zinc-700 hover:border-blue-500/50 hover:bg-blue-500/5"
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="file-input"
            />
            
            <div className="flex flex-col items-center pointer-events-none">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
                isDragging ? "bg-blue-500/20" : "bg-blue-500/10"
              }`}>
                <Upload className={`w-10 h-10 ${isDragging ? "text-blue-300" : "text-blue-400"}`} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {isDragging ? "Drop your files here!" : "Drag & drop your menu files"}
              </h3>
              <p className="text-zinc-500 mb-4">or click anywhere in this box to browse</p>
              <p className="text-sm text-zinc-600">
                Supports: PNG, JPG, JPEG, WebP, PDF (max 10MB each) • Multiple files allowed
              </p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-300">
                  Selected Files ({files.length})
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFiles}
                  className="text-zinc-500 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              </div>
              
              <div className="grid gap-3">
                {files.map((file, index) => {
                  const FileIcon = getFileIcon(file);
                  const preview = previews.find(p => p.name === file.name);
                  
                  return (
                    <Card key={index} className="bg-zinc-900/50 border-zinc-800">
                      <CardContent className="p-4 flex items-center gap-4">
                        {preview?.url ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                            <img src={preview.url} alt={file.name} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <FileIcon className="w-8 h-8 text-zinc-500" />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">{file.name}</p>
                          <p className="text-sm text-zinc-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Add More Files Button */}
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add More Pages
              </Button>
            </div>
          )}

          {/* Form Fields */}
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="menuName" className="text-zinc-300">Menu Name</Label>
              <Input
                id="menuName"
                data-testid="menu-name-input"
                placeholder="e.g., Main Dinner Menu"
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                className="h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-zinc-300">Location (for competitor analysis)</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <Input
                  id="location"
                  data-testid="location-input"
                  placeholder="e.g., Austin, TX"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-11 h-12 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
                />
              </div>
              <p className="text-xs text-zinc-500">Used to find competitor pricing within 60 miles</p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <Button
              data-testid="upload-btn"
              onClick={handleUpload}
              disabled={files.length === 0 || uploading || analyzing}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-semibold disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading {files.length} file{files.length > 1 ? 's' : ''}...
                </>
              ) : analyzing ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload & Analyze {files.length > 0 ? `(${files.length} file${files.length > 1 ? 's' : ''})` : 'Menu'}
                </>
              )}
            </Button>
            <p className="text-center text-sm text-zinc-500 mt-4">
              This will use 1 credit from your account
            </p>
          </div>

          {/* Processing Steps */}
          {(uploading || analyzing) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-white mb-4">Processing your menu...</h3>
                  <div className="space-y-3">
                    {[
                      { label: `Uploading ${files.length} file${files.length > 1 ? 's' : ''}`, done: !uploading },
                      { label: "Extracting menu items", done: false },
                      { label: "Calculating food costs", done: false },
                      { label: "Generating pricing suggestions", done: false }
                    ].map((step, index) => (
                      <div key={index} className="flex items-center gap-3">
                        {step.done ? (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        ) : index === 0 && uploading ? (
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        ) : index === 1 && analyzing ? (
                          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-zinc-700" />
                        )}
                        <span className={step.done ? "text-zinc-300" : "text-zinc-500"}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
