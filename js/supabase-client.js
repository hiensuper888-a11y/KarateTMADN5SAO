// ============================================
// Supabase Client Initialization
// Karate TMA DN5SAO
// ============================================

const SUPABASE_URL = 'https://copkpxudxwetizqzhbsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvcGtweHVkeHdldGl6cXpoYnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MjcyNzcsImV4cCI6MjA5MTEwMzI3N30.JFI7_Nlrwwei7v2tbADXDl2JMrsz0MOt6ArPGi6hbLw';

// Initialize Supabase client (uses window.supabase from CDN)
window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
