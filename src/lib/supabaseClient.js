// supabaseClient.js
//
// This file replaces Base44 as the backend. It creates a Supabase client and
// builds an object with the EXACT same shape as the one Base44 used to inject
// (db.entities.*, db.auth.*, db.integrations.Core.UploadFile), then attaches it
// to `globalThis.__B44_DB__`. Every page reads its data through that global, so
// the pages themselves did not need to change — this is the ONLY file that
// talks to Supabase directly.
//
// WHO CAN SEE WHAT is decided inside the database, not here (see
// supabase_schema.sql): every row and every uploaded file belongs to the account
// that created it, and other accounts cannot read, change or delete it.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Set them in .env.production (or .env.local when running on your computer).'
  );
}

// Fallback strings stop the app from crashing on load if the keys are missing,
// so you see a clear message instead of a blank white page.
export const supabase = createClient(
  supabaseUrl || 'https://missing-url.supabase.co',
  supabaseAnonKey || 'missing-key',
  // "implicit" keeps emailed links working even if the email is opened on a
  // different phone/browser than the one that asked for it.
  { auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } }
);

// The emailed "reset password" link carries "type=recovery" in its address. If it
// lands on any page other than the reset page (for example the home page, when the
// website address is not in Supabase's Redirect URLs list), the person would just
// be signed in and never get to choose a new password. So forward it to the reset
// page, keeping the secret part of the address so the page can still use it.
export function forwardRecoveryLink(loc, go) {
  const combined = `${loc.hash || ''}&${loc.search || ''}`;
  if (loc.pathname !== '/reset-password' && /(^|[#&?])type=recovery(&|$)/.test(combined)) {
    go(`/reset-password${loc.search || ''}${loc.hash || ''}`);
    return true;
  }
  return false;
}
if (typeof window !== 'undefined') {
  forwardRecoveryLink(window.location, (url) => window.location.replace(url));
}

// Set VITE_GOOGLE_LOGIN=true in .env.production only after Google sign-in has
// been switched on in Supabase; the Google buttons stay hidden otherwise.
export const googleLoginEnabled = import.meta.env.VITE_GOOGLE_LOGIN === 'true';

const STORAGE_BUCKET = 'school-files';
const SIGNED_URL_SECONDS = 60 * 60 * 24; // file links stay valid for 24 hours, then are re-issued automatically
const STORED_PREFIX = `sb://${STORAGE_BUCKET}/`; // how a private file is remembered in the database

// ---------------------------------------------------------------------
// Friendlier wording for the errors people actually run into
// ---------------------------------------------------------------------
function friendly(error) {
  const raw = error?.message || 'Something went wrong. Please try again.';
  const msg = raw.toLowerCase();
  const code = error?.code || error?.error_code || '';
  let text = raw;
  if (code === 'invalid_credentials' || msg.includes('invalid login credentials')) {
    text = 'Invalid email or password.';
  } else if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
    text = 'Please confirm your email first — check your inbox (and the spam folder) for our message.';
  } else if (code === 'email_address_not_authorized' || msg.includes('email address not authorized')) {
    text = "Supabase can't send emails to this address yet. The project owner needs to turn on custom SMTP in Supabase (see README).";
  } else if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || error?.status === 429 ||
             msg.includes('rate limit') || msg.includes('too many')) {
    text = 'Too many attempts or emails right now. Please wait a few minutes and try again.';
  } else if (error?.status === 504 || error?.status === 502 || error?.status === 503 ||
             error?.name === 'AuthRetryableFetchError' || msg.includes('timed out') || msg.includes('gateway')) {
    text = "The email service didn't answer in time, so we can't confirm whether your email was sent. " +
           "Wait a minute, then try 'Resend email' or sign in. If this keeps happening, the project owner needs to check the SMTP settings in Supabase (README, section 4).";
  } else if (code === 'otp_expired' || msg.includes('token has expired') || (msg.includes('invalid') && msg.includes('token'))) {
    text = 'That code is wrong or has expired. Request a new one and try again.';
  } else if (code === 'session_not_found' || msg.includes('auth session missing')) {
    text = 'This link has expired or was already used. Please request a new one.';
  } else if (code === 'same_password' || msg.includes('different from the old password')) {
    text = 'Please choose a password you have not used before.';
  } else if (code === 'weak_password' || msg.includes('password should be at least')) {
    text = 'That password is too weak. Use at least 6 characters (a mix of letters and numbers is better).';
  }
  const e = new Error(text);
  e.status = error?.status;
  e.code = code;
  return e;
}

