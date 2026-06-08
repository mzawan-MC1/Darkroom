import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/currencyUtils';
import { ShoppingBag, Search, Plus, Minus, ShoppingCart, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import SEOHead from '../../components/SEOHead';

interface MerchandiseStoreProps {
  onNavigate: (page: string) => void;
}

interface Variant {
  size?: string;
  color?: string;
  color_hex?: string;
  quantity: number;
  sku: string;
  price?: number;
}

interface Merchandise {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  base_price: number;
  stock_quantity: number;
  image_url: string | null;
  gallery_urls: string[] | null;
  has_variants: boolean;
  variants: Variant[] | null;
  product_type: string | null;
  size_chart: any;
}

interface CartItem {
  id: string;
  merchandise_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  variant?: {
    size?: string;
    color?: string;
    sku: string;
  };
}

export default function MerchandiseStore({ onNavigate }: MerchandiseStoreProps) {
  const { user } = useAuth();
  const [merchandise, setMerchandise] = useState<Merchandise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Merchandise | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageZoom, setImageZoom] = useState(1);
  const [showZoomedImage, setShowZoomedImage] = useState(false);

  useEffect(() => {
    fetchMerchandise();
  }, []);

  const fetchMerchandise = async () => {
    try {
      const { data, error } = await supabase
        .from('merchandise')
        .select(`
          *,
          merchandise_images(image_url, display_order, alt_text)
        `)
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      setMerchandise(data || []);
    } catch (error) {
      console.error('Error fetching merchandise:', error);
    } finally {
      setLoading(false);
    }
  };

  const openVariantSelector = (item: Merchandise) => {
    setSelectedProduct(item);
    setSelectedVariant(null);
    setSelectedImageIndex(0);
    setImageZoom(1);
    setShowZoomedImage(false);
  };

  const addToCart = (item: Merchandise, variant?: Variant) => {
    if (item.has_variants && !variant) {
      openVariantSelector(item);
      return;
    }

    const cartId = variant ? `${item.id}-${variant.sku}` : item.id;
    const existingItem = cart.find(c => c.id === cartId);
    const maxStock = variant ? variant.quantity : item.stock_quantity;
    const itemPrice = variant?.price || item.base_price;

    if (existingItem) {
      if (existingItem.quantity < maxStock) {
        setCart(cart.map(c =>
          c.id === cartId ? { ...c, quantity: c.quantity + 1 } : c
        ));
      } else {
        alert('Not enough stock available');
      }
    } else {
      const newItem: CartItem = {
        id: cartId,
        merchandise_id: item.id,
        name: item.name,
        price: itemPrice,
        quantity: 1,
        image_url: item.image_url,
      };

      if (variant) {
        newItem.variant = {
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
        };
      }

      setCart([...cart, newItem]);
    }

    if (item.has_variants) {
      setSelectedProduct(null);
      setSelectedVariant(null);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateVAT = () => {
    return calculateSubtotal() * 0.05;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const handleCheckout = () => {
    if (!user) {
      alert('Please login to complete your purchase');
      onNavigate('login');
      return;
    }
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }
    alert('Checkout functionality will be implemented with payment integration');
  };

  const filteredMerchandise = merchandise.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-24 pb-12">
      <SEOHead
        pageIdentifier="merchandise"
        fallbackTitle="Merchandise Store - Escape Room"
        fallbackDescription="Browse our exclusive escape room merchandise. Take home a piece of the adventure."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Merchandise Store</h1>
            <p className="text-lg text-slate-400">Take home a piece of the adventure</p>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Cart
            {cart.length > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        <div className="bg-black/50 border border-red-900/30 rounded-xl p-4 mb-8 hover:border-primary-500/50 transition-colors">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search merchandise..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-red-900/30 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {filteredMerchandise.length === 0 ? (
          <div className="bg-black/50 border border-red-900/30 rounded-xl p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-xl text-slate-400">No merchandise available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMerchandise.map((item) => (
              <div key={item.id} className="bg-black/50 border border-red-900/30 rounded-xl overflow-hidden hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all">
                <div className="h-64 bg-slate-900 relative">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-20 h-20 text-slate-600" />
                    </div>
                  )}
                  {item.stock_quantity < 10 && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full">
                      Only {item.stock_quantity} left
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white mb-2">{item.name}</h3>
                  {item.category && (
                    <p className="text-xs text-primary-500 mb-2">{item.category}</p>
                  )}
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                    {item.description || 'No description available'}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-primary-500">
                      {formatPrice(item.base_price)}
                    </div>
                    <button
                      onClick={() => addToCart(item)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {item.has_variants ? 'Options' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProduct && selectedProduct.has_variants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-red-900/30 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-red-900/30 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Select Options</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-black/50 rounded-lg transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
                <div className="lg:col-span-3">
                  {(() => {
                    const allImages = [
                      ...(selectedProduct.image_url ? [selectedProduct.image_url] : []),
                      ...(selectedProduct.gallery_urls || [])
                    ];

                    return allImages.length > 0 ? (
                      <div className="space-y-3">
                        <div className="relative aspect-square bg-black/50 rounded-lg overflow-hidden group">
                          <img
                            src={allImages[selectedImageIndex]}
                            alt={selectedProduct.name}
                            className="w-full h-full object-cover cursor-zoom-in transition-transform"
                            style={{ transform: `scale(${imageZoom})` }}
                            onClick={() => setShowZoomedImage(true)}
                          />
                          <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageZoom(Math.max(1, imageZoom - 0.25));
                              }}
                              className="px-3 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg text-sm font-medium transition-colors"
                              disabled={imageZoom <= 1}
                            >
                              Zoom Out
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageZoom(Math.min(3, imageZoom + 0.25));
                              }}
                              className="px-3 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg text-sm font-medium transition-colors"
                              disabled={imageZoom >= 3}
                            >
                              Zoom In
                            </button>
                          </div>
                          {imageZoom > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setImageZoom(1);
                              }}
                              className="absolute top-4 right-4 px-3 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg text-sm font-medium transition-colors"
                            >
                              Reset Zoom
                            </button>
                          )}
                        </div>
                        {allImages.length > 1 && (
                          <div className="grid grid-cols-6 gap-2">
                            {allImages.map((img, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setSelectedImageIndex(index);
                                  setImageZoom(1);
                                }}
                                className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                  selectedImageIndex === index
                                    ? 'border-primary-500 ring-2 ring-primary-500/30'
                                    : 'border-red-900/30 hover:border-primary-500/50'
                                }`}
                              >
                                <img src={img} alt={`${selectedProduct.name} ${index + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-square bg-black/50 rounded-lg flex items-center justify-center">
                        <ShoppingBag className="w-24 h-24 text-slate-600" />
                      </div>
                    );
                  })()}
                </div>
                <div className="lg:col-span-2">
                  <h3 className="text-2xl font-bold text-white mb-3">{selectedProduct.name}</h3>
                  <p className="text-slate-400 mb-4 leading-relaxed">{selectedProduct.description}</p>
                  <p className="text-3xl font-bold text-primary-500 mb-4">{formatPrice(selectedProduct.base_price)}</p>
                  {selectedProduct.product_type && (
                    <div className="inline-block px-3 py-1 bg-black/50 border border-red-900/30 text-slate-400 rounded-full text-sm mb-4">
                      {selectedProduct.product_type}
                    </div>
                  )}
                </div>
              </div>

              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-white">Available Options:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedProduct.variants.map((variant, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedVariant(variant)}
                        disabled={variant.quantity === 0}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedVariant === variant
                            ? 'border-primary-500 bg-primary-500/10'
                            : variant.quantity === 0
                            ? 'border-red-900/30 bg-black/50 opacity-50 cursor-not-allowed'
                            : 'border-red-900/30 hover:border-primary-500/50 bg-black/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {variant.color_hex && (
                              <div
                                className="w-8 h-8 rounded-full border-2 border-red-900/30"
                                style={{ backgroundColor: variant.color_hex }}
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                {variant.size && (
                                  <span className="font-semibold text-white">Size: {variant.size}</span>
                                )}
                                {variant.color && (
                                  <span className="text-slate-400">{variant.color}</span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500">
                                SKU: {variant.sku}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {variant.price && variant.price !== selectedProduct.base_price && (
                              <div className="text-lg font-bold text-primary-500">{formatPrice(variant.price)}</div>
                            )}
                            <div className={`text-sm ${variant.quantity < 10 ? 'text-primary-500 font-semibold' : 'text-slate-500'}`}>
                              {variant.quantity === 0 ? 'Out of Stock' : `${variant.quantity} in stock`}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-red-900/30">
                <button
                  onClick={() => selectedVariant && addToCart(selectedProduct, selectedVariant)}
                  disabled={!selectedVariant}
                  className={`w-full py-4 rounded-xl font-semibold transition-colors ${
                    selectedVariant
                      ? 'bg-primary-500 hover:bg-primary-600 text-white'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {selectedVariant ? 'Add to Cart' : 'Please Select an Option'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showZoomedImage && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[60] p-4">
          <button
            onClick={() => setShowZoomedImage(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <div className="max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            {(() => {
              const allImages = [
                ...(selectedProduct.image_url ? [selectedProduct.image_url] : []),
                ...(selectedProduct.gallery_urls || [])
              ];
              return (
                <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
                  <img
                    src={allImages[selectedImageIndex]}
                    alt={selectedProduct.name}
                    className="max-w-full max-h-[calc(90vh-120px)] object-contain"
                  />
                  <div className="flex items-center gap-4">
                    {allImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                          className="px-4 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg font-medium transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-white font-medium">
                          {selectedImageIndex + 1} / {allImages.length}
                        </span>
                        <button
                          onClick={() => setSelectedImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                          className="px-4 py-2 bg-white/90 hover:bg-white rounded-lg shadow-lg font-medium transition-colors"
                        >
                          Next
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50">
          <div className="bg-slate-900 border border-red-900/30 w-full md:max-w-2xl md:rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-red-900/30 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Shopping Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="p-2 hover:bg-black/50 rounded-lg transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 bg-black/50 border border-red-900/30 rounded-xl hover:border-primary-500/50 transition-colors">
                        <div className="w-20 h-20 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="w-8 h-8 text-slate-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{item.name}</h3>
                          {item.variant && (
                            <div className="text-xs text-slate-500 mt-1">
                              {item.variant.size && <span>Size: {item.variant.size}</span>}
                              {item.variant.size && item.variant.color && <span> • </span>}
                              {item.variant.color && <span>Color: {item.variant.color}</span>}
                            </div>
                          )}
                          <p className="text-sm text-slate-400 mt-1">{formatPrice(item.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-white"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-semibold text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-primary-500 hover:bg-primary-500/10 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-red-900/30 pt-6">
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Subtotal:</span>
                        <span className="font-semibold">{formatPrice(calculateSubtotal())}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>VAT (5%):</span>
                        <span className="font-semibold">{formatPrice(calculateVAT())}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-red-900/30">
                        <span className="text-lg font-semibold text-white">Total:</span>
                        <span className="text-3xl font-bold text-primary-500">{formatPrice(calculateTotal())}</span>
                      </div>
                    </div>
                    <button
                      onClick={handleCheckout}
                      className="w-full py-4 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold transition-colors"
                    >
                      Proceed to Checkout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
