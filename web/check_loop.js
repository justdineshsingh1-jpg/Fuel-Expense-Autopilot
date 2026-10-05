const fs = require('fs');
const content = fs.readFileSync('c:/Users/MIS/OneDrive/Fuel Expense Autopilot/web/src/app/(dashboard)/dashboard/page.tsx', 'utf8');
const match = content.match(/useEffect\(\(\) => \{[\s\S]*?setInterval[\s\S]*?\}, \[tripActive\]\);/);
if (match) console.log(match[0]);
