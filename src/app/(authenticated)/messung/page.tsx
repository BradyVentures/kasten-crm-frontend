'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Customer, ProductCategory, PriceCalculation } from '@/types';

const categoryIcons: Record<string, string> = {
  rolllaeden: '🪟',
  terrassendaecher: '🏠',
  fenster: '⬜',
};

const TERRASSENDACH_SLUGS = ['terrassendach', 'terrassendaecher'];

export default function MessungPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ company_name: '', contact_person: '', phone: '', email: '', postal_code: '', address: '', city: '' });

  // Foto
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Step 2: Product
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [config, setConfig] = useState<Record<string, string | number | boolean>>({});
  const [price, setPrice] = useState<PriceCalculation | null>(null);
  const [loadingCats, setLoadingCats] = useState(true);

  // Step 3: Creating
  const [creating, setCreating] = useState(false);

  // Load categories
  useEffect(() => {
    api.get('/products/categories').then((res) => {
      setCategories(res.data);
      setLoadingCats(false);
    });
  }, []);

  // Search customers
  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return; }
    const timeout = setTimeout(async () => {
      const res = await api.get(`/customers?search=${encodeURIComponent(customerSearch)}`);
      setCustomers(res.data.customers || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [customerSearch]);

  // Select category
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
  };

  // Calculate price
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

  // Create new customer
  const handleCreateCustomer = async () => {
    if (!newCustomer.company_name && !newCustomer.contact_person) return;
    try {
      const res = await api.post('/customers', {
        ...newCustomer,
        company_name: newCustomer.company_name || newCustomer.contact_person,
      });
      setSelectedCustomer(res.data);
      setShowNewCustomer(false);
      setCustomerSearch('');
    } catch { /* ignore */ }
  };

  // Photo handler
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setPhoto(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  // Upload photo to Website-Backend (reuse visualizer upload)
  const uploadPhoto = async (): Promise<string | null> => {
    if (!photo) return null;
    const formData = new FormData();
    formData.append('image', photo);
    try {
      const websiteBackend = process.env.NEXT_PUBLIC_WEBSITE_API_URL || 'http://localhost:4001';
      const res = await fetch(`${websiteBackend}/api/visualizer/upload`, { method: 'POST', body: formData });
      if (!res.ok) return null;
      const data = await res.json();
      return data.imageUrl;
    } catch { return null; }
  };

  // Create offer
  const createOffer = async () => {
    if (!selectedCustomer || !selectedCategory || !price) return;
    setCreating(true);
    try {
      const isTerrassendach = TERRASSENDACH_SLUGS.some(s => selectedCategory.slug.includes(s));
      const breite = config.breite as number || 0;
      const dimensionParts = [];
      if (breite) dimensionParts.push(`Breite: ${breite}mm`);
      if (config.hoehe) dimensionParts.push(`Höhe: ${config.hoehe}mm`);
      if (isTerrassendach && config.tiefe) dimensionParts.push(`Ausfall: ${config.tiefe}mm`);
      if (isTerrassendach && breite > 4000) dimensionParts.push('Mittelstütze erforderlich');

      // Foto hochladen
      const photoUrl = await uploadPhoto();

      const offerRes = await api.post('/offers', {
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.company_name || selectedCustomer.contact_person,
        customer_address: [selectedCustomer.address, selectedCustomer.postal_code, selectedCustomer.city].filter(Boolean).join(', '),
        customer_email: selectedCustomer.email,
        customer_phone: selectedCustomer.phone || selectedCustomer.mobile,
        notes: dimensionParts.length > 0 ? `Messung: ${dimensionParts.join(', ')}` : undefined,
        visualizer_image_url: photoUrl,
      });

      await api.post(`/offers/${offerRes.data.id}/items`, {
        category_slug: selectedCategory.slug,
        product_name: price.productName,
        configuration: config,
        quantity: 1,
        unit_price: price.unitPrice,
      });

      router.push(`/angebote/${offerRes.data.id}`);
    } catch {
      setCreating(false);
    }
  };

  const formatEur = (n: number) => n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });

  const isTerrassendach = selectedCategory ? TERRASSENDACH_SLUGS.some(s => selectedCategory.slug.includes(s)) : false;
  const breite = config.breite as number || 0;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <h1 className="font-heading text-2xl font-bold mb-6">Neue Messung</h1>

      {/* Steps */}
      <div className="flex items-center gap-2 mb-8">
        {[{ n: 1, l: 'Kunde' }, { n: 2, l: 'Produkt & Maße' }, { n: 3, l: 'Angebot' }].map(({ n, l }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= n ? 'bg-bd-accent text-white' : 'bg-bd-bg-secondary text-bd-text-muted'}`}>
              {n}
            </div>
            <span className="text-sm text-bd-text-muted hidden sm:inline">{l}</span>
            {n < 3 && <div className="w-8 h-px bg-bd-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Kunde */}
      {step === 1 && (
        <div className="bg-white border border-bd-border rounded-bd p-6">
          <h2 className="font-heading text-xl font-bold mb-4">Kunde auswählen</h2>

          {!selectedCustomer ? (
            <>
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Kunde suchen (Name, Firma, Kundennummer)..."
                className="w-full mb-3"
              />

              {customers.length > 0 && (
                <div className="border border-bd-border rounded-bd mb-4 max-h-60 overflow-y-auto">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomers([]); }}
                      className="w-full text-left px-4 py-3 hover:bg-bd-bg-secondary border-b border-bd-border last:border-0 transition-colors"
                    >
                      <p className="font-medium">{c.company_name || c.contact_person}</p>
                      <p className="text-sm text-bd-text-muted">
                        {[c.contact_person, c.phone, c.email].filter(Boolean).join(' · ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {!showNewCustomer ? (
                <button
                  onClick={() => setShowNewCustomer(true)}
                  className="text-sm text-bd-accent hover:underline"
                >
                  + Neuen Kunden anlegen
                </button>
              ) : (
                <div className="border border-bd-border rounded-bd p-4 space-y-3">
                  <h3 className="font-heading font-bold">Neuer Kunde</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input placeholder="Firma / Name *" value={newCustomer.company_name} onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })} />
                    <input placeholder="Ansprechpartner" value={newCustomer.contact_person} onChange={(e) => setNewCustomer({ ...newCustomer, contact_person: e.target.value })} />
                    <input placeholder="Telefon" value={newCustomer.phone} onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                    <input placeholder="E-Mail" value={newCustomer.email} onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })} />
                    <input placeholder="Straße" value={newCustomer.address} onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                    <div className="flex gap-2">
                      <input placeholder="PLZ" className="w-24" value={newCustomer.postal_code} onChange={(e) => setNewCustomer({ ...newCustomer, postal_code: e.target.value })} />
                      <input placeholder="Ort" className="flex-1" value={newCustomer.city} onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCreateCustomer} className="bg-bd-accent text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#d64f3e]">Anlegen</button>
                    <button onClick={() => setShowNewCustomer(false)} className="text-sm text-bd-text-muted hover:text-bd-text">Abbrechen</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start justify-between p-4 bg-bd-bg-secondary rounded-bd">
              <div>
                <p className="font-heading font-bold">{selectedCustomer.company_name || selectedCustomer.contact_person}</p>
                <p className="text-sm text-bd-text-muted">
                  {[selectedCustomer.contact_person, selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(' · ')}
                </p>
                {selectedCustomer.address && (
                  <p className="text-sm text-bd-text-muted">{[selectedCustomer.address, selectedCustomer.postal_code, selectedCustomer.city].filter(Boolean).join(', ')}</p>
                )}
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-bd-text-muted hover:text-bd-accent text-lg">&times;</button>
            </div>
          )}

          {selectedCustomer && (
            <button onClick={() => setStep(2)} className="mt-4 bg-bd-accent text-white px-6 py-3 rounded-full font-heading font-bold hover:bg-[#d64f3e] transition-colors">
              Weiter
            </button>
          )}
        </div>
      )}

      {/* Step 2: Produkt & Maße */}
      {step === 2 && (
        <div className="bg-white border border-bd-border rounded-bd p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl font-bold">
              {selectedCategory ? `${selectedCategory.name} konfigurieren` : 'Produkt wählen'}
            </h2>
            <button onClick={() => { if (selectedCategory) { setSelectedCategory(null); } else { setStep(1); } }} className="text-sm text-bd-text-muted hover:text-bd-accent">
              Zurück
            </button>
          </div>

          {/* Foto-Upload */}
          <div className="mb-6 p-4 bg-bd-bg-secondary rounded-bd">
            <label className="block text-sm font-medium mb-2">
              Foto der Messstelle {!photo && <span className="text-bd-accent">*</span>}
            </label>
            {!photoPreview ? (
              <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-bd-border rounded-bd cursor-pointer hover:border-bd-accent hover:bg-white transition-all">
                <span className="text-3xl mb-2">📷</span>
                <span className="text-sm text-bd-text-muted">Foto aufnehmen oder hochladen</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhoto}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Messfoto" className="w-full max-h-60 object-contain rounded-bd bg-white" />
                <button
                  onClick={removePhoto}
                  className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center text-bd-text-muted hover:text-red-500 text-lg"
                >
                  &times;
                </button>
              </div>
            )}
          </div>

          {!selectedCategory ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {loadingCats ? (
                <p className="text-bd-text-muted">Laden...</p>
              ) : (
                categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => selectCategory(cat.slug)}
                    className="bg-white border border-bd-border rounded-bd p-6 text-left hover:border-bd-accent hover:shadow-md transition-all group"
                  >
                    <div className="text-4xl mb-3">{categoryIcons[cat.slug] || '📦'}</div>
                    <h3 className="font-heading text-lg font-bold group-hover:text-bd-accent transition-colors">{cat.name}</h3>
                    <p className="text-sm text-bd-text-muted mt-1">{cat.description}</p>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
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

                {/* Terrassendach: Ausfall */}
                {isTerrassendach && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Ausfall <span className="text-bd-text-muted">(mm)</span>
                      <span className="text-bd-accent">*</span>
                    </label>
                    <input
                      type="number"
                      value={config.tiefe as number || ''}
                      onChange={(e) => updateConfig('tiefe', Number(e.target.value))}
                      placeholder="Hauswand bis Dachende"
                      min={0}
                    />
                  </div>
                )}
              </div>

              {/* Mittelstütze-Hinweis */}
              {isTerrassendach && breite > 4000 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-bd text-sm text-amber-800">
                  Bei einer Breite über 4.000 mm wird eine Mittelstütze benötigt.
                </div>
              )}

              {/* Preis */}
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
                    onClick={() => setStep(3)}
                    className="w-full mt-4 bg-bd-accent text-white py-3 rounded-full font-heading font-bold hover:bg-[#d64f3e] transition-colors"
                  >
                    Weiter zur Zusammenfassung
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 3: Zusammenfassung */}
      {step === 3 && selectedCustomer && selectedCategory && price && (
        <div className="bg-white border border-bd-border rounded-bd p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl font-bold">Zusammenfassung</h2>
            <button onClick={() => setStep(2)} className="text-sm text-bd-text-muted hover:text-bd-accent">Zurück</button>
          </div>

          <div className="space-y-4">
            {/* Foto */}
            {photoPreview && (
              <div className="rounded-bd overflow-hidden border border-bd-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Messfoto" className="w-full max-h-48 object-contain bg-bd-bg-secondary" />
              </div>
            )}

            {/* Kunde */}
            <div className="p-4 bg-bd-bg-secondary rounded-bd">
              <p className="text-xs text-bd-text-muted uppercase tracking-wider mb-1">Kunde</p>
              <p className="font-heading font-bold">{selectedCustomer.company_name || selectedCustomer.contact_person}</p>
              <p className="text-sm text-bd-text-muted">
                {[selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(' · ')}
              </p>
              {selectedCustomer.address && (
                <p className="text-sm text-bd-text-muted">{[selectedCustomer.address, selectedCustomer.postal_code, selectedCustomer.city].filter(Boolean).join(', ')}</p>
              )}
            </div>

            {/* Produkt */}
            <div className="p-4 bg-bd-bg-secondary rounded-bd">
              <p className="text-xs text-bd-text-muted uppercase tracking-wider mb-1">Produkt</p>
              <p className="font-heading font-bold">{price.productName}</p>
              <div className="mt-2 text-sm text-bd-text-body space-y-1">
                {Object.entries(config).map(([key, value]) => {
                  if (value === false || value === 0 || value === '') return null;
                  const attr = selectedCategory.attributes?.find(a => a.slug === key);
                  const label = attr?.label || key;
                  let display = String(value);
                  if (attr?.attribute_type === 'select') {
                    const opt = attr.options?.find(o => o.value === value);
                    if (opt) display = opt.label;
                  }
                  if (attr?.attribute_type === 'boolean') display = value ? 'Ja' : 'Nein';
                  if (attr?.unit) display += ` ${attr.unit}`;
                  if (key === 'tiefe') return <div key={key}><span className="text-bd-text-muted">Ausfall:</span> {value} mm</div>;
                  return <div key={key}><span className="text-bd-text-muted">{label}:</span> {display}</div>;
                })}
                {isTerrassendach && breite > 4000 && (
                  <div className="text-amber-600 font-medium">Mittelstütze erforderlich</div>
                )}
              </div>
            </div>

            {/* Preis */}
            <div className="p-4 bg-bd-bg-secondary rounded-bd">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-bd-text-muted uppercase tracking-wider mb-1">Kalkulierter Preis</p>
                  <p className="font-heading font-bold text-2xl text-bd-accent">{formatEur(price.unitPrice)}</p>
                </div>
                <p className="text-xs text-bd-text-muted">netto, zzgl. MwSt.</p>
              </div>
            </div>
          </div>

          <button
            onClick={createOffer}
            disabled={creating}
            className="w-full mt-6 bg-bd-accent text-white py-4 rounded-full font-heading font-bold text-lg hover:bg-[#d64f3e] transition-colors disabled:opacity-50"
          >
            {creating ? 'Wird erstellt...' : 'Angebot erstellen'}
          </button>
          <p className="text-center text-xs text-bd-text-muted mt-2">
            Das Angebot wird als Entwurf erstellt und kann vor dem Versand bearbeitet werden.
          </p>
        </div>
      )}
    </div>
  );
}
