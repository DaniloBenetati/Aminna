
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAny() {
  const { data, error } = await supabase
    .from('appointments')
    .select('date')
    .limit(100);

  if (error) {
    console.error(error);
    return;
  }

  const counts = {};
  data.forEach(a => counts[a.date] = (counts[a.date] || 0) + 1);
  console.log('Sample dates:', counts);
}

checkAny();
