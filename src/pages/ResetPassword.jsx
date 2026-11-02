const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { FileText, Loader2, CheckCircle2 } from "lucide-react";

// When the emailed link has expired or was already used, Supabase puts an
// "error_code" / "error" note in the web address instead of a login.
function linkHasProblem() {
  const raw = (window.location.hash || "").replace(/^#/, "") + "&" + (window.location.search || "").replace(/^\?/, "");
  const params = new URLSearchParams(raw);
  return Boolean(params.get("error_code") || params.get("error"));
}

export default function ResetPassword() {
  // checking -> ready (can type a new password) | invalid (link no good) | done
  const [status, setStatus] = useState("checking");
  const [linkProblem] = useState(linkHasProblem);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (linkProblem) { setStatus("invalid"); return; }
      let hasSession = false;
      try { hasSession = await db.auth.isAuthenticated(); } catch {}
      if (!cancelled) setStatus(hasSession ? "ready" : "invalid");
    })();
    return () => { cancelled = true; };
  }, [linkProblem]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    setLoading(true);
    try {
      await db.auth.resetPassword({ resetToken: null, newPassword: password });
      setStatus("done");
      // Sign out so the new password is what you use to sign back in.
      setTimeout(() => db.auth.logout("/login"), 1800);
    } catch (err) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Set New Password</h1>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          {status === "checking" && (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          )}

          {status === "invalid" && (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-600">
                This reset link has expired, was already used, or wasn&apos;t opened from the email.
                Reset links work only once and for a short time.
              </p>
              <Link to="/forgot-password"><Button className="w-full">Request a new link</Button></Link>
              <Link to="/login" className="block text-sm text-blue-600 hover:underline">Back to login</Link>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
              <div>
                <Label>New Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Reset Password
              </Button>
            </form>
          )}

          {status === "done" && (
            <div className="text-center space-y-3 py-2">
              <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
              <p className="text-sm text-slate-700 font-medium">Password updated.</p>
              <p className="text-sm text-slate-500">Taking you to sign in with your new password…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
