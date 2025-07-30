import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const checkoutSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 digits'),
  country: z.string().min(2, 'Country is required'),
  paymentMethod: z.enum(['cash_on_delivery', 'card', 'upi']),
  deliveryMethod: z.enum(['standard', 'express', 'overnight']),
  notes: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface OrderItem {
  product: any;
  quantity: number;
  product_id?: string;
  id?: string;
}

export const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { items, clearCart } = useCartStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const productId = searchParams.get('product_id');
  const buyNowQuantity = searchParams.get('quantity');
  const isBuyNow = !!productId;

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email || '',
      phone: '',
      fullName: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
      paymentMethod: 'cash_on_delivery',
      deliveryMethod: 'standard',
      notes: '',
    },
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth?redirect=/checkout');
      return;
    }

    if (isBuyNow && productId) {
      fetchProduct();
      setQuantity(parseInt(buyNowQuantity || '1'));
    } else if (items.length === 0) {
      navigate('/cart');
    }
  }, [user, productId, items]);

  const fetchProduct = async () => {
    if (!productId) return;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load product",
        variant: "destructive",
      });
      navigate('/');
      return;
    }

    setProduct(data);
  };

  const getOrderItems = (): OrderItem[] => {
    if (isBuyNow && product) {
      return [{ product, quantity }];
    }
    return items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      product_id: item.product_id,
      id: item.id
    }));
  };

  const getTotalAmount = () => {
    const orderItems = getOrderItems();
    return orderItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  };

  const getDeliveryFee = (method: string) => {
    switch (method) {
      case 'express': return 100;
      case 'overnight': return 200;
      default: return 50;
    }
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const orderItems = getOrderItems();
      const subtotal = getTotalAmount();
      const deliveryFee = getDeliveryFee(data.deliveryMethod);
      const totalAmount = subtotal + deliveryFee;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          status: 'pending',
          shipping_address: {
            fullName: data.fullName,
            address: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            country: data.country,
            phone: data.phone,
            email: data.email,
            paymentMethod: data.paymentMethod,
            deliveryMethod: data.deliveryMethod,
            notes: data.notes,
            deliveryFee,
            subtotal,
          },
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      // Update user profile with phone number
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          phone_number: data.phone,
          full_name: data.fullName,
          email: data.email,
        });

      // Clear cart if not buy now
      if (!isBuyNow) {
        clearCart();
      }

      toast({
        title: "Order Placed Successfully!",
        description: `Your order #${order.id.slice(0, 8)} has been placed.`,
      });

      navigate(`/orders`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const orderItems = getOrderItems();
  const subtotal = getTotalAmount();
  const deliveryFee = getDeliveryFee(form.watch('deliveryMethod'));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderItems.map((item, index) => (
                <div key={item.id || index} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span>₹{deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>₹{(subtotal + deliveryFee).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checkout Form */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping & Payment Details</CardTitle>
              <CardDescription>Please fill in your details to complete the order</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country *</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="India">India</SelectItem>
                                <SelectItem value="USA">USA</SelectItem>
                                <SelectItem value="UK">UK</SelectItem>
                                <SelectItem value="Canada">Canada</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="deliveryMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Delivery Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="standard" id="standard" />
                              <Label htmlFor="standard">Standard Delivery (5-7 days) - ₹50</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="express" id="express" />
                              <Label htmlFor="express">Express Delivery (2-3 days) - ₹100</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="overnight" id="overnight" />
                              <Label htmlFor="overnight">Overnight Delivery (1 day) - ₹200</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-col space-y-2"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cash_on_delivery" id="cod" />
                              <Label htmlFor="cod">Cash on Delivery</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="card" id="card" />
                              <Label htmlFor="card">Credit/Debit Card</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="upi" id="upi" />
                              <Label htmlFor="upi">UPI Payment</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Any special instructions..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Place Order - ₹{(subtotal + deliveryFee).toFixed(2)}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};