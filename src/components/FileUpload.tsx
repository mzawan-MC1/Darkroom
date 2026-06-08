import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FileUploadProps {
  onUploadComplete: (url: string) => void;
  currentImageUrl?: string | null;
  folder?: string;
  accept?: string;
}

export default function FileUpload({
  onUploadComplete,
  currentImageUrl,
  folder = 'general',
  accept = 'image/*,video/*'
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      // Validate file size (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        throw new Error(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 50MB`);
      }

      // Validate file type
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (!isVideo && !isImage) {
        throw new Error('Please upload a valid image or video file');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const fileSizeMB = file.size / (1024 * 1024);
      const estimatedTime = Math.max(2000, fileSizeMB * 500);
      const progressSteps = [15, 30, 45, 60, 75, 90];
      const stepDuration = estimatedTime / progressSteps.length;

      let currentStep = 0;
      const progressInterval = setInterval(() => {
        if (currentStep < progressSteps.length) {
          setUploadProgress(progressSteps[currentStep]);
          currentStep++;
        }
      }, stepDuration);

      setUploadProgress(5);

      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      clearInterval(progressInterval);

      if (error) {
        console.error('Supabase storage error:', error);
        throw new Error(error.message || 'Failed to upload file to storage');
      }

      if (!data || !data.path) {
        throw new Error('Upload succeeded but no file path returned');
      }

      setUploadProgress(95);

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(data.path);

      setUploadProgress(100);

      setTimeout(() => {
        setPreviewUrl(publicUrl);
        onUploadComplete(publicUrl);
      }, 300);

    } catch (error: any) {
      console.error('Error uploading file:', error);
      const errorMessage = error.message || 'Error uploading file. Please try again.';
      alert(errorMessage);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadComplete('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {previewUrl ? (
        <div className="relative group">
          <div className="w-full h-64 rounded-2xl overflow-hidden border border-red-900/30 bg-black/40 shadow-panel">
            {previewUrl.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={previewUrl}
                controls
                className="w-full h-full object-cover bg-black"
              />
            ) : (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover bg-black"
              />
            )}
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 p-2 bg-primary-700 hover:bg-primary-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-red-glow"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`relative border border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors bg-black/25 shadow-panel ${
            dragActive
              ? 'border-primary-500/80 bg-primary-500/10 shadow-red-glow'
              : 'border-red-900/30 hover:border-primary-500/70 hover:bg-black/35'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileInput}
            className="hidden"
          />

          {uploading ? (
            <div className="flex flex-col items-center gap-3 w-full max-w-md mx-auto">
              <Loader className="w-12 h-12 text-primary-500 animate-spin drop-shadow-[0_0_18px_rgba(244,63,94,0.35)]" />
              <p className="text-slate-400 font-medium">Uploading... {uploadProgress}%</p>
              <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden border border-red-900/30">
                <div
                  className="h-full bg-primary-500 transition-all duration-300 ease-out rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">Please wait while your file is being uploaded</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-black/40 rounded-full flex items-center justify-center border border-red-900/30 shadow-red-glow">
                {accept.includes('video') ? (
                  <Upload className="w-8 h-8 text-primary-200" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-primary-200" />
                )}
              </div>
              <div>
                <p className="text-slate-300 font-medium mb-1">
                  Drop your file here or click to browse
                </p>
                <p className="text-sm text-slate-500">
                  {accept.includes('video')
                    ? 'Supports images and videos (Max 50MB)'
                    : 'Supports JPG, PNG, GIF (Max 10MB)'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
