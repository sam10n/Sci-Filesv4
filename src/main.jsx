import React from 'react'
import ReactDOM from 'react-dom/client'
import { isSupabaseConfigured } from '@/lib/supabaseClient' // must load first: sets globalThis.__B44_DB__
import App from '@/App.jsx'
import '@/index.css'

function MissingKeys() {
  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: 24, fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>Supabase isn&rsquo;t connected yet</h1>
      <p>This site was built without its two Supabase keys, so it can&rsquo;t sign anyone in or load anything.</p>
      <p>Open the file <b>.env.production</b> in the project, paste your Supabase <b>Project URL</b> and
        <b> anon public key</b> after the two equals signs, then upload/deploy the project again.</p>
      <p style={{ color: '#666', fontSize: 14 }}>(Or add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY under
        Vercel &rarr; Settings &rarr; Environment Variables, then Redeploy without the build cache.)</p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  isSupabaseConfigured ? <App /> : <MissingKeys />
)
