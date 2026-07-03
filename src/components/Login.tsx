import { useState } from "react";
import Database from "@tauri-apps/plugin-sql";
import { Lock, User, Eye, EyeOff, Activity, ShieldAlert, Check, X } from "lucide-react";

export default function Login({
  onLoginSuccess,
}: {
  onLoginSuccess: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Username, 2: Security Q, 3: Staff Msg, 4: New Pass, 5: Success
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotUser, setForgotUser] = useState<any>(null);
  const [forgotAnswer, setForgotAnswer] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotIsLoading, setForgotIsLoading] = useState(false);
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);

  const handleForgotUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    setForgotIsLoading(true);

    try {
      const db = await Database.load("sqlite:apotek.db");
      const users: any[] = await db.select(
        "SELECT * FROM users WHERE username = ?",
        [forgotUsername.trim()]
      );

      if (users.length > 0) {
        const targetUser = users[0];
        setForgotUser(targetUser);
        if (targetUser.role === "admin") {
          setForgotStep(2); // Go to Security Question
        } else {
          setForgotStep(3); // Go to Staff Contact Message
        }
      } else {
        setForgotError("Username tidak terdaftar!");
      }
    } catch (err) {
      setForgotError("Gagal terhubung dengan database.");
    } finally {
      setForgotIsLoading(false);
    }
  };

  const handleVerifyAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    const answer = forgotUser?.security_answer || "";
    if (forgotAnswer.trim().toLowerCase() === answer.toLowerCase()) {
      setForgotStep(4); // Go to Reset Password form
    } else {
      setForgotError("Jawaban keamanan salah!");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("Konfirmasi password tidak cocok!");
      return;
    }
    if (forgotNewPassword.length < 4) {
      setForgotError("Password minimal 4 karakter!");
      return;
    }

    setForgotIsLoading(true);
    try {
      const db = await Database.load("sqlite:apotek.db");
      await db.execute(
        "UPDATE users SET password = ? WHERE id = ?",
        [forgotNewPassword, forgotUser.id]
      );
      setForgotStep(5); // Go to Success Screen
    } catch (err) {
      setForgotError("Gagal merubah password.");
    } finally {
      setForgotIsLoading(false);
    }
  };

  const resetForgotFlow = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotUsername("");
    setForgotUser(null);
    setForgotAnswer("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Simulasi loading 800ms untuk efek interaktif premium
    setTimeout(async () => {
      try {
        const db = await Database.load("sqlite:apotek.db");
        // Cari user berdasarkan username
        const users: any[] = await db.select(
          "SELECT * FROM users WHERE username = ?",
          [username],
        );

        if (users.length > 0 && users[0].password === password) {
          // Simpan info user ke localStorage agar bisa diakses di dashboard
          localStorage.setItem("user", JSON.stringify(users[0]));
          
          // Ubah path url ke root agar React Router selalu mengarahkan ke dashboard pertama kali
          window.history.pushState({}, '', '/');
          
          onLoginSuccess();
        } else {
          setError("Username atau password salah!");
        }
      } catch (err) {
        setError("Gagal mengakses database sistem.");
      } finally {
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-gradient-to-tr from-[#dae3db] to-[#eaeee9] overflow-hidden font-sans">
      
      {/* Soothing Pale Sage/Mint Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-700/5 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-[120px]"></div>

      {/* Login Card Container */}
      <div className="relative z-10 w-full max-w-md p-8 mx-4">
        <form
          onSubmit={handleLogin}
          className="bg-white/70 backdrop-blur-xl border border-white/60 p-8 rounded-3xl shadow-xl shadow-slate-300/30 space-y-6 transition-all duration-300"
        >
          {/* Clinic Branding */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3.5 bg-emerald-650/10 border border-emerald-500/20 text-emerald-700 rounded-2xl shadow-inner">
              <Activity size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Apotek ABC</h2>
              <p className="text-xs font-semibold text-slate-500">Sistem Informasi Pengelolaan Obat</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-2xl text-xs font-semibold">
              <ShieldAlert size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Input Fields */}
          <div className="space-y-4">
            
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-450">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Ketik username..."
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-[#f5f8f5]/90 border border-slate-200/80 rounded-2xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 transition-all font-sans"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-450">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Ketik password..."
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-11 pr-11 py-3 bg-[#f5f8f5]/90 border border-slate-200/80 rounded-2xl text-sm font-semibold text-slate-850 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:opacity-50 transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 hover:text-slate-600 transition-colors cursor-pointer bg-transparent border-none"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Lupa Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-550 hover:underline transition-colors bg-transparent border-none cursor-pointer"
              >
                Lupa Password?
              </button>
            </div>

          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400/60 disabled:cursor-not-allowed text-white py-3 rounded-2xl font-bold transition-all shadow-md shadow-emerald-700/10 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin"></div>
            ) : (
              <span>Masuk Ke Sistem</span>
            )}
          </button>
          
        </form>
      </div>

      {/* Modal Lupa Password Overlay */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans text-xs">
          <div className="bg-white/95 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-xl max-w-sm w-full p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-150 pb-2">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Lock size={16} className="text-emerald-600" />
                <span>Pembersihan / Lupa Password</span>
              </h3>
              <button 
                onClick={resetForgotFlow}
                className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error Message inside Modal */}
            {forgotError && (
              <div className="flex items-center gap-1.5 p-3 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-[11px] font-semibold">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{forgotError}</span>
              </div>
            )}

            {/* STEP 1: Enter Username */}
            {forgotStep === 1 && (
              <form onSubmit={handleForgotUsername} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Masukkan Username Anda</label>
                  <input
                    type="text"
                    required
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="ex: admin atau staff_name"
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotIsLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {forgotIsLoading ? "Memverifikasi..." : "Lanjutkan"}
                </button>
              </form>
            )}

            {/* STEP 2: Answer Security Question (Admin only) */}
            {forgotStep === 2 && forgotUser && (
              <form onSubmit={handleVerifyAnswer} className="space-y-4">
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Verifikasi Akun Administrator</span>
                  <div className="p-3 bg-slate-50 border border-gray-150 rounded-xl text-gray-700 font-semibold mb-1">
                    <span className="text-gray-450 block text-[9px] uppercase tracking-wider mb-0.5">Pertanyaan Keamanan:</span>
                    {forgotUser.security_question || "Apa nama apotek ini?"}
                  </div>
                  
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Masukkan Jawaban Keamanan</label>
                  <input
                    type="text"
                    required
                    value={forgotAnswer}
                    onChange={(e) => setForgotAnswer(e.target.value)}
                    placeholder="Ketik jawaban keamanan Anda..."
                    className="w-full p-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Verifikasi Kunci Jawaban
                </button>
              </form>
            )}

            {/* STEP 3: Contact Admin Message (Staff only) */}
            {forgotStep === 3 && (
              <div className="space-y-4 py-2 text-center">
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <ShieldAlert size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-800 text-sm">Reset Melalui Administrator</h4>
                  <p className="text-gray-500 text-[11px] leading-relaxed px-4">
                    Silakan hubungi Admin untuk melakukan reset password akun staf Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForgotFlow}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl font-bold border border-gray-200 transition-colors cursor-pointer"
                >
                  Kembali Ke Halaman Login
                </button>
              </div>
            )}

            {/* STEP 4: Input New Password (Admin only) */}
            {forgotStep === 4 && forgotUser && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-3">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Identitas Terverifikasi. Ganti Password Baru:</span>
                  
                  {/* Password Baru */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Password Baru</label>
                    <div className="relative">
                      <input 
                        type={showForgotNewPass ? 'text' : 'password'}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Minimal 4 karakter..."
                        className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
                      >
                        {showForgotNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Konfirmasi Password */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Ulangi Password Baru</label>
                    <div className="relative">
                      <input 
                        type={showForgotConfirmPass ? 'text' : 'password'}
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Ulangi sandi baru..."
                        className="w-full p-2.5 pr-10 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold font-mono"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowForgotConfirmPass(!showForgotConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-650"
                      >
                        {showForgotConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotIsLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {forgotIsLoading ? "Menyimpan password..." : "Simpan & Reset Password"}
                </button>
              </form>
            )}

            {/* STEP 5: Success Screen */}
            {forgotStep === 5 && (
              <div className="space-y-4 py-2 text-center animate-fadeIn">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-650 rounded-full flex items-center justify-center mx-auto shadow-inner">
                  <Check size={24} />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-gray-800 text-sm">Password Berhasil Diubah!</h4>
                  <p className="text-gray-500 text-[11px] leading-relaxed px-4">
                    Sandi untuk akun admin Anda berhasil diperbarui. Silakan login kembali dengan password yang baru.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetForgotFlow}
                  className="w-full bg-emerald-650 hover:bg-emerald-700 text-white py-2.5 rounded-xl font-bold transition-colors cursor-pointer shadow-sm shadow-emerald-100"
                >
                  Masuk Ke Halaman Login
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
