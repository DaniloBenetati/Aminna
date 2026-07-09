const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function extractUsername(social) {
  if (!social) return '';
  let cleaned = social.trim();
  cleaned = cleaned.split('?')[0];
  if (cleaned.includes('instagram.com/')) {
    const parts = cleaned.split('instagram.com/')[1].split('/');
    cleaned = parts[0] || '';
  } else if (cleaned.includes('/')) {
    const parts = cleaned.split('/').filter(Boolean);
    cleaned = parts[parts.length - 1] || '';
  }
  return cleaned.replace('@', '').trim().toLowerCase();
}

async function main() {
  const { data: partners, error: err1 } = await supabase.from('partners').select('*');
  const { data: posts, error: err2 } = await supabase.from('ig_posts').select('*');

  if (err1 || err2) {
    console.error("Error:", err1 || err2);
    return;
  }

  console.log(`Loaded ${partners.length} partners and ${posts.length} posts.`);

  partners.forEach(pt => {
    // Collect all usernames
    const rawList = [
      pt.social_media,
      pt.social_media_secondary,
      ...(pt.social_media_list || [])
    ].filter(Boolean);

    const socialList = rawList.map(extractUsername).filter(Boolean);

    // Find matching posts
    const matchingPosts = posts.filter(p => {
      // 1. Direct check in influencer_name
      if (p.influencer_name) {
        const names = p.influencer_name.split(',').map(n => n.replace('@', '').trim().toLowerCase());
        if (names.some(name => socialList.includes(name))) return true;
      }

      // 2. Fallback check: caption contains handle
      const caption = (p.caption || '').toLowerCase();
      return socialList.some(username => {
        if (!username) return false;
        return caption.includes(`@${username}`) || caption.includes(username);
      });
    });

    console.log(`Partner: ${pt.name} | Handles: ${JSON.stringify(socialList)} | Matches: ${matchingPosts.length}`);
  });
}

main();
