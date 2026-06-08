import { useState, useEffect } from 'react';
import type { Database } from '../../lib/database.types';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/currencyUtils';
import { ShoppingCart, CreditCard, Package, Plus, Minus, Trash2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Variant {
  size?: string;
  color?: string;
  color_hex?: string;
  quantity: number;
  sku: string;
  price?: number;
}

interface CartItem {
  id: string; // UI key (may include variant sku)
  product_id: string; // strict UUID of merchandise
  type: 'merchandise' | 'booking';
  name: string;
  price: number;
  quantity: number;
  item_code?: string; // SKU/variant code (TEXT)
  variant?: {
    size?: string;
    color?: string;
    sku: string;
  };
}

interface Merchandise {
  id: string;
  name: string;
  base_price: number;
  stock_quantity: number;
  is_available: boolean;
  image_url: string | null;
  has_variants: boolean;
  variants: Variant[] | null;
  description?: string;
}

export default function POSSystem() {
  const { user } = useAuth();
  const sb = supabase as any;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [merchandise, setMerchandise] = useState<Merchandise[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'online'>('cash');
  // const [promoCode, setPromoCode] = useState('');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Merchandise | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

  useEffect(() => {
    fetchMerchandise();
  }, []);

  const fetchMerchandise = async () => {
    try {
      const { data, error } = await supabase
        .from('merchandise')
        .select('id, name, base_price, stock_quantity, is_available, image_url, has_variants, variants')
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

  const openVariantSelector = (product: Merchandise) => {
    setSelectedProduct(product);
    setSelectedVariant(null);
  };

  const addToCart = (product: Merchandise, variant?: Variant) => {
    if (product.has_variants && !variant) {
      openVariantSelector(product);
      return;
    }

    const cartId = variant ? `${product.id}-${variant.sku}` : product.id;
    const existing = cart.find(item => item.id === cartId && item.type === 'merchandise');
    const maxStock = variant ? variant.quantity : product.stock_quantity;
    const itemPrice = variant?.price || product.base_price;

    if (existing) {
      if (existing.quantity < maxStock) {
        setCart(cart.map(item =>
          item.id === cartId && item.type === 'merchandise'
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        alert('Not enough stock available');
      }
    } else {
      const newItem: CartItem = {
        id: cartId,
        product_id: product.id,
        type: 'merchandise',
        name: product.name,
        price: itemPrice,
        quantity: 1,
      };

      if (variant) {
        newItem.variant = {
          size: variant.size,
          color: variant.color,
          sku: variant.sku,
        };
        newItem.item_code = variant.sku;
      }

      setCart([...cart, newItem]);
    }

    if (product.has_variants) {
      setSelectedProduct(null);
      setSelectedVariant(null);
    }
  };

  const updateQuantity = (id: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + change;
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

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === 'percent') {
      const pct = Math.max(0, Math.min(100, discountValue));
      return Math.round((subtotal * (pct / 100)) * 100) / 100;
    }
    return Math.max(0, Math.min(subtotal, Math.round(discountValue * 100) / 100));
  };

  const calculateTax = () => {
    const taxableBase = Math.max(0, calculateSubtotal() - calculateDiscountAmount());
    return Math.round((taxableBase * 0.05) * 100) / 100;
  };

  const calculateTotal = () => {
    return Math.round((calculateSubtotal() - calculateDiscountAmount() + calculateTax()) * 100) / 100;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    if (!user) {
      alert('You must be logged in to process transactions');
      return;
    }

    try {
      const subtotal = calculateSubtotal();
      const discountAmount = calculateDiscountAmount();
      const tax = calculateTax();
      const total = calculateTotal();

      const transactionPayload: Database['public']['Tables']['pos_transactions']['Insert'] = {
        created_by: user.id,
        status: 'completed',
        subtotal,
        tax,
        discount: discountAmount,
        total,
        payment_method: paymentMethod,
        discount_type: discountType,
        discount_value: discountValue,
      };

      const { data: transaction, error: transactionError } = await sb
        .from('pos_transactions')
        .insert([transactionPayload])
        .select()
        .single();

      if (transactionError) throw transactionError;

      const items: Database['public']['Tables']['pos_transaction_items']['Insert'][] = cart.map(item => ({
        transaction_id: transaction.id,
        item_type: item.type,
        item_id: item.product_id,
        item_code: item.item_code ?? null,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await sb
        .from('pos_transaction_items')
        .insert(items);

      if (itemsError) throw itemsError;

      for (const item of cart.filter(i => i.type === 'merchandise')) {
        const product = merchandise.find(p => p.id === item.product_id);
        if (product) {
          await sb
            .from('merchandise')
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq('id', item.product_id);
        }
      }

      // 3) Generate Invoice automatically
      const invoiceNumber = `POS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;

      const { data: invoice, error: invoiceError } = await sb
        .from('invoices')
        .insert([{
          invoice_number: invoiceNumber,
          order_type: 'pos',
          user_id: user.id,
          subtotal,
          discount_amount: discountAmount,
          tax_amount: tax,
          total_amount: total,
          status: paymentMethod === 'online' ? 'pending' : 'paid',
          payment_method: paymentMethod,
          pos_session_id: null,
          customer_name: null,
          customer_email: null,
          customer_phone: null,
        } as Database['public']['Tables']['invoices']['Insert']])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      await sb
        .from('pos_transactions')
        .update({ invoice_id: invoice.id })
        .eq('id', transaction.id);

      const lineItems: Database['public']['Tables']['invoice_line_items']['Insert'][] = items.map((li) => ({
        invoice_id: invoice.id,
        product_name: li.item_name,
        quantity: li.quantity,
        unit_price: li.unit_price,
        discount_amount: 0,
        tax_amount: Math.round((li.unit_price * li.quantity * 0.05) * 100) / 100,
        line_total: Math.round(((li.unit_price * li.quantity) - 0 + (li.unit_price * li.quantity * 0.05)) * 100) / 100,
      }));

      const { error: lineItemsError } = await sb
        .from('invoice_line_items')
        .insert(lineItems);

      if (lineItemsError) throw lineItemsError;

      alert('Transaction completed successfully! Invoice generated.');
      setCart([]);
      setDiscountValue(0);
      setDiscountType('fixed');
      // setPromoCode('');
      fetchMerchandise();
    } catch (error: any) {
      console.error('Error processing transaction:', error);
      alert(error.message || 'Error processing transaction');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white">Point of Sale</h3>
        <p className="text-slate-300 mt-1">Process sales and transactions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h4 className="text-lg font-semibold text-slate-900 mb-4">Products</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {merchandise.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-orange-50 transition-all text-left relative overflow-hidden"
                >
                  {product.image_url && (
                    <div className="absolute inset-0 opacity-10">
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="relative">
                    <div className="flex items-start justify-between mb-2">
                      <Package className="w-8 h-8 text-slate-400" />
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">
                          Stock: {product.stock_quantity}
                        </span>
                        {product.has_variants && (
                          <span className="text-xs bg-blue-100 text-primary-600 px-2 py-1 rounded font-medium">
                            Has Variants
                          </span>
                        )}
                      </div>
                    </div>
                    <h5 className="font-semibold text-slate-900 mb-1 line-clamp-2">{product.name}</h5>
                    <p className="text-lg font-bold text-primary-500">{formatPrice(product.base_price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              <h4 className="text-lg font-semibold text-slate-900">Cart ({cart.length})</h4>
            </div>

            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{item.name}</p>
                      {item.variant && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.variant.size && <span>Size: {item.variant.size}</span>}
                          {item.variant.size && item.variant.color && <span> • </span>}
                          {item.variant.color && <span>Color: {item.variant.color}</span>}
                        </p>
                      )}
                      <p className="text-xs text-slate-600">AED {item.price} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

        <div className="border-t border-slate-200 pt-4 space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal:</span>
            <span className="font-semibold">{formatPrice(calculateSubtotal())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Discount:</span>
            <span className="font-semibold text-green-600">- {formatPrice(calculateDiscountAmount())}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Tax (5%):</span>
            <span className="font-semibold">{formatPrice(calculateTax())}</span>
          </div>
          <div className="flex justify-between text-lg font-bold pt-2 border-t">
            <span>Total:</span>
            <span className="text-primary-500">{formatPrice(calculateTotal())}</span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">Discount</label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'fixed' | 'percent')}
              className="px-3 py-2 text-sm rounded-lg border-2 border-slate-200"
            >
              <option value="fixed">Fixed (AED)</option>
              <option value="percent">Percentage (%)</option>
            </select>
            <input
              type="number"
              min={0}
              step={discountType === 'fixed' ? 0.01 : 1}
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="px-3 py-2 text-sm rounded-lg border-2 border-slate-200"
              placeholder={discountType === 'fixed' ? 'Amount' : 'Percent'}
            />
            <div className="px-3 py-2 text-sm rounded-lg border-2 border-slate-200 bg-slate-50 text-right">
              Less: {formatPrice(calculateDiscountAmount())}
            </div>
          </div>
        </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'card', 'online'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                      paymentMethod === method
                        ? 'border-blue-500 bg-orange-50 text-primary-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-slate-300 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Complete Sale
            </button>
          </div>
        </div>
      </div>

      {selectedProduct && selectedProduct.has_variants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Select Variant - {selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <p className="text-slate-600 mb-2">{selectedProduct.description}</p>
                <p className="text-2xl font-bold text-primary-500">Base Price: {formatPrice(selectedProduct.base_price)}</p>
              </div>

              {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900">Available Variants:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {selectedProduct.variants.map((variant, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedVariant(variant)}
                        disabled={variant.quantity === 0}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedVariant === variant
                            ? 'border-blue-500 bg-orange-50'
                            : variant.quantity === 0
                            ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                            : 'border-slate-200 hover:border-blue-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {variant.color_hex && (
                              <div
                                className="w-10 h-10 rounded-lg border-2 border-slate-200"
                                style={{ backgroundColor: variant.color_hex }}
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                {variant.size && (
                                  <span className="font-semibold text-slate-900">Size: {variant.size}</span>
                                )}
                                {variant.color && (
                                  <span className="text-slate-600">{variant.color}</span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                SKU: {variant.sku}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {variant.price && variant.price !== selectedProduct.base_price && (
                              <div className="text-lg font-bold text-primary-500">{formatPrice(variant.price)}</div>
                            )}
                            <div className={`text-sm font-medium ${variant.quantity < 10 ? 'text-primary-500' : 'text-slate-600'}`}>
                              {variant.quantity === 0 ? 'Out of Stock' : `${variant.quantity} in stock`}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-slate-200">
                <button
                  onClick={() => selectedVariant && addToCart(selectedProduct, selectedVariant)}
                  disabled={!selectedVariant}
                  className={`w-full py-4 rounded-xl font-semibold transition-colors ${
                    selectedVariant
                      ? 'bg-primary-500 hover:bg-primary-600 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {selectedVariant ? 'Add to Cart' : 'Please Select a Variant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
