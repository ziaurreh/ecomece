import { useState } from 'react';

interface CloudinaryUploadOptions {
  folder?: string;
  transformation?: string;
}

export const useCloudinary = () => {
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = async (
    file: File,
    options: CloudinaryUploadOptions = {}
  ): Promise<{ url: string; publicId: string } | null> => {
    setIsUploading(true);

    try {
      // Create FormData for Cloudinary upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'ecommerce_preset'); // You'll need to create this in Cloudinary
      
      if (options.folder) {
        formData.append('folder', options.folder);
      }

      // Upload to Cloudinary
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'demo';

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName || 'demo'}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      return {
        url: data.secure_url,
        publicId: data.public_id,
      };
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const uploadMultipleImages = async (
    files: File[],
    options: CloudinaryUploadOptions = {}
  ): Promise<{ url: string; publicId: string }[]> => {
    const uploadPromises = files.map(file => uploadImage(file, options));
    const results = await Promise.all(uploadPromises);
    return results.filter(result => result !== null) as { url: string; publicId: string }[];
  };

  return {
    uploadImage,
    uploadMultipleImages,
    isUploading,
  };
};