import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '@/store/auth';
import { useHeroStore } from '@/store/hero';
import { useToast } from '@/hooks/use-toast';
import { useCloudinary } from '@/hooks/useCloudinary';

interface HeroFormData {
  title: string;
  subtitle: string;
  description: string;
  cta_text: string;
  cta_link: string;
  background_image?: string;
  is_active: boolean;
  order_index: number;
}

export default function AdminHeroSections() {
  const { isAdmin, user } = useAuthStore();
  const { heroSections, isLoading, loadHeroSections, createHeroSection, updateHeroSection, deleteHeroSection, toggleHeroStatus } = useHeroStore();
  const { toast } = useToast();
  const { uploadImage, isUploading } = useCloudinary();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingHero, setEditingHero] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HeroFormData>();

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadHeroSections();
  }, [user, isAdmin]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImagePreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const openCreateDialog = () => {
    setEditingHero(null);
    reset({
      title: '',
      subtitle: '',
      description: '',
      cta_text: 'Shop Now',
      cta_link: '/products',
      is_active: true,
      order_index: heroSections.length + 1,
    });
    setImageFile(null);
    setImagePreview('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (hero: any) => {
    setEditingHero(hero);
    setValue('title', hero.title);
    setValue('subtitle', hero.subtitle || '');
    setValue('description', hero.description || '');
    setValue('cta_text', hero.cta_text);
    setValue('cta_link', hero.cta_link);
    setValue('is_active', hero.is_active);
    setValue('order_index', hero.order_index);
    setImageFile(null);
    setImagePreview(hero.background_image || '');
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: HeroFormData) => {
    try {
      let backgroundImage = editingHero?.background_image || '';

      // Upload new image if selected
      if (imageFile) {
        const uploadResult = await uploadImage(imageFile, {
          folder: 'ecommerce/hero',
        });
        
        if (uploadResult) {
          backgroundImage = uploadResult.url;
        }
      }

      const heroData = {
        ...data,
        background_image: backgroundImage || null,
      };

      if (editingHero) {
        await updateHeroSection(editingHero.id, heroData);
        toast({
          title: 'Success',
          description: 'Hero section updated successfully.',
        });
      } else {
        await createHeroSection(heroData);
        toast({
          title: 'Success',
          description: 'Hero section created successfully.',
        });
      }

      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving hero section:', error);
      toast({
        title: 'Error',
        description: 'Failed to save hero section. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (heroId: string) => {
    try {
      await deleteHeroSection(heroId);
      toast({
        title: 'Success',
        description: 'Hero section deleted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete hero section.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStatus = async (heroId: string, currentStatus: boolean) => {
    try {
      await toggleHeroStatus(heroId, !currentStatus);
      toast({
        title: 'Success',
        description: `Hero section ${!currentStatus ? 'activated' : 'deactivated'} successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update hero section status.',
        variant: 'destructive',
      });
    }
  };

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Hero Section Management</h1>
          <p className="text-muted-foreground">Manage dynamic hero sections for your homepage</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="w-4 h-4 mr-2" />
          Add Hero Section
        </Button>
      </div>

      {/* Hero Sections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Hero Sections ({heroSections.length})</CardTitle>
          <CardDescription>
            Manage your homepage hero sections and their display order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : heroSections.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hero sections found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>CTA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heroSections.map((hero) => (
                    <TableRow key={hero.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{hero.order_index}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium truncate">{hero.title}</div>
                          {hero.subtitle && (
                            <div className="text-sm text-muted-foreground truncate">
                              {hero.subtitle}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="font-medium">{hero.cta_text}</div>
                          <div className="text-muted-foreground">{hero.cta_link}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={hero.is_active}
                            onCheckedChange={() => handleToggleStatus(hero.id, hero.is_active)}
                          />
                          <span className="text-sm">
                            {hero.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(hero.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditDialog(hero)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Hero Section</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this hero section? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(hero.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingHero ? 'Edit Hero Section' : 'Create Hero Section'}
            </DialogTitle>
            <DialogDescription>
              {editingHero ? 'Update hero section information' : 'Add a new hero section to your homepage'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...register('title', { required: 'Title is required' })}
                  placeholder="Enter hero title"
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  {...register('subtitle')}
                  placeholder="Enter hero subtitle"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Enter hero description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cta_text">CTA Button Text *</Label>
                <Input
                  id="cta_text"
                  {...register('cta_text', { required: 'CTA text is required' })}
                  placeholder="Shop Now"
                />
                {errors.cta_text && (
                  <p className="text-sm text-destructive">{errors.cta_text.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cta_link">CTA Button Link *</Label>
                <Input
                  id="cta_link"
                  {...register('cta_link', { required: 'CTA link is required' })}
                  placeholder="/products"
                />
                {errors.cta_link && (
                  <p className="text-sm text-destructive">{errors.cta_link.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="background_image">Background Image</Label>
              <div className="flex items-center gap-4">
                <input
                  id="background_image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('background_image')?.click()}
                >
                  Choose Image
                </Button>
                {imagePreview && (
                  <div className="w-20 h-12 bg-muted rounded overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order_index">Display Order</Label>
                <Input
                  id="order_index"
                  type="number"
                  {...register('order_index', { 
                    required: 'Order is required',
                    min: { value: 1, message: 'Order must be at least 1' }
                  })}
                  placeholder="1"
                />
                {errors.order_index && (
                  <p className="text-sm text-destructive">{errors.order_index.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="is_active"
                  checked={watch('is_active')}
                  onCheckedChange={(checked) => setValue('is_active', checked)}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUploading}
              >
                {isUploading ? 'Uploading...' : (editingHero ? 'Update' : 'Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}