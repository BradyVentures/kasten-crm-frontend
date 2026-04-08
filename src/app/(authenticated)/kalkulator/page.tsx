'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { ProductCategory, PriceCalculation } from '@/types';

const categoryIcons: Record<string, string> = {
  rolllaeden: '🪟',
  terrassendaecher: '🏠',
  fenster: '⬜',
};

export default function KalkulatorPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [config, setConfig] = useState<Record<string, string | number | boolean>>({});
  const [price, setPrice] = useState<PriceCalculation | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [cartItems, setCartItems] = useState<Array<{ category: string; config: Record<string, string | number | boolean>; price: PriceCalculation }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products/categories').then((res) => {
      setCategories(res.data);
      setLoading(false);
    });
  }, []);

  const selectCategory = async (slug: string) => {
    const res = await api.get(`/products/categories/${slug}`);
    setSelectedCategory(res.data);
    const defaults: Record<string, string | number | boolean> = {};
    for (const attr of res.data.attributes || []) {
      if (attr.attribute_type === 'select' && attr.options?.length) {
        const def = attr.options.find((o: { is_default: boolean }) => o.is_default) || attr.options[0];
        defaults[attr.slug] = def.value;
      }
      if (attr.attribute_type === 'number') defaults[attr.slug] = 0;
      if (attr.attribute_type === 'boolean') defaults[attr.slug] = false;
    }
    setConfig(defaults);
    setPrice(null);
    setStep(2);
  };

  const calculatePrice = useCallback(async () => {
    if (!selectedCategory) return;
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(config)) {
      params.set(k, String(v));
    }
    try {
      const res = await api.get(`/products/categories/${selectedCategory.slug}/calculate?${params}`);
      setPrice(res.data);
    } catch { /* ignore */ }
  }, [selectedCategory, config]);

  useEffect(() => {
    const timeout = setTimeout(calculatePrice, 300);
    return () => clearTimeout(timeout);
  }, [calculatePrice]);

  const updateConfig = (key: string, value: string | number | boolean) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const addToCart = () => {
    if (!price || !selectedCategory) return;
    setCartItems((prev) => [...prev, { category: selectedCategory.slug, config: { ...config }, price }]);
    setStep(1);
    setSelectedCategory(null);
    setConfig({});
    setPrice(null);
  };

  const removeFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const createOffer = async () => {
    if (cartItems.length === 0) return;
    try {
      const offerRes = await api.post('/offers', { customer_name: 'Neuer Kunde' });
      for (const item of cartItems) {
        await api.post(`/offers/${offerRes.data.id}/items`, {
          category_slug: item.category,
          product_name: item.price.productName,
          configuration: item.config,
          quantity: 1,
          unit_price: item.price.unitPrice,
        });
      }
      window.location.href = `/angebote/${offerRes.data.id}`;
    } catch { /* ignore */ }
  };

  const formatEur = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  if (loading) return <div className="p-8 text-bd-text-muted">Laden...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="font-heading text-2xl font-bold mb-6">Kalkulator</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-bd-accent text-white' : 'bg-bd-bg-secondary text-bd-text-muted'}`}>
              {s}
            </div>
            <span className="text-sm text-bd-text-muted hidden sm:inline">
              {s === 1 ? 'Kategorie' : s === 2 ? 'Konfiguration' : 'Zusammenfassung'}
            </span>
            {s < 3 && <div className="w-8 h-px bg-bd-border" />}
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main content */}
        <div className="flex-1">
          {/* Step 1: Category Selection */}
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => selectCategory(cat.slug)}
                  className="bg-white border border-bd-border rounded-bd p-6 text-left hover:border-bd-accent hover:shadow-md transition-all group"
                >
                  <div className="text-4xl mb-3">{categoryIcons[cat.slug] || '📦'}</div>
                  <h3 className="font-heading text-lg font-bold group-hover:text-bd-accent transition-colors">{cat.name}</h3>
                  <p className="text-sm text-bd-text-muted mt-1">{cat.description}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === 2 && selectedCategory && (
            <div className="bg-white border border-bd-border rounded-bd p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-xl font-bold">{selectedCategory.name} konfigurieren</h2>
                <button onClick={() => { setStep(1); setSelectedCategory(null); }} className="text-sm text-bd-text-muted hover:text-bd-accent">
                  Zurueck
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedCategory.attributes?.map((attr) => (
                  <div key={attr.id}>
                    <label className="block text-sm font-medium mb-1">
                      {attr.label} {attr.unit && <span className="text-bd-text-muted">({attr.unit})</span>}
                      {attr.is_required && <span className="text-bd-accent">*</span>}
                    </label>

                    {attr.attribute_type === 'number' && (
                      <input
                        type="number"
                        value={config[attr.slug] as number || ''}
                        onChange={(e) => updateConfig(attr.slug, Number(e.target.value))}
                        placeholder={`${attr.label} in ${attr.unit || ''}`}
                        min={0}
                      />
                    )}

                    {attr.attribute_type === 'select' && (
                      <select
                        value={config[attr.slug] as string || ''}
                        onChange={(e) => updateConfig(attr.slug, e.target.value)}
                      >
                        {attr.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} {opt.price_modifier > 0 ? `(+${formatEur(opt.price_modifier)})` : opt.price_modifier < 0 ? `(${formatEur(opt.price_modifier)})` : ''}
                          </option>
                        ))}
                      </select>
                    )}

                    {attr.attribute_type === 'boolean' && (
                      <label className="flex items-center gap-2 cursor-pointer mt-1">
                        <input
                          type="checkbox"
                          checked={config[attr.slug] as boolean || false}
                          onChange={(e) => updateConfig(attr.slug, e.target.checked)}
                          className="w-4 h-4 rounded border-bd-border text-bd-accent focus:ring-bd-accent"
                        />
                        <span className="text-sm">{attr.label}</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>

              {/* Price display */}
              {price && (
                <div className="mt-6 p-4 bg-bd-bg-secondary rounded-bd">
                  <h3 className="font-heading font-bold text-lg mb-3">Preisberechnung</h3>
                  <div className="space-y-1">
                    {price.breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-bd-text-body">{item.label}</span>
                        <span className={item.amount < 0 ? 'text-green-600' : ''}>{formatEur(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-3 pt-3 border-t border-bd-border">
                    <span>Einzelpreis</span>
                    <span className="text-bd-accent">{formatEur(price.unitPrice)}</span>
                  </div>

                  <button
                    onClick={() => { addToCart(); }}
                    className="w-full mt-4 bg-bd-accent text-white py-3 rounded-full font-heading font-bold hover:bg-[#d64f3e] transition-colors"
                  >
                    Zum Angebot hinzufuegen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart sidebar */}
        <div className="lg:w-80">
          <div className="bg-white border border-bd-border rounded-bd p-4 sticky top-4">
            <h3 className="font-heading font-bold mb-3">Warenkorb ({cartItems.length})</h3>

            {cartItems.length === 0 ? (
              <p className="text-sm text-bd-text-muted">Noch keine Produkte hinzugefuegt.</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cartItems.map((item, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 p-2 bg-bd-bg-secondary rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.price.productName}</p>
                        <p className="text-sm text-bd-accent font-bold">{formatEur(item.price.unitPrice)}</p>
                      </div>
                      <button onClick={() => removeFromCart(i)} className="text-bd-text-muted hover:text-red-500 text-lg leading-none">&times;</button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between font-bold text-lg mb-4 pt-3 border-t border-bd-border">
                  <span>Gesamt</span>
                  <span>{formatEur(cartItems.reduce((sum, item) => sum + item.price.unitPrice, 0))}</span>
                </div>

                <button
                  onClick={createOffer}
                  className="w-full bg-bd-accent text-white py-3 rounded-full font-heading font-bold hover:bg-[#d64f3e] transition-colors"
                >
                  Angebot erstellen
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
