import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createListing, updateListing, getListing, getCategories, uploadImage } from '../api/listings';
import { Upload, X, ImagePlus, ArrowLeft, Tag, DollarSign, ClipboardList, CheckCircle } from 'lucide-react';

const CONDITIONS = [
  { value: 'new',      label: 'New',      desc: 'Never used',             color: 'emerald' },
  { value: 'like_new', label: 'Like New', desc: 'Used once or twice',     color: 'blue' },
  { value: 'good',     label: 'Good',     desc: 'Light use, minor wear',  color: 'blue' },
  { value: 'fair',     label: 'Fair',     desc: 'Noticeable wear',        color: 'amber' },
  { value: 'poor',     label: 'Poor',     desc: 'Heavy wear',             color: 'slate' },
];

const CONDITION_SELECTED = {
  emerald: 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200',
  blue:    'border-blue-400 bg-blue-50 ring-2 ring-blue-200',
  amber:   'border-amber-400 bg-amber-50 ring-2 ring-amber-200',
  slate:   'border-slate-400 bg-slate-50 ring-2 ring-slate-200',
};

export default function CreateListingPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', price: '', condition: 'good', category_id: '',
  });
  const [images, setImages] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories().then(({ data }) => setCategories(data.categories));
    if (isEdit) {
      getListing(id).then(({ data }) => {
        const l = data.listing;
        setForm({
          title: l.title || '',
          description: l.description || '',
          price: l.price || '',
          condition: l.condition || 'good',
          category_id: l.category_id || '',
        });
        if (l.images?.length) {
          setImages(l.images.map(url => ({ url })));
        }
      });
    }
  }, [id, isEdit]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const addFiles = useCallback(async (files) => {
    const allowed = [...files].filter(f => f.type.startsWith('image/')).slice(0, 5 - images.length);
    if (!allowed.length) return;

    const placeholders = allowed.map(f => ({ url: URL.createObjectURL(f), uploading: true, file: f }));
    setImages(prev => [...prev, ...placeholders]);

    for (const file of allowed) {
      try {
        const { data } = await uploadImage(file);
        setImages(prev => {
          const next = [...prev];
          const idx = next.findIndex(img => img.file === file);
          if (idx !== -1) next[idx] = { url: data.url };
          return next;
        });
      } catch {
        setImages(prev => prev.filter(img => img.file !== file));
        setError('Failed to upload one or more images. Try again.');
      }
    }
  }, [images.length]);

  const removeImage = (i) => setImages(prev => prev.filter((_, idx) => idx !== i));

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.price || parseFloat(form.price) < 0) { setError('Valid price is required'); return; }
    if (!form.category_id) { setError('Please select a category'); return; }
    if (images.some(img => img.uploading)) { setError('Please wait for images to finish uploading'); return; }

    setError('');
    setLoading(true);
    const imageUrls = images.map(img => img.url);

    try {
      if (isEdit) {
        await updateListing(id, { ...form, images: imageUrls });
        navigate(`/listings/${id}`);
      } else {
        const { data } = await createListing({ ...form, images: imageUrls });
        navigate(`/listings/${data.listing.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save listing');
    } finally {
      setLoading(false);
    }
  };

  const uploading = images.some(img => img.uploading);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 text-sm mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            {isEdit ? 'Edit Listing' : 'List an Item'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isEdit ? 'Update your listing details' : 'Sell your second-hand items to fellow students'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-2">
            <X size={16} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Photo upload */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <ImagePlus size={16} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Photos</span>
              <span className="text-slate-400 text-sm font-normal">({images.length}/5)</span>
            </div>

            {images.length < 5 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all select-none ${
                  dragging
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                }`}
              >
                <Upload size={28} className={`mx-auto mb-2 transition-colors ${dragging ? 'text-blue-500' : 'text-slate-300'}`} />
                <p className="text-sm font-medium text-slate-600">
                  Drop photos here or <span className="text-blue-600">browse files</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG, WebP — up to 5MB each</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>
            )}

            {images.length > 0 && (
              <div className={`grid grid-cols-3 gap-3 ${images.length < 5 ? 'mt-3' : ''}`}>
                {images.map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group">
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {img.uploading && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                    {!img.uploading && (
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/75 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} className="text-white" />
                      </button>
                    )}
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-md font-medium">
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Item details */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList size={16} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">Item Details</span>
            </div>

            <div>
              <label className="label">Title *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Year 11 Biology Textbook"
                value={form.title}
                onChange={set('title')}
                maxLength={255}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label flex items-center gap-1">
                  <Tag size={12} /> Category *
                </label>
                <select className="input" value={form.category_id} onChange={set('category_id')} required>
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label flex items-center gap-1">
                  <DollarSign size={12} /> Price (NZD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                  <input
                    type="number"
                    className="input pl-7"
                    placeholder="0.00"
                    value={form.price}
                    onChange={set('price')}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                className="input"
                rows={4}
                placeholder="Describe the item — any wear, damage, what's included..."
                value={form.description}
                onChange={set('description')}
              />
            </div>
          </div>

          {/* Condition */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 mb-3">Condition</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONDITIONS.map((c) => (
                <label
                  key={c.value}
                  className={`flex flex-col p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    form.condition === c.value
                      ? CONDITION_SELECTED[c.color]
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="condition"
                    value={c.value}
                    checked={form.condition === c.value}
                    onChange={set('condition')}
                    className="sr-only"
                  />
                  <span className="font-semibold text-sm text-slate-900">{c.label}</span>
                  <span className="text-xs text-slate-500 mt-0.5">{c.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notice */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <CheckCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              Your listing will be reviewed by a school admin before going public. This usually takes a few hours.
            </p>
          </div>

          <div className="flex gap-3 pb-4">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={loading || uploading} className="btn-primary flex-1 py-2.5">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : uploading ? 'Uploading photos...' : isEdit ? 'Update Listing' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
