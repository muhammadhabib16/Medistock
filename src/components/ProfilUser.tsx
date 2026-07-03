import { useState, useEffect } from 'react';
import Database from '@tauri-apps/plugin-sql';
import { 
  User, 
  Lock, 
  Shield, 
  HelpCircle, 
  Check, 
  Eye, 
  EyeOff, 
  UserPlus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  X
} from 'lucide-react';

export default function ProfilUser() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'users'>('profile');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Form states for password change
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Form states for security question (Admin only)
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // States for Admin User Management
  const [users, setUsers] = useState<any[]>([]);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [resettingUser, setResettingUser] = useState<any>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  
  // Create / Edit User form states
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'apoteker'>('apoteker');
  const [formQuestion, setFormQuestion] = useState('Apa nama apotek ini?');
  const [formAnswer, setFormAnswer] = useState('');

  // Reset password form states
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPass, setShowResetPass] = useState(false);

  // Auto-dismiss notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load current user and list of users (if admin)
  const loadData = async () => {
    const cached = localStorage.getItem('user');
    if (cached) {
      const parsed = JSON.parse(cached);
      try {
        const db = await Database.load('sqlite:apotek.db');
        const res: any[] = await db.select('SELECT * FROM users WHERE id = $1', [parsed.id]);
        if (res.length > 0) {
          const userObj = res[0];
          setCurrentUser(userObj);
          setSecurityQuestion(userObj.security_question || '');
          setSecurityAnswer(userObj.security_answer || '');
        } else {
          setCurrentUser(parsed);
        }

        // Load all users if current user is admin
        if (parsed.role === 'admin') {
          const allUsers: any[] = await db.select('SELECT id, username, role, security_question FROM users ORDER BY username ASC');
          setUsers(allUsers);
        }
      } catch (err) {
        console.error('Gagal memuat detail profil:', err);
        setCurrentUser(parsed);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setNotification({ message: 'Harap isi semua kolom ganti password!', type: 'warning' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setNotification({ message: 'Password baru dan konfirmasi password tidak cocok!', type: 'warning' });
      return;
    }
    if (newPassword.length < 4) {
      setNotification({ message: 'Password baru harus minimal 4 karakter!', type: 'warning' });
      return;
    }

    try {
      const db = await Database.load('sqlite:apotek.db');
      
      // Verifikasi password lama
      const checkRes: any[] = await db.select('SELECT password FROM users WHERE id = $1', [currentUser.id]);
      if (checkRes.length === 0 || checkRes[0].password !== oldPassword) {
        setNotification({ message: 'Password lama Anda salah!', type: 'error' });
        return;
      }

      // Update password baru
      await db.execute('UPDATE users SET password = $1 WHERE id = $2', [newPassword, currentUser.id]);
      
      setNotification({ message: 'Password Anda berhasil diperbarui!', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Gagal memperbarui password:', err);
      setNotification({ message: 'Terjadi kesalahan sistem saat memperbarui password.', type: 'error' });
    }
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityQuestion.trim() || !securityAnswer.trim()) {
      setNotification({ message: 'Pertanyaan dan jawaban keamanan tidak boleh kosong!', type: 'warning' });
      return;
    }

    try {
      const db = await Database.load('sqlite:apotek.db');
      await db.execute(
        'UPDATE users SET security_question = $1, security_answer = $2 WHERE id = $3',
        [securityQuestion.trim(), securityAnswer.trim().toLowerCase(), currentUser.id]
      );
      setNotification({ message: 'Pertanyaan keamanan berhasil diperbarui!', type: 'success' });
      loadData();
    } catch (err) {
      console.error('Gagal menyimpan pertanyaan keamanan:', err);
      setNotification({ message: 'Gagal memperbarui pertanyaan keamanan.', type: 'error' });
    }
  };

  // CRUD User Management Handlers (Admin Only)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUsername.trim()) {
      setNotification({ message: 'Username tidak boleh kosong!', type: 'warning' });
      return;
    }

    try {
      const db = await Database.load('sqlite:apotek.db');
      
      if (editingUser) {
        // Edit User (Username & Role)
        // Cek duplikasi username (kecuali milik sendiri)
        const checkDup: any[] = await db.select(
          'SELECT id FROM users WHERE username = $1 AND id != $2',
          [formUsername.trim(), editingUser.id]
        );
        if (checkDup.length > 0) {
          setNotification({ message: 'Username sudah digunakan oleh akun lain!', type: 'warning' });
          return;
        }

        await db.execute(
          'UPDATE users SET username = $1, role = $2 WHERE id = $3',
          [formUsername.trim(), formRole, editingUser.id]
        );

        setNotification({ message: `Data user "${formUsername}" berhasil diperbarui!`, type: 'success' });
        
        // Update local storage if admin edited their own record
        if (editingUser.id === currentUser.id) {
          const updatedUser = { ...currentUser, username: formUsername.trim(), role: formRole };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }

      } else {
        // Tambah User Baru (Memerlukan password awal)
        if (!formPassword) {
          setNotification({ message: 'Password awal untuk user baru harus diisi!', type: 'warning' });
          return;
        }
        if (formPassword.length < 4) {
          setNotification({ message: 'Password harus minimal 4 karakter!', type: 'warning' });
          return;
        }

        // Cek duplikasi username
        const checkDup: any[] = await db.select('SELECT id FROM users WHERE username = $1', [formUsername.trim()]);
        if (checkDup.length > 0) {
          setNotification({ message: 'Username sudah terdaftar!', type: 'warning' });
          return;
        }

        // Insert new user
        await db.execute(
          'INSERT INTO users (username, password, role, security_question, security_answer) VALUES ($1, $2, $3, $4, $5)',
          [
            formUsername.trim(), 
            formPassword, 
            formRole, 
            formQuestion.trim(), 
            formAnswer.trim().toLowerCase() || 'apotek abc'
          ]
        );

        setNotification({ message: `User baru "${formUsername}" berhasil ditambahkan!`, type: 'success' });
      }

      resetUserForm();
      loadData();
    } catch (err) {
      console.error('Gagal memproses simpan user:', err);
      setNotification({ message: 'Terjadi kesalahan saat memproses data user.', type: 'error' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetNewPassword || resetNewPassword.length < 4) {
      setNotification({ message: 'Password baru harus minimal 4 karakter!', type: 'warning' });
      return;
    }

    try {
      const db = await Database.load('sqlite:apotek.db');
      await db.execute('UPDATE users SET password = $1 WHERE id = $2', [resetNewPassword, resettingUser.id]);
      setNotification({ message: `Password untuk akun "${resettingUser.username}" berhasil di-reset!`, type: 'success' });
      
      setResettingUser(null);
      setResetNewPassword('');
    } catch (err) {
      console.error('Gagal me-reset password:', err);
      setNotification({ message: 'Gagal me-reset password user.', type: 'error' });
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (id === currentUser.id) {
      setNotification({ message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif!', type: 'warning' });
      return;
    }
    
    if (confirm(`Apakah Anda yakin ingin menghapus akses akun "${username}" secara permanen?`)) {
      try {
        const db = await Database.load('sqlite:apotek.db');
        await db.execute('DELETE FROM users WHERE id = $1', [id]);
        setNotification({ message: `Akun "${username}" berhasil dihapus.`, type: 'success' });
        loadData();
      } catch (err) {
        console.error('Gagal menghapus user:', err);
        setNotification({ message: 'Gagal menghapus akun user dari database.', type: 'error' });
      }
    }
  };

  const openEditUser = (user: any) => {
    setEditingUser(user);
    setFormUsername(user.username);
    setFormRole(user.role);
    setShowUserForm(true);
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setFormUsername('');
    setFormPassword('');
    setFormRole('apoteker');
    setFormQuestion('Apa nama apotek ini?');
    setFormAnswer('');
    setShowUserForm(false);
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64 font-sans text-gray-500">
        Memuat detail profil...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-150 pb-4">
        <Shield className="text-emerald-600" size={24} />
        <div>
          <h2 className="text-2xl font-bold text-gray-800 tracking-tight">Pengaturan Akun & Karyawan</h2>
          <p className="text-gray-500 text-sm mt-0.5">Kelola kredensial login, pertanyaan keamanan, dan kontrol manajemen user.</p>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div className={`p-3.5 rounded-xl text-sm font-semibold border transition-all duration-300 ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm' :
          notification.type === 'warning' ? 'bg-amber-50 text-amber-800 border-amber-200' :
          'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Tab Navigation */}
      {currentUser.role === 'admin' && (
        <div className="flex border-b border-gray-200 gap-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 font-bold text-sm transition-colors relative cursor-pointer ${
              activeTab === 'profile' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>Profil & Keamanan Saya</span>
            {activeTab === 'profile' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 font-bold text-sm transition-colors relative cursor-pointer ${
              activeTab === 'users' ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>Manajemen User (Staff)</span>
              <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px]">{users.length}</span>
            </span>
            {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />}
          </button>
        </div>
      )}

      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom Kiri: Ringkasan Profil */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 h-fit">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
                <User size={40} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{currentUser.username}</h3>
                <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 ${
                  currentUser.role === 'admin' 
                    ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {currentUser.role === 'admin' ? 'Administrator' : 'Apoteker / Staff'}
                </span>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-3 text-xs">
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider">ID Akun</span>
                <span className="font-mono text-gray-700 font-bold">{currentUser.id}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Hak Akses</span>
                <span className="text-gray-700 font-semibold">{currentUser.role === 'admin' ? 'Akses Penuh' : 'Akses Terbatas'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Pertanyaan Keamanan</span>
                <span className="text-gray-700 font-semibold">{currentUser.security_question ? 'Sudah Diatur' : 'Belum Diatur'}</span>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Form Kredensial & Pertanyaan Keamanan */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form Ganti Password */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                <Lock size={18} className="text-emerald-600" />
                <span>Ganti Password Mandiri</span>
              </h3>

              <form onSubmit={handleChangePassword} className="space-y-4 text-xs font-semibold text-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Password Lama */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Password Lama</label>
                    <div className="relative">
                      <input 
                        type={showOldPass ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Ketik password lama..."
                        className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showOldPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Password Baru */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Password Baru</label>
                    <div className="relative">
                      <input 
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 4 karakter..."
                        className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Konfirmasi Password */}
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Konfirmasi Password Baru</label>
                    <div className="relative">
                      <input 
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password baru..."
                        className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>Perbarui Password</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Form Pertanyaan Keamanan (Khusus Admin) */}
            {currentUser.role === 'admin' && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2 border-b border-gray-100 pb-3">
                  <HelpCircle size={18} className="text-emerald-600" />
                  <span>Pengaturan Pertanyaan Keamanan</span>
                </h3>

                <p className="text-xs text-gray-500 leading-relaxed">
                  Digunakan untuk melakukan verifikasi identitas mandiri saat Anda lupa password di halaman masuk utama. 
                  Masukkan jawaban yang mudah Anda ingat, namun sulit ditebak oleh orang lain.
                </p>

                <form onSubmit={handleUpdateSecurity} className="space-y-4 text-xs font-semibold text-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Pertanyaan Keamanan</label>
                      <input 
                        type="text"
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                        placeholder="contoh: Siapa nama kecil guru favorit Anda?"
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Jawaban Keamanan</label>
                      <input 
                        type="text"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        placeholder="contoh: Ibu Indah (Jawaban disimpan case-insensitive)"
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Simpan Kunci Jawaban</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* TAB: MANAJEMEN USER (ADMIN ONLY) */
        <div className="space-y-6">
          {/* Section Atas: Pemicu Form & Tombol Tambah */}
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Kontrol Akses Karyawan</span>
            {!showUserForm && (
              <button
                onClick={() => setShowUserForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-100"
              >
                <UserPlus size={14} />
                <span>Tambah Staff Baru</span>
              </button>
            )}
          </div>

          {/* Form Tambah/Edit User */}
          {showUserForm && (
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-1.5">
                <UserPlus size={16} className="text-emerald-600" />
                <span>{editingUser ? `Edit User "${editingUser.username}"` : 'Tambah User Karyawan Baru'}</span>
              </h3>

              <form onSubmit={handleSaveUser} className="space-y-4 text-xs font-semibold text-gray-600">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Username */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Username Login</label>
                    <input 
                      type="text"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      placeholder="Masukkan nama login..."
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                      required
                    />
                  </div>

                  {/* Password Awal (Hanya untuk Tambah Baru) */}
                  {!editingUser ? (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Password Awal</label>
                      <input 
                        type="password"
                        value={formPassword}
                        onChange={(e) => setFormPassword(e.target.value)}
                        placeholder="Minimal 4 karakter..."
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold font-mono"
                        required
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col justify-end pb-1.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status Password</span>
                      <span className="text-gray-500 italic text-[11px] font-normal">Sandi diamankan. Gunakan tombol reset sandi di tabel jika lupa.</span>
                    </div>
                  )}

                  {/* Hak Akses / Role */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Hak Akses / Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as any)}
                      className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                    >
                      <option value="apoteker">Apoteker / Staff Biasa</option>
                      <option value="admin">Administrator (Akses Penuh)</option>
                    </select>
                  </div>
                </div>

                {/* Form Security Question Khusus untuk Tambah Admin Baru */}
                {!editingUser && formRole === 'admin' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Pertanyaan Keamanan Akun Admin</label>
                      <input 
                        type="text"
                        value={formQuestion}
                        onChange={(e) => setFormQuestion(e.target.value)}
                        placeholder="ex: Apa nama apotek ini?"
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Jawaban Keamanan</label>
                      <input 
                        type="text"
                        value={formAnswer}
                        onChange={(e) => setFormAnswer(e.target.value)}
                        placeholder="ex: apotek abc"
                        className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Actions Form */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetUserForm}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition-all border border-gray-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <X size={14} />
                    <span>Batal</span>
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} />
                    <span>{editingUser ? 'Simpan Perubahan' : 'Simpan User'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal / Dialog Reset Password User Karyawan */}
          {resettingUser && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-150 max-w-sm w-full p-6 space-y-4 font-sans text-xs">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <RefreshCw className="text-amber-500" size={18} />
                  <h4 className="text-sm font-bold text-gray-800">Reset Password: {resettingUser.username}</h4>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Masukkan Password Baru</label>
                    <div className="relative">
                      <input 
                        type={showResetPass ? 'text' : 'password'}
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        placeholder="Minimal 4 karakter..."
                        className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPass(!showResetPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showResetPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResettingUser(null);
                        setResetNewPassword('');
                      }}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl font-bold transition-colors cursor-pointer border border-gray-150 text-center"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl font-bold transition-colors cursor-pointer shadow-sm shadow-amber-100 text-center"
                    >
                      Konfirmasi Reset
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Tabel List User */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-150 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4">ID</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Role / Hak Akses</th>
                  <th className="p-4">Pertanyaan Keamanan</th>
                  <th className="p-4 text-center">Aksi / Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-600 font-medium">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-gray-400">{user.id}</td>
                    <td className="p-4 font-bold text-gray-800">{user.username}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        user.role === 'admin' 
                          ? 'bg-rose-50 text-rose-700 border-rose-100' 
                          : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Apoteker'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 font-normal">
                      {user.role === 'admin' ? (
                        user.security_question || 'Belum diatur'
                      ) : (
                        <span className="italic text-gray-400 text-[11px]">Bypass (Gunakan Reset Admin)</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Tombol Reset Password */}
                        <button
                          onClick={() => setResettingUser(user)}
                          title="Reset Password Karyawan"
                          className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center hover:bg-amber-100 transition-colors cursor-pointer border border-amber-100 shadow-sm"
                        >
                          <RefreshCw size={14} />
                        </button>

                        {/* Tombol Edit User */}
                        <button
                          onClick={() => openEditUser(user)}
                          title="Edit Username & Peran"
                          className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-100 shadow-sm"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Tombol Hapus User */}
                        <button
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={user.id === currentUser.id}
                          title={user.id === currentUser.id ? 'Tidak bisa menghapus akun sendiri' : 'Hapus Akun Karyawan'}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all border shadow-sm ${
                            user.id === currentUser.id
                              ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                              : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100 cursor-pointer'
                          }`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
