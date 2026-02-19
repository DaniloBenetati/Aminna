
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const filePath = "C:\\Users\\Lenovo\\Downloads\\Avec SalãoVIP - Sistema de Administração.xlsx";

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
        console.log("Excel Headers:", JSON.stringify(data[0]));
        console.log("First row of data:", JSON.stringify(data[1]));
        // Print a few more rows to see data examples
        console.log("Third row of data:", JSON.stringify(data[2]));
    } else {
        console.log("File is empty or could not be read.");
    }

} catch (error) {
    console.error("Error reading file:", error);
}
