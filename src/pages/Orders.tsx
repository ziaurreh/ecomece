import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Star, Package, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';

interface Order {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address: any;
  order_items: {
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
      images: string[];
    };
  }[];
}

interface Review {
  id: string;
  product_id: string;
  rating: number;
  comment: string;
}

export const Orders = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; productId: string; orderId: string; productName: string }>({
    open: false,
    productId: '',
    orderId: '',
    productName: ''
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
      loadReviews();
    }
  }, [user]);

  const loadOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            quantity,
            price,
            product:products(id, name, images)
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', user?.id);

      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error('Failed to load reviews:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <Package className="w-4 h-4" />;
      case 'shipped':
        return <Truck className="w-4 h-4" />;
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'shipped':
        return 'default';
      case 'delivered':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const hasReviewed = (productId: string) => {
    return reviews.some(review => review.product_id === productId);
  };

  const handleReviewSubmit = async () => {
    if (!user) return;

    setSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          product_id: reviewDialog.productId,
          order_id: reviewDialog.orderId,
          rating,
          comment,
        });

      if (error) throw error;

      toast({
        title: "Review Submitted",
        description: "Thank you for your review!",
      });

      setReviewDialog({ open: false, productId: '', orderId: '', productName: '' });
      setRating(5);
      setComment('');
      loadReviews();
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading your orders...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
            <p className="text-muted-foreground mb-4">
              You haven't placed any orders yet. Start shopping to see your orders here.
            </p>
            <Button onClick={() => window.location.href = '/products'}>
              Continue Shopping
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      Order #{order.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      Placed on {format(new Date(order.created_at), 'PPP')}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusBadgeVariant(order.status)} className="mb-2">
                      <span className="flex items-center gap-1">
                        {getStatusIcon(order.status)}
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </Badge>
                    <p className="text-lg font-semibold">₹{order.total_amount.toFixed(2)}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Items Ordered:</h4>
                    <div className="space-y-2">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-3">
                            {item.product.images && item.product.images[0] && (
                              <img
                                src={item.product.images[0]}
                                alt={item.product.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Quantity: {item.quantity} × ₹{item.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">₹{(item.price * item.quantity).toFixed(2)}</p>
                            {order.status === 'delivered' && !hasReviewed(item.product.id) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReviewDialog({
                                  open: true,
                                  productId: item.product.id,
                                  orderId: order.id,
                                  productName: item.product.name
                                })}
                              >
                                <Star className="w-4 h-4 mr-1" />
                                Review
                              </Button>
                            )}
                            {hasReviewed(item.product.id) && (
                              <Badge variant="secondary">Reviewed</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.shipping_address && (
                    <div>
                      <h4 className="font-semibold mb-2">Shipping Address:</h4>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="font-medium">{order.shipping_address.fullName}</p>
                        <p>{order.shipping_address.address}</p>
                        <p>
                          {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.zipCode}
                        </p>
                        <p>{order.shipping_address.country}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Phone: {order.shipping_address.phone}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => setReviewDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with {reviewDialog.productName}
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
                onClick={() => setReviewDialog({ open: false, productId: '', orderId: '', productName: '' })}
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
    </div>
  );
};