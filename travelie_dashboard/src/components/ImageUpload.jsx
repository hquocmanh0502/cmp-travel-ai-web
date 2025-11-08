import { useState, useRef } from 'react';
import { 
  MdCloudUpload, 
  MdDelete, 
  MdPhotoCamera, 
  MdImage,
  MdClose
} from 'react-icons/md';
import { uploadImage, uploadMultipleImages } from '../services/uploadService';

const ImageUpload = ({ 
  value, 
  onChange, 
  multiple = false, 
  maxFiles = 1, 
  label = "Upload Image",
  accept = "image/*",
  className = "",
  showPreview = true,
  previewClassName = "w-32 h-20"
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Convert file to base64 for preview and storage
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Validate file
  const validateFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      throw new Error('File size must be less than 5MB');
    }
    
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Only JPEG, PNG, GIF, and WebP images are allowed');
    }
    
    return true;
  };

  // Handle file selection
  const handleFiles = async (files) => {
    try {
      setUploading(true);
      const fileArray = Array.from(files);
      
      // Validate files
      fileArray.forEach(validateFile);
      
      // Check file count
      if (!multiple && fileArray.length > 1) {
        throw new Error('Only one file allowed');
      }
      
      if (multiple && fileArray.length > maxFiles) {
        throw new Error(`Maximum ${maxFiles} files allowed`);
      }
      
      // Upload files and get URLs
      let uploadedFiles;
      if (multiple) {
        uploadedFiles = await uploadMultipleImages(fileArray);
      } else {
        const uploaded = await uploadImage(fileArray[0]);
        uploadedFiles = [uploaded];
      }
      
      // Format the uploaded files
      const formattedFiles = uploadedFiles.map(uploaded => ({
        name: uploaded.originalName,
        size: uploaded.size,
        url: uploaded.url,
        data: uploaded.url // For compatibility
      }));
      
      if (multiple) {
        // For multiple files, pass the new files array directly
        onChange(formattedFiles);
      } else {
        // For single file
        onChange(formattedFiles[0]);
      }
      
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handle input change
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Handle remove file
  const handleRemove = (index = null) => {
    if (multiple && index !== null) {
      const currentFiles = Array.isArray(value) ? value : [];
      const newFiles = currentFiles.filter((_, i) => i !== index);
      onChange(newFiles);
    } else {
      onChange(null);
    }
  };

  // Open file dialog
  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Get current files for display
  const getCurrentFiles = () => {
    if (!value) return [];
    if (multiple) {
      return Array.isArray(value) ? value : [];
    } else {
      return [value];
    }
  };

  const currentFiles = getCurrentFiles();

  return (
    <div className={`w-full ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
          ${dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={accept}
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />
        
        <div className="flex flex-col items-center">
          <MdCloudUpload className="text-4xl text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-2">
            {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-gray-500">
            PNG, JPG, GIF up to 5MB
            {multiple && ` (Max ${maxFiles} files)`}
          </p>
        </div>
        
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Preview Area */}
      {showPreview && currentFiles.length > 0 && (
        <div className="mt-4">
          <div className={`grid gap-4 ${multiple ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
            {currentFiles.map((file, index) => (
              <div key={index} className="relative group">
                <div className={`relative rounded-lg overflow-hidden border border-gray-300 ${previewClassName}`}>
                  <img
                    src={file.url || file.data}
                    alt={file.name || `Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(multiple ? index : null);
                    }}
                    className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  >
                    <MdClose className="text-sm" />
                  </button>
                  
                  {/* File info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs truncate">{file.name}</p>
                    {file.size && (
                      <p className="text-xs text-gray-300">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* File count info for multiple */}
          {multiple && (
            <p className="text-sm text-gray-500 mt-2">
              {currentFiles.length} of {maxFiles} files uploaded
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;