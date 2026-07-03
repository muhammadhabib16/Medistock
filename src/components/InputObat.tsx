import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';

export default function InputObat() {
  const [formData, setFormData] = useState({ name: '', sku: '', price: '', unit: '', category_id: '', min_stock: '' });
  const [categories, setCategories] = useState<any[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const db = await Database.load('sqlite:apotek.db');
        const res: any[] = await db.select('SELECT * FROM categories ORDER BY name ASC');
        setCategories(res);
      } catch (err) {
        console.error('Gagal mengambil data kategori:', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = await Database.load('sqlite:apotek.db');
      
      const categoryIdValue = formData.category_id ? parseInt(formData.category_id) : null;
      const minStockValue = formData.min_stock ? parseInt(formData.min_stock) : 5;
      const skuValue = formData.sku.trim() === '' ? null : formData.sku.trim();
      
      await db.execute(
        'INSERT INTO drugs (name, sku, price, unit, category_id, min_stock) VALUES ($1, $2, $3, $4, $5, $6)',
        [formData.name, skuValue, formData.price, formData.unit, categoryIdValue, minStockValue]
      );
      
      setNotification({ message: `Obat "${formData.name}" berhasil ditambahkan!`, type: 'success' });
      setFormData({ name: '', sku: '', price: '', unit: '', category_id: '', min_stock: '' }); // Reset form
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Gagal menambah obat. Pastikan SKU/Kode Obat unik.', type: 'error' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 font-sans">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Tambah Stok Obat Baru</h2>
      
      {notification && (
        <div className={`p-3 mb-4 rounded-lg text-sm font-medium border transition-all duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <input className="p-2 border rounded text-sm bg-white" placeholder="Nama Obat" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
        <input className="p-2 border rounded text-sm bg-white" placeholder="SKU/Kode Obat (Opsional)" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} />
        <input className="p-2 border rounded text-sm bg-white" type="number" placeholder="Harga" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
        <input className="p-2 border rounded text-sm bg-white" placeholder="Satuan (ex: Pcs, Box)" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})} required />
        
        <select 
          className="p-2 border rounded text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500" 
          value={formData.category_id} 
          onChange={(e) => setFormData({...formData, category_id: e.target.value})}
        >
          <option value="">-- Pilih Kategori (Opsional) --</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <input 
          type="number" 
          className="p-2 border rounded text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500" 
          placeholder="Batas Stok Minimum (Default: 5)" 
          value={formData.min_stock} 
          onChange={(e) => setFormData({...formData, min_stock: e.target.value})} 
        />
      </div>
      <button className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 text-sm font-semibold shadow-sm transition-colors">
        Simpan Obat
      </button>
    </form>
  );
}