import { useEffect, useState } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { 
  Search, 
  Calendar, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Coins, 
  TrendingUp, 
  Pill,
  BookOpen,
  Eye,
  User,
  UserCheck,
  Truck,
  Hash,
  Tag,
  FileText,
  Trash2,
  ArrowLeft,
  AlertTriangle,
  ChevronRight,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';

export default function LaporanTransaksi() {
  const [riwayat, setRiwayat] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // States untuk Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Auto-dismiss toast setelah 4 detik
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Reset ke halaman 1 setiap kali filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, startDate, endDate]);
  
  // State untuk melacak transaksi mana yang sedang dilihat detailnya (Halaman Rincian)
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  
  // State untuk mengontrol kemunculan Modal Konfirmasi Hapus kustom
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchRiwayat = async () => {
    try {
      const db = await Database.load('sqlite:apotek.db');
      const query = `
        SELECT t.*, d.name as obat_name, d.unit, c.name as category_name, s.name as supplier_name, u.username as operator_name
        FROM stock_transactions t
        JOIN drugs d ON t.drug_id = d.id
        LEFT JOIN categories c ON d.category_id = c.id
        LEFT JOIN suppliers s ON t.supplier_id = s.id
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC, t.id DESC
      `;
      const result: any[] = await db.select(query);
      setRiwayat(result);
    } catch (err) {
      console.error("Gagal mengambil riwayat transaksi:", err);
    }
  };

  useEffect(() => {
    fetchRiwayat();
    const userRaw = localStorage.getItem("user");
    if (userRaw) {
      try {
        const parsed = JSON.parse(userRaw);
        setIsAdmin(parsed.role === 'admin');
      } catch {}
    }
  }, []);

  const executeHapusTransaksi = async (t: any) => {
    try {
      const db = await Database.load('sqlite:apotek.db');
      
      // 1. Ambil stok obat saat ini
      const drugResult: any[] = await db.select('SELECT current_stock FROM drugs WHERE id = $1', [t.drug_id]);
      if (drugResult.length === 0) {
        alert('Obat tidak ditemukan di database!');
        return;
      }
      const currentStock = drugResult[0].current_stock;

      // 2. Hitung stok baru berdasarkan tipe transaksi
      let newStock = currentStock;
      if (t.type === 'IN') {
        newStock = currentStock - t.quantity;
        if (newStock < 0) {
          const proceed = confirm(`Peringatan: Stok setelah dikurangi akan bernilai negatif (${newStock}). Apakah Anda tetap ingin melanjutkan?`);
          if (!proceed) return;
        }
      } else {
        newStock = currentStock + t.quantity;
      }

      // 3. Eksekusi update stok & hapus riwayat
      await db.execute('UPDATE drugs SET current_stock = $1 WHERE id = $2', [newStock, t.drug_id]);
      await db.execute('DELETE FROM stock_transactions WHERE id = $1', [t.id]);

      alert('Transaksi berhasil dihapus dan stok obat disesuaikan!');
      setSelectedTransaction(null);
      fetchRiwayat(); // Refresh data
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus transaksi dari database.');
    }
  };

  // Filter di sisi Client
  const filteredRiwayat = riwayat.filter((t) => {
    // 1. Filter Pencarian Teks
    const matchesSearch = 
      t.obat_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (t.doc_no && t.doc_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.batch_no && t.batch_no.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Filter Jenis Transaksi
    const matchesType = filterType === 'ALL' || t.type === filterType;

    // 3. Filter Rentang Tanggal
    let matchesDate = true;
    if (startDate) {
      const tDate = t.created_at.split(' ')[0];
      matchesDate = matchesDate && tDate >= startDate;
    }
    if (endDate) {
      const tDate = t.created_at.split(' ')[0];
      matchesDate = matchesDate && tDate <= endDate;
    }

    return matchesSearch && matchesType && matchesDate;
  });

  // Hitung Nilai Finansial Ringkasan
  let totalBelanjaVal = 0;
  let totalPenjualanVal = 0;
  let totalQtyIn = 0;
  let totalQtyOut = 0;

  filteredRiwayat.forEach((t) => {
    const totalRow = t.quantity * t.cost_price;
    if (t.type === 'IN') {
      totalQtyIn += t.quantity;
      totalBelanjaVal += totalRow;
    } else {
      totalQtyOut += t.quantity;
      totalPenjualanVal += totalRow;
    }
  });

  // Helper formatting tanggal & waktu penuh
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Helper formatting tanggal pendek (hari/bulan/tahun saja)
  const formatDateShort = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    setToast({ message: 'Mengekspor data ke Excel...', type: 'info' });

    setTimeout(() => {
      const tableHeader = `
        <tr>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Tanggal & Waktu</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Nama Obat</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Kategori</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Tipe</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Jumlah</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Satuan</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: right;">Harga Satuan (Rp)</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: right;">Total Harga (Rp)</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: center;">No. Batch</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Expired</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left;">No. Faktur</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Supplier</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Petugas Pengantar</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Karyawan Penerima</th>
          <th style="background-color: #059669; color: white; font-weight: bold; border: 1px solid #cbd5e1; padding: 8px; text-align: left;">Catatan</th>
        </tr>
      `;

      const tableRows = filteredRiwayat.map((t) => {
        const totalRow = t.quantity * t.cost_price;
        return `
          <tr style="border: 1px solid #cbd5e1;">
            <td style="border: 1px solid #cbd5e1; padding: 6px; white-space: nowrap;">${formatDate(t.created_at)}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${t.obat_name}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${t.category_name || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; color: ${t.type === 'IN' ? '#059669' : '#e11d48'}; font-weight: bold;">
              ${t.type === 'IN' ? 'MASUK' : 'KELUAR'}
            </td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${t.quantity}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${t.unit}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right;">${t.cost_price}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: right; font-weight: bold;">${totalRow}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${t.batch_no || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${t.expired_date ? formatDateShort(t.expired_date) : '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${t.doc_no || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${t.supplier_name || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${t.deliverer || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">${t.receiver || '-'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; font-style: italic;">${t.notes || '-'}</td>
          </tr>
        `;
      }).join('');

      const htmlTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <!--[if gte mso 9]>
            <xml>
              <x:ExcelWorkbook>
                <x:ExcelWorksheets>
                  <x:ExcelWorksheet>
                    <x:Name>Riwayat Laporan</x:Name>
                    <x:WorksheetOptions>
                      <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                  </x:ExcelWorksheet>
                </x:ExcelWorksheets>
              </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <meta charset="utf-8">
          </head>
          <body>
            <table style="border-collapse: collapse; font-family: sans-serif;">
              ${tableHeader}
              ${tableRows}
            </table>
          </body>
        </html>
      `;

      const blob = new Blob([htmlTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute("download", `Laporan_Riwayat_Transaksi_${dateStr}.xls`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
      setToast({ message: 'Laporan berhasil diekspor ke Excel!', type: 'success' });
    }, 1200);
  };

  if (selectedTransaction) {
    return (
      <div className="space-y-6 font-sans max-w-4xl mx-auto relative">
        {/* Toast Notification */}
        {toast && (
          <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 transform translate-y-0 scale-100 ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
            toast.type === 'info' ? 'bg-slate-50 text-slate-700 border-slate-200 shadow-sm' :
            'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {toast.type === 'info' && <Loader2 className="animate-spin text-slate-500" size={14} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-3 border-b pb-4 border-gray-150 print:hidden">
          <button 
            onClick={() => setSelectedTransaction(null)}
            className="text-gray-500 hover:text-gray-850 hover:bg-gray-100 p-1.5 rounded-xl transition-all cursor-pointer border border-gray-205 inline-flex items-center justify-center"
            title="Kembali"
          >
            <ArrowLeft size={14} />
          </button>
          
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <button 
              onClick={() => setSelectedTransaction(null)} 
              className="hover:text-emerald-600 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0 font-semibold"
            >
              <BookOpen size={14} />
              <span>Laporan Transaksi</span>
            </button>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-855 font-bold">Rincian Transaksi</span>
          </div>
        </div>

        {/* Header Rincian */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <FileText className="text-emerald-600" size={24} />
            <span>Rincian Transaksi Obat</span>
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Detail data riwayat persediaan, dokumen faktur, dan petugas pencatat.</p>
        </div>

        {/* Detail Card Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Main Stats Header */}
          <div className="p-6 bg-slate-50 border-b border-gray-150 flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">IDENTITAS OBAT</span>
              <h3 className="text-lg font-extrabold text-gray-800 flex items-center gap-2">
                <span>{selectedTransaction.obat_name}</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">
                  {selectedTransaction.category_name || 'Tanpa Kategori'}
                </span>
              </h3>
              <div className="text-xs text-gray-500 flex items-center gap-1 font-semibold">
                <span>Waktu Catat:</span>
                <span className="text-gray-800 font-bold font-mono">{formatDate(selectedTransaction.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">Tipe Mutasi</span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border inline-flex items-center justify-center gap-1 ${
                  selectedTransaction.type === 'IN' 
                    ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                    : 'bg-rose-50 border-rose-250 text-rose-700'
                }`}>
                  {selectedTransaction.type === 'IN' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                  <span>{selectedTransaction.type === 'IN' ? 'Obat Masuk' : 'Obat Keluar'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Body Details */}
          <div className="p-6 space-y-6">
            
            {/* Grid Angka */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 p-5 rounded-2xl border border-gray-150">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Harga Satuan</span>
                <p className="text-lg font-extrabold text-gray-800 font-mono">
                  Rp {selectedTransaction.cost_price.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Jumlah Transaksi</span>
                <p className="text-lg font-extrabold text-gray-800">
                  {selectedTransaction.quantity} {selectedTransaction.unit}
                </p>
              </div>
              <div className="space-y-1 border-t md:border-t-0 md:border-l border-gray-200 pt-3 md:pt-0 md:pl-6">
                <span className="text-[10px] font-extrabold text-gray-455 uppercase tracking-widest block">Total Nilai Transaksi</span>
                <p className="text-xl font-black text-slate-800 font-mono">
                  Rp {(selectedTransaction.quantity * selectedTransaction.cost_price).toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Rincian Pengadaan (Faktur / PBF) - Hanya Jika Tipe IN */}
            {selectedTransaction.type === 'IN' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b pb-1.5 border-gray-150 flex items-center gap-1.5">
                  <Truck size={14} className="text-gray-400" />
                  <span>DATA FAKTUR & PENGADAAN DISTRIBUTOR</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-455 uppercase block">No. Dokumen / Faktur</span>
                    <span className="font-semibold text-gray-855 text-sm flex items-center gap-1.5">
                      <Tag size={14} className="text-slate-400 shrink-0" />
                      <span>{selectedTransaction.doc_no || '-'}</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-455 uppercase block">Nomor Batch</span>
                    <span className="font-mono font-bold text-gray-855 text-sm flex items-center gap-1.5">
                      <Hash size={14} className="text-slate-400 shrink-0" />
                      <span>{selectedTransaction.batch_no || '-'}</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-455 uppercase block">Tanggal Kadaluwarsa (Expired)</span>
                    <span className="font-mono font-semibold text-gray-855 text-sm flex items-center gap-1.5">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <span>{selectedTransaction.expired_date ? formatDateShort(selectedTransaction.expired_date) : '-'}</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-455 uppercase block">Supplier / PBF</span>
                    <span className="font-semibold text-gray-855 text-sm flex items-center gap-1.5">
                      <Truck size={14} className="text-slate-400 shrink-0" />
                      <span>{selectedTransaction.supplier_name || '-'}</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-455 uppercase block">Petugas Pengantar PBF</span>
                    <span className="font-semibold text-gray-855 text-sm flex items-center gap-1.5">
                      <User size={14} className="text-slate-400 shrink-0" />
                      <span>{selectedTransaction.deliverer || '-'}</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-bold text-gray-455 uppercase block">Karyawan Penerima Apotek</span>
                    <span className="font-semibold text-gray-855 text-sm flex items-center gap-1.5">
                      <UserCheck size={14} className="text-slate-400 shrink-0" />
                      <span>{selectedTransaction.receiver || '-'}</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Rincian Tambahan / Operator */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest border-b pb-1.5 border-gray-150 flex items-center gap-1.5">
                <User size={14} className="text-gray-450" />
                <span>INFORMASI OPERATOR & PENCATATAN</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs text-gray-700">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-gray-455 uppercase block">Operator Pencatat</span>
                  <span className="font-semibold text-gray-855 text-sm flex items-center gap-1.5">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <span>{selectedTransaction.operator_name || 'Sistem (Bawaan)'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Keterangan / Catatan */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block">Catatan Keterangan</span>
              <div className="bg-slate-50 p-4 rounded-xl border border-gray-150 text-gray-700 italic text-xs leading-relaxed">
                {selectedTransaction.notes || 'Tidak ada catatan keterangan khusus untuk transaksi ini.'}
              </div>
            </div>

          </div>

          {/* Action Footer */}
          <div className="p-5 border-t border-gray-150 bg-gray-50 flex justify-between items-center print:hidden">
            {isAdmin ? (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer hover:scale-[1.01]"
              >
                <Trash2 size={14} />
                <span>Batalkan Transaksi</span>
              </button>
            ) : (
              <div className="text-[10px] text-gray-400 italic">Hanya Administrator yang memiliki akses untuk pembatalan transaksi.</div>
            )}
            <button 
              onClick={() => setSelectedTransaction(null)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Kembali Ke Laporan
            </button>
          </div>

        </div>

        {/* Modal Konfirmasi Hapus Kustom */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-150 max-w-sm w-full p-6 text-center space-y-4">
              
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                <AlertTriangle size={24} />
              </div>
              
              <div className="space-y-1">
                <h4 className="text-base font-bold text-gray-800">Konfirmasi Pembatalan</h4>
                <p className="text-xs text-gray-550 leading-relaxed px-2">
                  Apakah Anda yakin ingin membatalkan/menghapus transaksi ini? Tindakan ini akan mengoreksi stok obat kembali secara otomatis.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-gray-150"
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    executeHapusTransaksi(selectedTransaction);
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-rose-200"
                >
                  Ya, Hapus
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    );
  }

  // Kalkulasi Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRiwayat.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRiwayat.length / itemsPerPage);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  // TAMPILAN UTAMA TABEL & FILTER LAPORAN
  return (
    <div className="space-y-6 font-sans relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border text-xs font-bold transition-all duration-300 transform translate-y-0 scale-100 ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          toast.type === 'info' ? 'bg-slate-50 text-slate-700 border-slate-200 shadow-sm' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {toast.type === 'info' && <Loader2 className="animate-spin text-slate-550" size={14} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Dokumen untuk Cetak (Hanya Muncul saat Print) */}
      <div className="hidden print:block text-center border-b-2 border-double border-gray-400 pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-wide">Apotek ABC</h1>
        <p className="text-sm font-medium text-gray-600">JL. H. ILYAS YAKUB ( SIMPANG TUGU PAINAN )</p>
        <h2 className="text-md font-bold uppercase mt-3 tracking-wider underline">LAPORAN MUTASI & TRANSAKSI OBAT</h2>
        <p className="text-xs text-gray-500 mt-1 font-mono">
          Periode Filter: {startDate || 'Awal'} s/d {endDate || 'Sekarang'}
        </p>
      </div>

      {/* Header Halaman (Sembunyikan saat Print) */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-150 pb-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            <BookOpen className="text-emerald-600" size={24} />
            <span>Laporan Riwayat Transaksi</span>
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">Analisis riwayat perputaran stok, nilai penjualan, dan belanja obat.</p>
        </div>
        
        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/60 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow transition-all inline-flex items-center gap-2 hover:scale-[1.02] cursor-pointer"
        >
          {isExporting ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              <span>Mengekspor...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet size={16} />
              <span>Ekspor Excel</span>
            </>
          )}
        </button>
      </div>

      {/* Panel Filter Transaksi (Sembunyikan saat Print) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        {/* Kolom Pencarian */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Search size={12} />
            <span>Cari Obat / Faktur / Batch</span>
          </label>
          <input 
            type="text" 
            placeholder="Ketik kata kunci..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
          />
        </div>

        {/* Filter Tipe */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Filter size={12} />
            <span>Tipe Transaksi</span>
          </label>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value as any)} 
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
          >
            <option value="ALL">Semua Transaksi</option>
            <option value="IN">Obat Masuk (IN)</option>
            <option value="OUT">Obat Keluar (OUT)</option>
          </select>
        </div>

        {/* Tanggal Mulai */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={12} />
            <span>Tanggal Mulai</span>
          </label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
          />
        </div>

        {/* Tanggal Selesai */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={12} />
            <span>Tanggal Selesai</span>
          </label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="w-full p-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
          />
        </div>
      </div>

      {/* Ringkasan Akumulasi Metrik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Belanja */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-gray-455 text-[10px] font-bold uppercase tracking-wider block">Total Pengadaan (IN)</span>
            <h4 className="text-lg font-extrabold text-gray-800 font-mono">
              Rp {totalBelanjaVal.toLocaleString('id-ID')}
            </h4>
          </div>
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shadow-inner shrink-0">
            <Coins size={20} />
          </div>
        </div>

        {/* Pendapatan */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-gray-455 text-[10px] font-bold uppercase tracking-wider block">Total Penjualan (OUT)</span>
            <h4 className="text-lg font-extrabold text-gray-800 font-mono">
              Rp {totalPenjualanVal.toLocaleString('id-ID')}
            </h4>
          </div>
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shadow-inner shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Qty IN */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-gray-455 text-[10px] font-bold uppercase tracking-wider block">Volume Masuk</span>
            <h4 className="text-lg font-extrabold text-gray-800 font-mono">
              {totalQtyIn.toLocaleString('id-ID')} Item
            </h4>
          </div>
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shadow-inner shrink-0">
            <Pill size={20} />
          </div>
        </div>

        {/* Qty OUT */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <span className="text-gray-455 text-[10px] font-bold uppercase tracking-wider block">Volume Keluar</span>
            <h4 className="text-lg font-extrabold text-gray-800 font-mono">
              {totalQtyOut.toLocaleString('id-ID')} Item
            </h4>
          </div>
          <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center shadow-inner shrink-0">
            <Pill size={20} />
          </div>
        </div>
      </div>

      {/* Tabel Utama Laporan */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden max-w-5xl mx-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                <th className="p-4 w-44">Tanggal & Waktu</th>
                <th className="p-4">Obat / Kategori</th>
                <th className="p-4 text-center w-28">Tipe</th>
                <th className="p-4 text-center w-28">Jumlah</th>
                <th className="p-4 text-right w-32">Total Harga</th>
                <th className="p-4 text-center w-28 print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400 italic text-sm">
                    Tidak ditemukan data transaksi yang sesuai dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                currentItems.map((t) => {
                  const totalRow = t.quantity * t.cost_price;
                  return (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-slate-50/70 transition-all">
                      <td className="p-4 font-mono text-gray-400 font-semibold">{formatDate(t.created_at)}</td>
                      <td className="p-4">
                        <div className="text-gray-850 font-bold text-sm tracking-tight">{t.obat_name}</div>
                        <div className="text-[10px] text-emerald-600 font-bold mt-0.5">{t.category_name || '-'}</div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border inline-flex items-center justify-center gap-0.5 w-16 ${
                          t.type === 'IN' 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                          {t.type === 'IN' ? <ArrowDownLeft size={8} /> : <ArrowUpRight size={8} />}
                          <span>{t.type === 'IN' ? 'Masuk' : 'Keluar'}</span>
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-gray-800">
                        {t.quantity} {t.unit}
                      </td>
                      <td className="p-4 text-right font-extrabold text-slate-900 font-mono text-xs">
                        Rp {totalRow.toLocaleString('id-ID')}
                      </td>
                      <td className="p-4 text-center print:hidden">
                        <button
                          onClick={() => setSelectedTransaction(t)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-colors border border-emerald-150 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Rekap Data & Pagination Controls */}
        {filteredRiwayat.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-semibold print:hidden">
            <div>
              Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredRiwayat.length)} dari {filteredRiwayat.length} transaksi
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer font-bold bg-white"
                >
                  Sebelumnya
                </button>

                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-extrabold transition-all cursor-pointer ${
                      currentPage === page
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm shadow-emerald-100'
                        : 'border-gray-200 hover:bg-white text-gray-700 bg-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-white text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer font-bold bg-white"
                >
                  Selanjutnya
                </button>
              </div>
            )}
            
            <span className="font-mono text-[10px] text-gray-400">Apotek ABC © 2026</span>
          </div>
        )}
      </div>
    </div>
  );
}