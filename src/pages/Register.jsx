const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { FileText, Loader2 } from "lucide-react";
import { googleLoginEnabled } from "@/lib/supabaseClient";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function Register() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await db.auth.register({ email, password });
      if (res?.alreadyExists) {
        setError("An account with this email already exists. Sign in instead — or, if you signed up with Google, use \"Forgot password?\" on the sign-in page to add a password.");
        return;
      }
      if (res?.session) {
        // "Confirm email" is OFF in Supabase: the account is already signed in.
        window.location.href = "/";
        return;
      }
      setStep(2);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const { access_token } = await db.auth.verifyOtp({ email, otpCode });
      db.auth.setToken(access_token);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await db.auth.resendOtp(email);
    } catch {}
  };

  const handleGoogle = () => {
    sessionStorage.setItem("sci_oauth_signin", "1");
    db.auth.loginWithProvider("google", "/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-slate-900">Create Account</h1>
          <p className="text-sm text-slate-500 mt-1">{step === 1 ? "Get started with Sci-Files" : "Verify your email"}</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          {step === 1 ? (
            <>
              <form onSubmit={handleRegister} className="space-y-4">
                {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div>
                  <Label>Confirm Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create Account
                </Button>
              </form>
              {googleLoginEnabled && (
                <>
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-slate-400">or</span></div>
              </div>
              <Button variant="outline" className="w-full" onClick={handleGoogle}>
                Continue with Google
              </Button>
                </>
              )}
              <p className="text-sm text-slate-500 text-center mt-4">Already have an account? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link></p>
            </>
          ) : (
            <div className="space-y-4 text-center">
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
              <p className="text-sm text-slate-600">We emailed <strong>{email}</strong>. Click the confirmation link in that email, or type the 6-digit code if it shows one. Check your spam folder too.</p>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button onClick={handleVerify} className="w-full" disabled={loading || otpCode.length < 6}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Verify
              </Button>
              <button onClick={handleResend} className="text-sm text-blue-600 hover:underline">Resend email</button>
              <p className="text-sm text-slate-500">Already confirmed? <Link to="/login" className="text-blue-600 hover:underline">Sign in</Link></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
