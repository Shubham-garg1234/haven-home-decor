import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Category } from '@/types';

const Categories = () => {
  const { data: categories, isLoading } = useQuery({
    queryKey: ['all-categories'],
    queryFn: async () => {
      const response = await api.getCategories();
      return response.categories as Category[];
    },
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="font-serif text-4xl font-bold text-foreground mb-4">
            Shop by Category
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore our wide range of home decor categories and find the perfect pieces to transform your living space.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-muted animate-pulse" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className="group relative aspect-[4/3] overflow-hidden bg-muted"
              >
                <img
                  src={category.image_url || '/placeholder.svg'}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="font-serif text-2xl font-bold text-primary-foreground mb-2">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="text-primary-foreground/80 text-sm line-clamp-2 mb-4">
                      {category.description}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-2 text-primary-foreground text-sm font-medium group-hover:gap-3 transition-all">
                    Shop Now <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No categories available yet. Check back soon!</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Categories;
