const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";
import { Outlet } from "react-router-dom";

import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { KeyRound, Loader2, MailCheck } from "lucide-react";

const OAUTH_FLAG = "sci_oauth_signin";
const SKIP_FLAG = "sci_password_setup_skipped";

export default function PasswordSetupGate() {
  const { user } = useAuth();
  const [needed, setNeeded] = useState(
    () => sessionStorage.getItem(OAUTH_FLAG) === "1" && !sessionStorage.getItem(SKIP_FLAG)
  );
  const [step, setStep] = useState("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!needed || !user || user.password_setup_done) return <Outlet />;

  const sendLink = async () => {
    setError("");
    setLoading(true);
    try {
      await db.auth.resetPasswordRequest(user.email);
      setStep("sent");
    } catch (err) {
      setError(err.message || "We couldn't send the email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    setLoading(true);
    try {
      await db.auth.updateMe({ password_setup_done: true });
    } catch {}
    sessionStorage.removeItem(OAUTH_FLAG);
    setLoading(false);
    setNeeded(false);
  };

  const skip = () => {
    sessionStorage.setItem(SKIP_FLAG, "1");
    setNeeded(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Create your password</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your account was created with Google. Add a password so you can also sign in with your email.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}

          {step === "idle" ? (
            <>
              <p className="text-sm text-slate-600">
                We'll email a link to <span className="font-medium text-slate-900">{user.email}</span>. Open it, choose
                a password, then come back here.
              </p>
              <Button className="w-full" onClick={sendLink} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MailCheck className="w-4 h-4 mr-2" />}
                Email me a password setup link
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Link sent to <span className="font-medium text-slate-900">{user.email}</span>. Open it, choose your
                password, then confirm below.
              </p>
              <Button className="w-full" onClick={finish} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} I've set my password
              </Button>
              <Button variant="outline" className="w-full" onClick={sendLink} disabled={loading}>
                Send the link again
              </Button>
            </>
          )}

          <button type="button" onClick={skip} className="block w-full text-center text-sm text-slate-500 hover:underline">
            Do this later
          </button>
        </div>
      </div>
    </div>
  );
}