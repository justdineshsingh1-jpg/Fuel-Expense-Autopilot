import sys

files = [
    r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\approvals\page.tsx',
    r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\executive-summary\page.tsx'
]

for file in files:
    with open(file, 'r', encoding='utf-8') as f:
        c = f.read()
    
    c = c.replace("import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';", "import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';")
    c = c.replace("const supabase = createClientComponentClient();", "")
    
    with open(file, 'w', encoding='utf-8') as f:
        f.write(c)
