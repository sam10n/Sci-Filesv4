# SchoolVault — Supabase version WITH LOGIN

Each account has its **own private** students, folders, files and tasks. Other accounts
cannot see, change or delete them. Signing in with the same email (email + password, or
Google) on any phone or computer is the same account, so it shows the same data everywhere.
The rules are enforced inside the database (`supabase_schema.sql`), not just in the app.

Login and emails are handled by **Supabase**. Vercel only hosts the website; it does not
store accounts or send email.

---

## 1. Supabase: create the database (one time)

1. Create a project at https://supabase.com and wait until it finishes setting up.
2. **SQL Editor → New query** → paste the whole of `supabase_schema.sql` → **Run**.
   - This creates the tables, the privacy rules, and the **private** file bucket `school-files`.
   - Safe to run again, and safe to run on a project made with the older no-login version
     (it removes the old open rules).
   - If it complains about the bucket, create it by hand (**Storage → New bucket**, name
     `school-files`, leave **Public bucket OFF**) and run the script again.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
   (Never use the `service_role` key.)

## 2. Put the keys in the project

Open `.env.production` and paste the two values after the equals signs (no quotes, no spaces):

```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your long key...
```

To run on your own computer, copy `.env.example` to `.env.local` and fill in the same two values.

## 3. Tell Supabase where your website lives

You only get your live address AFTER the first deploy (section 8), so do this in two rounds:

**Round 1 (before you have a live address):** in Supabase go to **Authentication → URL Configuration**
and set **Site URL** to `http://localhost:5173`, and add `http://localhost:5173/**` under
**Redirect URLs**. (To test on a phone over WiFi, also add that address, e.g. `http://192.168.1.42:5173/**`.)

**Round 2 (right after your first deploy):** Vercel shows your address when the deploy finishes
(the project page's **Visit** button / **Domains** tab, or in the terminal after `vercel --prod`;
it looks like `https://your-project-name.vercel.app`). Then come back here and:
- change **Site URL** to that address, and
- add `https://your-project-name.vercel.app/**` under **Redirect URLs** (keep the localhost one).

Use the address from the Production deployment, not a "Preview" one (those change every time).
Without this, the links in emails (confirm account / reset password) send people to the wrong place.

## 4. Emails (confirm account, reset password) — pick one

