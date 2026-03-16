
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const filePath = "C:\\Users\\Lenovo\\Downloads\\Avec SalãoVIP - Sistema de Administração (1).xlsx";

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
        console.log("TOTAL ROWS:", data.length);
        console.log("HEADERS:", JSON.stringify(data[0]));
        for (let i = 1; i <= Math.min(5, data.length - 1); i++) {
            console.log(`ROW ${i}:`, JSON.stringify(data[i]));
        }
    } else {
        console.log("File is empty or could not be read.");
    }

} catch (error) {
    console.error("Error reading file:", error);
}
