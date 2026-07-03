# 📦 Aplikasi Pengelolaan Obat Apotik (Medistock)

[![Tauri](https://img.shields.io/badge/Tauri-v2.0-blue?logo=tauri&logoColor=white)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-v19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3.0-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%9D%A4-brightgreen.svg)](https://opensource.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Aplikasi Desktop berkinerja tinggi yang dirancang untuk mengelola inventaris, transaksi pengadaan (stok masuk), pengeluaran (stok keluar), serta pelaporan obat secara terintegrasi pada **Apotek ABC**. Dibuat menggunakan **Tauri v2** dan **React 19**, aplikasi ini menawarkan ukuran file yang sangat ringan, konsumsi memori rendah, serta keamanan data lokal menggunakan database **SQLite**.

---

## 🛠️ Tech Stack & Dependensi

Aplikasi ini dibangun menggunakan kombinasi teknologi modern untuk menghadirkan pengalaman pengguna desktop yang mulus dan cepat:

| Komponen | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Framework Desktop** | [Tauri v2](https://tauri.app/) | Engine desktop berbasis Rust yang ringan & aman untuk membungkus frontend web. |
| **Frontend Library** | [React 19](https://react.dev/) | Library deklaratif untuk membangun antarmuka pengguna yang responsif. |
| **Bahasa Pemrograman** | [TypeScript](https://www.typescriptlang.org/) | Superset JavaScript dengan sistem pengetikan statis untuk meminimalkan bug. |
| **Database** | [SQLite](https://sqlite.org/) (via `@tauri-apps/plugin-sql`) | Database relasional lokal yang cepat untuk menyimpan seluruh data operasional apotek. |
| **Utility Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Kerangka kerja CSS untuk desain antarmuka modern dan responsif. |
| **Navigasi** | [React Router v7](https://reactrouter.com/) | Router untuk menangani perpindahan halaman internal aplikasi. |
| **Ikon** | [Lucide React](https://lucide.dev/) | Kumpulan ikon SVG modern dan konsisten. |
| **Testing** | [Playwright](https://playwright.dev/) | Alat pengujian end-to-end (E2E) otomatis untuk memastikan keandalan fitur. |

---

## ✨ Fitur-Fitur Utama

Aplikasi ini dilengkapi dengan fitur pengelolaan apotek yang komprehensif:

1. **Dashboard Interaktif & Ringkasan Real-Time**
   - Panel informasi yang menampilkan total jenis obat, jumlah kategori, dan total supplier mitra.
   - Sistem deteksi dini **Stok Kritis** (stok saat ini < stok minimum) untuk mencegah kekosongan obat secara proaktif.

2. **Manajemen Pengguna & Keamanan (RBAC)**
   - Autentikasi aman bagi pengguna.
   - **Role-based Access Control**: Hak akses khusus bagi **Admin** (akses penuh ke seluruh fitur dan pengaturan) dan **Staf/User** (akses terbatas untuk operasional harian).
   - Fitur keamanan reset password mandiri melalui pertanyaan keamanan khusus.

3. **Katalog Inventaris Obat Lengkap**
   - Pencarian obat yang responsif, filter berdasarkan kategori, serta informasi detail (SKU, nama obat, harga, stok minimum, unit, dan stok saat ini).
   - Penambahan, pembaruan, dan penghapusan data obat (fitur eksklusif Administrator).

4. **Pengelolaan Data Master (Kategori & Supplier)**
   - Manajemen kategori obat (menambah, mengubah, dan menghapus kategori).
   - Database Supplier lengkap dengan nama kontak, nomor telepon, dan alamat untuk mempermudah proses pengadaan/kontak vendor.

5. **Pencatatan Transaksi Stok Masuk & Keluar**
   - Fitur transaksi stok masuk (`IN`) untuk mencatat pengadaan obat baru dari supplier, dan stok keluar (`OUT`) untuk mencatat penggunaan/penjualan obat.
   - Pencatatan informasi dokumen penting seperti **Nomor Dokumen/Faktur**, **Nomor Batch**, **Tanggal Kadaluarsa (Expired Date)**, **Nama Pengantar**, **Penerima**, serta **Catatan Tambahan** demi kepatuhan regulasi farmasi.

6. **Kartu Stok (Stock Card)**
   - Catatan mutasi log detail dari setiap obat yang merekam kronologi perubahan stok masuk dan keluar secara terperinci.
   - Fitur **Ekspor Kartu Stok ke format Microsoft Word (.doc)** untuk kemudahan dokumentasi fisik atau pelaporan eksternal.

7. **Laporan & Analisis Transaksi**
   - Halaman pelaporan yang menyajikan riwayat seluruh transaksi masuk dan keluar.
   - Dilengkapi filter pencarian lanjutan berdasarkan rentang tanggal, jenis transaksi, dan obat spesifik.
   - Fitur **Ekspor Laporan Transaksi ke format Microsoft Excel** untuk keperluan audit, analisis data lebih lanjut, atau pembukuan keuangan.

---

## 📂 Struktur Database (Skema SQLite)

Aplikasi menggunakan skema database relasional berikut di SQLite:
* `users`: Menyimpan data akun pengguna, role (`admin` / `user`), password, dan pertanyaan keamanan.
* `categories`: Pengelompokan jenis obat.
* `suppliers`: Informasi vendor/rekanan penyedia obat.
* `drugs`: Master data obat (terhubung ke tabel `categories` dan mencakup detail `min_stock` & `current_stock`).
* `stock_transactions`: Log transaksi pengadaan & pengeluaran obat (terhubung ke tabel `drugs`, `suppliers`, dan `users`).

---

## 🚀 Panduan Instalasi & Penggunaan

### Prasyarat Sebelum Instalasi

Pastikan komputer Anda memiliki perangkat lunak berikut terinstal:
1. **Node.js** (versi 18 ke atas) -> [Unduh Node.js](https://nodejs.org/)
2. **Rust & Build Tools** (wajib untuk Tauri) -> ikuti panduan instalasi di [Tauri Prerequisites Guide](https://tauri.app/start/prerequisites/)

### Langkah-Langkah Menjalankan Proyek

1. **Klon Repositori ini:**
   ```bash
   git clone <url-repository-anda>
   cd sistem-pengadaan-obat-apotik
   ```

2. **Instal Dependensi NPM:**
   ```bash
   npm install
   ```

3. **Jalankan Aplikasi dalam Mode Pengembangan (Development Mode):**
   ```bash
   npm run tauri dev
   ```
   *Perintah ini akan membuka jendela aplikasi desktop dan memuat antarmuka React secara langsung.*

4. **Membangun Aplikasi untuk Produksi (Production Build / Installer):**
   ```bash
   npm run tauri build
   ```
   *Installer aplikasi desktop (seperti `.msi` untuk Windows) akan dihasilkan di folder `src-tauri/target/release/bundle/`.*

---

## 🔒 Informasi Kredensial Default

Setelah database berhasil diinisialisasi pertama kali, Anda dapat masuk menggunakan akun administrator bawaan berikut:

* **Username:** `admin`
* **Password:** `admin123`
* **Pertanyaan Keamanan:** `Apa nama apotek ini?`
* **Jawaban Keamanan:** `apotek abc`

> [!WARNING]
> Harap segera mengubah password default ini pada menu **Profil Saya** demi menjaga keamanan sistem informasi apotek Anda.

---

## 🧪 Menjalankan Pengujian (Testing)

Proyek ini menggunakan **Playwright** untuk melakukan pengujian fungsionalitas secara otomatis:
```bash
npx playwright test
```

---

## 🤝 Kontribusi & Open Source

Proyek ini adalah **proyek open source (sumber terbuka)**! Saya mendedikasikan proyek ini agar dapat dipelajari, dikembangkan, dan dimanfaatkan oleh siapa saja. 

Semua bentuk kontribusi sangat dihargai:
* **Melaporkan Bug:** Buka *Issue* jika Anda menemukan kesalahan sistem atau celah keamanan.
* **Mengajukan Fitur:** Ajukan ide atau saran fitur baru untuk meningkatkan kualitas aplikasi.
* **Pull Request (PR):** Kirimkan perbaikan kode atau peningkatan fitur secara langsung dengan melakukan fork pada repositori ini terlebih dahulu.

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **Lisensi MIT** - bebas digunakan, dimodifikasi, dan didistribusikan baik untuk keperluan komersial maupun non-komersial. Untuk informasi lebih lanjut, silakan lihat berkas lisensi yang terkait.
