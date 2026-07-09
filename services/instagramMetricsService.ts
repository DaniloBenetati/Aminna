import { supabase } from './supabase';

const META_API = 'https://graph.facebook.com/v19.0';

// ─── Types ─────────────────────────────────────────────────────────────────
export interface IGMetricSnapshot {
  id?: string;
  synced_at: string;
  followers_count: number;
  following_count: number;
  media_count: number;
  reach: number;
  impressions: number;
  accounts_reached: number;
  profile_views: number;
  website_clicks: number;
  email_contacts: number;
  ig_user_id?: string;
}

export interface IGPost {
  id: string;
  permalink: string;
  media_type: string;
  caption: string;
  timestamp: string;
  like_count: number;
  comments_count: number;
  shares_count: number;
  saved: number;
  reach: number;
  impressions: number;
  video_views: number;
  total_interactions: number;
  engagement_rate: number;
  is_collab: boolean;
  influencer_name: string;
  estimated_followers: number;
  thumbnail_url?: string;
  media_url?: string;
  ig_user_id?: string;
  synced_at?: string;
}

export interface IGAccountSummary {
  followers: number;
  following: number;
  mediaCount: number;
  totalReach: number;
  totalImpressions: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalSaved: number;
  totalEngagement: number;
  avgEngagementRate: number;
  totalViews: number;
  accountsReached: number;
  reelsCount: number;
  storiesCount: number;
  postsCount: number;
  carouselCount: number;
  newFollowers: number;
  growthPercent: number;
  bestPost: IGPost | null;
}

// ─── API Helpers ───────────────────────────────────────────────────────────
async function fetchMeta(token: string, endpoint: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_API}/${endpoint}`);
  url.searchParams.set('access_token', token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Meta API ${res.status}: ${txt}`);
  }
  return res.json();
}

// ─── Sync Functions ────────────────────────────────────────────────────────

export async function fetchIGProfile(token: string, igUserId: string) {
  return fetchMeta(token, igUserId, {
    fields: 'id,name,username,followers_count,follows_count,media_count,profile_picture_url,biography'
  });
}

export async function fetchIGInsights(token: string, igUserId: string, period: string = 'day', since?: string, until?: string) {
  const metrics = 'reach,impressions,accounts_engaged,profile_views,website_clicks,email_contacts';
  const params: Record<string, string> = {
    metric: metrics,
    period,
    metric_type: 'total_value'
  };
  if (since) params.since = since;
  if (until) params.until = until;
  try {
    return await fetchMeta(token, `${igUserId}/insights`, params);
  } catch {
    return { data: [] };
  }
}

async function fetchIGEdge(token: string, igUserId: string, edge: string, fields: string, limit = 50) {
  try {
    let allMedia: any[] = [];
    const first = await fetchMeta(token, `${igUserId}/${edge}`, { fields, limit: String(limit) });
    allMedia = first.data || [];
    let nextUrl = first.paging?.next || null;
    
    let pages = 0;
    while (nextUrl && pages < 2) {
      const res = await fetch(nextUrl);
      if (!res.ok) break;
      const data = await res.json();
      allMedia = [...allMedia, ...(data.data || [])];
      nextUrl = data.paging?.next || null;
      pages++;
    }
    return allMedia;
  } catch (err) {
    console.error(`Erro ao buscar edge ${edge}:`, err);
    return [];
  }
}

export async function fetchIGMedia(token: string, igUserId: string, limit = 50) {
  const mediaFields = 'id,caption,media_type,permalink,timestamp,like_count,comments_count,media_url,thumbnail_url,collaborators,username';
  const collabFields = 'id,caption,media_type,permalink,timestamp,like_count,comments_count,media_url,thumbnail_url,username';
  const tagFields = 'id,caption,media_type,permalink,timestamp,like_count,comments_count,media_url,thumbnail_url,username';

  const [ownMedia, collaborativeMedia, taggedMedia, storiesMedia] = await Promise.all([
    fetchIGEdge(token, igUserId, 'media', mediaFields, limit),
    fetchIGEdge(token, igUserId, 'collaborative_media', collabFields, limit),
    fetchIGEdge(token, igUserId, 'tags', tagFields, limit),
    fetchIGEdge(token, igUserId, 'stories', collabFields, limit).then(items =>
      items.map(item => ({ ...item, media_type: 'STORY' }))
    ),
  ]);

  const merged: any[] = [];
  const seenIds = new Set<string>();

  const addItems = (items: any[]) => {
    for (const item of items) {
      if (item && item.id && !seenIds.has(item.id)) {
        seenIds.add(item.id);
        merged.push(item);
      }
    }
  };

  addItems(ownMedia);
  addItems(collaborativeMedia);
  addItems(taggedMedia);
  addItems(storiesMedia);

  // Ordenar decrescentemente pelo timestamp
  merged.sort((a, b) => {
    const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return tB - tA;
  });

  return merged;
}

