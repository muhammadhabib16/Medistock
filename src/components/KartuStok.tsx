import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { Activity, Truck, UserCheck, FileText, Loader2 } from 'lucide-react';

export default function KartuStok() {
  const [drugs, setDrugs] = useState<any[]>([]);
  const [selectedDrugId, setSelectedDrugId] = useState<string>('');
  const [drugInfo, setDrugInfo] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Default filter tanggal: mulai dari tanggal 1 bulan berjalan s.d. hari ini
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Load daftar obat untuk pilihan dropdown
  useEffect(() => {
    const fetchDrugs = async () => {
      try {
        const db = await Database.load('sqlite:apotek.db');
        const res: any[] = await db.select('SELECT id, name FROM drugs ORDER BY name ASC');
        setDrugs(res);
      } catch (err) {
        console.error('Gagal mengambil daftar obat:', err);
      }
    };
    fetchDrugs();
  }, []);

  // Auto-dismiss toast setelah 4 detik
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Memuat data kartu stok obat secara reaktif saat obat atau tanggal filter berubah
  useEffect(() => {
    const fetchLedgerData = async () => {
      if (!selectedDrugId) {
        setDrugInfo(null);
        setLedger([]);
        setOpeningBalance(0);
        return;
      }

      try {
        const db = await Database.load('sqlite:apotek.db');
        
        // 1. Ambil detail obat
        const drugRes: any[] = await db.select(
          'SELECT drugs.*, categories.name as category_name FROM drugs LEFT JOIN categories ON drugs.category_id = categories.id WHERE drugs.id = $1',
          [selectedDrugId]
        );
        if (drugRes.length > 0) {
          setDrugInfo(drugRes[0]);
        }

        // 2. Hitung Saldo Awal (semua transaksi masuk/keluar sebelum startDate)
        const opRes: any[] = await db.select(
          `SELECT SUM(CASE WHEN type = 'IN' THEN quantity ELSE -quantity END) as op_bal 
           FROM stock_transactions 
           WHERE drug_id = $1 AND created_at < $2`,
          [selectedDrugId, startDate + ' 00:00:00']
        );
        const opBalance = opRes[0]?.op_bal || 0;
        setOpeningBalance(opBalance);

        // 3. Ambil transaksi obat dalam rentang tanggal secara kronologis (ASC)
        const ledgerRes: any[] = await db.select(
          `SELECT t.*, s.name as supplier_name 
           FROM stock_transactions t
           LEFT JOIN suppliers s ON t.supplier_id = s.id
           WHERE t.drug_id = $1 AND t.created_at >= $2 AND t.created_at <= $3
           ORDER BY t.created_at ASC, t.id ASC`,
          [selectedDrugId, startDate + ' 00:00:00', endDate + ' 23:59:59']
        );

        // 4. Hitung saldo sisa stok secara kumulatif dimulai dari Saldo Awal
        let balance = opBalance;
        const ledgerWithBalance = ledgerRes.map((t) => {
          if (t.type === 'IN') {
            balance += t.quantity;
          } else {
            balance -= t.quantity;
          }
          return { ...t, balance };
        });

        setLedger(ledgerWithBalance);
      } catch (err) {
        console.error('Gagal mengambil data riwayat stok:', err);
      }
    };

    fetchLedgerData();
  }, [selectedDrugId, startDate, endDate]);

  // Helper formatting tanggal
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = String(date.getFullYear()).slice(-2);
      return `${day}/${month}-${year}`;
    } catch {
      return dateStr;
    }
  };

  // Fungsi Ekspor Kartu Stok ke format Word (.doc)
  const handleExportWord = () => {
    if (!drugInfo) return;
    setIsExporting(true);
    setToast({ message: 'Mengekspor kartu stok ke Word...', type: 'info' });

    setTimeout(() => {
      const dateStr = new Date().toISOString().split('T')[0];

      // Baris tabel mutasi
      const tableRows = [
        // Baris Saldo Awal
        `
        <tr style="background-color: #f8fafc;">
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">-</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; font-weight: bold; color: #334155;">SALDO AWAL (Persediaan Sebelum Periode)</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">-</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">-</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">-</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center; font-weight: bold; background-color: #fef9c3;">${openingBalance}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">-</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">-</td>
          <td style="border: 1px solid #94a3b8; padding: 6px;">-</td>
          <td style="border: 1px solid #94a3b8; padding: 6px;">-</td>
        </tr>
        `,
        ...ledger.map((row) => `
        <tr>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">${row.doc_no || '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px;">${row.supplier_name || '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center;">${formatDate(row.created_at)}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center; font-weight: bold; color: #16a34a;">${row.type === 'IN' ? row.quantity : ''}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center; font-weight: bold; color: #dc2626;">${row.type === 'OUT' ? row.quantity : ''}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center; font-weight: bold; background-color: #fef9c3;">${row.balance}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center; font-family: monospace;">${row.batch_no || '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px; text-align: center; font-family: monospace;">${row.expired_date ? formatDate(row.expired_date) : '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 6px;">
            ${row.type === 'IN' 
              ? [row.deliverer, row.receiver].filter(Boolean).join(' / ') 
              : '-'
            }
          </td>
          <td style="border: 1px solid #94a3b8; padding: 6px; color: #64748b;">${row.notes || '-'}</td>
        </tr>
        `)
      ].join('');

      const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>Kartu Barang - ${drugInfo.name}</title>
          <meta charset="utf-8">
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            body { font-family: 'Arial', sans-serif; font-size: 11pt; color: #334155; }
            .header-table { width: 100%; border-bottom: 2px double #475569; margin-bottom: 20px; }
            .title { font-size: 16pt; font-weight: bold; text-align: center; text-transform: uppercase; }
            .subtitle { font-size: 11pt; text-align: center; color: #475569; }
            .info-table { width: 100%; margin-bottom: 20px; font-size: 10pt; }
            .info-label { color: #64748b; font-weight: bold; width: 100px; }
            .info-value { font-weight: bold; border-bottom: 1px dashed #cbd5e1; }
            .ledger-table { width: 100%; border-collapse: collapse; font-size: 9pt; }
            .ledger-th { background-color: #f1f5f9; color: #334155; font-weight: bold; border: 1px solid #94a3b8; padding: 8px; text-align: left; }
            .signature-section { margin-top: 40px; text-align: right; }
            .signature-box { display: inline-block; text-align: center; width: 200px; font-size: 10pt; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="title">Apotek ABC</td>
            </tr>
            <tr>
              <td class="subtitle">JL. SESAME STREET NO. 123</td>
            </tr>
            <tr>
              <td style="text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline; padding-top: 15px;">KARTU BARANG</td>
            </tr>
            <tr>
              <td style="text-align: center; font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase; padding-bottom: 10px;">
                Periode: ${formatDate(startDate)} s.d. ${formatDate(endDate)}
              </td>
            </tr>
          </table>

          <table class="info-table">
            <tr>
              <td class="info-label">Nama Obat</td>
              <td>:</td>
              <td class="info-value">${drugInfo.name}</td>
              <td style="width: 40px;"></td>
              <td class="info-label">Kode / SKU</td>
              <td>:</td>
              <td class="info-value" style="font-family: monospace;">${drugInfo.sku || '-'}</td>
            </tr>
            <tr>
              <td class="info-label">Satuan</td>
              <td>:</td>
              <td class="info-value" style="text-transform: uppercase;">${drugInfo.unit}</td>
              <td></td>
              <td class="info-label">Kategori</td>
              <td>:</td>
              <td class="info-value">${drugInfo.category_name || '-'}</td>
            </tr>
          </table>

          <table class="ledger-table">
            <thead>
              <tr>
                <th class="ledger-th" style="text-align: center; width: 60px;">No. Dok</th>
                <th class="ledger-th">PBF (Supplier)</th>
                <th class="ledger-th" style="text-align: center; width: 70px;">Tgl</th>
                <th class="ledger-th" style="text-align: center; width: 50px;">Masuk</th>
                <th class="ledger-th" style="text-align: center; width: 50px;">Keluar</th>
                <th class="ledger-th" style="text-align: center; width: 60px;">Sisa</th>
                <th class="ledger-th" style="text-align: center; width: 70px;">Batch</th>
                <th class="ledger-th" style="text-align: center; width: 70px;">Exp</th>
                <th class="ledger-th">Petugas</th>
                <th class="ledger-th">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <!-- Tanda Tangan -->
          <table style="width: 100%; margin-top: 50px; border: none; border-collapse: collapse;">
            <tr>
              <td style="width: 65%; border: none;"></td>
              <td style="width: 35%; text-align: center; border: none; font-size: 10pt; font-family: Arial, sans-serif;">
                <p style="margin: 0 0 60px 0; padding: 0; color: #334155;">Penanggung Jawab,</p>
                <p style="margin: 0; padding: 0; font-weight: bold; color: #334155;">(....................................)</p>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\uFEFF' + htmlContent], { type: 'application/msword;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Kartu_Stok_${drugInfo.name.replace(/\s+/g, '_')}_${dateStr}.doc`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
      setToast({ message: 'Kartu stok berhasil diekspor ke Word!', type: 'success' });
    }, 1200);
  };

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
      
      {/* Selector & Filter Area */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Pilih Obat</label>
          <select
            value={selectedDrugId}
            onChange={(e) => setSelectedDrugId(e.target.value)}
            className="w-full p-2.5 border rounded-lg bg-white text-sm focus:ring-emerald-500 focus:border-emerald-500 shadow-sm font-semibold text-gray-800"
          >
            <option value="">-- Pilih Obat --</option>
            {drugs.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Mulai Tanggal</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
            className="w-full p-2.5 border rounded-lg bg-white text-sm focus:ring-emerald-500 focus:border-emerald-500 shadow-sm font-semibold text-gray-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Sampai Tanggal</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            className="w-full p-2.5 border rounded-lg bg-white text-sm focus:ring-emerald-500 focus:border-emerald-500 shadow-sm font-semibold text-gray-800"
          />
        </div>
      </div>

      {selectedDrugId && drugInfo && (
        <div className="flex justify-end max-w-4xl mx-auto mb-2">
          <button
            onClick={handleExportWord}
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
                <FileText size={16} />
                <span>Ekspor ke Word</span>
              </>
            )}
          </button>
        </div>
      )}

      {selectedDrugId && drugInfo ? (
        /* Tampilan Kartu Stok Fisik Apotek */
        <div className="bg-white p-8 rounded-xl shadow-md border border-gray-300 max-w-4xl mx-auto space-y-6 text-gray-800">
          
          {/* Header Kartu */}
          <div className="text-center border-b-2 border-double border-gray-400 pb-4 relative">
            <div className="absolute left-2 top-1 text-rose-500 opacity-80">
              <Activity size={28} />
            </div>
            
            <h1 className="text-xl font-bold uppercase tracking-wide">Apotek ABC</h1>
            <p className="text-sm font-medium text-gray-600">JL. H. ILYAS YAKUB</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">( SIMPANG TUGU PAINAN )</p>
            
            <h2 className="text-md font-bold uppercase mt-4 tracking-wider underline">KARTU BARANG</h2>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
              Periode: {formatDate(startDate)} s.d. {formatDate(endDate)}
            </p>
          </div>

          {/* Info Obat */}
          <div className="grid grid-cols-2 gap-4 text-sm font-medium border-b border-gray-200 pb-4">
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-24 text-gray-500">NAMA</span>
                <span className="mr-2">:</span>
                <span className="font-bold text-gray-900 border-b border-dashed border-gray-400 flex-1">{drugInfo.name}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-gray-500">SATUAN</span>
                <span className="mr-2">:</span>
                <span className="text-gray-800 border-b border-dashed border-gray-400 flex-1 uppercase font-semibold">{drugInfo.unit}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex">
                <span className="w-24 text-gray-500">KODE/SKU</span>
                <span className="mr-2">:</span>
                <span className="text-gray-800 font-mono border-b border-dashed border-gray-400 flex-1">{drugInfo.sku || '-'}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-gray-500">KATEGORI</span>
                <span className="mr-2">:</span>
                <span className="text-gray-800 border-b border-dashed border-gray-400 flex-1">{drugInfo.category_name || '-'}</span>
              </div>
            </div>
          </div>

          {/* Tabel Ledger Kartu */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-xs text-left">
              <thead>
                <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-300 divide-x divide-gray-300">
                  <th className="p-2 border-gray-300 text-center w-20">No. Dok</th>
                  <th className="p-2 border-gray-300">PBF (Supplier)</th>
                  <th className="p-2 border-gray-300 text-center w-20">Tgl</th>
                  <th className="p-2 border-gray-300 text-center w-14">Masuk</th>
                  <th className="p-2 border-gray-300 text-center w-14">Keluar</th>
                  <th className="p-2 border-gray-300 text-center w-16 bg-yellow-50/50">Sisa</th>
                  <th className="p-2 border-gray-300 text-center w-18">Batch</th>
                  <th className="p-2 border-gray-300 text-center w-14">Exp</th>
                  <th className="p-2 border-gray-300">Petugas (Del/Rec)</th>
                  <th className="p-2 border-gray-300">Ket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {/* Baris Saldo Awal Khusus Sebelum Periode */}
                <tr className="bg-slate-50 border-b border-gray-200 italic text-gray-500 font-semibold divide-x divide-gray-200">
                  <td className="p-2 text-center text-gray-400">-</td>
                  <td className="p-2 text-slate-700">SALDO AWAL (Persediaan Sebelum Periode)</td>
                  <td className="p-2 text-center text-gray-400">-</td>
                  <td className="p-2 text-center text-gray-400">-</td>
                  <td className="p-2 text-center text-gray-400">-</td>
                  <td className="p-2 text-center font-bold bg-yellow-50/50 text-slate-900">{openingBalance}</td>
                  <td className="p-2 text-center text-gray-400">-</td>
                  <td className="p-2 text-center text-gray-400">-</td>
                  <td className="p-2 text-center text-gray-400">-</td>
                  <td className="p-2 text-gray-400">-</td>
                </tr>

                {ledger.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 divide-x divide-gray-200 font-medium text-gray-800">
                    <td className="p-2 text-center text-gray-500">{row.doc_no || '-'}</td>
                    <td className="p-2 truncate max-w-[120px]" title={row.supplier_name}>
                      {row.supplier_name || '-'}
                    </td>
                    <td className="p-2 text-center">{formatDate(row.created_at)}</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">
                      {row.type === 'IN' ? row.quantity : ''}
                    </td>
                    <td className="p-2 text-center text-rose-600 font-bold">
                      {row.type === 'OUT' ? row.quantity : ''}
                    </td>
                    <td className="p-2 text-center font-bold bg-yellow-50/40 text-slate-900">
                      {row.balance}
                    </td>
                    <td className="p-2 text-center font-mono text-[10px]">{row.batch_no || '-'}</td>
                    <td className="p-2 text-center font-mono text-[10px]">
                      {row.expired_date ? formatDate(row.expired_date) : '-'}
                    </td>
                    <td className="p-2 text-center text-[10px] text-gray-600 leading-tight">
                      {row.type === 'IN' ? (
                        <div className="space-y-0.5">
                          {row.deliverer && (
                            <div className="flex items-center gap-1">
                              <Truck size={10} className="text-gray-400" />
                              <span>{row.deliverer}</span>
                            </div>
                          )}
                          {row.receiver && (
                            <div className="flex items-center gap-1">
                              <UserCheck size={10} className="text-gray-400" />
                              <span>{row.receiver}</span>
                            </div>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-2 text-gray-500 text-[10px]">{row.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Penanggung Jawab Footer */}
          <div className="flex justify-end pt-8 text-xs font-semibold text-gray-700">
            <div className="text-center w-48 space-y-12">
              <p>Penanggung Jawab</p>
              <p className="border-t border-gray-400 pt-1 text-gray-450 font-normal">(....................................)</p>
            </div>
          </div>
        </div>
      ) : (
        selectedDrugId && (
          <div className="p-6 text-center text-gray-500 bg-white rounded-xl shadow-sm border border-gray-200">
            Memuat data kartu stok...
          </div>
        )
      )}
    </div>
  );
}
