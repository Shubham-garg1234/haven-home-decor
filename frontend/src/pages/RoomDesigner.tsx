import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, ArrowRight, ImagePlus, LoaderCircle, Palette, ShoppingCart, Sparkles, WandSparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Layout from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import api, { RoomDesignResult } from '@/lib/api';
import { formatPrice } from '@/lib/utils';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const roomTypes = ['living room', 'bedroom', 'dining room', 'entryway', 'home office'];
const styles = [
  { value: 'let the AI choose', label: 'Let AI choose' },
  { value: 'modern', label: 'Modern' },
  { value: 'scandinavian', label: 'Scandinavian' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'warm contemporary', label: 'Warm contemporary' },
  { value: 'traditional', label: 'Traditional' },
];

const RoomDesigner = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [roomPhoto, setRoomPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [roomType, setRoomType] = useState('living room');
  const [style, setStyle] = useState('let the AI choose');
  const [design, setDesign] = useState<RoomDesignResult | null>(null);
  const [generatedImage, setGeneratedImage] = useState('');
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addToCart, addProductsToCart } = useCart();

  useEffect(() => {
    if (!roomPhoto) {
      setPhotoUrl('');
      return;
    }

    const url = URL.createObjectURL(roomPhoto);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [roomPhoto]);

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError('Choose a JPEG, PNG, or WebP room photo.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Your photo must be 5 MB or smaller.');
      return;
    }

    setError('');
    setDesign(null);
    setGeneratedImage('');
    setRoomPhoto(file);
  };

  const handleAnalyze = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomPhoto) {
      setError('Upload a room photo to get started.');
      return;
    }

    setError('');
    setDesign(null);
    setGeneratedImage('');
    setIsAnalyzing(true);
    try {
      const result = await api.getRoomRecommendations(roomPhoto, roomType, style);
      setDesign(result);
      if (result.recommendations.length === 0) {
        setError('We could not find a close match in the current catalog. Try another room photo or style.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Room analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!roomPhoto || !design?.recommendations.length) return;

    setError('');
    setIsGenerating(true);
    try {
      const result = await api.generateRoomPreview(
        roomPhoto,
        design.recommendations.map(({ product }) => product.id),
        design.roomType,
        design.style,
      );
      setGeneratedImage(`data:image/png;base64,${result.image}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not generate the room preview.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddAllToCart = async () => {
    if (!design?.recommendations.length) return;

    setIsAddingToCart(true);
    try {
      await addProductsToCart(design.recommendations.map(({ product }) => product.id));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not add these picks to your cart.');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <Layout>
      <section className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-5 gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              Your room, thoughtfully restyled
            </Badge>
            <h1 className="font-serif text-4xl font-bold leading-tight md:text-5xl">
              Find pieces that feel at home in your room.
            </h1>
            <p className="mt-4 max-w-2xl text-primary-foreground/80 md:text-lg">
              Share a room photo and our AI stylist will suggest in-stock DecorNest finds that complement its colors and character.
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:py-14">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-6 p-5 md:p-7">
              <div>
                <h2 className="font-serif text-2xl font-semibold">Start with a room photo</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use a clear, well-lit photo of the room you would like to refresh.
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="hidden"
                aria-label="Upload a room photo"
              />

              {photoUrl ? (
                <div className="relative overflow-hidden border border-border bg-muted">
                  <img
                    src={photoUrl}
                    alt="Your uploaded room"
                    className="max-h-[420px] w-full object-contain"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-3 right-3"
                    disabled={isAnalyzing || isGenerating}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Change photo
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-56 w-full flex-col items-center justify-center border border-dashed border-border bg-muted/40 px-6 text-center transition-colors hover:bg-muted"
                >
                  <ImagePlus className="mb-3 h-8 w-8 text-primary" />
                  <span className="font-medium">Choose a room photo</span>
                  <span className="mt-1 text-sm text-muted-foreground">JPEG, PNG, or WebP · up to 5 MB</span>
                </button>
              )}

              <form className="space-y-5" onSubmit={handleAnalyze}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="room-type">Room type</Label>
                    <Select
                      value={roomType}
                      disabled={isAnalyzing || isGenerating}
                      onValueChange={(value) => {
                        setRoomType(value);
                        setDesign(null);
                        setGeneratedImage('');
                        setError('');
                      }}
                    >
                      <SelectTrigger id="room-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option.replace(/\b\w/g, (letter) => letter.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room-style">Style direction</Label>
                    <Select
                      value={style}
                      disabled={isAnalyzing || isGenerating}
                      onValueChange={(value) => {
                        setStyle(value);
                        setDesign(null);
                        setGeneratedImage('');
                        setError('');
                      }}
                    >
                      <SelectTrigger id="room-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {styles.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={!roomPhoto || isAnalyzing || isGenerating}
                >
                  {isAnalyzing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isAnalyzing ? 'Finding your room’s best match...' : 'Get my recommendations'}
                </Button>
              </form>

              <p className="text-xs leading-relaxed text-muted-foreground">
                Your photo is sent to the configured AI provider for analysis and is not stored by this feature.
              </p>
            </CardContent>
          </Card>

          {error && (
            <p role="alert" className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </p>
          )}

          {design && (
            <Card>
              <CardContent className="space-y-4 p-5 md:p-7">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-primary">Your room at a glance</p>
                  <p className="mt-2 text-muted-foreground">{design.roomDescription}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {design.detectedStyle && <Badge variant="secondary">{design.detectedStyle}</Badge>}
                  {design.palette.length > 0 && (
                    <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Palette className="h-4 w-4" />
                      {design.palette.map((color) => (
                        <Badge key={color} variant="outline">{color}</Badge>
                      ))}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-8">
          {generatedImage && (
            <Card>
              <CardContent className="space-y-4 p-5 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-serif text-2xl font-semibold">A fresh take on your space</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      The concept uses your selected catalog pieces and product photos as references; generated details may still vary.
                    </p>
                  </div>
                  <a
                    href={generatedImage}
                    download="decornest-room-concept.png"
                    className="inline-flex h-9 items-center gap-2 border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
                  >
                    <ArrowDownToLine className="h-4 w-4" />
                    Download
                  </a>
                </div>
                <img
                  src={generatedImage}
                  alt="AI-generated concept for your room"
                  className="max-h-[540px] w-full bg-muted object-contain"
                />
              </CardContent>
            </Card>
          )}

          {design && design.recommendations.length > 0 ? (
            <section>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-medium uppercase tracking-wide text-primary">Picked for your space</p>
                  <h2 className="mt-1 font-serif text-3xl font-semibold">Your room edit</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={handleGeneratePreview}
                    disabled={isGenerating || isAnalyzing}
                  >
                    {isGenerating ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <WandSparkles className="h-4 w-4" />
                    )}
                    {isGenerating ? 'Creating concept...' : 'Generate room concept'}
                  </Button>
                  <Button
                    type="button"
                    className="gap-2"
                    onClick={() => void handleAddAllToCart()}
                    disabled={isAddingToCart}
                  >
                    {isAddingToCart ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    {isAddingToCart ? 'Adding picks...' : 'Add all to cart'}
                  </Button>
                </div>
              </div>
              <p className="mb-5 text-sm text-muted-foreground">
                Preview generation uses OpenAI image generation and may take a little while. The selected product photos and catalog details guide this approximate visualization; it is not an exact product rendering.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {design.recommendations.map(({ product, reason }) => (
                  <Card key={product.id} className="overflow-hidden">
                    <Link to={`/product/${product.slug}`} className="block">
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        <img
                          src={product.images?.[0] || '/placeholder.svg'}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                    </Link>
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {product.category?.name || 'Home decor'}
                        </p>
                        <Link to={`/product/${product.slug}`} className="mt-1 block font-medium hover:text-primary">
                          {product.name}
                        </Link>
                        <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{formatPrice(product.price)}</span>
                        <Button
                          size="sm"
                          className="gap-2"
                          disabled={product.stock_quantity < 1}
                          onClick={() => {
                            void addToCart(product.id);
                          }}
                        >
                          Add to cart
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : !design ? (
            <div className="flex min-h-64 flex-col items-center justify-center border border-dashed border-border px-6 text-center">
              <Sparkles className="mb-4 h-8 w-8 text-primary" />
              <h2 className="font-serif text-2xl font-semibold">Your recommendations will appear here</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Upload a room photo and choose a style to discover products selected from our in-stock collection.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Layout>
  );
};

export default RoomDesigner;