export async function fetchMediaInsights(token: string, mediaId: string, mediaType: string) {
  const isVideo = mediaType === 'VIDEO' || mediaType === 'REEL';
  const isStory = mediaType === 'STORY';
  
  let metrics = 'impressions,reach,saved,shares';
  if (isVideo) metrics += ',plays';
  if (isStory) metrics = 'impressions,reach';

  try {
    const data = await fetchMeta(token, `${mediaId}/insights`, { metric: metrics });
    const result: Record<string, number> = {};
    (data.data || []).forEach((m: any) => {
      result[m.name] = m.values?.[0]?.value || 0;
    });
    return result;
  } catch {
    return {};
  }
}

// ─── Full Sync ─────────────────────────────────────────────────────────────

export async function syncAllMetrics(
  token: string,
  igUserId: string,
  onProgress?: (msg: string, pct: number) => void
): Promise<{ snapshot: IGMetricSnapshot; posts: IGPost[] }> {
  onProgress?.('Buscando perfil...', 5);
  const profile = await fetchIGProfile(token, igUserId);

  onProgress?.('Buscando insights da conta...', 15);
  const insightsData = await fetchIGInsights(token, igUserId, 'day');
  const insightsMap: Record<string, number> = {};
  (insightsData.data || []).forEach((m: any) => {
    insightsMap[m.name] = m.total_value?.value || m.values?.[0]?.value || 0;
  });

  const snapshot: IGMetricSnapshot = {
    synced_at: new Date().toISOString(),
    followers_count: profile.followers_count || 0,
    following_count: profile.follows_count || 0,
    media_count: profile.media_count || 0,
    reach: insightsMap.reach || 0,
    impressions: insightsMap.impressions || 0,
    accounts_reached: insightsMap.accounts_engaged || 0,
    profile_views: insightsMap.profile_views || 0,
    website_clicks: insightsMap.website_clicks || 0,
    email_contacts: insightsMap.email_contacts || 0,
    ig_user_id: igUserId
  };

  onProgress?.('Buscando publicações...', 30);
  const rawMedia = await fetchIGMedia(token, igUserId, 50);

  const posts: IGPost[] = [];
  const BATCH_SIZE = 5;

  const myUsername = (profile.username || '').toLowerCase();

  function buildPost(m: any, ins: Record<string, number>): IGPost {
    const likes = m.like_count || 0;
    const comments = m.comments_count || 0;
    const shares = ins.shares || 0;
    const saved = ins.saved || 0;
    const reach = ins.reach || 0;
    const impressions = ins.impressions || 0;
    const views = ins.plays || 0;
    const totalInteractions = likes + comments + shares + saved;
    const engRate = reach > 0 ? (totalInteractions / reach) * 100 : 0;

    // Detect collab: official collaborators field OR @mention in caption OR different creator username
    const caption = m.caption || '';
    const collaboratorsList: any[] = m.collaborators?.data || [];
    const hasOfficialCollab = collaboratorsList.length > 0;
    const hasMentionCollab = caption.includes('@');
    const isExternalOwner = m.username && m.username.toLowerCase() !== myUsername;
    const isCollab = hasOfficialCollab || hasMentionCollab || isExternalOwner;
    
    const officialNames = collaboratorsList.map((c: any) => c.username).join(', ');
    const mentionNames = hasMentionCollab
      ? (caption.match(/@[\w.]+/g) || []).join(', ')
      : '';
      
    let influencerName = officialNames || mentionNames;
    if (isExternalOwner) {
      if (influencerName) {
        if (!influencerName.toLowerCase().includes(m.username.toLowerCase())) {
          influencerName = `${influencerName}, ${m.username}`;
        }
      } else {
        influencerName = m.username;
      }
    }

    return {
      id: m.id,
      permalink: m.permalink || '',
      media_type: m.media_type || 'IMAGE',
      caption,
      timestamp: m.timestamp || '',
      like_count: likes,
      comments_count: comments,
      shares_count: shares,
      saved,
      reach,
      impressions,
      video_views: views,
      total_interactions: totalInteractions,
      engagement_rate: Math.round(engRate * 100) / 100,
      is_collab: isCollab,
      influencer_name: influencerName,
      estimated_followers: 0,
      thumbnail_url: m.thumbnail_url || m.media_url || '',
      media_url: m.media_url || '',
      ig_user_id: igUserId
    };
  }

  // Process in parallel batches to avoid rate limits while being fast
  for (let i = 0; i < rawMedia.length; i += BATCH_SIZE) {
    const batch = rawMedia.slice(i, i + BATCH_SIZE);
    onProgress?.(
      `Analisando publicações ${i + 1}–${Math.min(i + BATCH_SIZE, rawMedia.length)} de ${rawMedia.length}...`,
      30 + Math.round((i / rawMedia.length) * 60)
    );

    const batchResults = await Promise.all(
      batch.map(async (m: any) => {
        const ins = await fetchMediaInsights(token, m.id, m.media_type);
        return buildPost(m, ins);
      })
    );

    posts.push(...batchResults);
  }

  onProgress?.('Salvando histórico de métricas...', 92);
  await persistSnapshot(snapshot);

  onProgress?.('Calculando estimativas de seguidores...', 95);
  const enriched = await estimateFollowersPerPost(posts, igUserId);

  onProgress?.('Salvando publicações no banco...', 98);
  await persistPosts(enriched);

  onProgress?.('Sincronização concluída!', 100);
  return { snapshot, posts: enriched };
}

