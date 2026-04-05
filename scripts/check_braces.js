const fs = require('fs');
const content = fs.readFileSync('src/pages/Programs.jsx', 'utf8');

let braces = 0;
let parens = 0;
let brackets = 0;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '{') braces++;
    else if (char === '}') braces--;
    else if (char === '(') parens++;
    else if (char === ')') parens--;
    else if (char === '[') brackets++;
    else if (char === ']') brackets--;
    
    if (braces < 0) console.log('Brace mismatch at index', i, content.slice(i-20, i+20));
    if (parens < 0) console.log('Paren mismatch at index', i, content.slice(i-20, i+20));
    if (brackets < 0) console.log('Bracket mismatch at index', i, content.slice(i-20, i+20));
}

console.log('Final counts:', { braces, parens, brackets });
