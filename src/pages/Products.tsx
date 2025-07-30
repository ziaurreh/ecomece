import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Filter, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useProductsStore } from '@/store/products';
import { useCartStore } from '@/store/cart';
import { useAuthStore } from '@/store/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Products() {
  const { 
    products, 
    categories, 
    isLoading, 
    filters,
    sortBy,
    sortOrder,
    loadProducts, 
    loadCategories, 
    setFilters, 
    setSorting,
    getFilteredProducts 
  } = useProductsStore();
  
  const { addItem } = useCartStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [localSearchQuery, setLocalSearchQuery] = useState(filters.searchQuery || '');
  const [productReviews, setProductReviews] = useState<{[key: string]: {average: number, count: number}}>({});

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Load reviews for all products
  useEffect(() => {
    const loadProductReviews = async () => {
      if (products.length === 0) return;
      
      const productIds = products.map(p => p.id);
      
      const { data: reviews } = await supabase
        .from('reviews')
        .select('product_id, rating')
        .in('product_id', productIds);

      if (reviews) {
        const reviewsMap: {[key: string]: {average: number, count: number}} = {};
        
        reviews.forEach(review => {
          if (!reviewsMap[review.product_id]) {
            reviewsMap[review.product_id] = { average: 0, count: 0 };
          }
          reviewsMap[review.product_id].count++;
        });

        // Calculate averages
        Object.keys(reviewsMap).forEach(productId => {
          const productReviewsData = reviews.filter(r => r.product_id === productId);
          const average = productReviewsData.reduce((sum, review) => sum + review.rating, 0) / productReviewsData.length;
          reviewsMap[productId].average = Math.round(average * 10) / 10;
        });

        setProductReviews(reviewsMap);
      }
    };

    loadProductReviews();
  }, [products]);

  useEffect(() => {
    if (products.length > 0) {
      const maxPrice = Math.max(...products.map(p => p.price));
      setPriceRange([filters.minPrice || 0, filters.maxPrice || maxPrice]);
    }
  }, [products, filters]);

  const filteredProducts = getFilteredProducts();

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

  const handlePriceRangeChange = (newRange: number[]) => {
    setPriceRange(newRange);
    setFilters({
      minPrice: newRange[0],
      maxPrice: newRange[1],
    });
  };

  const handleSearch = () => {
    setFilters({ searchQuery: localSearchQuery });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <div className="w-full lg:w-64 space-y-6">
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Filter products by category, price, and more.
                  </SheetDescription>
                </SheetHeader>
                <FiltersContent 
                  categories={categories}
                  filters={filters}
                  priceRange={priceRange}
                  localSearchQuery={localSearchQuery}
                  setLocalSearchQuery={setLocalSearchQuery}
                  setFilters={setFilters}
                  handlePriceRangeChange={handlePriceRangeChange}
                  handleSearch={handleSearch}
                />
              </SheetContent>
            </Sheet>
          </div>

          <div className="hidden lg:block">
            <FiltersContent 
              categories={categories}
              filters={filters}
              priceRange={priceRange}
              localSearchQuery={localSearchQuery}
              setLocalSearchQuery={setLocalSearchQuery}
              setFilters={setFilters}
              handlePriceRangeChange={handlePriceRangeChange}
              handleSearch={handleSearch}
            />
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Products ({filteredProducts.length})</h1>
            
            <div className="flex items-center gap-4">
              <Label htmlFor="sort">Sort by:</Label>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSorting(field, order as 'asc' | 'desc');
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="price-asc">Price Low to High</SelectItem>
                  <SelectItem value="price-desc">Price High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="h-48 bg-muted rounded-t-lg" />
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded mb-4" />
                    <div className="h-6 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No products found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="group hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
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
                    
                    {product.compare_price && product.compare_price > product.price && (
                      <Badge className="absolute top-2 left-2" variant="destructive">
                        {Math.round((1 - product.price / product.compare_price) * 100)}% OFF
                      </Badge>
                    )}

                    <Button
                      variant="outline"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>

                  <CardContent className="p-4">
                    <Link to={`/products/${product.id}`}>
                      <h3 className="font-semibold hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                      </h3>
                    </Link>
                    
                    {product.categories && (
                      <Badge variant="secondary" className="mt-1">
                        {product.categories.name}
                      </Badge>
                    )}

                    {productReviews[product.id] && (
                      <div className="flex items-center mt-2">
                        <div className="flex items-center">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(productReviews[product.id].average) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({productReviews[product.id].average}) · {productReviews[product.id].count} review{productReviews[product.id].count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">${product.price}</span>
                        {product.compare_price && product.compare_price > product.price && (
                          <span className="text-sm text-muted-foreground line-through">
                            ${product.compare_price}
                          </span>
                        )}
                      </div>
                      
                      {product.inventory_count <= 5 && product.inventory_count > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {product.inventory_count} left
                        </Badge>
                      )}
                    </div>
                  </CardContent>

                  <CardFooter className="p-4 pt-0">
                    <Button
                      onClick={() => handleAddToCart(product.id)}
                      className="w-full"
                      disabled={product.inventory_count === 0}
                    >
                      {product.inventory_count === 0 ? (
                        'Out of Stock'
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FiltersContent = ({
  categories,
  filters,
  priceRange,
  localSearchQuery,
  setLocalSearchQuery,
  setFilters,
  handlePriceRangeChange,
  handleSearch,
}: any) => (
  <div className="space-y-6">
    {/* Search */}
    <div className="space-y-2">
      <Label>Search</Label>
      <div className="flex gap-2">
        <Input
          placeholder="Search products..."
          value={localSearchQuery}
          onChange={(e) => setLocalSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch} size="sm">
          Search
        </Button>
      </div>
    </div>

    {/* Categories */}
    <div className="space-y-2">
      <Label>Category</Label>
      <Select
        value={filters.category || 'all'}
        onValueChange={(value) => setFilters({ category: value === 'all' ? undefined : value })}
      >
        <SelectTrigger>
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((category: any) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Price Range */}
    <div className="space-y-4">
      <Label>Price Range</Label>
      <div className="px-2">
        <Slider
          value={priceRange}
          onValueChange={handlePriceRangeChange}
          min={0}
          max={1000}
          step={10}
          className="w-full"
        />
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>${priceRange[0]}</span>
        <span>${priceRange[1]}</span>
      </div>
    </div>
  </div>
);