import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  const { data: providersData, error } = await supabase.from('providers').select('*');
  if (error) {
    console.error('Error fetching providers:', error);
    return;
  }
  
  console.log(`Total providers in DB: ${providersData.length}`);
  providersData.forEach(p => {
    console.log(`- ID: ${p.id}, Name: ${p.name}, Nickname: ${p.nickname}, Active: ${p.active}, Phone: ${p.phone}`);
  });
}

run();
