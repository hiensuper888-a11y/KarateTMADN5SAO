// ============================================
// Supabase Client Initialization
// Karate TMA DN5SAO
// ============================================

const SUPABASE_URL = 'https://copkpxudxwetizqzhbsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGtweHVkeHdldGl6cXpoYnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MjcyNzcsImV4cCI6MjA5MTEwMzI3N30.JFI7_Nlrwwei7v2tbADXDl2JMrsz0MOt6ArPGi6hbLw';

try {
    // Simple initialization — no custom flowType, let Supabase handle defaults
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
        }
    });
    console.log('[Supabase] Client initialized OK');
} catch (e) {
    console.error('[Supabase] Init failed:', e);
    window.sb = null;
}
