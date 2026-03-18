import { readFile, utils } from 'xlsx';
import { resolve } from 'path';

try {
    const filePath = "C:\\Users\\Danilo Souza\\Downloads\\itens.xlsx";
    const workbook = readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const datasheet = workbook.Sheets[sheetName];
    const data = utils.sheet_to_json(datasheet);
    console.log(JSON.stringify(data, null, 2));
} catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
}
