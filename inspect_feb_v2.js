import XLSX from 'xlsx';
const FILE_PATH = "C:\\Users\\Danilo Souza\\Downloads\\Avec SalãoVIP - Sistema de Administração fevereiro.xlsx";

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const headers = rawData[0];
    console.log("INDEX_MAP");
    headers.forEach((h, i) => console.log(`${i}: ${h}`));
    console.log("FIRST_ROW");
    console.log(JSON.stringify(rawData[1]));
} catch (e) {
    console.error("Error reading file:", e.message);
}
