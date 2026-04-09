const getLocalDateString = (date = new Date()) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

console.log('Test 1 (Current Date):', getLocalDateString());
console.log('Test 2 (Specific Date - 2026-04-18):', getLocalDateString(new Date('2026-04-18')));
console.log('Test 3 (Specific Date - Jan 1st):', getLocalDateString(new Date('2026-01-01')));
