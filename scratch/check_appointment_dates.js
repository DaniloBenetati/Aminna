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
  const { data: appts, error } = await supabase.from('appointments').select('date, status');
  if (error) {
    console.error('Error fetching appointments:', error);
    return;
  }
  
  console.log(`Total appointments: ${appts.length}`);
  
  const today = new Date().toISOString().split('T')[0];
  console.log(`Today is: ${today}`);
  
  const countToday = appts.filter(a => a.date === today).length;
  console.log(`Appointments for today (${today}): ${countToday}`);
  
  // Find dates with most appointments
  const dateCounts = {};
  appts.forEach(a => {
    dateCounts[a.date] = (dateCounts[a.date] || 0) + 1;
  });
  
  const sortedDates = Object.entries(dateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
    
  console.log('Top 10 dates with most appointments:');
  sortedDates.forEach(([d, count]) => {
    console.log(`- ${d}: ${count} appointments`);
  });
}

run();