// ---------------------------------------------------------------------
// Private files. Files live in a PRIVATE bucket; the database only remembers
// "sb://school-files/<account id>/<file>" and a fresh temporary link is
// created whenever the data is loaded. Old full links (from earlier test
// versions) are left untouched.
// ---------------------------------------------------------------------
const URL_COLUMNS = {
  students: ['photo_url'],
  school_files: ['file_url'],
};

// A temporary link that points into our bucket -> the compact form we store.
function toStoredUrl(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/\/storage\/v1\/object\/sign\/school-files\/([^?#]+)/);
  return m ? STORED_PREFIX + decodeURIComponent(m[1]) : value;
}

// The compact stored form -> a temporary link the browser can open.
async function resolveUrls(table, rows) {
  const cols = URL_COLUMNS[table];
  if (!cols || !rows) return rows;
  const list = Array.isArray(rows) ? rows : [rows];

  const paths = new Set();
  for (const row of list) {
    for (const c of cols) {
      if (typeof row?.[c] === 'string' && row[c].startsWith(STORED_PREFIX)) {
        paths.add(row[c].slice(STORED_PREFIX.length));
      }
    }
  }
  if (!paths.size) return rows;

  const signed = new Map();
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls([...paths], SIGNED_URL_SECONDS);
    if (!error && data) {
      for (const item of data) {
        if (item?.signedUrl && !item.error) signed.set(item.path, item.signedUrl);
      }
    }
  } catch {
    // fall through to the public-link fallback below
  }

  const swap = (row) => {
    if (!row) return row;
    const out = { ...row };
    for (const c of cols) {
      const v = out[c];
      if (typeof v === 'string' && v.startsWith(STORED_PREFIX)) {
        const p = v.slice(STORED_PREFIX.length);
        out[c] = signed.get(p) || supabase.storage.from(STORAGE_BUCKET).getPublicUrl(p).data.publicUrl;
      }
    }
    return out;
  };
  return Array.isArray(rows) ? rows.map(swap) : swap(rows);
}

// ---------------------------------------------------------------------
// Entities: "list / get / create / update / delete / bulkUpdate" become normal
// database queries. Which rows come back is limited by the database rules to
// the signed-in account's own data.
// ---------------------------------------------------------------------
const TABLES = {
  Student: 'students',
  SchoolFile: 'school_files',
  Folder: 'folders',
  BoardTask: 'board_tasks',
  User: 'profiles',
};

// Base44 quietly accepted blank text ("") for fields like dates, numbers and
// links to other records. Postgres is strict and rejects "" for those, so any
// blank value in these columns is converted to null (= "empty") before saving.
const STRICT_COLUMNS = {
  students: ['age', 'grade_number', 'base_grade_number', 'base_year_start'],
  school_files: ['file_size', 'folder_id', 'student_id'],
  folders: ['parent_folder_id'],
  board_tasks: ['due_date'],
};

function clean(table, payload) {
  const out = { ...payload };
  for (const col of STRICT_COLUMNS[table] || []) {
    if (out[col] === '') out[col] = null;
  }
  for (const col of URL_COLUMNS[table] || []) {
    if (col in out) out[col] = toStoredUrl(out[col]);
  }
  // The owner is always filled in by the database from the signed-in account.
  delete out.created_by_id;
  return out;
}

function makeEntity(entityName) {
  const table = TABLES[entityName];

  return {
    // db.entities.X.list("-created_date", 200)
    async list(sort, limit) {
      let query = supabase.from(table).select('*');
      if (sort) {
        const desc = sort.startsWith('-');
        const column = desc ? sort.slice(1) : sort;
        query = query.order(column, { ascending: !desc });
      } else {
        query = query.order('created_date', { ascending: false });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return resolveUrls(table, data);
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return resolveUrls(table, data);
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table).insert(clean(table, payload)).select().single();
      if (error) throw error;
      return resolveUrls(table, data);
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table).update(clean(table, payload)).eq('id', id).select().single();
      if (error) throw error;
      return resolveUrls(table, data);
    },

    async delete(id) {
      // Remember which uploaded file (if any) belongs to this row, so the file
      // itself can be removed too and doesn't linger in storage.
      let storedPath = null;
      if (table === 'school_files') {
        const { data: row } = await supabase.from(table).select('file_url').eq('id', id).maybeSingle();
        if (typeof row?.file_url === 'string' && row.file_url.startsWith(STORED_PREFIX)) {
          storedPath = row.file_url.slice(STORED_PREFIX.length);
        }
      }
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      if (storedPath) {
        try { await supabase.storage.from(STORAGE_BUCKET).remove([storedPath]); } catch { /* best effort */ }
      }
      return { success: true };
    },

    // Used by "Promote Grades": [{ id, grade, grade_number, ... }, ...]
    async bulkUpdate(updates) {
      const results = await Promise.all(
        updates.map(({ id, ...fields }) =>
          supabase.from(table).update(clean(table, fields)).eq('id', id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;
      return { success: true };
    },
  };
}

const entities = {};
for (const name of Object.keys(TABLES)) {
  entities[name] = makeEntity(name);
}

// "Delete Account" must remove the real login, the person's data and their
// uploaded files — not just a profile row.
async function removeAllMyFiles(uid) {
  try {
    const bucket = supabase.storage.from(STORAGE_BUCKET);
    for (let round = 0; round < 50; round++) {
      const { data, error } = await bucket.list(uid, { limit: 100 });
      if (error || !data || !data.length) break;
      const paths = data.filter((f) => f.name).map((f) => `${uid}/${f.name}`);
      if (!paths.length) break;
      const { error: rmError } = await bucket.remove(paths);
      if (rmError) break;
    }
  } catch {
    // best effort: the account is still deleted below
  }
}

entities.User.delete = async (id) => {
  const { data } = await supabase.auth.getUser();
  const user = data?.user;
  if (!user || (id && id !== user.id)) {
    throw new Error('You can only delete your own account.');
  }
  await removeAllMyFiles(user.id);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) throw error;
  return { success: true };
};

// ---------------------------------------------------------------------
// Auth: maps Base44's auth calls onto Supabase Auth.
// ---------------------------------------------------------------------
async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data;
}

const auth = {
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  // The signed-in account, merged with its profile row (role, password_setup_done...)
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const profile = await getProfile(data.user.id);
    return { ...profile, id: data.user.id, email: data.user.email, role: profile?.role || 'user' };
  },

  // Used by the "create a password" screen after a Google sign-up.
  // Only fields in this list can be changed (never role).
  async updateMe(fields) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const allowed = {};
    for (const key of ['password_setup_done']) {
      if (fields && key in fields) allowed[key] = fields[key];
    }
    if (Object.keys(allowed).length) {
      const { error: updateError } = await supabase.from('profiles').update(allowed).eq('id', data.user.id);
      if (updateError) throw friendly(updateError);
    }
    return auth.me();
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw friendly(error);
    return data;
  },

  async loginWithProvider(provider, redirectPath = '/') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    });
    if (error) throw friendly(error);
  },

  // Creates the account. With "Confirm email" ON in Supabase, an email is sent
  // (link and/or 6-digit code) and no session exists yet; with it OFF, the
  // person is signed in immediately (data.session is set).
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw friendly(error);
    // With confirmation ON, an address that is already registered comes back as
    // a "fake" user with no identities (and no email is sent).
    const alreadyExists =
      !data.session && Array.isArray(data.user?.identities) && data.user.identities.length === 0;
    return { ...data, alreadyExists };
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw friendly(error);
    return { access_token: data.session?.access_token };
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw friendly(error);
  },

  // No-op: Supabase already holds the session after sign-in / verification.
  setToken() {},

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw friendly(error);
  },

  // Supabase creates a temporary "recovery" session when the person clicks the
  // emailed link, so the old resetToken value isn't needed here.
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw friendly(error);
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin() {
    window.location.href = '/login';
  },
};

