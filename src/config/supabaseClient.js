const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ Supabase Credentials missing in .env file (SUPABASE_URL, SUPABASE_KEY)");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