// ─── Persistence ───────────────────────────────────────────────────────────

async function persistSnapshot(s: IGMetricSnapshot) {
  await supabase.from('ig_metrics').insert([{
    synced_at: s.synced_at,
    followers_count: s.followers_count,
    following_count: s.following_count,
    media_count: s.media_count,
    reach: s.reach,
    impressions: s.impressions,
    accounts_reached: s.accounts_reached,
    profile_views: s.profile_views,
    website_clicks: s.website_clicks,
    email_contacts: s.email_contacts,
    ig_user_id: s.ig_user_id
  }]);
}

async function persistPosts(posts: IGPost[]) {
  if (posts.length === 0) return;
  const now = new Date().toISOString();
  const rows = posts.map(p => ({
    id: p.id,
    permalink: p.permalink,
    media_type: p.media_type,
    caption: p.caption,
    timestamp: p.timestamp,
    like_count: p.like_count,
    comments_count: p.comments_count,
    shares_count: p.shares_count,
    saved: p.saved,
    reach: p.reach,
    impressions: p.impressions,
    video_views: p.video_views,
    total_interactions: p.total_interactions,
    engagement_rate: p.engagement_rate,
    is_collab: p.is_collab,
    influencer_name: p.influencer_name,
    estimated_followers: p.estimated_followers,
    thumbnail_url: p.thumbnail_url || '',
    media_url: p.media_url || '',
    ig_user_id: p.ig_user_id,
    synced_at: now
  }));
  // Single batch upsert instead of one request per post
  await supabase.from('ig_posts').upsert(rows, { onConflict: 'id' });
}

export async function loadHistoryFromDB(igUserId?: string) {
  const { data: snapshots } = await supabase
    .from('ig_metrics')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(500);

  const { data: posts } = await supabase
    .from('ig_posts')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(500);

  return {
    snapshots: (snapshots || []).map((s: any) => ({
      id: s.id,
      synced_at: s.synced_at,
      followers_count: s.followers_count,
      following_count: s.following_count,
      media_count: s.media_count,
      reach: s.reach,
      impressions: s.impressions,
      accounts_reached: s.accounts_reached,
      profile_views: s.profile_views,
      website_clicks: s.website_clicks,
      email_contacts: s.email_contacts,
      ig_user_id: s.ig_user_id
    })),
    posts: (posts || []).map((p: any) => ({
      id: p.id,
      permalink: p.permalink,
      media_type: p.media_type,
      caption: p.caption || '',
      timestamp: p.timestamp,
      like_count: p.like_count,
      comments_count: p.comments_count,
      shares_count: p.shares_count,
      saved: p.saved,
      reach: p.reach,
      impressions: p.impressions,
      video_views: p.video_views,
      total_interactions: p.total_interactions,
      engagement_rate: Number(p.engagement_rate),
      is_collab: p.is_collab,
      influencer_name: p.influencer_name || '',
      estimated_followers: p.estimated_followers,
      thumbnail_url: p.thumbnail_url || '',
      media_url: p.media_url || '',
      ig_user_id: p.ig_user_id,
      synced_at: p.synced_at
    }))
  };
}

