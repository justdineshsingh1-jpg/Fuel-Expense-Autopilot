import sys

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\api\upload\route.ts', 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('const fileName = \_\;', 'const fileName = `${Date.now()}_${file.name}`;')
c = c.replace('uploads/\, buffer', '`uploads/${fileName}`, buffer')
c = c.replace('getPublicUrl(uploads/\);', 'getPublicUrl(`uploads/${fileName}`);')

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\api\upload\route.ts', 'w', encoding='utf-8') as f:
    f.write(c)
