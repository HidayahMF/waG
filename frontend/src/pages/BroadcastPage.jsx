import { useEffect, useMemo, useRef, useState } from "react";
import API from "../services/api";

function formatPhoneLikeWA(no_hp) {
    if (!no_hp) return "";
    return String(no_hp).trim();
}

const STATUS_CONFIG = {
    sending: { label: "Mengirim...", color: "#185FA5", bg: "#E6F1FB" },
    success: { label: "Terkirim", color: "#3B6D11", bg: "#EAF3DE" },
    failed: { label: "Gagal", color: "#A32D2D", bg: "#FCEBEB" },
};

function Badge({ status }) {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return <span style={{ color: "#888780", fontSize: 12 }}>–</span>;
    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: cfg.bg,
                color: cfg.color,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.03em",
                padding: "2px 8px",
                borderRadius: 99,
            }}
        >
            {cfg.label}
        </span>
    );
}

function Avatar({ name }) {
    const initials = (name || "?")
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() || "")
        .join("");
    const hue = ((name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 5);
    const palette = [
        { bg: "#EEEDFE", color: "#3C3489" },
        { bg: "#E1F5EE", color: "#085041" },
        { bg: "#E6F1FB", color: "#0C447C" },
        { bg: "#FAEEDA", color: "#633806" },
        { bg: "#FBEAF0", color: "#72243E" },
    ];
    const { bg, color } = palette[hue];
    return (
        <div
            style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: bg,
                color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                flexShrink: 0,
                userSelect: "none",
            }}
        >
            {initials}
        </div>
    );
}

const MAX_FILE_BYTES = 16 * 1024 * 1024;

function getFileKind(file) {
    if (!file) return null;
    const mime = file.type || "";
    if (mime.startsWith("image/")) return "image";
    if (mime === "application/pdf") return "pdf";
    if (mime.startsWith("video/")) return "video";
    if (mime.startsWith("audio/")) return "audio";
    return "other";
}

function isAllowedMime(mime) {
    return (
        mime === "image/jpeg" ||
        mime === "image/png" ||
        mime === "image/webp" ||
        mime === "video/mp4" ||
        mime === "audio/mpeg" ||
        mime === "application/pdf"
    );
}

