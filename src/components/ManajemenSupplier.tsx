import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { Edit2, Trash2, Plus, Check, Truck, Phone, MapPin, X } from 'lucide-react';

export default function ManajemenSupplier() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [supplierList, setSupplierList] = useState<any[]>([]);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const fetchSuppliers = async () => {
    try {
      const db = await Database.load('sqlite:apotek.db');
      const result: any[] = await db.select('SELECT * FROM suppliers ORDER BY name ASC');
      setSupplierList(result);
    } catch (err) {
      console.error('Gagal mengambil data supplier:', err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Auto-dismiss notification setelah 4 detik
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleSimpan = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = name.trim();
    const phoneTrimmed = phone.trim() || null;
    const addressTrimmed = address.trim() || null;

    if (!nameTrimmed) {
      setNotification({ message: 'Nama supplier/PBF wajib diisi!', type: 'error' });
      return;
    }

    try {
      const db = await Database.load('sqlite:apotek.db');
      
      if (editingSupplier) {
        // Update data supplier
        await db.execute(
          'UPDATE suppliers SET name = $1, phone = $2, address = $3 WHERE id = $4',
          [nameTrimmed, phoneTrimmed, addressTrimmed, editingSupplier.id]
        );
        setNotification({ message: `Data supplier "${nameTrimmed}" berhasil diperbarui!`, type: 'success' });
        setEditingSupplier(null);
      } else {
        // Tambah supplier baru
        await db.execute(
          'INSERT INTO suppliers (name, phone, address) VALUES ($1, $2, $3)',
          [nameTrimmed, phoneTrimmed, addressTrimmed]
        );
        setNotification({ message: `Supplier "${nameTrimmed}" berhasil ditambahkan!`, type: 'success' });
      }
      
      setName('');
      setPhone('');
      setAddress('');
      fetchSuppliers();
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Gagal menyimpan data supplier ke database.', type: 'error' });
    }
  };

  const handleHapus = async (id: number, supplierName: string) => {
    try {
      const db = await Database.load('sqlite:apotek.db');
      
      const countResult: any[] = await db.select(
        'SELECT COUNT(*) as count FROM stock_transactions WHERE supplier_id = $1',
        [id]
      );
      const count = countResult[0]?.count || 0;
      
      if (count > 0) {
        setNotification({
          message: `Supplier "${supplierName}" tidak dapat dihapus karena telah digunakan dalam ${count} transaksi pengadaan obat!`,
          type: 'warning'
        });
        return;
      }

      if (confirm(`Apakah Anda yakin ingin menghapus supplier "${supplierName}"?`)) {
        await db.execute('DELETE FROM suppliers WHERE id = $1', [id]);
        setNotification({ message: `Supplier "${supplierName}" berhasil dihapus!`, type: 'success' });
        fetchSuppliers();
        
        if (editingSupplier?.id === id) {
          setEditingSupplier(null);
          setName('');
          setPhone('');
          setAddress('');
        }
      }
    } catch (err) {
      console.error('Gagal menghapus supplier:', err);
      setNotification({ message: 'Gagal menghapus supplier dari database.', type: 'error' });
    }
  };

  const startEdit = (sup: any) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setPhone(sup.phone || '');
    setAddress(sup.address || '');
  };

  const cancelEdit = () => {
    setEditingSupplier(null);
    setName('');
    setPhone('');
    setAddress('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-150 pb-4">
        <Truck className="text-emerald-600" size={24} />
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Manajemen Supplier (PBF)</h2>
          <p className="text-gray-500 text-sm mt-0.5">Kelola data mitra distributor dan Pedagang Besar Farmasi rekanan apotek.</p>
        </div>
      </div>

      {notification && (
        <div className={`p-3.5 rounded-xl text-sm font-semibold border transition-all duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          notification.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="space-y-6">
        
        {/* Panel Form Input (Atas) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-1.5">
            <Truck size={16} className="text-emerald-600" />
            <span>{editingSupplier ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}</span>
          </h3>
          
          <form onSubmit={handleSimpan} className="space-y-4 text-xs text-gray-705">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Nama Supplier */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Nama Distributor / PBF</label>
                <input 
                  type="text" 
                  placeholder="ex: Kimia Farma, BSP, dll" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                  required
                />
              </div>

              {/* Nomor Telepon */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Nomor Telepon / HP</label>
                <input 
                  type="text" 
                  placeholder="ex: 0812-3456-7890" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold font-mono"
                />
              </div>

              {/* Alamat */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Alamat Kantor</label>
                <input 
                  type="text"
                  placeholder="ex: Jl. Sudirman No. 12, Padang" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              {editingSupplier && (
                <button 
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all border border-gray-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X size={14} />
                  <span>Batal</span>
                </button>
              )}
              <button 
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {editingSupplier ? <Check size={14} /> : <Plus size={14} />}
                <span>{editingSupplier ? 'Simpan Perubahan' : 'Tambah Supplier'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Panel Tabel Daftar (Bawah) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-gray-150">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Daftar PBF Aktif</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3.5 text-sm font-semibold text-gray-600">Nama PBF</th>
                  <th className="p-3.5 text-sm font-semibold text-gray-600 w-36">Telepon</th>
                  <th className="p-3.5 text-sm font-semibold text-gray-600">Alamat</th>
                  <th className="p-3.5 text-sm font-semibold text-gray-600 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {supplierList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-sm text-gray-500 italic">
                      Belum ada data supplier yang terdaftar di database.
                    </td>
                  </tr>
                ) : (
                  supplierList.map((sup) => (
                    <tr key={sup.id} className="border-b border-gray-100 hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 text-sm font-bold text-gray-805 flex items-center gap-1.5">
                        <Truck size={14} className="text-slate-400 shrink-0" />
                        <span>{sup.name}</span>
                      </td>
                      <td className="p-3.5 text-gray-700 font-mono text-[11px]">
                        {sup.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone size={10} className="text-slate-400" />
                            <span>{sup.phone}</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3.5 text-gray-600 leading-relaxed max-w-xs truncate">
                        {sup.address ? (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} className="text-slate-400 shrink-0" />
                            <span className="truncate">{sup.address}</span>
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => startEdit(sup)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-colors border border-emerald-150 inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <Edit2 size={10} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleHapus(sup.id, sup.name)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1.5 rounded-lg font-bold text-[10px] transition-colors border border-rose-150 inline-flex items-center gap-0.5 cursor-pointer"
                          >
                            <Trash2 size={10} />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-3.5 bg-slate-50 border-t border-gray-150 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Total Mitra: {supplierList.length} PBF
          </div>
        </div>

      </div>
    </div>
  );
}
