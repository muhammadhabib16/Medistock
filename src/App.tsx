import "./App.css";
import { initializeDatabase } from "./db/initDb";
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from "./components/Login";
import Layout from './components/Layout';
import InputObat from './components/InputObat';
import DaftarObat from "./components/DaftarObat";
import Transaksi from "./components/Transaksi";
import LaporanTransaksi from "./components/LaporanTransaksi";
import ManajemenKategori from "./components/ManajemenKategori";
import ManajemenSupplier from "./components/ManajemenSupplier";
import Dashboard from "./components/Dashboard";
import KartuStok from "./components/KartuStok";
import ProfilUser from "./components/ProfilUser";

function AdminRoute({ children }: { children: React.ReactNode }) {
  const userRaw = localStorage.getItem("user");
  let isAdmin = false;
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      isAdmin = parsed.role === 'admin';
    } catch {}
  }
  
  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 text-rose-800 font-bold rounded-2xl max-w-lg mx-auto mt-20 shadow-sm font-sans space-y-2">
        <h3 className="text-base font-extrabold uppercase tracking-wider">Akses Ditolak</h3>
        <p className="text-xs text-rose-600 font-medium">Maaf, halaman ini hanya dapat diakses oleh Administrator Apotek ABC.</p>
      </div>
    );
  }
  
  return <>{children}</>;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    initializeDatabase();
    if (localStorage.getItem("user")) setIsLoggedIn(true);
  }, []);

  if (!isLoggedIn) {
    return <Login onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="obat" element={<DaftarObat />} />
          <Route path="tambah-obat" element={<AdminRoute><InputObat /></AdminRoute>} />
          <Route path="transaksi" element={<Transaksi />} />
          <Route path="laporan" element={<LaporanTransaksi />} />
          <Route path="kategori" element={<AdminRoute><ManajemenKategori /></AdminRoute>} />
          <Route path="supplier" element={<AdminRoute><ManajemenSupplier /></AdminRoute>} />
          <Route path="kartu-stok" element={<KartuStok />} />
          <Route path="profil" element={<ProfilUser />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
