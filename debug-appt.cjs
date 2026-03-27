
const fs = require('fs');
const content = fs.readFileSync('patricia-final.json', 'utf8');
// Clean up any potential BOM or weird characters if UTF-16 was used
const cleanContent = content.replace(/^\uFEFF/, '');
try {
    const data = JSON.parse(cleanContent);
    data.forEach(a => {
        console.log("ID:", a.id);
        console.log("Service ID:", a.service_id);
        console.log("Provider ID:", a.provider_id);
        console.log("Combined Names:", a.combined_service_names);
        console.log("Additional Services:", JSON.stringify(a.additional_services, null, 2));
        console.log("-------------------");
    });
} catch (e) {
    console.error("Error parsing JSON:", e.message);
}
