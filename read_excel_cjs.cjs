const XLSX = require('xlsx');
const path = require('path');

try {
    const filePath = "C:\\Users\\Danilo Souza\\Downloads\\itens.xlsx";
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const datasheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(datasheet);
    console.log(JSON.stringify(data, null, 2));
} catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
}
