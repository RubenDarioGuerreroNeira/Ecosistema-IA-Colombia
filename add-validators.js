const fs = require('fs');
const path = require('path');

const entitiesDir = path.join(__dirname, 'src', 'entities');
const files = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

for (const file of files) {
    const filePath = path.join(entitiesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('class-validator')) {
        content = "import { IsString, IsNumber, IsOptional } from 'class-validator';\n" + content;
    }

    // Replace @Column(...) ... prop: type;
    const regex = /(@Column\([^\)]*\)\s+)([a-zA-Z0-9_]+):\s*(string|number);/g;
    content = content.replace(regex, (match, columnDecorator, propName, propType) => {
        const validator = propType === 'string' ? '@IsString()' : '@IsNumber()';
        return `${columnDecorator}@IsOptional()\n    ${validator}\n    ${propName}: ${propType};`;
    });
    
    // For @PrimaryGeneratedColumn
    const idRegex = /(@PrimaryGeneratedColumn\([^\)]*\)\s+)([a-zA-Z0-9_]+):\s*(number);/g;
    content = content.replace(idRegex, (match, columnDecorator, propName, propType) => {
        return `${columnDecorator}@IsOptional()\n    @IsNumber()\n    ${propName}: ${propType};`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Entities updated with class-validator decorators.');
