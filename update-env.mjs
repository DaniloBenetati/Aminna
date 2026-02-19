
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env.local');
const key = 'VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZGF6cWhndnZlbGNqdXJpZ2xhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM4NTI5NywiZXhwIjoyMDg0OTYxMjk3fQ.g6GobuEV8PYw92hzHjz303xRYYl7etqrfcSDMxh37WM';

let content = fs.readFileSync(envPath, 'utf-8');
if (!content.includes('VITE_SUPABASE_SERVICE_ROLE_KEY')) {
    content += `\n${key}`;
    fs.writeFileSync(envPath, content);
    console.log("Updated .env.local");
} else {
    console.log(".env.local already has the key");
}
