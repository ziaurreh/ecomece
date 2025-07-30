import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingCart, Star, Share, Truck, Shield, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useProductsStore } from '@/store/products';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_price?: number;
  category_id?: string;
  images: string[];
  inventory_count: number;
  sku?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  categories?: {
    name: string;
  };
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
  product_id: string;
  order_id: string;
  profiles?: {
    full_name: string | null;
  };
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [canReview, setCanReview] = useState(false);
  const [userOrderId, setUserOrderId] = useState<string | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      loadProduct(id);
      loadReviews(id);
      if (user) {
        checkUserCanReview(id);
      }
    }
  }, [id, user]);

  const loadProduct = async (productId: string) => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        categories:category_id (
          name
        )
      `)
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (!error && data) {
      setProduct(data);
    } else {
      toast({
        title: 'Product not found',
        description: 'The product you are looking for does not exist.',
        variant: 'destructive',
      });
    }
    
    setIsLoading(false);
  };

  const loadReviews = async (productId: string) => {
    setReviewsLoading(true);
    
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        user_id,
        product_id,
        order_id
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch profile data separately for each review
      const reviewsWithProfiles = await Promise.all(
        data.map(async (review) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', review.user_id)
            .maybeSingle();
          
          return {
            ...review,
            profiles: profile || { full_name: null }
          };
        })
      );
      
      setReviews(reviewsWithProfiles);
    }
    
    setReviewsLoading(false);
  };

  const checkUserCanReview = async (productId: string) => {
    if (!user) return;

    // Check if user has ordered this product and it's shipped/delivered
    const { data: orderItems } = await supabase
      .from('order_items')
      .select(`
        order_id,
        orders!inner(
          id,
          user_id,
          status
        )
      `)
      .eq('product_id', productId)
      .eq('orders.user_id', user.id)
      .in('orders.status', ['shipped', 'delivered']);

    if (orderItems && orderItems.length > 0) {
      // Check if user hasn't already reviewed this product
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingReview) {
        setCanReview(true);
        setUserOrderId(orderItems[0].order_id);
      }
    }
  };

  const handleReviewSubmit = async () => {
    if (!user || !product || !userOrderId) return;

    setSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          product_id: product.id,
          order_id: userOrderId,
          rating,
          comment,
        });

      if (error) throw error;

      toast({
        title: "Review Submitted",
        description: "Thank you for your review!",
      });

      setReviewDialog(false);
      setRating(5);
      setComment('');
      setCanReview(false);
      loadReviews(product.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
        }`}
      />
    ));
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to add items to cart.',
        variant: 'destructive',
      });
      return;
    }

    if (!product) return;

    await addItem(product.id, quantity);
    toast({
      title: 'Added to cart',
      description: `${quantity} item(s) added to your cart.`,
    });
  };

  const handleAddToWishlist = async () => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to add items to wishlist.',
        variant: 'destructive',
      });
      return;
    }

    if (!product) return;

    const { error } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: user.id,
        product_id: product.id,
      });

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        toast({
          title: 'Already in wishlist',
          description: 'This item is already in your wishlist.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add item to wishlist.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Added to wishlist',
        description: 'Item added to your wishlist successfully.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-96 bg-muted rounded" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-muted rounded" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-1/2" />
              <div className="h-16 bg-muted rounded" />
              <div className="h-12 bg-muted rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The product you are looking for does not exist or is no longer available.
          </p>
          <Link to="/products">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </div>
    );
  }

  const discountPercentage = product.compare_price && product.compare_price > product.price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/products">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative">
            <div className="h-96 bg-muted rounded-lg overflow-hidden">
              {product.images?.[selectedImage] ? (
                <img
                  src={product.images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No Image
                </div>
              )}
            </div>
            
            {discountPercentage > 0 && (
              <Badge className="absolute top-4 left-4" variant="destructive">
                {discountPercentage}% OFF
              </Badge>
            )}
          </div>

          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`h-20 rounded border-2 overflow-hidden transition-colors ${
                    selectedImage === index ? 'border-primary' : 'border-border'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {product.categories && (
                <Badge variant="secondary">{product.categories.name}</Badge>
              )}
              {product.sku && (
                <Badge variant="outline">SKU: {product.sku}</Badge>
              )}
            </div>
            
            <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center">
                {renderStars(Math.round(averageRating))}
              </div>
              <span className="text-sm text-muted-foreground">
                {reviews.length > 0 
                  ? `(${averageRating.toFixed(1)}) ${reviews.length} review${reviews.length !== 1 ? 's' : ''}`
                  : 'No reviews yet'
                }
              </span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold">₹{product.price}</span>
              {product.compare_price && product.compare_price > product.price && (
                <span className="text-xl text-muted-foreground line-through">
                  ₹{product.compare_price}
                </span>
              )}
            </div>

            <p className="text-muted-foreground mb-6">
              {product.description || 'No description available.'}
            </p>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="font-medium">Quantity:</label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(product.inventory_count, quantity + 1))}
                  disabled={quantity >= product.inventory_count}
                >
                  +
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">Stock:</span>
              {product.inventory_count > 0 ? (
                <Badge variant="outline" className="text-green-600">
                  {product.inventory_count} in stock
                </Badge>
              ) : (
                <Badge variant="destructive">Out of stock</Badge>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handleAddToCart}
              className="flex-1"
              size="lg"
              variant="outline"
              disabled={product.inventory_count === 0}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Add to Cart
            </Button>
            <Button 
              onClick={() => navigate(`/checkout?product_id=${product.id}&quantity=${quantity}`)}
              className="flex-1"
              size="lg"
              disabled={product.inventory_count === 0}
            >
              Buy Now
            </Button>
          </div>
          
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              size="lg" 
              className="flex-1"
              onClick={handleAddToWishlist}
            >
              <Heart className="w-4 h-4 mr-2" />
              Add to Wishlist
            </Button>
            <Button variant="outline" size="lg">
              <Share className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Truck className="w-4 h-4 text-primary" />
              <span>Free shipping on orders over ₹500</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="w-4 h-4 text-primary" />
              <span>1 year warranty included</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <RotateCcw className="w-4 h-4 text-primary" />
              <span>30-day return policy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info Tabs */}
      <div className="mt-12">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="specifications">Specifications</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>
          
          <TabsContent value="description" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Product Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description || 'No detailed description available for this product.'}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="specifications" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Specifications</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">SKU:</span>
                    <span>{product.sku || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Category:</span>
                    <span>{product.categories?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Stock:</span>
                    <span>{product.inventory_count}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reviews" className="mt-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Customer Reviews</h3>
                  <div className="flex items-center gap-4">
                    {reviews.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          {renderStars(Math.round(averageRating))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {averageRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                    )}
                    {canReview && (
                      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <Star className="w-4 h-4 mr-1" />
                            Write Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Write a Review</DialogTitle>
                            <DialogDescription>
                              Share your experience with {product.name}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="rating">Rating</Label>
                              <div className="flex items-center gap-2 mt-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                                  >
                                    <Star className="w-full h-full fill-current" />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="comment">Review (Optional)</Label>
                              <Textarea
                                id="comment"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="Tell others about your experience with this product..."
                                className="mt-1"
                              />
                            </div>
                            <div className="flex gap-2 pt-4">
                              <Button
                                onClick={() => setReviewDialog(false)}
                                variant="outline"
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleReviewSubmit}
                                disabled={submittingReview}
                                className="flex-1"
                              >
                                {submittingReview ? 'Submitting...' : 'Submit Review'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>
                
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-muted rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : reviews.length === 0 ? (
                  <p className="text-muted-foreground">
                    No reviews yet. Be the first to review this product!
                  </p>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-border pb-6 last:border-b-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center">
                                {renderStars(review.rating)}
                              </div>
                              <span className="font-medium">
                                {review.profiles?.full_name || 'Anonymous User'}
                              </span>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        {review.comment && (
                          <p className="text-muted-foreground mt-2">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}