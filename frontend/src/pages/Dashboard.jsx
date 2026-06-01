import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import API from "../services/api";
import BroadcastPage from "./BroadcastPage";


export default function Dashboard() {
    const auth = useContext(AuthContext);
    const [profile, setProfile] = useState(auth.user);

    useEffect(() => {
        const run = async () => {
            try {
                const res = await API.get("/auth/profile");
                setProfile(res.data?.user || null);
            } catch {
                // let ProtectedRoute / interceptor handle redirect
            }
        };
        run();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-black/5">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                        <div className="text-sm text-slate-500">Dashboard</div>
                        <div className="font-semibold text-slate-900">{profile?.nama || ""}</div>
                    </div>
                    <div className="text-xs text-slate-600">
                        NIP: <span className="font-mono">{profile?.nip || auth.user?.nip || ""}</span>
                    </div>
                    <button
                        onClick={auth.logout}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-6">
                {/* Existing content protected */}
                <BroadcastPage />
            </div>
        </div>
    );
}

