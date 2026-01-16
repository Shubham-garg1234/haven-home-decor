import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  const discount = product.compare_at_price 
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await addToCart(product.id);
  };

  return (
    <Card className="group overflow-hidden border-border hover:shadow-lg transition-all duration-300">
      <Link to={`/product/${product.slug}`}>
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.images[0] || '/placeholder.svg'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {discount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground">
                {discount}% OFF
              </Badge>
            )}
            {product.is_featured && (
              <Badge className="bg-secondary text-secondary-foreground">
                Featured
              </Badge>
            )}
            {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
              <Badge variant="outline" className="bg-card">
                Only {product.stock_quantity} left
              </Badge>
            )}
          </div>

          {/* Quick actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="secondary" className="h-9 w-9">
              <Heart className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary" className="h-9 w-9">
              <Eye className="h-4 w-4" />
            </Button>
          </div>

          {/* Add to cart overlay */}
          {product.stock_quantity > 0 && (
            <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
              <Button 
                onClick={handleAddToCart}
                className="w-full gap-2"
                variant="default"
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          )}

          {product.stock_quantity === 0 && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Badge variant="destructive" className="text-sm">
                Out of Stock
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {product.category?.name || 'Home Decor'}
          </div>
          <h3 className="font-medium text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-foreground">
              {formatPrice(product.price)}
            </span>
            {product.compare_at_price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
};

export default ProductCard;
