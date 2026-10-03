import os

# Fix approvals page
path_approvals = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\approvals\page.tsx"
with open(path_approvals, "r", encoding="utf8") as f:
    content = f.read()
content = content.replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';")
with open(path_approvals, "w", encoding="utf8") as f:
    f.write(content)

# Fix users page
path_users = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\admin\users\page.tsx"
with open(path_users, "r", encoding="utf8") as f:
    content = f.read()

# Replace variants with allowed ones:
# "danger" -> "rejected"
# "warning" -> "pending"
# "success" -> "approved"
# "primary" -> "default"
# "secondary" -> "draft"
content = content.replace("u.role === 'managing_director' ? 'danger' :", "u.role === 'managing_director' ? 'rejected' :")
content = content.replace("u.role === 'team_leader' ? 'warning' :", "u.role === 'team_leader' ? 'pending' :")
content = content.replace("u.role === 'accounts' ? 'success' : 'primary'", "u.role === 'accounts' ? 'approved' : 'default'")
content = content.replace("variant={u.is_active ? 'success' : 'secondary'}", "variant={u.is_active ? 'approved' : 'draft'}")

with open(path_users, "w", encoding="utf8") as f:
    f.write(content)
print("Fixed TS errors")
