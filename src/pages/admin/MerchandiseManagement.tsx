import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Plus, Edit2, Trash2, TrendingUp, AlertCircle, Upload, X, Palette, Image as ImageIcon } from 'lucide-react';

interface Variant {
  size: string;
  color: string;
  color_hex: string;
  quantity: number;
  sku: string;
}

interface Merchandise {
  id: string;
  name: string;
  description: string | null;
  category: string;
  base_price: number;
  cost_price: number;
  stock_quantity: number;
  sku: string;
  image_url: string | null;
  gallery_urls: string[] | null;
  is_available: boolean;
  has_variants: boolean;
  variants: Variant[] | null;
  created_at: string;
}

export default function MerchandiseManagement() {
  const [products, setProducts] = useState<Merchandise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Merchandise | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    base_price: '',
    cost_price: '',
    stock_quantity: 0,
    sku: '',
    image_url: '',
    gallery_urls: [] as string[],
    is_available: true,
    has_variants: false,
  });
  const [variants, setVariants] = useState<Variant[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Error loading products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: Merchandise) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        category: product.category,
        base_price: product.base_price.toString(),
        cost_price: product.cost_price.toString(),
        stock_quantity: product.stock_quantity,
        sku: product.sku,
        image_url: product.image_url || '',
        gallery_urls: product.gallery_urls || [],
        is_available: product.is_available,
        has_variants: product.has_variants || false,
      });
      setVariants(product.variants || []);
      setImageFile(null);
      setImagePreview(product.image_url || null);
      setGalleryFiles([]);
      setGalleryPreviews(product.gallery_urls || []);
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: '',
        base_price: '',
        cost_price: '',
        stock_quantity: 0,
        sku: '',
        image_url: '',
        gallery_urls: [],
        is_available: true,
        has_variants: false,
      });
      setVariants([]);
      setImageFile(null);
      setImagePreview(null);
      setGalleryFiles([]);
      setGalleryPreviews([]);
    }
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData({ ...formData, image_url: '' });
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setGalleryFiles([...galleryFiles, ...files]);

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeGalleryImage = (index: number) => {
    const isExistingUrl = index < (formData.gallery_urls?.length || 0);

    if (isExistingUrl) {
      const updatedUrls = [...(formData.gallery_urls || [])];
      updatedUrls.splice(index, 1);
      setFormData({ ...formData, gallery_urls: updatedUrls });
    } else {
      const fileIndex = index - (formData.gallery_urls?.length || 0);
      setGalleryFiles(galleryFiles.filter((_, i) => i !== fileIndex));
    }

    setGalleryPreviews(galleryPreviews.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let imageUrl = formData.image_url || null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `merchandise/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      const galleryUrls = [...(formData.gallery_urls || [])];

      for (const file of galleryFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
        const filePath = `merchandise/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        galleryUrls.push(publicUrl);
      }

      const totalStock = formData.has_variants
        ? variants.reduce((sum, v) => sum + v.quantity, 0)
        : formData.stock_quantity;

      const productData = {
        name: formData.name,
        slug: formData.name.toLowerCase().replace(/\s+/g, '-'),
        description: formData.description || null,
        category: formData.category,
        base_price: parseFloat(formData.base_price),
        cost_price: parseFloat(formData.cost_price),
        stock_quantity: totalStock,
        sku: formData.sku,
        image_url: imageUrl,
        gallery_urls: galleryUrls.length > 0 ? galleryUrls : null,
        is_available: formData.is_available,
        has_variants: formData.has_variants,
        variants: formData.has_variants ? variants : null,
        updated_at: new Date().toISOString(),
      };

      if (editingProduct) {
        const { error } = await (supabase
          .from('merchandise') as any)
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        alert('Product updated successfully!');
      } else {
        const { error } = await (supabase
          .from('merchandise') as any)
          .insert([productData]);

        if (error) throw error;
        alert('Product created successfully!');
      }

      setShowModal(false);
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      alert(error.message || 'Error saving product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('merchandise')
        .delete()
        .eq('id', id);

      if (error) throw error;
      alert('Product deleted successfully!');
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product');
    }
  };

  const calculateMargin = (price: number, cost: number) => {
    if (price === 0) return 0;
    return (((price - cost) / price) * 100).toFixed(1);
  };

  const addVariant = () => {
    setVariants([...variants, {
      size: 'M',
      color: 'Black',
      color_hex: '#000000',
      quantity: 0,
      sku: `${formData.sku}-M-BLACK`,
    }]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | number) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Merchandise Management</h3>
          <p className="text-slate-300 mt-1">Manage your store inventory</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {products.length === 0 ? (
        <div className="bg-black/50 rounded-xl border border-red-900/30 p-12 text-center hover:border-primary-500/50 transition-colors">
          <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No products yet</h3>
          <p className="text-slate-400 mb-6">Add your first product to start selling merchandise</p>
          <button
            onClick={() => handleOpenModal()}
            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Create First Product
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-slate-900 rounded-xl border border-red-900/30 overflow-hidden hover:border-primary-500/50 hover:shadow-lg hover:shadow-primary-500/20 transition-all"
            >
              <div className="h-48 bg-black/50 relative">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-600" />
                  </div>
                )}
                <div className="absolute top-3 right-3 flex gap-2">
                  <button
                    onClick={() => handleOpenModal(product)}
                    className="p-2 bg-black/70 rounded-lg hover:bg-primary-500/20 border border-red-900/30 transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="p-2 bg-black/70 rounded-lg hover:bg-primary-500 border border-red-900/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-primary-500 hover:text-white" />
                  </button>
                </div>
                {!product.is_available && (
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded">Unavailable</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-3 flex gap-2">
                  {product.has_variants && (
                    <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded flex items-center gap-1">
                      <Palette className="w-3 h-3" />
                      Variants
                    </span>
                  )}
                  {product.gallery_urls && product.gallery_urls.length > 0 && (
                    <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      {product.gallery_urls.length}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{product.name}</h3>
                    <p className="text-sm text-slate-400">{product.category}</p>
                  </div>
                </div>

                {product.description && (
                  <p className="text-sm text-slate-400 mb-4 line-clamp-2">{product.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">SKU:</span>
                    <span className="font-mono text-white">{product.sku}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Price:</span>
                    <span className="font-semibold text-white">AED {product.base_price}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Stock:</span>
                    <span className={`font-semibold ${product.stock_quantity < 10 ? 'text-primary-500' : 'text-primary-400'}`}>
                      {product.stock_quantity}
                      {product.stock_quantity < 10 && (
                        <AlertCircle className="w-3 h-3 inline ml-1" />
                      )}
                    </span>
                  </div>
                  {product.has_variants ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Variants:</span>
                      <span className="font-semibold text-white">{product.variants?.length || 0}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Margin:</span>
                      <span className="font-semibold text-primary-500 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {calculateMargin(product.base_price, product.cost_price)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl border border-red-900/30 shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-red-900/30">
              <h3 className="text-xl font-bold text-white">
                {editingProduct ? 'Edit Product' : 'New Product'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Main Product Image
                  </label>
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border border-red-900/30"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute -top-2 -right-2 p-1 bg-primary-500 text-white rounded-full hover:bg-primary-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-red-900/30 rounded-lg flex items-center justify-center bg-black/30">
                        <Upload className="w-8 h-8 text-slate-500" />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="flex-1 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Gallery Images (Multiple)
                  </label>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 border-2 border-dashed border-red-900/30 rounded-lg flex items-center justify-center bg-black/30">
                        <ImageIcon className="w-8 h-8 text-slate-500" />
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleGalleryChange}
                          className="w-full text-white"
                        />
                        <p className="text-xs text-slate-500 mt-1">Select multiple images for the product gallery</p>
                      </div>
                    </div>

                    {galleryPreviews.length > 0 && (
                      <div className="grid grid-cols-4 gap-3">
                        {galleryPreviews.map((preview, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={preview}
                              alt={`Gallery ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-red-900/30"
                            />
                            <button
                              type="button"
                              onClick={() => removeGalleryImage(index)}
                              className="absolute -top-2 -right-2 p-1 bg-primary-500 text-white rounded-full hover:bg-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3 h-3" />
                            </button>
                            <div className="absolute bottom-1 left-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Price (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Cost (AED)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.cost_price}
                      onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                      className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      required
                    />
                  </div>
                </div>

                <div className="border-t border-red-900/30 pt-6">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="has-variants"
                      checked={formData.has_variants}
                      onChange={(e) => setFormData({ ...formData, has_variants: e.target.checked })}
                      className="w-4 h-4 text-primary-500 border-red-900/30 rounded focus:ring-primary-500 bg-black/50"
                    />
                    <label htmlFor="has-variants" className="text-sm font-medium text-white">
                      This product has variants (sizes and colors)
                    </label>
                  </div>

                  {formData.has_variants ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-slate-400">Add size and color variants with quantities</p>
                        <button
                          type="button"
                          onClick={addVariant}
                          className="flex items-center gap-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add Variant
                        </button>
                      </div>

                      {variants.map((variant, index) => (
                        <div key={index} className="bg-black/30 p-4 rounded-lg border border-red-900/30">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="text-sm font-semibold text-white">Variant {index + 1}</h5>
                            <button
                              type="button"
                              onClick={() => removeVariant(index)}
                              className="p-1 text-primary-500 hover:bg-primary-500/20 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-5 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-white mb-1">
                                Size
                              </label>
                              <select
                                value={variant.size}
                                onChange={(e) => updateVariant(index, 'size', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-red-900/30 text-white rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              >
                                <option value="XS">XS</option>
                                <option value="S">S</option>
                                <option value="M">M</option>
                                <option value="L">L</option>
                                <option value="XL">XL</option>
                                <option value="XXL">XXL</option>
                                <option value="One Size">One Size</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white mb-1">
                                Color
                              </label>
                              <input
                                type="text"
                                value={variant.color}
                                onChange={(e) => updateVariant(index, 'color', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-red-900/30 text-white rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="Black"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white mb-1">
                                Hex Code
                              </label>
                              <input
                                type="color"
                                value={variant.color_hex}
                                onChange={(e) => updateVariant(index, 'color_hex', e.target.value)}
                                className="w-full h-[30px] bg-slate-900 border border-red-900/30 rounded cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={variant.quantity}
                                onChange={(e) => updateVariant(index, 'quantity', parseInt(e.target.value))}
                                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-red-900/30 text-white rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-white mb-1">
                                SKU
                              </label>
                              <input
                                type="text"
                                value={variant.sku}
                                onChange={(e) => updateVariant(index, 'sku', e.target.value)}
                                className="w-full px-2 py-1.5 text-sm bg-slate-900 border border-red-900/30 text-white rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                placeholder="SHIRT-M-BLK"
                              />
                            </div>
                          </div>
                        </div>
                      ))}

                      {variants.length > 0 && (
                        <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
                          <p className="text-sm text-white">
                            <strong>Total Stock:</strong> {variants.reduce((sum, v) => sum + v.quantity, 0)} units across {variants.length} variant(s)
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.stock_quantity}
                        onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        required
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Status
                  </label>
                  <select
                    value={formData.is_available ? 'available' : 'unavailable'}
                    onChange={(e) => setFormData({ ...formData, is_available: e.target.value === 'available' })}
                    className="w-full px-3 py-2 bg-black/50 border border-red-900/30 text-white rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-red-900/30 text-white rounded-lg hover:bg-black/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  {editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
