import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eedazqhgvvelcjurigla.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZGF6cWhndnZlbGNqdXJpZ2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM4NTI5NywiZXhwIjoyMDg0OTYxMjk3fQ.g6GobuEV8PYw92hzHjz303xRYYl7etqrfcSDMxh37WM'; // service_role key

const supabase = createClient(supabaseUrl, supabaseKey);

const APPOINTMENT_ID = '97ed3b45-94c7-469c-8f47-b34e1da65728';
const OLD_SERVICE_ID = 'a2c3aac9-15f3-4a5b-8eca-3a24e2b09f55'; // COLOCAÇÃO
const NEW_SERVICE_ID = 'ebf81fc7-ee4f-4bf5-a4ee-5f10c2efb7bf'; // BROW Lamination
const NEW_PRICE = 258;

async function fixAppointment() {
    console.log(`Fetching appointment ${APPOINTMENT_ID}...`);
    const { data: appt, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', APPOINTMENT_ID)
        .single();

    if (fetchError || !appt) {
        console.error('Error fetching appointment:', fetchError);
        return;
    }

    console.log('Original Appointment Data:', JSON.stringify(appt, null, 2));

    let updated = false;
    let additional_services = appt.additional_services || [];
    
    additional_services = additional_services.map((as: any) => {
        if (as.serviceId === OLD_SERVICE_ID) {
            console.log(`Updating additional service ${OLD_SERVICE_ID} to ${NEW_SERVICE_ID}...`);
            updated = true;
            return {
                ...as,
                serviceId: NEW_SERVICE_ID,
                bookedPrice: NEW_PRICE
            };
        }
        return as;
    });

    if (!updated) {
        console.warn('Wait, the service ID was not found in additional_services. Checking main service...');
        if (appt.service_id === OLD_SERVICE_ID) {
             console.log('Updating main service...');
             updated = true;
        } else {
             console.error('Service ID still not found.');
             return;
        }
    }

    const payload: any = {
        additional_services: additional_services,
        combined_service_names: appt.combined_service_names?.replace('COLOCAÇÃO', 'BROW Lamination')
    };

    if (appt.service_id === OLD_SERVICE_ID) {
        payload.service_id = NEW_SERVICE_ID;
        payload.booked_price = NEW_PRICE;
    }

    console.log('Updating appointment with payload:', JSON.stringify(payload, null, 2));

    const { data: result, error: updateError } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', APPOINTMENT_ID)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating appointment:', updateError);
    } else {
        console.log('Update successful!');
        console.log('Updated Record:', JSON.stringify(result, null, 2));
    }
}

fixAppointment();
