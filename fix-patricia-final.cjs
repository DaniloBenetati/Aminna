
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const appointmentId = '97ed3b45-94c7-469c-8f47-b34e1da65728';
    const grazieleId = 'a8f87b8f-a30f-439c-820c-c441ccf47154';
    const browLaminationId = 'ebf81fc7-ee4f-4bf5-a4ee-5f10c2efb7bf';
    
    const { data: appt, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();
        
    if (fetchError) {
        console.error("Error fetching appt:", fetchError);
        return;
    }
    
    const updatedAdditionalServices = [
        {
            "status": "Concluído",
            "endTime": "14:00",
            "discount": 0,
            "products": [],
            "quantity": 1,
            "serviceId": browLaminationId,
            "startTime": "12:00",
            "tipAmount": 0,
            "isCourtesy": false,
            "providerId": grazieleId,
            "bookedPrice": 258
        }
    ];
    
    const { error: updateError } = await supabase
        .from('appointments')
        .update({
            combined_service_names: "Manutenção + BROW Lamination",
            additional_services: updatedAdditionalServices,
            provider_id: grazieleId // Main provider is also Graziele
        })
        .eq('id', appointmentId);
        
    if (updateError) {
        console.error("Error updating appt:", updateError);
        return;
    }
    
    console.log("Appointment 97ed3b45-94c7-469c-8f47-b34e1da65728 fixed successfully.");
}

main();
