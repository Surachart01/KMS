import { saveStudentTemplate } from './src/utils/excelTemplate.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputPath = path.join(__dirname, 'student-import-template.xlsx');
saveStudentTemplate(outputPath);

console.log(`✅ Excel template generated successfully!`);
console.log(`📁 File location: ${outputPath}`);
