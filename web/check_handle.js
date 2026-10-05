const fs = require('fs');
const content = fs.readFileSync('c:/Users/MIS/OneDrive/Fuel Expense Autopilot/web/src/app/(dashboard)/dashboard/page.tsx', 'utf8');
const match = content.match(/const handleSubmit = async.*?catch.*?}/s);
if (match) console.log(match[0]);
