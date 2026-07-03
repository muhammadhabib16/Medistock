import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, Pill, ClipboardList, PlusCircle, ArrowUpDown, FileText, Tags, LogOut, Activity, Truck, User } from 'lucide-react';

export default function Layout() {
  const location = useLocation();

  // Load user profile details
  const userRaw = localStorage.getItem("user");
  let username = "Apoteker";
  let role = "Admin";
  try {
    if (userRaw) {
      const parsed = JSON.parse(userRaw);
      username = parsed.username || username;
      role = parsed.role || role;
    }
  } catch (e) {
    console.error("Gagal membaca profil user:", e);
  }

  const isAdmin = role.toLowerCase() === 'admin';

  const getLinkClass = (path: string) => {
    const isActive = location.pathname === path;
    const baseClass = "flex items-center gap-3 p-2.5 rounded-xl transition-all text-xs font-bold select-none transform hover:translate-x-1 duration-200 cursor-pointer";
    if (isActive) {
      return `${baseClass} bg-emerald-600 text-white shadow-md shadow-emerald-950/20`;
    }
    return `${baseClass} text-slate-300 hover:bg-slate-800/80 hover:text-emerald-450`;
  };

  const getIconColor = (path: string) => {
    return location.pathname === path ? "text-white" : "text-slate-400 group-hover:text-emerald-400 transition-colors";
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white p-5 flex flex-col justify-between print:hidden border-r border-slate-800 shadow-xl">
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="flex items-center gap-2.5 mb-6 bg-slate-850/40 p-3 rounded-2xl border border-slate-800/60 shadow-inner">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Activity size={18} />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-wider leading-none">Apotek ABC</h1>
              <span className="text-[9px] text-emerald-400 font-extrabold uppercase tracking-widest block mt-1">Aplikasi Stok Obat</span>
            </div>
          </div>

          <nav className="space-y-1">
            <Link to="/" className={getLinkClass("/")}>
              <LayoutDashboard size={16} className={getIconColor("/")} />
              <span>Dashboard</span>
            </Link>
            <Link to="/obat" className={getLinkClass("/obat")}>
              <Pill size={16} className={getIconColor("/obat")} />
              <span>Daftar Obat</span>
            </Link>
            <Link to="/transaksi" className={getLinkClass("/transaksi")}>
              <ArrowUpDown size={16} className={getIconColor("/transaksi")} />
              <span>Transaksi</span>
            </Link>
            {isAdmin && (
              <Link to="/tambah-obat" className={getLinkClass("/tambah-obat")}>
                <PlusCircle size={16} className={getIconColor("/tambah-obat")} />
                <span>Tambah Obat</span>
              </Link>
            )}
            <Link to="/laporan" className={getLinkClass("/laporan")}>
              <FileText size={16} className={getIconColor("/laporan")} />
              <span>Laporan Transaksi</span>
            </Link>
            {isAdmin && (
              <Link to="/kategori" className={getLinkClass("/kategori")}>
                <Tags size={16} className={getIconColor("/kategori")} />
                <span>Manajemen Kategori</span>
              </Link>
            )}
            {isAdmin && (
              <Link to="/supplier" className={getLinkClass("/supplier")}>
                <Truck size={16} className={getIconColor("/supplier")} />
                <span>Manajemen Supplier</span>
              </Link>
            )}
            <Link to="/kartu-stok" className={getLinkClass("/kartu-stok")}>
              <ClipboardList size={16} className={getIconColor("/kartu-stok")} />
              <span>Kartu Stok Obat</span>
            </Link>
            <Link to="/profil" className={getLinkClass("/profil")}>
              <User size={16} className={getIconColor("/profil")} />
              <span>Pengaturan Profil</span>
            </Link>
          </nav>
        </div>
        
        {/* Footer/Logout button in sidebar */}
        <div className="border-t border-slate-800/80 pt-4 space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-850/40 rounded-xl border border-slate-800/60 shadow-inner">
            <div className="w-8 h-8 rounded-full bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{username}</p>
              <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">{role}</p>
            </div>
          </div>

          <button 
            onClick={() => {
              localStorage.removeItem("user");
              window.location.reload();
            }}
            className="flex items-center justify-center gap-2 w-full p-2.5 text-slate-400 hover:text-rose-450 hover:bg-rose-500/10 rounded-xl transition-all text-xs font-bold cursor-pointer border border-transparent hover:border-rose-550/10"
          >
            <LogOut size={14} />
            <span>Keluar Sistem</span>
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-8 overflow-y-auto print:p-0 print:overflow-visible">
        <Outlet />
      </div>
    </div>
  );
}