// ---------------------------------------------------------------------
// File uploads -> Supabase Storage (private bucket "school-files").
// Each account uploads into its own folder: <account id>/<file>
// ---------------------------------------------------------------------
const integrations = {
  Core: {
    async UploadFile({ file }) {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData?.session?.user?.id;
      if (!uid) throw new Error('Please sign in again before uploading.');

      // Keep file names URL-safe (spaces/symbols can break storage paths)
      const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      // crypto.randomUUID only exists on https/localhost pages; when testing on a
      // phone over plain http WiFi it's missing, so fall back to a random string.
      const uniq = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const path = `${uid}/${uniq}-${safeName}`;

      const bucket = supabase.storage.from(STORAGE_BUCKET);
      const { error } = await bucket.upload(path, file, { contentType: file.type || undefined });
      if (error) throw error;

      const { data: signed, error: signError } = await bucket.createSignedUrl(path, SIGNED_URL_SECONDS);
      if (signError || !signed?.signedUrl) {
        // Only works if the bucket was left public.
        return { file_url: bucket.getPublicUrl(path).data.publicUrl };
      }
      return { file_url: signed.signedUrl };
    },
  },
};

export const db = { auth, entities, integrations };

// Make it available globally BEFORE the rest of the app evaluates.
// main.jsx imports this file first, so this runs before any page reads it.
globalThis.__B44_DB__ = db;

export default db;
