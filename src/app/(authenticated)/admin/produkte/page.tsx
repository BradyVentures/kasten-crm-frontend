'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { ProductCategory, ProductAttribute, ProductAttributeOption } from '@/types';

export default function ProduktePage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [pricingRules, setPricingRules] = useState<Array<{ id: string; rule_type: string; price: number; attribute_slug: string | null; option_value: string | null }>>([]);
  const [savedItems, setSavedItems] = useState<Array<{ id: string; name: string; description: string | null; default_price: number; category: string }>>([]);
  const [loading, setLoading] = useState(true);

  // Add new states
  const [addingOption, setAddingOption] = useState<string | null>(null);
  const [newOption, setNewOption] = useState({ value: '', label: '', price_modifier: 0 });
  const [addingRule, setAddingRule] = useState(false);
  const [newRule, setNewRule] = useState({ rule_type: 'base_sqm', price: 0 });
  const [addingSavedItem, setAddingSavedItem] = useState(false);
  const [newSavedItem, setNewSavedItem] = useState({ name: '', description: '', default_price: 0 });

  // New category
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', slug: '', description: '', show_in_visualizer: true });

  // New attribute
  const [addingAttribute, setAddingAttribute] = useState(false);
  const [newAttribute, setNewAttribute] = useState({ label: '', slug: '', attribute_type: 'select' as string, is_required: false });

  // Edit category
  const [editingCategory, setEditingCategory] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const res = await api.get('/products/categories');
    setCategories(res.data);
    setLoading(false);
  };

  const selectCategory = async (slug: string) => {
    const cat = categories.find(c => c.slug === slug);
    if (!cat) return;
    const [catRes, rulesRes, itemsRes] = await Promise.all([
      api.get(`/products/categories/${slug}`),
      api.get(`/products/pricing-rules/${cat.id}`),
      api.get(`/saved-items?category=${slug}`),
    ]);
    setSelectedCategory(catRes.data);
    setPricingRules(rulesRes.data);
    setSavedItems(itemsRes.data);
  };

  const reload = () => { if (selectedCategory) selectCategory(selectedCategory.slug); };

  // ===== CATEGORY CRUD =====
  const createCategory = async () => {
    if (!newCategory.name || !newCategory.slug) return;
    await api.post('/products/categories', newCategory);
    setAddingCategory(false);
    setNewCategory({ name: '', slug: '', description: '', show_in_visualizer: true });
    await loadCategories();
  };

  const updateCategory = async (data: Partial<ProductCategory>) => {
    if (!selectedCategory) return;
    await api.put(`/products/categories/${selectedCategory.id}`, data);
    await loadCategories();
    if (selectedCategory.slug) await selectCategory(data.slug || selectedCategory.slug);
  };

  const deleteCategory = async () => {
    if (!selectedCategory) return;
    if (!confirm(`Kategorie "${selectedCategory.name}" wirklich löschen? Alle Attribute, Optionen und Preisregeln werden ebenfalls gelöscht.`)) return;
    try {
      await api.delete(`/products/categories/${selectedCategory.id}`);
    } catch {
      // If no delete endpoint, use a workaround
      alert('Kategorie konnte nicht gelöscht werden.');
      return;
    }
    setSelectedCategory(null);
    await loadCategories();
  };

  // ===== ATTRIBUTE CRUD =====
  const createAttribute = async () => {
    if (!selectedCategory || !newAttribute.label || !newAttribute.slug) return;
    await api.post('/products/attributes', {
      category_id: selectedCategory.id,
      ...newAttribute,
    });
    setAddingAttribute(false);
    setNewAttribute({ label: '', slug: '', attribute_type: 'select', is_required: false });
    reload();
  };

  const deleteAttribute = async (attrId: string) => {
    if (!confirm('Attribut und alle Optionen löschen?')) return;
    await api.delete(`/products/attributes/${attrId}`);
    reload();
  };

  // Pricing rules
  const updateRule = async (ruleId: string, price: number) => {
    await api.put(`/products/pricing-rules/${ruleId}`, { price });
  };
  const deleteRule = async (ruleId: string) => {
    if (!confirm('Preisregel löschen?')) return;
    await api.delete(`/products/pricing-rules/${ruleId}`);
    reload();
  };
  const addRule = async () => {
    if (!selectedCategory) return;
    await api.post('/products/pricing-rules', { category_id: selectedCategory.id, ...newRule });
    setAddingRule(false);
    setNewRule({ rule_type: 'base_sqm', price: 0 });
    reload();
  };

  // Attribute options
  const updateOption = async (optId: string, data: Partial<ProductAttributeOption>) => {
    await api.put(`/products/attribute-options/${optId}`, data);
  };
  const deleteOption = async (optId: string) => {
    if (!confirm('Option löschen?')) return;
    await api.delete(`/products/attribute-options/${optId}`);
    reload();
  };
  const addOption = async (attrId: string) => {
    await api.post('/products/attribute-options', { attribute_id: attrId, ...newOption });
    setAddingOption(null);
    setNewOption({ value: '', label: '', price_modifier: 0 });
    reload();
  };

  // Saved items
  const updateSavedItem = async (itemId: string, data: Record<string, unknown>) => {
    await api.put(`/saved-items/${itemId}`, data);
  };
  const deleteSavedItem = async (itemId: string) => {
    if (!confirm('Textbaustein löschen?')) return;
    await api.delete(`/saved-items/${itemId}`);
    reload();
  };
  const addSavedItemFn = async () => {
    await api.post('/saved-items', { ...newSavedItem, category: selectedCategory?.slug || 'allgemein' });
    setAddingSavedItem(false);
    setNewSavedItem({ name: '', description: '', default_price: 0 });
    reload();
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (loading) return <div className="p-8 text-bd-text-muted">Laden...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Produktverwaltung</h1>
        <button onClick={() => setAddingCategory(true)}
          className="text-sm bg-bd-accent text-white px-4 py-2 rounded-full hover:bg-[#d64f3e] transition">
          + Neue Kategorie
        </button>
      </div>

      {/* New category form */}
      {addingCategory && (
        <div className="bg-white border-2 border-bd-accent rounded-bd p-5 mb-6">
          <h2 className="font-heading font-bold mb-4">Neue Produktkategorie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs text-bd-text-muted mb-1">Name *</label>
              <input type="text" value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value, slug: generateSlug(e.target.value) })}
                placeholder="z.B. Markisen" className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-bd-text-muted mb-1">Slug (intern) *</label>
              <input type="text" value={newCategory.slug}
                onChange={(e) => setNewCategory({ ...newCategory, slug: e.target.value })}
                placeholder="z.B. markisen" className="w-full" />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs text-bd-text-muted mb-1">Beschreibung</label>
            <input type="text" value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
              placeholder="Kurze Beschreibung der Kategorie" className="w-full" />
          </div>
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input type="checkbox" checked={newCategory.show_in_visualizer}
              onChange={(e) => setNewCategory({ ...newCategory, show_in_visualizer: e.target.checked })}
              className="accent-[#e8533e]" />
            <span className="text-sm">In Produktvorschau anzeigen</span>
          </label>
          <div className="flex gap-2">
            <button onClick={createCategory} disabled={!newCategory.name || !newCategory.slug}
              className="text-sm bg-bd-accent text-white px-4 py-2 rounded-full disabled:opacity-50 hover:bg-[#d64f3e] transition">
              Kategorie erstellen
            </button>
            <button onClick={() => setAddingCategory(false)} className="text-sm text-bd-text-muted px-4 py-2">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Category cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {categories.map((cat) => (
          <button key={cat.slug} onClick={() => selectCategory(cat.slug)}
            className={`bg-white border rounded-bd p-4 text-left transition-all ${selectedCategory?.slug === cat.slug ? 'border-bd-accent shadow-md' : 'border-bd-border hover:border-bd-accent/50'}`}>
            <h3 className="font-heading font-bold">{cat.name}</h3>
            <p className="text-xs text-bd-text-muted mt-1">{cat.description}</p>
          </button>
        ))}
      </div>

      {selectedCategory && (
        <div className="space-y-6">

          {/* ===== KATEGORIE BEARBEITEN ===== */}
          <div className="bg-white border border-bd-border rounded-bd p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold">Kategorie: {selectedCategory.name}</h2>
              <div className="flex gap-2">
                <button onClick={() => setEditingCategory(!editingCategory)}
                  className="text-xs text-bd-accent hover:underline">
                  {editingCategory ? 'Schließen' : 'Bearbeiten'}
                </button>
                <button onClick={deleteCategory}
                  className="text-xs text-red-400 hover:text-red-600">
                  Löschen
                </button>
              </div>
            </div>
            {editingCategory && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-bd-text-muted mb-1">Name</label>
                  <input type="text" defaultValue={selectedCategory.name}
                    onBlur={(e) => updateCategory({ name: e.target.value })} className="w-full" />
                </div>
                <div>
                  <label className="block text-xs text-bd-text-muted mb-1">Beschreibung</label>
                  <input type="text" defaultValue={selectedCategory.description || ''}
                    onBlur={(e) => updateCategory({ description: e.target.value })} className="w-full" />
                </div>
              </div>
            )}
          </div>

          {/* ===== PREISREGELN ===== */}
          <div className="bg-white border border-bd-border rounded-bd p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold">Preisregeln – {selectedCategory.name}</h2>
              <button onClick={() => setAddingRule(true)} className="text-sm text-bd-accent hover:underline">+ Neue Regel</button>
            </div>
            <div className="space-y-2">
              {pricingRules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 p-3 bg-bd-bg-secondary rounded-lg">
                  <div className="flex-1 text-sm font-medium">
                    {rule.rule_type === 'base_sqm' && 'Basispreis pro m²'}
                    {rule.rule_type === 'base_unit' && 'Basispreis pro Stück'}
                    {rule.rule_type === 'min_price' && 'Mindestpreis'}
                    {rule.rule_type === 'festpreis' && 'Festpreis'}
                    {rule.rule_type === 'pauschal' && 'Pauschal'}
                    {rule.rule_type === 'size_surcharge' && 'Größenzuschlag'}
                    {rule.rule_type === 'attribute_surcharge' && `Zuschlag: ${rule.attribute_slug}`}
                  </div>
                  <input type="number" defaultValue={parseFloat(String(rule.price))} step="0.01"
                    onBlur={(e) => updateRule(rule.id, Number(e.target.value))}
                    className="!w-28 !text-right !py-1" />
                  <span className="text-xs text-bd-text-muted">EUR</span>
                  <button onClick={() => deleteRule(rule.id)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                </div>
              ))}
            </div>
            {addingRule && (
              <div className="mt-3 p-3 border border-bd-border rounded-lg flex items-center gap-3">
                <select value={newRule.rule_type} onChange={(e) => setNewRule({...newRule, rule_type: e.target.value})} className="!w-auto !py-1 !text-sm">
                  <option value="base_sqm">Preis pro m²</option>
                  <option value="base_unit">Preis pro Stück</option>
                  <option value="min_price">Mindestpreis</option>
                  <option value="festpreis">Festpreis</option>
                  <option value="pauschal">Pauschal</option>
                </select>
                <input type="number" value={newRule.price} onChange={(e) => setNewRule({...newRule, price: Number(e.target.value)})}
                  placeholder="Preis" step="0.01" className="!w-28 !py-1 !text-sm" />
                <button onClick={addRule} className="text-xs bg-bd-accent text-white px-3 py-1 rounded-full">Hinzufügen</button>
                <button onClick={() => setAddingRule(false)} className="text-xs text-bd-text-muted">Abbrechen</button>
              </div>
            )}
          </div>

          {/* ===== ATTRIBUTE + OPTIONEN ===== */}
          <div className="bg-white border border-bd-border rounded-bd p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold">Attribute & Optionen</h2>
              <button onClick={() => setAddingAttribute(true)} className="text-sm text-bd-accent hover:underline">+ Neues Attribut</button>
            </div>

            {/* Add attribute form */}
            {addingAttribute && (
              <div className="mb-4 p-4 border-2 border-bd-accent rounded-lg">
                <h3 className="text-sm font-bold mb-3">Neues Attribut</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Bezeichnung *</label>
                    <input type="text" value={newAttribute.label}
                      onChange={(e) => setNewAttribute({ ...newAttribute, label: e.target.value, slug: generateSlug(e.target.value) })}
                      placeholder="z.B. Farbe" className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Slug (intern) *</label>
                    <input type="text" value={newAttribute.slug}
                      onChange={(e) => setNewAttribute({ ...newAttribute, slug: e.target.value })}
                      placeholder="z.B. farbe" className="w-full" />
                  </div>
                  <div>
                    <label className="block text-xs text-bd-text-muted mb-1">Typ</label>
                    <select value={newAttribute.attribute_type}
                      onChange={(e) => setNewAttribute({ ...newAttribute, attribute_type: e.target.value })} className="w-full">
                      <option value="select">Auswahl (Dropdown)</option>
                      <option value="boolean">Ja/Nein (Checkbox)</option>
                      <option value="number">Zahl</option>
                      <option value="text">Text</option>
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input type="checkbox" checked={newAttribute.is_required}
                    onChange={(e) => setNewAttribute({ ...newAttribute, is_required: e.target.checked })}
                    className="accent-[#e8533e]" />
                  <span className="text-sm">Pflichtfeld</span>
                </label>
                <div className="flex gap-2">
                  <button onClick={createAttribute} disabled={!newAttribute.label || !newAttribute.slug}
                    className="text-xs bg-bd-accent text-white px-3 py-1.5 rounded-full disabled:opacity-50">Erstellen</button>
                  <button onClick={() => setAddingAttribute(false)} className="text-xs text-bd-text-muted">Abbrechen</button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {selectedCategory.attributes?.map((attr) => (
                <div key={attr.id} className="p-4 bg-bd-bg-secondary rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{attr.label}</span>
                      <span className="text-xs bg-white px-2 py-0.5 rounded text-bd-text-muted">{attr.attribute_type}</span>
                      {attr.unit && <span className="text-xs text-bd-text-muted">({attr.unit})</span>}
                      {attr.is_required && <span className="text-xs text-bd-accent">Pflicht</span>}
                    </div>
                    <button onClick={() => deleteAttribute(attr.id)} className="text-xs text-red-400 hover:text-red-600">Attribut löschen</button>
                  </div>

                  {attr.options && attr.options.length > 0 && (
                    <div className="ml-2 space-y-1.5">
                      {attr.options.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-2 bg-white p-2 rounded-lg">
                          <input type="text" defaultValue={opt.label}
                            onBlur={(e) => updateOption(opt.id, { label: e.target.value })}
                            className="!border-0 !bg-transparent !p-0 !text-sm flex-1 focus:!bg-bd-bg-secondary focus:!px-2 focus:!rounded" />
                          <div className="flex items-center gap-1">
                            <input type="number" defaultValue={parseFloat(String(opt.price_modifier))} step="0.01"
                              onBlur={(e) => updateOption(opt.id, { price_modifier: Number(e.target.value) })}
                              className="!w-24 !text-right !py-0.5 !text-sm" />
                            <span className="text-xs text-bd-text-muted">EUR</span>
                          </div>
                          {opt.is_default && <span className="text-[10px] bg-bd-accent/10 text-bd-accent px-1.5 py-0.5 rounded">Standard</span>}
                          <button onClick={() => deleteOption(opt.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add option */}
                  {attr.attribute_type === 'select' && (
                    <>
                      {addingOption === attr.id ? (
                        <div className="ml-2 mt-2 flex items-center gap-2 p-2 border border-bd-border rounded-lg">
                          <input type="text" value={newOption.value} onChange={(e) => setNewOption({...newOption, value: e.target.value})}
                            placeholder="Wert (intern)" className="!py-0.5 !text-xs !w-24" />
                          <input type="text" value={newOption.label} onChange={(e) => setNewOption({...newOption, label: e.target.value})}
                            placeholder="Bezeichnung" className="!py-0.5 !text-xs flex-1" />
                          <input type="number" value={newOption.price_modifier} onChange={(e) => setNewOption({...newOption, price_modifier: Number(e.target.value)})}
                            placeholder="Aufpreis" step="0.01" className="!py-0.5 !text-xs !w-20 !text-right" />
                          <button onClick={() => addOption(attr.id)} disabled={!newOption.value || !newOption.label}
                            className="text-[10px] bg-bd-accent text-white px-2 py-1 rounded-full disabled:opacity-50">OK</button>
                          <button onClick={() => setAddingOption(null)} className="text-[10px] text-bd-text-muted">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setAddingOption(attr.id)} className="ml-2 mt-2 text-xs text-bd-accent hover:underline">
                          + Option hinzufügen
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
              {(!selectedCategory.attributes || selectedCategory.attributes.length === 0) && !addingAttribute && (
                <p className="text-sm text-bd-text-muted">Keine Attribute vorhanden. Klicke oben auf &quot;+ Neues Attribut&quot;.</p>
              )}
            </div>
          </div>

          {/* ===== TEXTBAUSTEINE ===== */}
          <div className="bg-white border border-bd-border rounded-bd p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading font-bold">Textbausteine / Vorlagen</h2>
              <button onClick={() => setAddingSavedItem(true)} className="text-sm text-bd-accent hover:underline">+ Neuer Baustein</button>
            </div>
            <div className="space-y-2">
              {savedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-bd-bg-secondary rounded-lg">
                  <input type="text" defaultValue={item.name}
                    onBlur={(e) => updateSavedItem(item.id, { name: e.target.value })}
                    className="!border-0 !bg-transparent !p-0 !text-sm font-medium flex-1 focus:!bg-white focus:!px-2 focus:!rounded" />
                  <input type="number" defaultValue={parseFloat(String(item.default_price))} step="0.01"
                    onBlur={(e) => updateSavedItem(item.id, { default_price: Number(e.target.value) })}
                    className="!w-24 !text-right !py-0.5 !text-sm" />
                  <span className="text-xs text-bd-text-muted">EUR</span>
                  <span className="text-[10px] bg-white px-1.5 py-0.5 rounded text-bd-text-muted">{item.category}</span>
                  <button onClick={() => deleteSavedItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                </div>
              ))}
              {savedItems.length === 0 && !addingSavedItem && (
                <p className="text-sm text-bd-text-muted">Keine Textbausteine für diese Kategorie.</p>
              )}
            </div>
            {addingSavedItem && (
              <div className="mt-3 p-3 border border-bd-border rounded-lg space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <input type="text" value={newSavedItem.name} onChange={(e) => setNewSavedItem({...newSavedItem, name: e.target.value})}
                    placeholder="Name (z.B. Montageaufpreis)" className="!py-1 !text-sm col-span-2" />
                  <input type="number" value={newSavedItem.default_price} onChange={(e) => setNewSavedItem({...newSavedItem, default_price: Number(e.target.value)})}
                    placeholder="Preis" step="0.01" className="!py-1 !text-sm !text-right" />
                </div>
                <input type="text" value={newSavedItem.description} onChange={(e) => setNewSavedItem({...newSavedItem, description: e.target.value})}
                  placeholder="Beschreibung (optional)" className="!py-1 !text-sm w-full" />
                <div className="flex gap-2">
                  <button onClick={addSavedItemFn} disabled={!newSavedItem.name}
                    className="text-xs bg-bd-accent text-white px-3 py-1 rounded-full disabled:opacity-50">Hinzufügen</button>
                  <button onClick={() => setAddingSavedItem(false)} className="text-xs text-bd-text-muted">Abbrechen</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
