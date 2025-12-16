
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ritfpmljlbfcbxrtdloy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpdGZwbWxqbGJmY2J4cnRkbG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTMxMDgsImV4cCI6MjA4MTQ2OTEwOH0.F7eE3GvCx2QpItqmuIva2J26Fubtt1tQE4akctKbNpA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
