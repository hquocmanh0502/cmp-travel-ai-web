// Real upload service using backend endpoint
export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await fetch('http://localhost:3000/api/upload/upload-single', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      url: result.url,
      originalName: result.originalName,
      size: result.size,
      filename: result.filename
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

export const uploadMultipleImages = async (files) => {
  const formData = new FormData();
  files.forEach((file, index) => {
    formData.append('images', file);
  });

  try {
    const response = await fetch('http://localhost:3000/api/upload/upload-multiple', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    const processedFiles = result.files.map(file => ({
      url: file.url,
      originalName: file.originalName,
      size: file.size,
      filename: file.filename
    }));
    
    return processedFiles;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Function to delete uploaded file
export const deleteImage = async (filename) => {
  try {
    const response = await fetch(`http://localhost:3000/api/upload/upload/${filename}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};