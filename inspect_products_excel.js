import XLSX from 'xlsx';
import fs from 'fs';

const FILE_PATH = "C:\\Users\\Danilo Souza\\Downloads\\orcamento_completo_110_itens-1.xlsx";

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    
    const results = {
        headers: data.length > 0 ? Object.keys(data[0]) : [],
        sample: data.slice(0, 5)
    };
    
    console.log(JSON.stringify(results, null, 2));
} catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
}
