const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eedazqhgvvelcjurigla.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZGF6cWhndnZlbGNqdXJpZ2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM4NTI5NywiZXhwIjoyMDg0OTYxMjk3fQ.g6GobuEV8PYw92hzHjz303xRYYl7etqrfcSDMxh37WM';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("Searching for 'tanaka' in all posts...");
  const { data, error } = await supabase
    .from('ig_posts')
    .select('id, permalink, influencer_name, caption')
    .or('influencer_name.ilike.%tanaka%,caption.ilike.%tanaka%');

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Total matched rows:", data.length);
  data.forEach(p => {
    console.log(`- ID: ${p.id}\n  Link: ${p.permalink}\n  Influencer: ${p.influencer_name}\n  Caption: ${p.caption.substring(0, 150)}...\n`);
  });
}

main();