**A. Quick start, no emails at all:** **Authentication → Sign In / Providers → Email** →
turn **Confirm email OFF**. People can register and are signed in immediately.
(Anyone can then register with an email address they don't own — fine for testing.)
"Forgot password" will not work in this mode.

**B. Real emails from your Gmail:** Supabase's built-in sender only emails members of your own
Supabase organization and only a couple per hour, so for real users you must plug in your own
email account (custom SMTP):

1. Google Account → **Security** → turn on **2-Step Verification**, then search for
   **App passwords** and create one. Copy the 16 characters (type them with no spaces).
2. Supabase → **Authentication → Emails → SMTP Settings** (menu names vary slightly) →
   enable **Custom SMTP** and fill in EXACTLY:
   - Sender email: your Gmail address
   - Username: the SAME Gmail address (sender and username must match)
   - Sender name: SchoolVault
   - Host: `smtp.gmail.com`   ·   Port: `465`
   - Password: the 16-character App Password (NOT your normal Gmail password)
3. **Authentication → Rate Limits**: raise "emails per hour" if you need more than the default.
4. Turn **Confirm email ON** (**Authentication → Sign In / Providers → Email**).
5. Optional but recommended — show a code as well as a link: **Authentication → Emails →
   Templates → Confirm sign up**, and add this line to the message:
   `<p>Your code: {{ .Token }}</p>`  (keep the existing link too)

Gmail allows roughly 500 emails a day from a personal account, and messages may land in spam
at first. Supabase itself recommends a dedicated mail service (Resend, Brevo, SendGrid...) for
anything bigger; it uses the same screen.

**If sign-up shows an error 504 / "email service didn't answer in time":** Supabase tries to send
the confirmation email while the person waits, and the mail server did not reply.
1. Supabase → **Logs → Auth** (or **Logs Explorer**): the line for the sign-up shows the real reason
   (wrong password, blocked login, wrong port...).
2. Re-check step 2 above: App Password (not the normal password), sender = username, host
   `smtp.gmail.com`, port `465`. If 465 fails try `587`.
3. Make sure 2-Step Verification is still on for that Google account (App passwords stop working if it is turned off).
4. Meanwhile you can keep working: turn **Confirm email OFF** (option A) so registering needs no email.
   (Reset-password emails still need the SMTP above.)
5. Failed attempts can leave half-created test accounts: **Authentication → Users**, delete them and try again.

**If "Forgot password" email arrives but you never get to type a new password:**
1. Look at the address the email link opens. It must start with your live website address
   (e.g. `https://your-site.vercel.app`), NOT `http://localhost:5173`. If it opens localhost,
   change **Site URL** in **Authentication → URL Configuration** to your live address.
2. In the same screen, **Redirect URLs** must contain `https://your-site.vercel.app/**`.
   (The app also forwards a misrouted link to the right page, but Supabase should send it there directly.)
3. Reset links work **once** and expire after a while. If the page says the link expired or was already
   used, click **Request a new link**. Wait 60 seconds between requests.
4. **Authentication → Emails → Templates → Reset Password** must still contain the link
   `{{ .ConfirmationURL }}`.
5. If no email arrives at all, the page now shows the reason; fix the SMTP settings above.

## 5. Optional: "Continue with Google"

The Google buttons are hidden until you switch this on.
1. In Google Cloud Console create an **OAuth client ID** (type: Web application). Add the
   redirect URI shown in Supabase under **Authentication → Sign In / Providers → Google**
   (it looks like `https://abcdefgh.supabase.co/auth/v1/callback`).
2. Paste the Client ID and Secret into that Supabase Google screen and enable it.
3. In `.env.production` set `VITE_GOOGLE_LOGIN=true` and deploy again.

People who sign up with Google are asked once to create a password too (an email link is sent,
so step 4B must be done first).

## 6. Make yourself an admin (optional)

Admins can see everyone's data; nobody is an admin until you do this. Register once, then in
the SQL Editor run:

```
update public.profiles set role = 'admin' where email = 'you@gmail.com';
```

## 7. Run it

```
npm install
npm run dev
```

Open the **Local** address on the computer and the **Network** address on a phone on the same
WiFi. (Phone browsers block the camera on plain `http://` addresses, so Scan / QR need the
HTTPS address you get once deployed.)

## 8. Deploy to Vercel

Option A — straight from this folder, no GitHub:
```
npm install -g vercel
vercel login
vercel
vercel --prod
```
Option B — via GitHub: upload the **contents** of this folder to a **Private** repository
(`index.html` and `src/` at the top level; never `node_modules`), then on vercel.com choose
Add New → Project → import it → Deploy. The keys are read from `.env.production`, so no Vercel
environment variables are needed. After any later change, commit and push; Vercel redeploys.

## Notes

- **Files are private.** Uploaded files sit in a private bucket inside a folder named after the
  account. The app creates temporary links (valid 24 hours, re-issued automatically).
- **Delete account** really deletes the login, the profile, all the account's records and its
  uploaded files.
- Data created with the earlier no-login version has no owner. Normal accounts cannot see it;
  `supabase_schema.sql` ends with a snippet that hands it to one account.
- **`src/lib/grades.js`** was missing from the Base44 export, so your original file (supplied
  separately) was added as-is. It holds the school-year rules: the school year starts in July, years
  are written `2026-2027`, and a grade above 12 means graduated.
- The latest Base44 export was also missing the login, register, forgot-password and reset-password
  pages and several other files (the export tool dropped them). The versions in this project come
  from the earlier conversion and were fixed (see section 4).
- Students now have a **Student LRN** (12-digit Learner Reference Number) instead of "Student
  number", and two new fields (`base_grade_number`, `base_year_start`) that anchor the grade to a
  school year. Re-run `supabase_schema.sql` once to add them; your data is kept.
- Base44's backend was replaced by `src/lib/supabaseClient.js` (the only file that talks to
  Supabase). `AuthContext.jsx`, `ProtectedRoute.jsx`, `App.jsx`, `Login.jsx` and `Register.jsx`
  were adapted; Base44-only files were removed; the stray `const db = ...` line that the export
  put at the top of `index.html` was removed.
