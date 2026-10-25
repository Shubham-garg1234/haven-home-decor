import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Filter, ImageUp, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/products/ProductCard';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Product, Category } from '@/types';

const priceRanges = [
  { label: 'Under ₹500', min: 0, max: 500 },
  { label: '₹500 - ₹1,000', min: 500, max: 1000 },
  { label: '₹1,000 - ₹2,500', min: 1000, max: 2500 },
  { label: '₹2,500 - ₹5,000', min: 2500, max: 5000 },
  { label: 'Above ₹5,000', min: 5000, max: 999999 },
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageSearch, setImageSearch] = useState<{
    description: string;
    products: Product[];
  } | null>(
    () =>
      (location.state?.imageSearch as
        | { description: string; products: Product[] }
        | undefined) || null,
  );
  const imageSearchRequestRef = useRef(0);
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  const [imageSearchError, setImageSearchError] = useState('');
  
  const search = searchParams.get('search') || '';
  const categorySlug = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = Number(searchParams.get('minPrice')) || 0;
  const maxPrice = Number(searchParams.get('maxPrice')) || 999999;
  const filtersKey = JSON.stringify([search, categorySlug, sort, minPrice, maxPrice]);
  const previousFiltersKeyRef = useRef(filtersKey);
  const incomingImageSearch = location.state?.imageSearch as
    | { description: string; products: Product[] }
    | undefined;

  useEffect(() => {
    if (!incomingImageSearch) return;

    setImageSearch(incomingImageSearch);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [incomingImageSearch, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (previousFiltersKeyRef.current === filtersKey) return;
    previousFiltersKeyRef.current = filtersKey;
    imageSearchRequestRef.current += 1;
    setImageSearch(null);
    setImageSearchError('');
    setIsSearchingImage(false);
  }, [filtersKey]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.getCategories();
      return response.categories as Category[];
    },
  });

  // Find category ID from slug
  const categoryId = categorySlug 
    ? categories?.find(c => c.slug === categorySlug)?.id 
    : undefined;

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search, categoryId, sort, minPrice, maxPrice],
    queryFn: async () => {
      const response = await api.getProducts({
        category: categoryId,
        search,
        minPrice,
        maxPrice,
        limit: 100,
      });
      // Client-side sorting since backend doesn't handle it yet
      let sorted = [...response.products];
      switch (sort) {
        case 'price-low':
          sorted.sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          sorted.sort((a, b) => b.price - a.price);
          break;
        case 'name':
          sorted.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'newest':
        default:
          // Already sorted by newest from backend
          break;
      }
      return sorted as Product[];
    },
    enabled: !imageSearch && (!categorySlug || !!categories),
  });

  const handleImageSearch = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const requestId = ++imageSearchRequestRef.current;
    setImageSearch(null);
    setIsSearchingImage(false);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageSearchError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageSearchError('Image must be 5 MB or smaller.');
      return;
    }

    setImageSearchError('');
    setIsSearchingImage(true);
    try {
      const result = await api.searchProductsByImage(file);
      if (imageSearchRequestRef.current === requestId) {
        setImageSearch({
          description: result.description,
          products: result.products,
        });
      }
    } catch (error) {
      if (imageSearchRequestRef.current === requestId) {
        setImageSearchError(
          error instanceof Error ? error.message : 'Image search failed. Please try again.',
        );
      }
    } finally {
      if (imageSearchRequestRef.current === requestId) setIsSearchingImage(false);
    }
  };

  const updateFilter = (key: string, value: string) => {
    setImageSearch(null);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setImageSearch(null);
    setSearchParams({});
  };

  const hasActiveFilters = search || categorySlug || minPrice > 0 || maxPrice < 999999;
  const displayedProducts = imageSearch?.products || products || [];

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <span className="font-medium text-foreground">Categories</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          <div
            className={`cursor-pointer py-1 text-sm ${!categorySlug ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
            onClick={() => updateFilter('category', '')}
          >
            All Categories
          </div>
          {categories?.map((category) => (
            <div
              key={category.id}
              className={`cursor-pointer py-1 text-sm ${categorySlug === category.slug ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}`}
              onClick={() => updateFilter('category', category.slug)}
            >
              {category.name}
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Price Range */}
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <span className="font-medium text-foreground">Price Range</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2 space-y-2">
          {priceRanges.map((range) => (
            <div key={range.label} className="flex items-center gap-2">
              <Checkbox
                id={range.label}
                checked={minPrice === range.min && maxPrice === range.max}
                onCheckedChange={(checked) => {
                  if (checked) {
                    const params = new URLSearchParams(searchParams);
                    params.set('minPrice', String(range.min));
                    params.set('maxPrice', String(range.max));
                    setSearchParams(params);
                  } else {
                    const params = new URLSearchParams(searchParams);
                    params.delete('minPrice');
                    params.delete('maxPrice');
                    setSearchParams(params);
                  }
                }}
              />
              <Label htmlFor={range.label} className="text-sm cursor-pointer">
                {range.label}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {hasActiveFilters && (
        <Button variant="outline" className="w-full" onClick={clearFilters}>
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">
              {imageSearch
                ? `Visual matches for "${imageSearch.description}"`
                : search
                  ? `Search: "${search}"`
                  : categorySlug
                    ? categories?.find(c => c.slug === categorySlug)?.name || 'Products'
                    : 'All Products'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {displayedProducts.length} products found
            </p>
          </div>

          <div className="flex items-center gap-4">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageSearch}
              aria-label="Choose an image to search"
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => imageInputRef.current?.click()}
              disabled={isSearchingImage}
            >
              {isSearchingImage ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <ImageUp className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isSearchingImage ? 'Searching...' : 'Search by image'}
              </span>
              <span className="sm:hidden">Image</span>
            </Button>
            {/* Mobile Filter Button */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <FilterContent />
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort */}
            <Select value={sort} onValueChange={(value) => updateFilter('sort', value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="name">Name: A to Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {imageSearchError && (
          <p role="alert" className="mb-6 text-sm text-destructive">
            {imageSearchError}
          </p>
        )}

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterContent />
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {isSearchingImage || (!imageSearch && isLoading) ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="aspect-square bg-muted animate-pulse" />
                ))}
              </div>
            ) : displayedProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground text-lg mb-4">
                  {imageSearch ? 'No similar products found. Try another image.' : 'No products found'}
                </p>
                {imageSearch ? (
                  <Button variant="outline" onClick={() => setImageSearch(null)}>
                    Browse All Products
                  </Button>
                ) : (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Products;
