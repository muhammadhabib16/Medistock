import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { Edit2, Trash2, Plus, Check } from 'lucide-react';

export default function ManajemenKategori() {
  const [namaKategori, setNamaKategori] = useState('');
  const [kategoriList, setKategoriList] = useState<any[]>([]);
  const [editingKategori, setEditingKategori] = useState<{ id: number; name: string } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const fetchKategori = async () => {
    try {
      const db = await Database.load('sqlite:apotek.db');
      const result: any[] = await db.select('SELECT * FROM categories ORDER BY name ASC');
      setKategoriList(result);
    } catch (err) {
      console.error('Gagal mengambil data kategori:', err);
    }
  };

  useEffect(() => {
    fetchKategori();
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
    const nameTrimmed = namaKategori.trim();
    if (!nameTrimmed) return;

    try {
      const db = await Database.load('sqlite:apotek.db');
      
      if (editingKategori) {
        // Update kategori
        await db.execute('UPDATE categories SET name = $1 WHERE id = $2', [nameTrimmed, editingKategori.id]);
        setNotification({ message: `Kategori "${editingKategori.name}" berhasil diubah menjadi "${nameTrimmed}"!`, type: 'success' });
        setEditingKategori(null);
      } else {
        // Tambah kategori baru
        await db.execute('INSERT INTO categories (name) VALUES ($1)', [nameTrimmed]);
        setNotification({ message: `Kategori "${nameTrimmed}" berhasil ditambahkan!`, type: 'success' });
      }
      
      setNamaKategori('');
      fetchKategori();
    } catch (err) {
      console.error(err);
      setNotification({ message: 'Gagal menyimpan kategori. Pastikan nama kategori belum terdaftar!', type: 'error' });
    }
  };

  const handleHapus = async (id: number, name: string) => {
    try {
      const db = await Database.load('sqlite:apotek.db');
      
      // Cek apakah kategori masih dipakai oleh obat
      const countResult: any[] = await db.select('SELECT COUNT(*) as count FROM drugs WHERE category_id = $1', [id]);
      const count = countResult[0]?.count || 0;
      
      if (count > 0) {
        setNotification({
          message: `Kategori "${name}" tidak dapat dihapus karena sedang digunakan oleh ${count} obat!`,
          type: 'warning'
        });
        return;
      }

      if (confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?`)) {
        await db.execute('DELETE FROM categories WHERE id = $1', [id]);
        setNotification({ message: `Kategori "${name}" berhasil dihapus!`, type: 'success' });
        fetchKategori();
        
        if (editingKategori?.id === id) {
          setEditingKategori(null);
          setNamaKategori('');
        }
      }
    } catch (err) {
      console.error('Gagal menghapus kategori:', err);
      setNotification({ message: 'Gagal menghapus kategori dari database.', type: 'error' });
    }
  };

  const startEdit = (kat: any) => {
    setEditingKategori(kat);
    setNamaKategori(kat.name);
  };

  const cancelEdit = () => {
    setEditingKategori(null);
    setNamaKategori('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 font-sans">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Manajemen Kategori Obat</h2>

      {notification && (
        <div className={`p-3 mb-4 rounded-lg text-sm font-medium border transition-all duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          notification.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Form Input */}
      <form onSubmit={handleSimpan} className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          {editingKategori ? 'Edit Kategori' : 'Tambah Kategori Baru'}
        </h3>
        <div className="flex gap-2">
          <input 
            className="border p-2 rounded-md flex-1 text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500" 
            placeholder="Nama Kategori (ex: Obat Keras, Vitamin, dll)" 
            value={namaKategori} 
            onChange={(e) => setNamaKategori(e.target.value)} 
            required 
          />
          <button className={`text-white px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
            editingKategori ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}>
            {editingKategori ? <Check size={16} /> : <Plus size={16} />}
            <span>{editingKategori ? 'Simpan' : 'Tambah'}</span>
          </button>
          {editingKategori && (
            <button 
              type="button" 
              onClick={cancelEdit} 
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {/* Tabel Kategori */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-sm font-semibold text-gray-600 w-16 text-center">No</th>
              <th className="p-3 text-sm font-semibold text-gray-600">Nama Kategori</th>
              <th className="p-3 text-sm font-semibold text-gray-600 w-44 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {kategoriList.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-sm text-gray-500">
                  Belum ada kategori terdaftar.
                </td>
              </tr>
            ) : (
              kategoriList.map((kat, index) => (
                <tr key={kat.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center text-sm text-gray-500 font-medium">{index + 1}</td>
                  <td className="p-3 text-sm font-medium text-gray-800">{kat.name}</td>
                  <td className="p-3 text-center flex justify-center gap-4">
                    <button
                      onClick={() => startEdit(kat)}
                      className="text-emerald-600 hover:text-emerald-850 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleHapus(kat.id, kat.name)}
                      className="text-red-600 hover:text-red-900 text-xs font-semibold inline-flex items-center gap-1"
                    >
                      <Trash2 size={13} />
                      <span>Hapus</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}