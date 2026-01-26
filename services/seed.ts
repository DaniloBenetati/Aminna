
import { createClient } from '@supabase/supabase-js';
import { PROVIDERS, SERVICES, STOCK, PANTRY_ITEMS, PARTNERS, CAMPAIGNS } from '../constants';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Handling __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual env parsing to avoid external deps like dotenv
const envPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading env from: ${envPath}`);

let supabaseUrl = '';
let supabaseKey = '';

try {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const envVars = envContent.split('\n').reduce((acc, line) => {
        const [key, val] = line.split('=');
        if (key && val) acc[key.trim()] = val.trim();
        return acc;
    }, {} as Record<string, string>);

    supabaseUrl = envVars.VITE_SUPABASE_URL;
    supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
} catch (e) {
    console.error('Could not read .env.local', e);
}

if (!supabaseUrl || !supabaseKey) {
    // Fallback to process.env if passed via CLI
    supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
}

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

console.log(`Connecting to Supabase at: ${supabaseUrl}`);
const supabase = createClient(supabaseUrl, supabaseKey);

export const seedDatabase = async () => {
    console.log('Starting Database Seed...');

    // 1. PROVIDERS
    console.log('Seeding Providers...');
    // Check if empty first to avoid duplicates if re-run
    const { count: providerCount } = await supabase.from('providers').select('*', { count: 'exact', head: true });

    if (providerCount === 0) {
        const providersData = PROVIDERS.map(p => ({
            name: p.name,
            specialty: p.specialty,
            specialties: p.specialties,
            commission_rate: p.commissionRate,
            avatar: p.avatar,
            phone: p.phone,
            birth_date: p.birthDate,
            pix_key: p.pixKey,
            active: p.active,
            work_days: p.workDays
        }));

        const { error: errorProviders } = await supabase.from('providers').insert(providersData);
        if (errorProviders) console.error('Error seeding providers:', errorProviders);
        else console.log(`Seeded ${providersData.length} providers.`);
    } else {
        console.log('Providers table not empty, skipping.');
    }

    // 2. SERVICES
    console.log('Seeding Services...');
    const { count: serviceCount } = await supabase.from('services').select('*', { count: 'exact', head: true });

    if (serviceCount === 0) {
        const servicesData = SERVICES.map(s => ({
            name: s.name,
            price: s.price,
            duration_minutes: s.durationMinutes,
            required_specialty: s.requiredSpecialty,
            active: true
        }));

        const { error: errorServices } = await supabase.from('services').insert(servicesData);
        if (errorServices) console.error('Error seeding services:', errorServices);
        else console.log(`Seeded ${servicesData.length} services.`);
    } else {
        console.log('Services table not empty, skipping.');
    }

    // 3. STOCK ITEMS
    console.log('Seeding Stock...');
    const { count: stockCount } = await supabase.from('stock_items').select('*', { count: 'exact', head: true });

    if (stockCount === 0) {
        const stockData = STOCK.map(s => ({
            code: s.code,
            name: s.name,
            category: s.category,
            "group": s.group,
            sub_group: s.subGroup,
            quantity: s.quantity,
            min_quantity: s.minQuantity,
            unit: s.unit,
            cost_price: s.costPrice,
            sale_price: s.price || null,
            active: true
        }));

        const { error: errorStock } = await supabase.from('stock_items').insert(stockData);
        if (errorStock) console.error('Error seeding stock:', errorStock);
        else console.log(`Seeded ${stockData.length} stock items.`);
    } else {
        console.log('Stock items table not empty, skipping.');
    }

    // 4. PANTRY ITEMS
    console.log('Seeding Pantry...');
    const { count: pantryCount } = await supabase.from('pantry_items').select('*', { count: 'exact', head: true });

    if (pantryCount === 0) {
        const pantryData = PANTRY_ITEMS.map(p => ({
            name: p.name,
            unit: p.unit,
            category: p.category,
            quantity: p.quantity,
            min_quantity: p.minQuantity,
            cost_price: p.costPrice,
            reference_price: p.referencePrice,
            active: true
        }));

        const { error: errorPantry } = await supabase.from('pantry_items').insert(pantryData);
        if (errorPantry) console.error('Error seeding pantry:', errorPantry);
        else console.log(`Seeded ${pantryData.length} pantry items.`);
    } else {
        console.log('Pantry items table not empty, skipping.');
    }

    // 5. PARTNERS
    console.log('Seeding Partners...');
    const { count: partnerCount } = await supabase.from('partners').select('*', { count: 'exact', head: true });

    if (partnerCount === 0) {
        for (const partner of PARTNERS) {
            const { data: newPartner, error: errP } = await supabase.from('partners').insert({
                name: partner.name,
                social_media: partner.socialMedia,
                category: partner.category,
                phone: partner.phone,
                partnership_type: partner.partnershipType,
                active: partner.active
            }).select().single();

            if (errP) {
                console.error('Error inserting partner:', partner.name, errP);
                continue;
            }

            // Find campaigns for this partner
            const partnerCampaigns = CAMPAIGNS.filter(c => c.partnerId === partner.id);
            if (partnerCampaigns.length > 0 && newPartner) {
                const campaignsData = partnerCampaigns.map(c => ({
                    partner_id: newPartner.id,
                    name: c.name,
                    coupon_code: c.couponCode,
                    discount_type: c.discountType,
                    discount_value: c.discountValue,
                    start_date: c.startDate,
                    use_count: c.useCount,
                    max_uses: c.maxUses,
                    total_revenue_generated: c.totalRevenueGenerated
                }));

                const { error: errC } = await supabase.from('campaigns').insert(campaignsData);
                if (errC) console.error('Error inserting campaigns for:', partner.name, errC);
            }
        }
        console.log('Partners seeding completed.');
    } else {
        console.log('Partners table not empty, skipping.');
    }

    console.log('Database Seed Completed!');
};

// Auto-run if executed directly
seedDatabase().catch(console.error);
