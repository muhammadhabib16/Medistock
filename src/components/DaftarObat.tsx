import { useEffect, useState } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { AlertTriangle, Filter, Edit2, X, Search } from 'lucide-react';

export default function DaftarObat() {
  const [drugs, setDrugs] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  
  // State untuk mengontrol obat mana yang sedang diedit
  const [editingDrug, setEditingDrug] = useState<any | null>(null);
  
  // State form edit obat
  const [editForm, setEditForm] = useState({
    name: '',
    sku: '',
    price: 0,
    unit: '',
    category_id: '',
    min_stock: 5
  });

  const fetchData = async () => {
    try {
      const db = await Database.load('sqlite:apotek.db');
      
      // Load categories
      const catResult: any[] = await db.select('SELECT * FROM categories ORDER BY name ASC');
      setCategories(catResult);

      // Load drugs with categories
      const query = `
        SELECT drugs.*, categories.name as category_name 
        FROM drugs 
        LEFT JOIN categories ON drugs.category_id = categories.id
        ORDER BY drugs.name ASC
      `;
      const result: any[] = await db.select(query);
      setDrugs(result);
    } catch (err) {
      console.error("Gagal mengambil data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      try {
        const parsed = JSON.parse(userRaw);
        setIsAdmin(parsed.role === 'admin');
      } catch {}
    }
  }, []);

  const startEdit = (drug: any) => {
    if (!isAdmin) return;
    setEditingDrug(drug);
    setEditForm({
      name: drug.name,
      sku: drug.sku,
      price: drug.price,
      unit: drug.unit,
      category_id: drug.category_id ? String(drug.category_id) : '',
      min_stock: drug.min_stock
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const db = await Database.load('sqlite:apotek.db');
      const catId = editForm.category_id ? parseInt(editForm.category_id) : null;
      const skuValue = editForm.sku.trim() === '' ? null : editForm.sku.trim();
      await db.execute(
        `UPDATE drugs 
         SET name = $1, sku = $2, price = $3, unit = $4, category_id = $5, min_stock = $6 
         WHERE id = $7`,
        [editForm.name, skuValue, editForm.price, editForm.unit, catId, editForm.min_stock, editingDrug.id]
      );
      
      setEditingDrug(null);
      fetchData(); // Refresh list obat
      alert('Data obat berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui data obat. Pastikan SKU/Kode Obat unik.');
    }
  };

  const filteredDrugs = drugs.filter(drug => {
    const matchesCategory = selectedCategory ? String(drug.category_id) === selectedCategory : true;
    const matchesSearch = searchQuery.trim() === '' || 
      drug.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (drug.sku && drug.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (drug.category_name && drug.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 font-sans">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 mb-6 border-b pb-4 border-gray-100">
        <h2 className="text-xl font-bold text-gray-800">Daftar Stok Obat</h2>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
          {/* Input Pencarian */}
          <div className="relative w-full sm:w-[240px]">
            <input
              type="text"
              placeholder="Cari nama atau SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm placeholder:text-gray-400"
            />
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-450 pointer-events-none">
              <Search size={14} />
            </span>
          </div>

          {/* Filter Kategori */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-xs font-bold text-gray-400 flex items-center gap-1 shrink-0 uppercase tracking-wider">
              <Filter size={14} className="text-gray-400" />
              <span>Kategori:</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border p-2 rounded-xl text-xs bg-white font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none w-full sm:min-w-[180px] shadow-sm cursor-pointer"
            >
              <option value="">-- Semua Kategori --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="p-3 text-sm font-semibold text-gray-600">Nama Obat</th>
              <th className="p-3 text-sm font-semibold text-gray-600">SKU</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Kategori</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Harga</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Min. Stok</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Stok Sekarang</th>
              {isAdmin && <th className="p-3 text-sm font-semibold text-gray-600 text-center w-24">Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {filteredDrugs.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="p-4 text-center text-sm text-gray-500">
                  Tidak ada obat ditemukan dalam kategori ini.
                </td>
              </tr>
            ) : (
              filteredDrugs.map((drug) => {
                const isLowStock = drug.current_stock <= drug.min_stock;
                return (
                  <tr key={drug.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm font-medium text-gray-850">{drug.name}</td>
                    <td className="p-3 font-mono text-xs text-gray-600">{drug.sku}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                        drug.category_id 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm' 
                          : 'bg-gray-50 text-gray-500 border border-gray-150'
                      }`}>
                        {drug.category_name || 'Tanpa Kategori'}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-700 font-mono">Rp {drug.price.toLocaleString()}</td>
                    <td className="p-3 text-sm text-gray-600 font-medium">{drug.min_stock} {drug.unit}</td>
                    <td className="p-3 text-sm">
                      <span className={`font-semibold ${isLowStock ? 'text-rose-600' : 'text-gray-850'}`}>
                        {drug.current_stock} {drug.unit}
                      </span>
                      {isLowStock && (
                        <span className="ml-2 inline-flex items-center gap-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-200">
                          <AlertTriangle size={10} />
                          <span>Menipis</span>
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="p-3 text-center">
                        <button
                          onClick={() => startEdit(drug)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Edit Data Obat */}
      {editingDrug && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-150 max-w-md w-full overflow-hidden transition-all transform scale-100 flex flex-col">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-150 bg-gray-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Edit2 size={16} className="text-emerald-600" />
                <span>Edit Data Obat</span>
              </h3>
              <button 
                onClick={() => setEditingDrug(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Modal Form Body */}
            <form onSubmit={handleUpdate}>
              <div className="p-5 space-y-4 text-xs text-gray-700">
                
                {/* Nama Obat */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Nama Obat</label>
                  <input 
                    type="text" 
                    value={editForm.name} 
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})} 
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                    required
                  />
                </div>

                {/* SKU */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">SKU / Kode Obat (Opsional)</label>
                  <input 
                    type="text" 
                    value={editForm.sku} 
                    onChange={(e) => setEditForm({...editForm, sku: e.target.value})} 
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-semibold text-gray-700"
                  />
                </div>

                {/* Harga & Satuan */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Harga Jual</label>
                    <input 
                      type="number" 
                      value={editForm.price} 
                      onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})} 
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Satuan</label>
                    <input 
                      type="text" 
                      value={editForm.unit} 
                      onChange={(e) => setEditForm({...editForm, unit: e.target.value})} 
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

                {/* Kategori & Min Stok */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Kategori</label>
                    <select 
                      value={editForm.category_id} 
                      onChange={(e) => setEditForm({...editForm, category_id: e.target.value})} 
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                    >
                      <option value="">Tanpa Kategori</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Batas Stok Min</label>
                    <input 
                      type="number" 
                      value={editForm.min_stock} 
                      onChange={(e) => setEditForm({...editForm, min_stock: parseInt(e.target.value) || 0})} 
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                      required
                    />
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-150 bg-gray-50 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingDrug(null)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-gray-200"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-emerald-100"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
