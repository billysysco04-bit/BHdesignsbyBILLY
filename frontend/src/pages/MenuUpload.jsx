import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
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
  CheckCircle
} from "lucide-react";

export default function MenuUpload() {
  const navigate = useNavigate();
  const { token, user, refreshUser } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [menuName, setMenuName] = useState("");
  const [location, setLocation] = useState(user?.location || "");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedJobId, setUploadedJobId] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = React.useRef(null);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    
    if (rejectedFiles && rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError("File is too large. Maximum size is 10MB.");
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError("Invalid file type. Please upload PNG, JPG, JPEG, WebP, or PDF.");
      } else {
        setError("Could not upload file. Please try again.");
      }
      return;
    }
    
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview for images
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
      
      // Auto-set name from filename
      if (!menuName) {
        const name = selectedFile.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
        setMenuName(name.charAt(0).toUpperCase() + name.slice(1));
      }
    }
  }, [menuName]);

  // Manual file selection handler
  const handleManualFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onDrop([selectedFile], []);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "application/pdf": [".pdf"]
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file to upload");
      setError("Please select a file to upload");
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", menuName || "Uploaded Menu");
      if (location) formData.append("location", location);

      console.log("Uploading file:", file.name, file.type, file.size);
      
      const response = await axios.post(`${API}/menus/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        },
        timeout: 30000 // 30 second timeout
      });

      console.log("Upload response:", response.data);
      setUploadedJobId(response.data.job_id);
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
        headers: { Authorization: `Bearer ${token}` }
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

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  const getFileIcon = () => {
    if (!file) return FileImage;
    return file.type === "application/pdf" ? FileText : FileImage;
  };

  const FileIcon = getFileIcon();

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
              Upload a photo or PDF of your menu for AI-powered analysis
            </p>
          </div>

          {/* Upload Zone */}
          {!file ? (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                data-testid="dropzone"
                className={`dropzone ${isDragActive ? "dragging" : ""} cursor-pointer`}
              >
                <input {...getInputProps()} data-testid="file-input" />
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                    <Upload className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {isDragActive ? "Drop your menu here" : "Drag & drop your menu"}
                  </h3>
                  <p className="text-zinc-500 mb-4">or click to browse files</p>
                  <p className="text-sm text-zinc-600">
                    Supports: PNG, JPG, JPEG, WebP, PDF (max 10MB)
                  </p>
                </div>
              </div>
              
              {/* Fallback file input button */}
              <div className="text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleManualFileSelect}
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  className="hidden"
                  data-testid="manual-file-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800"
                  data-testid="browse-files-btn"
                >
                  <FileImage className="w-4 h-4 mr-2" />
                  Browse Files Manually
                </Button>
              </div>
              
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {preview ? (
                    <div className="w-32 h-32 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                      <img src={preview} alt="Menu preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <FileIcon className="w-12 h-12 text-zinc-600" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-medium text-white truncate">{file.name}</h3>
                        <p className="text-sm text-zinc-500">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={clearFile}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-emerald-400">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Ready for upload</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
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
              disabled={!file || uploading || analyzing}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-lg font-semibold"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : analyzing ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload & Analyze Menu
                </>
              )}
            </Button>
            <p className="text-center text-sm text-zinc-500 mt-4">
              This will use 1 credit from your account
            </p>
          </div>

          {/* Analysis Steps */}
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
                      { label: "Uploading file", done: !uploading },
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
