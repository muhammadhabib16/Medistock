import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { Link } from 'react-router-dom';
import { 
  Pill, 
  AlertTriangle, 
  ArrowUpDown, 
  History, 
  CheckCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar 
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalDrugs: 0,
    lowStockCount: 0,
    transactionsToday: 0,
    totalValue: 0
  });
  const [lowStockDrugs, setLowStockDrugs] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  // Mengambil tanggal hari ini terformat
  const [currentDateString, setCurrentDateString] = useState('');

  useEffect(() => {
    // Format tanggal lokal Indonesia
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' };
    setCurrentDateString(new Date().toLocaleDateString('id-ID', options));

    const fetchDashboardData = async () => {
      try {
        const db = await Database.load('sqlite:apotek.db');
        
        // 1. Total jenis obat
        const totalResult: any[] = await db.select('SELECT COUNT(*) as count FROM drugs');
        const totalDrugs = totalResult[0]?.count || 0;

        // 2. Transaksi hari ini
        const transResult: any[] = await db.select(
          "SELECT COUNT(*) as count FROM stock_transactions WHERE date(created_at) = date('now', 'localtime')"
        );
        const transactionsToday = transResult[0]?.count || 0;

        // 3. Obat stok rendah (low stock drugs)
        const lowStockDrugsResult: any[] = await db.select(
          `SELECT drugs.*, categories.name as category_name 
           FROM drugs 
           LEFT JOIN categories ON drugs.category_id = categories.id 
           WHERE drugs.current_stock <= drugs.min_stock 
           ORDER BY drugs.current_stock ASC`
        );
        const lowStockCount = lowStockDrugsResult.length;

        // 4. Total nilai investasi stok (current_stock * price)
        const valueResult: any[] = await db.select('SELECT SUM(current_stock * price) as total_value FROM drugs');
        const totalValue = valueResult[0]?.total_value || 0;

        // 5. 5 Transaksi terbaru
        const recentResult: any[] = await db.select(
          `SELECT t.*, d.name as drug_name, d.unit
           FROM stock_transactions t
           JOIN drugs d ON t.drug_id = d.id
           ORDER BY t.created_at DESC, t.id DESC
           LIMIT 5`
        );

        setStats({ totalDrugs, lowStockCount, transactionsToday, totalValue });
        setLowStockDrugs(lowStockDrugsResult);
        setRecentTransactions(recentResult);
      } catch (err) {
        console.error('Gagal memuat data dashboard:', err);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Helper pemformat waktu dan tanggal untuk umpan aktivitas
  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const formatDateShort = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      return `${day}/${month}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-150 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Dashboard Utama</h2>
          <p className="text-gray-500 text-sm mt-0.5">Ringkasan kesehatan finansial, inventaris, dan pengadaan obat apotek.</p>
        </div>
        <div className="mt-2 md:mt-0 bg-emerald-50 border border-emerald-150 px-4 py-2 rounded-xl flex items-center gap-2 text-emerald-700 font-semibold text-sm shadow-sm">
          <Calendar size={18} />
          <span>{currentDateString}</span>
        </div>
      </div>

      {/* Grid Kartu Statistik Utama (4 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Obat */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Jenis Obat</span>
            <h3 className="text-3xl font-extrabold text-gray-800">{stats.totalDrugs}</h3>
            <Link to="/obat" className="text-emerald-600 hover:text-emerald-800 text-xs font-bold inline-flex items-center gap-1 mt-1 transition-colors">
              Lihat Daftar &rarr;
            </Link>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
            <Pill size={24} />
          </div>
        </div>

        {/* Stok Menipis */}
        <div className={`bg-white p-6 rounded-2xl shadow-sm border hover:shadow-md transition-shadow flex items-center justify-between ${
          stats.lowStockCount > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-gray-200'
        }`}>
          <div className="space-y-1">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Stok Menipis</span>
            <h3 className={`text-3xl font-extrabold ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {stats.lowStockCount}
            </h3>
            <span className={`text-xs font-bold ${stats.lowStockCount > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
              {stats.lowStockCount > 0 ? 'Butuh Restok Segera!' : 'Seluruh Stok Aman'}
            </span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-inner ${
            stats.lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Transaksi Hari Ini */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Transaksi Hari Ini</span>
            <h3 className="text-3xl font-extrabold text-gray-800">{stats.transactionsToday}</h3>
            <Link to="/laporan" className="text-emerald-600 hover:text-emerald-800 text-xs font-bold inline-flex items-center gap-1 mt-1 transition-colors">
              Lihat Laporan &rarr;
            </Link>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shadow-inner">
            <ArrowUpDown size={24} />
          </div>
        </div>
      </div>

      {/* Panel Utama (Split Layout 2 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Detail Stok Menipis (2/3 Lebar) */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-150 bg-gray-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-500" />
                <span>Detail Peringatan Stok Menipis</span>
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Segera lakukan pembelian stok pada item-item berikut.</p>
            </div>
            {stats.lowStockCount > 0 && (
              <Link 
                to="/transaksi" 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 hover:scale-[1.02]"
              >
                + Tambah Pengadaan
              </Link>
            )}
          </div>
          
          <div className="p-5">
            {lowStockDrugs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                <CheckCircle size={44} className="text-emerald-500" />
                <h4 className="text-emerald-600 font-bold text-base">Semua Stok Obat Aman!</h4>
                <p className="text-gray-400 text-xs max-w-sm leading-relaxed">
                  Tidak ada obat di apotek Anda yang berada di bawah batas minimum persediaan saat ini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-600">
                      <th className="p-3">Nama Obat</th>
                      <th className="p-3 w-28">SKU</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3 text-center w-24">Stok Saat Ini</th>
                      <th className="p-3 text-center w-24">Batas Min</th>
                      <th className="p-3 text-center w-20">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockDrugs.map((drug) => (
                      <tr key={drug.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="p-3 font-semibold text-gray-800">{drug.name}</td>
                        <td className="p-3 font-mono text-gray-500">{drug.sku || '-'}</td>
                        <td className="p-3">
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 font-bold text-[10px]">
                            {drug.category_name || 'Tanpa Kategori'}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-rose-600">
                          {drug.current_stock} {drug.unit}
                        </td>
                        <td className="p-3 text-center text-gray-500 font-semibold">
                          {drug.min_stock} {drug.unit}
                        </td>
                        <td className="p-3 text-center">
                          <Link 
                            to="/transaksi" 
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md font-bold text-[10px] transition-colors border border-emerald-150 inline-block"
                          >
                            Restok
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Umpan Transaksi Terbaru (1/3 Lebar) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-gray-150 bg-gray-50/50">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <History size={18} className="text-emerald-500" />
              <span>Aktivitas Transaksi Terbaru</span>
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">Daftar mutasi stok obat yang baru saja diproses.</p>
          </div>
          
          <div className="p-5 flex-1 flex flex-col justify-between">
            {recentTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 italic text-xs space-y-1">
                <span>📭</span>
                <span>Belum ada transaksi terdaftar</span>
              </div>
            ) : (
              <div className="space-y-4">
                {recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-start gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    {/* Badge Tipe */}
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border w-16 flex items-center justify-center gap-0.5 shrink-0 ${
                      tx.type === 'IN' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}>
                      {tx.type === 'IN' ? (
                        <>
                          <ArrowDownLeft size={10} />
                          <span>Masuk</span>
                        </>
                      ) : (
                        <>
                          <ArrowUpRight size={10} />
                          <span>Keluar</span>
                        </>
                      )}
                    </span>
                    
                    {/* Info Obat */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-gray-800 truncate" title={tx.drug_name}>
                        {tx.drug_name}
                      </h4>
                      <p className="text-[10px] text-gray-500 font-medium">
                        Jumlah: <span className="font-bold text-gray-700">{tx.quantity} {tx.unit}</span>
                        {tx.type === 'IN' && tx.doc_no && (
                          <span className="block text-[9px] text-gray-400 truncate">No. Dok: {tx.doc_no}</span>
                        )}
                      </p>
                    </div>

                    {/* Waktu */}
                    <div className="text-right shrink-0 text-[10px] font-semibold text-gray-400 font-mono">
                      <div>{formatTime(tx.created_at)}</div>
                      <div className="text-[9px] text-gray-300 font-normal">{formatDateShort(tx.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recentTransactions.length > 0 && (
              <Link 
                to="/laporan" 
                className="text-center text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:underline pt-4 border-t border-gray-100 block transition-colors mt-4"
              >
                Lihat Seluruh Riwayat Laporan &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