// ─── Follower Estimation Algorithm ─────────────────────────────────────────

async function estimateFollowersPerPost(posts: IGPost[], igUserId: string): Promise<IGPost[]> {
  const { data: snapshots } = await supabase
    .from('ig_metrics')
    .select('synced_at, followers_count')
    .eq('ig_user_id', igUserId)
    .order('synced_at', { ascending: true });

  if (!snapshots || snapshots.length < 2) return posts;

  const sorted = [...posts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return sorted.map((post, idx) => {
    const postTime = new Date(post.timestamp).getTime();
    const windowEnd = postTime + 72 * 60 * 60 * 1000; // 72h after

    const before = snapshots.filter(s => new Date(s.synced_at).getTime() <= postTime);
    const after = snapshots.filter(s => {
      const t = new Date(s.synced_at).getTime();
      return t > postTime && t <= windowEnd;
    });

    if (before.length === 0 || after.length === 0) return post;

    const followersBefore = before[before.length - 1].followers_count;
    const followersAfter = after[after.length - 1].followers_count;
    const growth = Math.max(0, followersAfter - followersBefore);

    // Check concurrent posts in the window
    const concurrent = sorted.filter((p, i) => {
      if (i === idx) return false;
      const t = new Date(p.timestamp).getTime();
      return t >= postTime - 6 * 3600000 && t <= windowEnd;
    });

    if (concurrent.length === 0) {
      return { ...post, estimated_followers: growth };
    }

    // Distribute proportionally by engagement
    const allInWindow = [post, ...concurrent];
    const totalEng = allInWindow.reduce((s, p) => s + p.total_interactions + p.reach, 0);
    const myShare = totalEng > 0 ? (post.total_interactions + post.reach) / totalEng : 1 / allInWindow.length;

    return { ...post, estimated_followers: Math.round(growth * myShare) };
  });
}

// ─── Summary Calculator ────────────────────────────────────────────────────

export function calculateSummary(
  snapshot: IGMetricSnapshot | null,
  posts: IGPost[],
  history: IGMetricSnapshot[],
  dateStart?: string,
  dateEnd?: string
): IGAccountSummary {
  const filtered = posts.filter(p => {
    if (!dateStart || !dateEnd) return true;
    const d = p.timestamp.split('T')[0];
    return d >= dateStart && d <= dateEnd;
  });

  const totalLikes = filtered.reduce((s, p) => s + p.like_count, 0);
  const totalComments = filtered.reduce((s, p) => s + p.comments_count, 0);
  const totalShares = filtered.reduce((s, p) => s + p.shares_count, 0);
  const totalSaved = filtered.reduce((s, p) => s + p.saved, 0);
  const totalReach = filtered.reduce((s, p) => s + p.reach, 0);
  const totalImpressions = filtered.reduce((s, p) => s + p.impressions, 0);
  const totalViews = filtered.reduce((s, p) => s + p.video_views, 0);
  const totalEng = totalLikes + totalComments + totalShares + totalSaved;
  const avgEngRate = filtered.length > 0 ? filtered.reduce((s, p) => s + p.engagement_rate, 0) / filtered.length : 0;

  const reels = filtered.filter(p => p.media_type === 'VIDEO' || p.media_type === 'REEL');
  const carousels = filtered.filter(p => p.media_type === 'CAROUSEL_ALBUM');
  const images = filtered.filter(p => p.media_type === 'IMAGE');
  const stories = filtered.filter(p => p.media_type === 'STORY');

  const best = filtered.length > 0 ? [...filtered].sort((a, b) => b.total_interactions - a.total_interactions)[0] : null;

  const followers = snapshot?.followers_count || 0;
  const oldest = history.length > 1 ? history[history.length - 1].followers_count : followers;
  const newFollowers = followers - oldest;
  const growthPct = oldest > 0 ? (newFollowers / oldest) * 100 : 0;

  return {
    followers,
    following: snapshot?.following_count || 0,
    mediaCount: snapshot?.media_count || 0,
    totalReach,
    totalImpressions,
    totalLikes,
    totalComments,
    totalShares,
    totalSaved,
    totalEngagement: totalEng,
    avgEngagementRate: Math.round(avgEngRate * 100) / 100,
    totalViews,
    accountsReached: snapshot?.accounts_reached || 0,
    reelsCount: reels.length,
    storiesCount: stories.length,
    postsCount: images.length,
    carouselCount: carousels.length,
    newFollowers,
    growthPercent: Math.round(growthPct * 100) / 100,
    bestPost: best
  };
}