export default function BroadcastPage() {
    const [employees, setEmployees] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState("");
    const [divisiFilter, setDivisiFilter] = useState("all");

    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [progressById, setProgressById] = useState({});
    const [sendSummary, setSendSummary] = useState(null);
    const [activeTab, setActiveTab] = useState("compose"); // "compose" | "filter"

    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [filePreviewUrl, setFilePreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (!filePreviewUrl) return;
        return () => URL.revokeObjectURL(filePreviewUrl);
    }, [filePreviewUrl]);

    const fetchEmployees = async () => {
        const res = await API.get("/broadcast/employees");
        setEmployees(res.data || []);
    };

    const selected = useMemo(() => {
        const s = new Set(selectedIds);
        return employees.filter((e) => s.has(e.id));
    }, [employees, selectedIds]);

    const divisions = useMemo(() => {
        const d = new Set();
        for (const e of employees) if (e.divisi) d.add(e.divisi);
        return ["all", ...Array.from(d).sort((a, b) => a.localeCompare(b))];
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        const q = search.trim().toLowerCase();
        return employees.filter((e) => {
            const matchSearch =
                !q ||
                String(e.nama || "").toLowerCase().includes(q) ||
                String(e.no_hp || "").toLowerCase().includes(q) ||
                String(e.nip || "").toLowerCase().includes(q);
            const matchDiv = divisiFilter === "all" || String(e.divisi || "") === divisiFilter;
            return matchSearch && matchDiv;
        });
    }, [employees, search, divisiFilter]);

    const allFilteredSelected = useMemo(() => {
        if (!filteredEmployees.length) return false;
        const s = new Set(selectedIds);
        return filteredEmployees.every((e) => s.has(e.id));
    }, [filteredEmployees, selectedIds]);

    const toggleOne = (emp) => {
        setSelectedIds((prev) => (prev.includes(emp.id) ? prev.filter((id) => id !== emp.id) : [...prev, emp.id]));
    };

    const toggleAllFiltered = () => {
        setSelectedIds((prev) => {
            const s = new Set(prev);
            const allSel = filteredEmployees.every((e) => s.has(e.id));
            filteredEmployees.forEach((e) => (allSel ? s.delete(e.id) : s.add(e.id)));
            return Array.from(s);
        });
    };

    const onPickFile = (pickedFile) => {
        setFileError("");

        if (!pickedFile) return;

        if (pickedFile.size > MAX_FILE_BYTES) {
            setFileError("Ukuran file maksimal 16MB.");
            return;
        }

        if (!isAllowedMime(pickedFile.type)) {
            setFileError("Tipe file tidak didukung. Allowed: JPG/PNG/WEBP, MP4, MP3, PDF.");
            return;
        }

        // Preview untuk image saja
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);

        const kind = getFileKind(pickedFile);
        if (kind === "image") {
            setFilePreviewUrl(URL.createObjectURL(pickedFile));
        } else {
            setFilePreviewUrl(null);
        }

        setFile(pickedFile);
    };

    const removeFile = () => {
        setFileError("");
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const sendBroadcast = async () => {
        if (!message.trim()) return alert("Pesan tidak boleh kosong.");
        if (!selected.length) return alert("Pilih minimal satu penerima.");
        if (fileError) return alert(fileError);

        setSending(true);
        setSendSummary(null);

        const init = {};
        selected.forEach((e) => {
            init[e.id] = { status: "sending" };
        });
        setProgressById(init);

        try {
            const payloadEmployees = selected.map((e) => ({
                id: e.id,
                nama: e.nama,
                no_hp: formatPhoneLikeWA(e.no_hp),
            }));

            let res;
            if (file) {
                const fd = new FormData();
                fd.append("message", message);
                fd.append("employees", JSON.stringify(payloadEmployees));
                fd.append("file", file);

                res = await API.post("/broadcast/send", fd, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                });
            } else {
                res = await API.post("/broadcast/send", { message, employees: payloadEmployees });
            }

            const { summary, results } = res.data || {};
            setSendSummary(summary || null);

            const next = {};
            (results || []).forEach((r) => {
                next[r.id] = { status: r.status, error: r.error };
            });
            setProgressById(next);
        } catch (err) {
            console.error(err);
            alert(err?.response?.data?.message || err.message || "Gagal mengirim broadcast");
        } finally {
            setSending(false);
        }
    };

    const canSend = !sending && selected.length > 0 && message.trim().length > 0 && !fileError;
    const charCount = message.length;
    const fileKind = file ? getFileKind(file) : null;

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#F7F6F3",
                fontFamily: "'DM Sans', 'Instrument Sans', system-ui, sans-serif",
                padding: "32px 20px",
            }}
        >
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');

        * { box-sizing: border-box; }

        .bcast-input {
          width: 100%;
          background: #fff;
          border: 1.5px solid #E2DFD7;
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: inherit;
          color: #1A1916;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
          resize: none;
        }
        .bcast-input::placeholder { color: #B4B2A9; }
        .bcast-input:focus {
          border-color: #534AB7;
          box-shadow: 0 0 0 3px rgba(83,74,183,0.10);
        }

        .tab-btn {
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          font-family: inherit;
        }
        .tab-btn.active { background: #fff; color: #1A1916; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
        .tab-btn.inactive { background: transparent; color: #888780; }
        .tab-btn.inactive:hover { color: #444441; }

        .send-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 11px 24px;
          background: #534AB7;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
          letter-spacing: 0.01em;
        }
        .send-btn:hover:not(:disabled) { background: #3C3489; }
        .send-btn:active:not(:disabled) { transform: scale(0.98); }
        .send-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .preview-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #fff;
          border: 1px solid #EEEAE0;
          border-radius: 10px;
          margin-bottom: 8px;
        }

        .summary-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 500;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        .pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #534AB7;
          animation: pulse-dot 1.2s ease-in-out infinite;
          display: inline-block;
        }

        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #D3D1C7; border-radius: 99px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>

            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ marginBottom: 28 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                        <div
                            style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: "#534AB7",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#1A1916", letterSpacing: "-0.02em" }}>WhatsApp Broadcast</h1>
                            <p style={{ margin: 0, fontSize: 13, color: "#888780" }}>Kirim pesan ke banyak karyawan sekaligus</p>
                        </div>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        <div
                            style={{
                                background: "#fff",
                                border: "1px solid #EEEAE0",
                                borderRadius: 14,
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    gap: 4,
                                    padding: "10px 14px",
                                    borderBottom: "1px solid #F0EDE6",
                                    background: "#FAFAF8",
                                }}
                            >
                                <button
                                    className={`tab-btn ${activeTab === "compose" ? "active" : "inactive"}`}
                                    onClick={() => setActiveTab("compose")}
                                >
                                    Pesan
                                </button>
                                <button
                                    className={`tab-btn ${activeTab === "filter" ? "active" : "inactive"}`}
                                    onClick={() => setActiveTab("filter")}
                                >
                                    Filter & Cari
                                </button>
                            </div>

                            <div style={{ padding: 20 }}>
                                {activeTab === "compose" ? (
                                    <>
                                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5F5E5A", marginBottom: 8, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                            Isi Pesan
                                        </label>

                                        <div style={{ position: "relative" }}>
                                            <textarea
                                                className="bcast-input"
                                                rows={7}
                                                placeholder="Tulis pesan broadcast Anda di sini..."
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                style={{ paddingBottom: 32 }}
                                            />
                                            <span
                                                style={{
                                                    position: "absolute",
                                                    bottom: 10,
                                                    right: 12,
                                                    fontSize: 11,
                                                    color: charCount > 1000 ? "#A32D2D" : "#B4B2A9",
                                                    fontFamily: "'DM Mono', monospace",
                                                }}
                                            >
                                                {charCount}
                                            </span>
                                        </div>

                                        {/* File picker */}
                                        <div style={{ marginTop: 14 }}>
                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                                                <div>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#5F5E5A", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                                        Lampiran (opsional)
                                                    </div>
                                                    <div style={{ fontSize: 12, color: "#888780", marginTop: 3 }}>
                                                        Max 16MB • JPG/PNG/WEBP, MP4, MP3, PDF
                                                    </div>
                                                </div>
                                                <div>
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,application/pdf"
                                                        style={{ display: "none" }}
                                                        onChange={(e) => onPickFile(e.target.files?.[0])}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="send-btn"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={sending}
                                                        style={{ background: "#fff", color: "#534AB7", border: "1px solid #E2DFD7" }}
                                                    >
                                                        Pilih File
                                                    </button>
                                                </div>
                                            </div>

                                            {fileError && (
                                                <div style={{ background: "#FCEBEB", color: "#A32D2D", border: "1px solid #F2B5B5", padding: "10px 12px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
                                                    {fileError}
                                                </div>
                                            )}

                                            {file && (
                                                <div style={{ background: "#ECE5DD", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                                        {fileKind === "image" && filePreviewUrl ? (
                                                            <img
                                                                src={filePreviewUrl}
                                                                alt="preview"
                                                                style={{ width: 52, height: 52, borderRadius: 10, objectFit: "cover", border: "1px solid #ddd" }}
                                                            />
                                                        ) : (
                                                            <div
                                                                style={{
                                                                    width: 52,
                                                                    height: 52,
                                                                    borderRadius: 12,
                                                                    background: "#fff",
                                                                    border: "1px solid #ddd",
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    justifyContent: "center",
                                                                    fontSize: 20,
                                                                }}
                                                            >
                                                                {fileKind === "pdf" ? "📄" : fileKind === "video" ? "🎬" : fileKind === "audio" ? "🎵" : "📎"}
                                                            </div>
                                                        )}

                                                        <div style={{ minWidth: 0 }}>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#1A1916", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 190 }}>
                                                                {file.name}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: "#888780" }}>
                                                                {(file.size / (1024 * 1024)).toFixed(2)} MB • {file.type || ""}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={removeFile}
                                                        disabled={sending}
                                                        style={{
                                                            border: "1px solid #E2DFD7",
                                                            background: "#fff",
                                                            color: "#A32D2D",
                                                            borderRadius: 10,
                                                            padding: "8px 10px",
                                                            cursor: "pointer",
                                                            fontWeight: 700,
                                                            fontSize: 12,
                                                        }}
                                                    >
                                                        Hapus
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* WhatsApp preview */}
                                        {message.trim() && (
                                            <div style={{ marginTop: 14 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: "#B4B2A9", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 }}>
                                                    Pratinjau WhatsApp
                                                </div>
                                                <div style={{ background: "#ECE5DD", borderRadius: 10, padding: 14 }}>
                                                    <div
                                                        style={{
                                                            background: "#fff",
                                                            borderRadius: "12px 12px 12px 2px",
                                                            padding: "10px 14px",
                                                            maxWidth: "80%",
                                                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                                                            fontSize: 13.5,
                                                            lineHeight: 1.55,
                                                            color: "#111",
                                                            whiteSpace: "pre-wrap",
                                                            wordBreak: "break-word",
                                                        }}
                                                    >
                                                        {message}
                                                        <div style={{ fontSize: 11, color: "#999", textAlign: "right", marginTop: 4 }}>
                                                            {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} ✓✓
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                        <div>
                                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#5F5E5A", marginBottom: 6, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                                Cari Karyawan
                                            </label>
                                            <div style={{ position: "relative" }}>
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="#B4B2A9"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                                                >
                                                    <circle cx="11" cy="11" r="8" />
                                                    <path d="m21 21-4.35-4.35" />
                                                </svg>
                                                <input
                                                    className="bcast-input"
                                                    placeholder="Nama, NIP, atau nomor HP..."
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    style={{ paddingLeft: 36 }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Employee list */}
                        <div style={{ background: "#fff", border: "1px solid #EEEAE0", borderRadius: 14, overflow: "hidden" }}>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "44px 1fr auto auto",
                                    gap: 12,
                                    padding: "10px 16px",
                                    borderBottom: "1px solid #F0EDE6",
                                    background: "#FAFAF8",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={toggleAllFiltered}>
                                    <div className={`custom-checkbox ${allFilteredSelected ? "checked" : ""}`} style={{ width: 18, height: 18, border: "2px solid #D3D1C7", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", background: allFilteredSelected ? "#534AB7" : "#fff", borderColor: allFilteredSelected ? "#534AB7" : "#D3D1C7" }}>
                                        {allFilteredSelected && (
                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                                                <polyline points="2,6 5,9 10,3" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#888780", letterSpacing: "0.04em", textTransform: "uppercase", alignSelf: "center" }}>
                                    Nama Karyawan
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#888780", letterSpacing: "0.04em", textTransform: "uppercase", alignSelf: "center", width: 130 }}>
                                    No. HP
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#888780", letterSpacing: "0.04em", textTransform: "uppercase", alignSelf: "center", width: 80 }}>
                                    Status
                                </div>
                            </div>

                            <div style={{ maxHeight: 440, overflowY: "auto" }}>
                                {filteredEmployees.length === 0 ? (
                                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#B4B2A9", fontSize: 14 }}>
                                        <div style={{ marginBottom: 8, fontSize: 32 }}>🔍</div>
                                        Tidak ada karyawan ditemukan
                                    </div>
                                ) : (
                                    filteredEmployees.map((emp) => {
                                        const isChecked = selectedIds.includes(emp.id);
                                        const prog = progressById[emp.id];
                                        return (
                                            <div
                                                key={emp.id}
                                                className={`emp-row ${isChecked ? "selected" : ""}`}
                                                onClick={() => toggleOne(emp)}
                                                style={{
                                                    display: "grid",
                                                    gridTemplateColumns: "44px 1fr auto auto",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    padding: "12px 16px",
                                                    borderBottom: "1px solid #F0EDE6",
                                                    transition: "background 0.1s",
                                                    cursor: "pointer",
                                                    background: isChecked ? "#F5F4FE" : "transparent",
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center" }}>
                                                    <div
                                                        className={`custom-checkbox ${isChecked ? "checked" : ""}`}
                                                        style={{
                                                            width: 18,
                                                            height: 18,
                                                            border: "2px solid #D3D1C7",
                                                            borderRadius: 5,
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            transition: "all 0.12s",
                                                            flexShrink: 0,
                                                            background: isChecked ? "#534AB7" : "#fff",
                                                            borderColor: isChecked ? "#534AB7" : "#D3D1C7",
                                                        }}
                                                    >
                                                        {isChecked && (
                                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                                                                <polyline points="2,6 5,9 10,3" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                                                    <Avatar name={emp.nama} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: 14, fontWeight: 500, color: "#1A1916", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                            {emp.nama}
                                                        </div>
                                                        {emp.divisi && <div style={{ fontSize: 12, color: "#888780" }}>{emp.divisi}</div>}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 13, color: "#5F5E5A", fontFamily: "'DM Mono', monospace", width: 130 }}>
                                                    {emp.no_hp}
                                                </div>
                                                <div style={{ width: 80 }}>
                                                    {prog?.status ? <Badge status={prog.status} /> : <span style={{ color: "#D3D1C7", fontSize: 13 }}>–</span>}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div
                                style={{
                                    padding: "10px 16px",
                                    borderTop: "1px solid #F0EDE6",
                                    background: "#FAFAF8",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span style={{ fontSize: 13, color: "#888780" }}>
                                    {filteredEmployees.length} karyawan{search || divisiFilter !== "all" ? " (terfilter)" : ""}
                                </span>
                                <span style={{ fontSize: 13, color: "#534AB7", fontWeight: 500 }}>{selectedIds.length} dipilih</span>
                            </div>
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                            {[
                                { label: "Dipilih", value: selectedIds.length, color: "#534AB7", bg: "#EEEDFE" },
                                { label: "Total", value: employees.length, color: "#5F5E5A", bg: "#F1EFE8" },
                            ].map((stat) => (
                                <div key={stat.label} style={{ background: stat.bg, borderRadius: 12, padding: "14px 16px" }}>
                                    <div style={{ fontSize: 24, fontWeight: 600, color: stat.color, letterSpacing: "-0.03em" }}>{stat.value}</div>
                                    <div style={{ fontSize: 12, color: stat.color, opacity: 0.7, marginTop: 2 }}>{stat.label}</div>
                                </div>
                            ))}
                        </div>

                        {sendSummary && (
                            <div style={{ background: "#fff", border: "1px solid #EEEAE0", borderRadius: 12, padding: 16 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: "#888780", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 10 }}>
                                    Hasil Pengiriman
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    <span className="summary-pill" style={{ background: "#EAF3DE", color: "#3B6D11" }}>
                                        ✓ {sendSummary.success} sukses
                                    </span>
                                    {sendSummary.failed > 0 && (
                                        <span className="summary-pill" style={{ background: "#FCEBEB", color: "#A32D2D" }}>
                                            ✕ {sendSummary.failed} gagal
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            className="send-btn"
                            disabled={!canSend}
                            onClick={sendBroadcast}
                            style={{ width: "100%", justifyContent: "center" }}
                        >
                            {sending ? (
                                <>
                                    <span className="pulse-dot" />
                                    Mengirim...
                                </>
                            ) : (
                                <>
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                        <line x1="22" y1="2" x2="11" y2="13" />
                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                    </svg>
                                    Kirim Broadcast
                                </>
                            )}
                        </button>

                        {!canSend && !sending && (
                            <p style={{ margin: 0, fontSize: 12, color: "#B4B2A9", textAlign: "center", lineHeight: 1.5 }}>
                                {!selected.length ? "Pilih penerima terlebih dahulu." : "Tulis pesan terlebih dahulu."}
                            </p>
                        )}

                        {/* Penerima preview */}
                        <div style={{ background: "#fff", border: "1px solid #EEEAE0", borderRadius: 14, overflow: "hidden" }}>
                            <div style={{ padding: "12px 16px", borderBottom: "1px solid #F0EDE6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: "#1A1916" }}>Daftar Penerima</span>
                                {selected.length > 0 && (
                                    <span
                                        style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            background: "#EEEDFE",
                                            color: "#3C3489",
                                            padding: "2px 8px",
                                            borderRadius: 99,
                                        }}
                                    >
                                        {selected.length}
                                    </span>
                                )}
                            </div>

                            <div style={{ maxHeight: 360, overflowY: "auto", padding: "10px 12px" }}>
                                {selected.length === 0 ? (
                                    <div style={{ padding: "20px 8px", textAlign: "center", color: "#B4B2A9", fontSize: 13 }}>Belum ada penerima dipilih.</div>
                                ) : (
                                    <>
                                        {selected.slice(0, 50).map((e) => (
                                            <div key={e.id} className="preview-card" style={{ alignItems: "center" }}>
                                                <Avatar name={e.nama} />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 500, color: "#1A1916", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {e.nama}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: "#888780", fontFamily: "'DM Mono', monospace" }}>{formatPhoneLikeWA(e.no_hp)}</div>
                                                </div>
                                                {progressById[e.id]?.status && (
                                                    <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                                                        <Badge status={progressById[e.id].status} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {selected.length > 50 && (
                                            <div style={{ textAlign: "center", fontSize: 12, color: "#B4B2A9", padding: "8px 0" }}>
                                                +{selected.length - 50} penerima lainnya
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

