import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeroSection } from '@/components/HeroSection';
import { useProductsStore } from '@/store/products';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { products, loadProducts } = useProductsStore();
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    loadProducts();
  }, []);

  const featuredProducts = products.slice(0, 4);

  const handleAddToCart = async (productId: string) => {
    if (!user) {
      toast({
        title: 'Please sign in',
        description: 'You need to be signed in to add items to cart.',
        variant: 'destructive',
      });
      return;
    }

    await addItem(productId);
    toast({
      title: 'Added to cart',
      description: 'Item has been added to your cart.',
    });
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <HeroSection />

      {/* Featured Products */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Featured Products</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Check out our handpicked selection of the best products just for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {featuredProducts.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-shadow overflow-hidden">
                <div className="relative">
                  <div className="h-48 bg-muted overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-semibold line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-lg font-bold">${product.price}</span>
                  </div>

                  <Button
                    onClick={() => handleAddToCart(product.id)}
                    className="w-full"
                    size="sm"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Add to Cart
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link to="/products">
              <Button size="lg" variant="outline">
                View All Products
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
