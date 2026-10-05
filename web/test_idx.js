const fs = require('fs');
const content = fs.readFileSync('c:/Users/MIS/OneDrive/Fuel Expense Autopilot/web/src/app/(dashboard)/dashboard/page.tsx', 'utf8');

const sIdx = content.indexOf("const handleSubmit = async (e: React.FormEvent) => {");
const errIdx = content.indexOf("toast.error(\"Network error during upload. Please try again.\");", sIdx);
if (errIdx !== -1) {
    const endIdx = content.indexOf("}", errIdx);
    console.log("FOUND END");
} else {
    console.log("NOT FOUND");
}
