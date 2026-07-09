const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: posts, error } = await supabase
    .from('ig_posts')
    .select('id, caption, influencer_name, is_collab, synced_at')
    .limit(100);

  if (error) {
    console.error("Error fetching posts:", error);
    return;
  }

  console.log(`Total posts loaded: ${posts.length}`);
  const withInfluencer = posts.filter(p => p.influencer_name);
  console.log(`Posts with influencer_name: ${withInfluencer.length}`);
  console.log("Influencers found:", [...new Set(withInfluencer.map(p => p.influencer_name))]);

  console.log("\nSample posts:");
  posts.slice(0, 10).forEach(p => {
    console.log(`ID: ${p.id} | Collab: ${p.is_collab} | Influencer: "${p.influencer_name}" | Caption start: "${(p.caption || '').substring(0, 60)}"`);
  });
}

main();
