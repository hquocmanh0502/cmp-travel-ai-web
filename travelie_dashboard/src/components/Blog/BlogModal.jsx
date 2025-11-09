import { useState, useEffect, useRef } from 'react';
import { FiX, FiImage, FiUpload, FiTrash2 } from 'react-icons/fi';
import MDEditor from '@uiw/react-md-editor';

const BlogModal = ({ isOpen, onClose, onSave, blog, categories }) => {
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    author: '',
    category: '',
    tags: '',
    thumbnail: '',
    image: '',
    images: '',
    readingTime: 5,
    status: 'draft',
    publishedDate: ''
  });

  const [errors, setErrors] = useState({});
  const [imagePreview, setImagePreview] = useState('');
  const [imagesPreview, setImagesPreview] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const thumbnailInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  useEffect(() => {
    if (blog) {
      setFormData({
        title: blog.title || '',
        excerpt: blog.excerpt || '',
        content: blog.content || '',
        author: blog.author || '',
        category: blog.category || '',
        tags: Array.isArray(blog.tags) ? blog.tags.join(', ') : blog.tags || '',
        thumbnail: blog.thumbnail || '',
        image: blog.image || '',
        images: Array.isArray(blog.images) ? blog.images.join('\n') : blog.images || '',
        readingTime: blog.readingTime || 5,
        status: blog.status || 'draft',
        publishedDate: blog.publishedDate ? new Date(blog.publishedDate).toISOString().split('T')[0] : ''
      });
      setImagePreview(blog.thumbnail || blog.image || '');
      setImagesPreview(Array.isArray(blog.images) ? blog.images : []);
    } else {
      // Reset form for new blog
      setFormData({
        title: '',
        excerpt: '',
        content: '',
        author: 'CMP Travel Team',
        category: '',
        tags: '',
        thumbnail: '',
        image: '',
        images: '',
        readingTime: 5,
        status: 'draft',
        publishedDate: new Date().toISOString().split('T')[0]
      });
      setImagePreview('');
      setImagesPreview([]);
    }
    setErrors({});
  }, [blog, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleImageChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, thumbnail: value, image: value }));
    setImagePreview(value);
  };

  const handleImagesChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, images: value }));
    // Parse images (one URL per line)
    const imageUrls = value.split('\n').map(url => url.trim()).filter(url => url);
    setImagesPreview(imageUrls);
  };

  // Upload thumbnail image
  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      const response = await fetch('http://localhost:3000/api/upload/upload-single', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, thumbnail: data.url, image: data.url }));
        setImagePreview(data.url);
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Upload gallery images
  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingGallery(true);
    const formDataUpload = new FormData();
    files.forEach(file => {
      formDataUpload.append('images', file);
    });

    try {
      const response = await fetch('http://localhost:3000/api/upload/upload-multiple', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      if (data.success) {
        const newImageUrls = data.files.map(f => f.url);
        const currentImages = formData.images ? formData.images.split('\n').filter(url => url.trim()) : [];
        const allImages = [...currentImages, ...newImageUrls];
        
        setFormData(prev => ({ ...prev, images: allImages.join('\n') }));
        setImagesPreview(allImages);
      } else {
        alert('Upload failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploadingGallery(false);
    }
  };

  // Remove image from gallery
  const handleRemoveGalleryImage = (indexToRemove) => {
    const currentImages = formData.images.split('\n').filter(url => url.trim());
    const updatedImages = currentImages.filter((_, index) => index !== indexToRemove);
    setFormData(prev => ({ ...prev, images: updatedImages.join('\n') }));
    setImagesPreview(updatedImages);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.excerpt.trim()) {
      newErrors.excerpt = 'Excerpt is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.status === 'published' && !formData.publishedDate) {
      newErrors.publishedDate = 'Published date is required for published blogs';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Process tags and images
    const processedData = {
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      images: formData.images.split('\n').map(url => url.trim()).filter(url => url),
      thumbnail: formData.thumbnail || formData.image,
      image: formData.thumbnail || formData.image,
      readingTime: parseInt(formData.readingTime) || 5,
      publishedDate: formData.publishedDate || new Date().toISOString()
    };

    onSave(processedData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {blog ? 'Edit Blog' : 'Create New Blog'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-4 py-3 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                placeholder="Enter blog title"
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
            </div>

            {/* Author and Category Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Author <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.author ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                  placeholder="Author name"
                />
                {errors.author && <p className="text-red-500 text-sm mt-1">{errors.author}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.category ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                >
                  <option value="">Select category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
              </div>
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Excerpt <span className="text-red-500">*</span>
              </label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                rows="2"
                className={`w-full px-4 py-3 border ${errors.excerpt ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                placeholder="Brief description of the blog (150-200 characters)"
              />
              {errors.excerpt && <p className="text-red-500 text-sm mt-1">{errors.excerpt}</p>}
              <p className="text-sm text-gray-500 mt-1">{formData.excerpt.length} characters</p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <div className={`border ${errors.content ? 'border-red-500' : 'border-gray-300'} rounded-lg overflow-hidden`} data-color-mode="light">
                <MDEditor
                  value={formData.content}
                  onChange={(value) => setFormData(prev => ({ ...prev, content: value || '' }))}
                  height={400}
                  preview="edit"
                  hideToolbar={false}
                  enableScroll={true}
                  visibleDragbar={false}
                />
              </div>
              {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
              <p className="text-sm text-gray-500 mt-1">Hỗ trợ Markdown - Preview thời gian thực</p>
            </div>

            {/* Thumbnail (Hero Image) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Thumbnail / Hero Image <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <input
                  type="url"
                  name="thumbnail"
                  value={formData.thumbnail}
                  onChange={handleImageChange}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Or paste image URL here"
                />
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 disabled:bg-gray-400"
                >
                  <FiUpload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
              {imagePreview && (
                <div className="mt-3 relative">
                  <img
                    src={imagePreview}
                    alt="Thumbnail Preview"
                    className="w-full h-48 object-cover rounded-lg"
                    onError={() => setImagePreview('')}
                  />
                </div>
              )}
            </div>

            {/* Gallery Images */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gallery Images
              </label>
              <div className="space-y-3">
                <div className="flex gap-4">
                  <textarea
                    name="images"
                    value={formData.images}
                    onChange={handleImagesChange}
                    rows="3"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-sm"
                    placeholder="Or paste image URLs here (one per line)"
                  />
                  <div className="flex flex-col gap-2">
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleGalleryUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={uploadingGallery}
                      className="px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2 whitespace-nowrap disabled:bg-gray-400"
                    >
                      <FiUpload className="w-4 h-4" />
                      {uploadingGallery ? 'Uploading...' : 'Upload Images'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">Upload images or enter URLs (one per line)</p>
              </div>
              {imagesPreview.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {imagesPreview.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Gallery ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiTrash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reading Time */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Reading Time (minutes)
              </label>
              <input
                type="number"
                name="readingTime"
                value={formData.readingTime}
                onChange={handleChange}
                min="1"
                max="60"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="5"
              />
              <p className="text-sm text-gray-500 mt-1">Estimated reading time in minutes</p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Separate tags with commas (e.g., travel, adventure, tips)"
              />
              <p className="text-sm text-gray-500 mt-1">Separate tags with commas</p>
            </div>

            {/* Status and Date Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Published Date {formData.status === 'published' && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="date"
                  name="publishedDate"
                  value={formData.publishedDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border ${errors.publishedDate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent`}
                />
                {errors.publishedDate && <p className="text-red-500 text-sm mt-1">{errors.publishedDate}</p>}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              {blog ? 'Update Blog' : 'Create Blog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlogModal;
