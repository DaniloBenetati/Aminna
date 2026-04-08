import XLSX from 'xlsx';
const FILE_PATH = "C:\\Users\\Danilo Souza\\Downloads\\Avec SalãoVIP - Sistema de Administração fevereiro.xlsx";

try {
    const workbook = XLSX.readFile(FILE_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    console.log("DATA_START");
    console.log(JSON.stringify({
        headers: rawData[0],
        firstRow: rawData[1]
    }));
    console.log("DATA_END");
} catch (e) {
    console.error("Error reading file:", e.message);
}
