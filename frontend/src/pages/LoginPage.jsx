import { useContext, useState, useRef } from "react";
import { AuthContext } from "../context/AuthContext";

export default function LoginPage() {
    const auth = useContext(AuthContext);

    const [nip, setNip] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const nipRef = useRef(null);
    const pwdRef = useRef(null);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!nip.trim()) {
            setError("NIP wajib diisi");
            nipRef.current?.focus();
            return;
        }
        if (!password.trim()) {
            setError("Password wajib diisi");
            pwdRef.current?.focus();
            return;
        }

        setSubmitting(true);
        try {
            await auth.login({ nip: nip.trim(), password: password.trim() });
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || "Login gagal";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-[420px]">

                {/* Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden">

                    {/* Header */}
                    <div className="px-8 pt-8 pb-6 border-b border-slate-100">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-indigo-100 text-[13px] font-medium tracking-wide flex-shrink-0">
                                WA
                            </div>
                            <div>
                                <h1 className="text-[16px] font-medium text-slate-900 leading-tight">
                                    Selamat datang
                                </h1>
                                <p className="text-[13px] text-slate-500 mt-0.5">
                                    Masuk menggunakan NIP &amp; Nomor HP
                                </p>
                            </div>
                        </div>

                        {/* Progress indicator */}
                        <div className="flex gap-1.5">
                            <div className="flex-1 h-[3px] rounded-full bg-indigo-600" />
                            <div className="flex-1 h-[3px] rounded-full bg-indigo-600" />
                            <div className="flex-1 h-[3px] rounded-full bg-slate-200" />
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-8 py-7">
                        <form onSubmit={onSubmit} noValidate className="space-y-5">

                            {/* NIP Field */}
                            <div>
                                <label
                                    htmlFor="nip"
                                    className="block text-[13px] font-medium text-slate-600 mb-2"
                                >
                                    NIP
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="4" width="18" height="16" rx="2" />
                                            <circle cx="9" cy="10" r="2" />
                                            <path d="M15 8h2M15 12h2M7 16h10" />
                                        </svg>
                                    </span>
                                    <input
                                        ref={nipRef}
                                        id="nip"
                                        value={nip}
                                        onChange={(e) => { setNip(e.target.value); setError(""); }}
                                        inputMode="numeric"
                                        placeholder="Masukkan NIP Anda"
                                        className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-[13px] font-medium text-slate-600 mb-2"
                                >
                                    Password
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="5" y="11" width="14" height="10" rx="2" />
                                            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                                        </svg>
                                    </span>
                                    <input
                                        ref={pwdRef}
                                        id="password"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                        inputMode="tel"
                                        placeholder="Nomor HP terdaftar"
                                        type={showPassword ? "text" : "password"}
                                        className="w-full h-11 pl-10 pr-11 border border-slate-200 rounded-xl text-[14px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-500/10 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                    >
                                        {showPassword ? (
                                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <p className="mt-2 text-[12px] text-slate-400 flex items-center gap-1.5">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    Password diisi dengan nomor HP yang terdaftar
                                </p>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-px" aria-hidden="true">
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    {error}
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-55 disabled:cursor-not-allowed text-indigo-50 text-[14px] font-medium flex items-center justify-center gap-2 transition-all"
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                        </svg>
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                            <polyline points="10 17 15 12 10 7" />
                                            <line x1="15" y1="12" x2="3" y2="12" />
                                        </svg>
                                        Masuk
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-center gap-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <p className="text-[12px] text-slate-400">
                            Sesi terenkripsi
                        </p>
                        <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />
                        <p className="text-[12px] text-slate-400">
                            Tidak ada fitur register
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}