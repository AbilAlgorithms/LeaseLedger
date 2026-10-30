import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getConfig, updateConfig } from '../../api/admin.api.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Spinner from '../../components/ui/Spinner.jsx';

export default function AdminConfigPage() {
  const [scale, setScale] = useState({ 5: '', 4: '', 3: '', 2: '', 1: '' });
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingScale, setSavingScale] = useState(false);
  const [savingCat, setSavingCat] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, cRes] = await Promise.all([
        getConfig('conditionScale'),
        getConfig('itemCategories'),
      ]);
      setScale(sRes.data.value || {});
      setCategories(cRes.data.value || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScale = async (e) => {
    e.preventDefault();
    setSavingScale(true);
    setMessage(null);
    setError(null);
    try {
      await updateConfig('conditionScale', {
        value: scale,
        description: 'Standard 5-point condition rating scale',
      });
      setMessage('Condition rating scale updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update condition scale');
    } finally {
      setSavingScale(false);
    }
  };

  const handleSaveCategories = async (updatedCategories) => {
    setSavingCat(true);
    setMessage(null);
    setError(null);
    try {
      await updateConfig('itemCategories', {
        value: updatedCategories,
        description: 'Global item inventory categories',
      });
      setCategories(updatedCategories);
      setMessage('Item categories updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update categories');
    } finally {
      setSavingCat(false);
    }
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    const trimmed = newCat.trim().toUpperCase().replace(/\s+/g, '_');
    if (!trimmed || categories.includes(trimmed)) return;
    const updated = [...categories, trimmed];
    setNewCat('');
    handleSaveCategories(updated);
  };

  const handleRemoveCategory = (cat) => {
    const updated = categories.filter((c) => c !== cat);
    handleSaveCategories(updated);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="flex items-center space-x-2 text-xs text-stone-500 uppercase tracking-wider mb-1">
            <Link to="/admin" className="hover:text-primary transition-colors">Admin</Link>
            <span>/</span>
            <span className="text-stone-900 font-semibold">System Configuration</span>
          </nav>
          <h1 className="font-serif text-3xl text-stone-900 tracking-tight">
            Global Taxonomies & Scale
          </h1>
          <p className="text-stone-600 text-sm mt-1">
            Maintain standardization across condition scores, nomenclature, and catalog categories.
          </p>
        </div>

        <Link to="/admin">
          <Button variant="outline">← Admin Overview</Button>
        </Link>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-md">
          ✓ {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-md">
          {error}
        </div>
      )}

      {/* 5-Point Condition Rating Scale */}
      <div className="bg-white rounded-lg border border-stone-200 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="font-serif text-xl text-stone-900">
            5-Point Condition Rating Scale
          </h2>
          <p className="text-stone-500 text-xs mt-1">
            Standard descriptors attached to scores 1 through 5 across inspection checklists and PDF reports.
          </p>
        </div>

        <form onSubmit={handleSaveScale} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {[5, 4, 3, 2, 1].map((score) => (
              <div key={score} className="space-y-1">
                <label className="block text-xs font-mono font-bold text-stone-700">
                  Score {score}
                </label>
                <input
                  type="text"
                  value={scale[score] || ''}
                  onChange={(e) => setScale({ ...scale, [score]: e.target.value })}
                  className="w-full text-xs font-mono uppercase px-3 py-2 border border-stone-300 rounded focus:border-primary focus:outline-none"
                  required
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" disabled={savingScale}>
              {savingScale ? <Spinner size="sm" /> : 'Save Condition Scale'}
            </Button>
          </div>
        </form>
      </div>

      {/* Item Categories */}
      <div className="bg-white rounded-lg border border-stone-200 p-6 shadow-sm space-y-6">
        <div>
          <h2 className="font-serif text-xl text-stone-900">
            Inventory Item Categories
          </h2>
          <p className="text-stone-500 text-xs mt-1">
            Global taxonomies used by landlords to catalog property fixtures, furniture, and fittings.
          </p>
        </div>

        {/* Existing Categories Badges */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-stone-100 text-stone-800 border border-stone-300"
            >
              {cat}
              <button
                type="button"
                onClick={() => handleRemoveCategory(cat)}
                className="text-stone-400 hover:text-rose-600 transition-colors"
                title="Remove category"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleAddCategory} className="flex gap-2 max-w-md pt-2">
          <Input
            placeholder="NEW_CATEGORY_NAME..."
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="text-xs font-mono uppercase"
          />
          <Button type="submit" variant="secondary" disabled={savingCat}>
            {savingCat ? <Spinner size="sm" /> : 'Add Category'}
          </Button>
        </form>
      </div>
    </div>
  );
}
