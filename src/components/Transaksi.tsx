import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { Trash2, Plus, Calendar, FileText, Truck, UserCheck, Users, Check } from 'lucide-react';

export default function Transaksi() {
  const [obat, setObat] = useState<any[]>([]);
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [items, setItems] = useState<Array<{ 
    drug_id: string; 
    quantity: number; 
    price: number; 
    unit: string; 
    batch_no: string; 
    expired_date: string; 
    notes: string;
    searchTerm: string;
    showDropdown: boolean;
    total_input_price: number;
  }>>([
    { drug_id: '', quantity: 0, price: 0, unit: '', batch_no: '', expired_date: '', notes: '', searchTerm: '', showDropdown: false, total_input_price: 0 }
  ]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Global fields for transactions
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNo, setDocNo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [deliverer, setDeliverer] = useState('');
  const [receiver, setReceiver] = useState('');
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    // Ambil daftar obat untuk pilihan di dropdown (termasuk kolom harga dan satuan)
    const fetchObat = async () => {
      try {
        const db = await Database.load('sqlite:apotek.db');
        const res: any[] = await db.select('SELECT id, name, price, unit FROM drugs ORDER BY name ASC');
        setObat(res);
      } catch (err) {
        console.error('Gagal mengambil data obat:', err);
      }
    };

    // Ambil daftar supplier (PBF)
    const fetchSuppliers = async () => {
      try {
        const db = await Database.load('sqlite:apotek.db');
        const res: any[] = await db.select('SELECT id, name FROM suppliers ORDER BY name ASC');
        setSuppliers(res);
      } catch (err) {
        console.error('Gagal mengambil data supplier:', err);
      }
    };

    fetchObat();
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

  const addItem = () => {
    setItems([...items, { drug_id: '', quantity: 0, price: 0, unit: '', batch_no: '', expired_date: '', notes: '', searchTerm: '', showDropdown: false, total_input_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: 'drug_id' | 'quantity' | 'batch_no' | 'expired_date' | 'notes' | 'total_input_price', value: any) => {
    const newItems = [...items];
    if (field === 'quantity') {
      const qty = parseInt(value) || 0;
      newItems[index].quantity = qty;
      if (type === 'IN') {
        newItems[index].price = qty > 0 ? (newItems[index].total_input_price / qty) : 0;
      }
    } else if (field === 'drug_id') {
      newItems[index].drug_id = value;
      const selectedObat = obat.find(o => String(o.id) === String(value));
      newItems[index].price = selectedObat ? selectedObat.price : 0;
      newItems[index].unit = selectedObat ? selectedObat.unit : '';
    } else if (field === 'batch_no') {
      newItems[index].batch_no = value;
    } else if (field === 'expired_date') {
      newItems[index].expired_date = value;
    } else if (field === 'notes') {
      newItems[index].notes = value;
    } else if (field === 'total_input_price') {
      const totalVal = parseFloat(value) || 0;
      newItems[index].total_input_price = totalVal;
      newItems[index].price = newItems[index].quantity > 0 ? (totalVal / newItems[index].quantity) : 0;
    }
    setItems(newItems);
  };

  const selectDrug = (index: number, selectedObat: any) => {
    const newItems = [...items];
    newItems[index].drug_id = String(selectedObat.id);
    newItems[index].searchTerm = selectedObat.name;
    if (type === 'IN') {
      newItems[index].price = 0;
      newItems[index].total_input_price = 0;
    } else {
      newItems[index].price = selectedObat.price;
      newItems[index].total_input_price = selectedObat.price * newItems[index].quantity;
    }
    newItems[index].unit = selectedObat.unit;
    newItems[index].showDropdown = false;
    setItems(newItems);
  };

  const handleSearchChange = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index].searchTerm = val;
    newItems[index].showDropdown = true;
    
    // Check if what was typed matches exactly a drug
    const match = obat.find(o => o.name.toLowerCase() === val.trim().toLowerCase());
    if (match) {
      newItems[index].drug_id = String(match.id);
      newItems[index].price = match.price;
      newItems[index].unit = match.unit;
    } else {
      newItems[index].drug_id = '';
      newItems[index].price = 0;
      newItems[index].unit = '';
    }
    setItems(newItems);
  };

  const setDropdownOpen = (index: number, isOpen: boolean) => {
    const newItems = [...items];
    newItems[index].showDropdown = isOpen;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validasi: minimal ada 1 item
    if (items.length === 0) {
      setNotification({ message: "Harap tambahkan minimal 1 obat ke dalam daftar!", type: 'warning' });
      return;
    }

    // 2. Validasi: data global faktur jika tipe IN
    if (type === 'IN') {
      if (!docNo || docNo.trim() === "") {
        setNotification({ message: "Harap isi Nomor Dokumen / Faktur!", type: 'warning' });
        return;
      }
      if (!supplierId || supplierId === "") {
        setNotification({ message: "Harap pilih PBF / Supplier!", type: 'warning' });
        return;
      }
    }

    // 3. Validasi: cek kelengkapan data tiap baris obat
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.drug_id || item.drug_id === "") {
        setNotification({ message: `Harap pilih obat pada baris ke-${i + 1}!`, type: 'warning' });
        return;
      }
      if (item.quantity <= 0) {
        setNotification({ message: `Jumlah obat pada baris ke-${i + 1} harus minimal 1!`, type: 'warning' });
        return;
      }
      if (type === 'IN') {
        if (!item.batch_no || item.batch_no.trim() === "") {
          setNotification({ message: `Harap isi Nomor Batch pada baris ke-${i + 1}!`, type: 'warning' });
          return;
        }
        if (!item.expired_date || item.expired_date.trim() === "") {
          setNotification({ message: `Harap isi Tanggal Expired pada baris ke-${i + 1}!`, type: 'warning' });
          return;
        }
      }
    }

    try {
      const db = await Database.load('sqlite:apotek.db');
      const userRaw = localStorage.getItem("user");
      let activeUserId: number | null = null;
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw);
          activeUserId = parsed.id || null;
        } catch {}
      }

      // 4. Validasi stok untuk transaksi OUT (Obat Keluar)
      if (type === 'OUT') {
        // Group quantities by drug_id to handle duplicates in the batch
        const requestedQuantities: Record<string, number> = {};
        items.forEach(item => {
          requestedQuantities[item.drug_id] = (requestedQuantities[item.drug_id] || 0) + item.quantity;
        });

        // Query current stock for these drugs
        const drugIds = Object.keys(requestedQuantities);
        for (const drugId of drugIds) {
          const drugsResult: any[] = await db.select(
            'SELECT name, current_stock FROM drugs WHERE id = $1',
            [drugId]
          );

          if (drugsResult.length > 0) {
            const drug = drugsResult[0];
            const currentStock = drug.current_stock;
            const requested = requestedQuantities[drugId];
            if (requested > currentStock) {
              setNotification({
                message: `Stok tidak mencukupi untuk "${drug.name}". Stok tersedia: ${currentStock}, Jumlah diminta: ${requested}.`,
                type: 'warning'
              });
              return;
            }
          } else {
            setNotification({ message: "Data obat tidak ditemukan di database.", type: 'error' });
            return;
          }
        }
      }

      // 5. Jalankan transaksi database (SQLite Transaction)
      await db.execute('BEGIN TRANSACTION');
      
      // Ambil waktu saat ini (HH:MM:SS) untuk digabungkan dengan tanggal kustom
      const currentTime = new Date().toTimeString().split(' ')[0];
      const transactionDateTime = `${transactionDate} ${currentTime}`;
      
      try {
        for (const item of items) {
          // A. Insert ke stock_transactions dengan harga satuan dari list obat, tanggal kustom, catatan, dan user_id
          await db.execute(
            `INSERT INTO stock_transactions 
             (drug_id, type, quantity, cost_price, doc_no, supplier_id, batch_no, expired_date, deliverer, receiver, created_at, notes, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              item.drug_id, 
              type, 
              item.quantity, 
              item.price, 
              type === 'IN' ? docNo.trim() : null,
              type === 'IN' ? parseInt(supplierId) : null,
              type === 'IN' ? item.batch_no.trim() : null,
              type === 'IN' ? item.expired_date.trim() : null,
              type === 'IN' ? deliverer.trim() : null,
              type === 'IN' ? receiver.trim() : null,
              transactionDateTime,
              item.notes.trim() || null,
              activeUserId
            ]
          );

          // B. Update stok drugs
          const multiplier = type === 'IN' ? 1 : -1;
          await db.execute(
            'UPDATE drugs SET current_stock = current_stock + ($1 * $2) WHERE id = $3',
            [item.quantity, multiplier, item.drug_id]
          );
        }

        await db.execute('COMMIT');
        setNotification({ message: `Seluruh transaksi (${items.length} item) berhasil disimpan dan stok diperbarui!`, type: 'success' });
        
        // Reset form ke satu baris kosong & kosongkan global inputs
        setItems([{ drug_id: '', quantity: 0, price: 0, unit: '', batch_no: '', expired_date: '', notes: '', searchTerm: '', showDropdown: false, total_input_price: 0 }]);
        setDocNo('');
        setSupplierId('');
        setDeliverer('');
        setReceiver('');
        setTransactionDate(new Date().toISOString().split('T')[0]);
      } catch (dbErr) {
        // Rollback jika terjadi kegagalan query
        await db.execute('ROLLBACK');
        throw dbErr;
      }

    } catch (err) {
      console.error('Gagal memproses transaksi:', err);
      setNotification({ message: "Gagal memproses transaksi. Terjadi kesalahan pada database.", type: 'error' });
    }
  };    

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800 font-sans">Input Transaksi Kelompok (Batch)</h2>

      {notification && (
        <div className={`p-3 mb-4 rounded-lg text-sm font-medium border transition-all duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          notification.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Tipe Transaksi */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Jenis Transaksi</label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="type" 
                value="IN" 
                checked={type === 'IN'} 
                onChange={() => {
                  setType('IN');
                  setItems([{ drug_id: '', quantity: 0, price: 0, unit: '', batch_no: '', expired_date: '', notes: '', searchTerm: '', showDropdown: false, total_input_price: 0 }]);
                }} 
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
              />
              <span className="text-gray-800 font-medium">Obat Masuk (Beli)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="radio" 
                name="type" 
                value="OUT" 
                checked={type === 'OUT'} 
                onChange={() => {
                  setType('OUT');
                  setItems([{ drug_id: '', quantity: 0, price: 0, unit: '', batch_no: '', expired_date: '', notes: '', searchTerm: '', showDropdown: false, total_input_price: 0 }]);
                }} 
                className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
              />
              <span className="text-gray-800 font-medium">Obat Keluar (Jual)</span>
            </label>
          </div>
        </div>

        {/* Informasi Transaksi (Tanggal kustom untuk semua, Dokumen/PBF khusus Obat Masuk) */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase flex items-center gap-1.5">
              <Calendar size={13} className="text-gray-400" />
              <span>Tanggal Transaksi</span>
            </label>
            <input 
              type="date" 
              value={transactionDate} 
              onChange={(e) => setTransactionDate(e.target.value)} 
              className="w-full p-2 border rounded text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500 font-semibold"
              required
            />
          </div>
          
          {type === 'IN' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase flex items-center gap-1.5">
                  <FileText size={13} className="text-gray-400" />
                  <span>No. Dokumen / Faktur</span>
                </label>
                <input 
                  type="text" 
                  placeholder="ex: FKT-12345" 
                  value={docNo} 
                  onChange={(e) => setDocNo(e.target.value)} 
                  className="w-full p-2 border rounded text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase flex items-center gap-1.5">
                  <Truck size={13} className="text-gray-400" />
                  <span>Pedagang Besar Farmasi (PBF)</span>
                </label>
                <select 
                  value={supplierId} 
                  onChange={(e) => setSupplierId(e.target.value)} 
                  className="w-full p-2 border rounded text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">-- Pilih PBF --</option>
                  {suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase flex items-center gap-1.5">
                  <UserCheck size={13} className="text-gray-400" />
                  <span>Karyawan Penerima</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Nama Penerima Apotek" 
                  value={receiver} 
                  onChange={(e) => setReceiver(e.target.value)} 
                  className="w-full p-2 border rounded text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase flex items-center gap-1.5">
                  <Users size={13} className="text-gray-400" />
                  <span>Petugas Pengantar</span>
                </label>
                <input 
                  type="text" 
                  placeholder="Nama Pengantar PBF" 
                  value={deliverer} 
                  onChange={(e) => setDeliverer(e.target.value)} 
                  className="w-full p-2 border rounded text-sm bg-white focus:ring-emerald-500 focus:border-emerald-500 col-span-1 md:col-span-2"
                />
              </div>
            </>
          )}
        </div>

        {/* Tabel Input Barang */}
        <div className="overflow-visible mb-4 border border-gray-200 rounded-lg">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-sm font-semibold text-gray-600 w-16 text-center">No</th>
                <th className="p-3 text-sm font-semibold text-gray-600 w-80">Pilih Obat</th>
                {type === 'IN' && (
                  <>
                    <th className="p-3 text-sm font-semibold text-gray-600 w-36">No. Batch</th>
                    <th className="p-3 text-sm font-semibold text-gray-600 w-36">Tgl Exp</th>
                  </>
                )}
                <th className="p-3 text-sm font-semibold text-gray-600 w-28 text-center">Jumlah</th>
                <th className="p-3 text-sm font-semibold text-gray-600 w-44 text-right">
                  {type === 'IN' ? 'Harga Beli Satuan (Kalkulasi)' : 'Harga Jual Satuan'}
                </th>
                <th className="p-3 text-sm font-semibold text-gray-600 w-44 text-right">
                  {type === 'IN' ? 'Total Beli (Input Faktur)' : 'Total Jual'}
                </th>
                <th className="p-3 text-sm font-semibold text-gray-600 w-44">Keterangan</th>
                <th className="p-3 text-sm font-semibold text-gray-600 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-center text-gray-500 font-medium">{index + 1}</td>
                  <td className="p-3 relative">
                    <input
                      type="text"
                      placeholder="Ketik nama obat..."
                      value={item.searchTerm || ''}
                      onChange={(e) => handleSearchChange(index, e.target.value)}
                      onFocus={() => setDropdownOpen(index, true)}
                      onBlur={() => setTimeout(() => setDropdownOpen(index, false), 250)}
                      className="w-full p-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white font-medium"
                      required
                    />
                    {item.showDropdown && (
                      <div className="absolute left-3 right-3 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-50">
                        {obat.filter(o => o.name.toLowerCase().includes((item.searchTerm || '').toLowerCase())).length === 0 ? (
                          <div className="p-2.5 text-xs text-gray-500 italic">Obat tidak ditemukan</div>
                        ) : (
                          obat.filter(o => o.name.toLowerCase().includes((item.searchTerm || '').toLowerCase())).map((o: any) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => selectDrug(index, o)}
                              className="w-full text-left p-2.5 text-xs hover:bg-emerald-50 hover:text-emerald-700 font-semibold transition-colors border-b border-gray-50 last:border-b-0 cursor-pointer"
                            >
                              {o.name}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </td>
                  {type === 'IN' && (
                    <>
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="Batch (ex: GD9455)"
                          value={item.batch_no}
                          onChange={(e) => updateItem(index, 'batch_no', e.target.value)}
                          className="w-full p-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="date"
                          value={item.expired_date}
                          onChange={(e) => updateItem(index, 'expired_date', e.target.value)}
                          className="w-full p-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                        />
                      </td>
                    </>
                  )}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Jumlah"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        className="w-20 p-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white text-center"
                      />
                      <span className="text-xs font-semibold text-gray-500 uppercase">
                        {item.unit || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-right text-gray-700 font-mono font-semibold">
                    Rp {item.price.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-3">
                    {type === 'IN' ? (
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs font-semibold text-gray-450">Rp</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.total_input_price || ''}
                          onChange={(e) => updateItem(index, 'total_input_price', e.target.value)}
                          className="w-28 p-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white font-mono font-semibold text-right"
                          required
                        />
                      </div>
                    ) : (
                      <div className="text-sm text-right font-bold text-gray-905 font-mono">
                        Rp {(item.price * item.quantity).toLocaleString('id-ID')}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      placeholder="Catatan (opsional)"
                      value={item.notes}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      className="w-full p-2 border rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-white"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                      disabled={items.length === 1}
                      title="Hapus baris ini"
                    >
                      <Trash2 size={14} />
                      <span>Hapus</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-4 mt-6">
          <button
            type="button"
            onClick={addItem}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-gray-300 inline-flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Tambah Baris Obat</span>
          </button>
          
          <button
            type="submit"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Check size={16} />
            <span>Proses Semua Transaksi</span>
          </button>
        </div>
      </form>
    </div>
  );
}
