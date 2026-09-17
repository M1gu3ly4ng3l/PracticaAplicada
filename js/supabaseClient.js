import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://sabftpplncnvxwthyubz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhYmZ0cHBsbmNudnh3dGh5dWJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0MTU3ODAsImV4cCI6MjEwNDk5MTc4MH0.6pa0pcJWUg2Ak2rLhT39jR8MiCi7l4xNs4CXOSHimfw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
