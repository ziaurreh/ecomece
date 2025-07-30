import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { useCloudinary } from '@/hooks/useCloudinary';
import { supabase } from '@/integrations/supabase/client';

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  compare_price?: number;
  category_id?: string;
  inventory_count: number;
  sku?: string;
  is_active: boolean;
}

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { isAdmin, user } = useAuthStore();
  const { toast } = useToast();
  const { uploadMultipleImages, isUploading } = useCloudinary();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEdit);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      is_active: true,
      inventory_count: 0,
      price: 0,
    },
  });

  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/admin');
      return;
    }
    
    loadCategories();
    
    if (isEdit && id) {
      loadProduct(id);
    }
  }, [user, isAdmin, navigate, isEdit, id]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
  };

  const loadProduct = async (productId: string) => {
    setIsLoadingProduct(true);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (!error && data) {
      setValue('name', data.name);
      setValue('description', data.description || '');
      setValue('price', data.price);
      setValue('compare_price', data.compare_price || undefined);
      setValue('category_id', data.category_id || '');
      setValue('inventory_count', data.inventory_count);
      setValue('sku', data.sku || '');
      setValue('is_active', data.is_active);
      setImages(data.images || []);
    }
    
    setIsLoadingProduct(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setImageFiles(prev => [...prev, ...files]);
    
    // Preview images
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImages(prev => [...prev, e.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);

    try {
      let finalImages = images;

      // Upload new images to Cloudinary
      if (imageFiles.length > 0) {
        const uploadResults = await uploadMultipleImages(imageFiles, {
          folder: 'ecommerce/products',
        });
        
        // Replace preview URLs with actual Cloudinary URLs
        const newImages = uploadResults.map(result => result.url);
        finalImages = [...images.filter(img => !img.startsWith('data:')), ...newImages];
      }

      const productData = {
        ...data,
        images: finalImages,
        price: Number(data.price),
        compare_price: data.compare_price ? Number(data.compare_price) : null,
        inventory_count: Number(data.inventory_count),
      };

      if (isEdit && id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Product updated successfully.',
        });
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;

        toast({
          title: 'Success',
          description: 'Product created successfully.',
        });
      }

      navigate('/admin/products');
    } catch (error) {
      console.error('Error saving product:', error);
      toast({
        title: 'Error',
        description: 'Failed to save product. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !isAdmin) {
    return null;
  }

  if (isLoadingProduct) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-64" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/admin/products')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </CardTitle>
            <CardDescription>
              {isEdit ? 'Update product information' : 'Create a new product for your store'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    {...register('name', { required: 'Product name is required' })}
                    placeholder="Enter product name"
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    {...register('sku')}
                    placeholder="Enter SKU"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Enter product description"
                  rows={4}
                />
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...register('price', { 
                      required: 'Price is required',
                      min: { value: 0, message: 'Price must be positive' }
                    })}
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="text-sm text-destructive">{errors.price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compare_price">Compare Price</Label>
                  <Input
                    id="compare_price"
                    type="number"
                    step="0.01"
                    {...register('compare_price')}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Category and Inventory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={watch('category_id') || ''}
                    onValueChange={(value) => setValue('category_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="inventory_count">Inventory Count *</Label>
                  <Input
                    id="inventory_count"
                    type="number"
                    {...register('inventory_count', { 
                      required: 'Inventory count is required',
                      min: { value: 0, message: 'Inventory count must be positive' }
                    })}
                    placeholder="0"
                  />
                  {errors.inventory_count && (
                    <p className="text-sm text-destructive">{errors.inventory_count.message}</p>
                  )}
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <Label>Product Images</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <div className="mt-4">
                      <label htmlFor="images" className="cursor-pointer">
                        <Button type="button" variant="outline" asChild>
                          <span>
                            <Plus className="w-4 h-4 mr-2" />
                            Upload Images
                          </span>
                        </Button>
                        <input
                          id="images"
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Upload product images (PNG, JPG, JPEG)
                    </p>
                  </div>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {images.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                          <img
                            src={image}
                            alt={`Product ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {index === 0 && (
                          <Badge className="absolute bottom-2 left-2">
                            Primary
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
                <Label htmlFor="is_active">Active Product</Label>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={isLoading || isUploading}
                  className="flex-1"
                >
                  {isLoading || isUploading ? 'Saving...' : (isEdit ? 'Update Product' : 'Create Product')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/admin/products')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}