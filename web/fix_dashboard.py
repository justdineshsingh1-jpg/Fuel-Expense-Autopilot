import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\dashboard\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

content = content.replace(
    "// if (!tripRes.ok) throw new Error(\"Failed to save trip\");",
    "if (!tripRes.ok) { const errData = await tripRes.json(); throw new Error(errData.error || \"Failed to save trip to database\"); }"
)

content = content.replace(
    "// if (!expRes.ok) throw new Error(\"Failed to save expense\");",
    "if (!expRes.ok) { const errData = await expRes.json(); throw new Error(errData.error || \"Failed to save expense\"); }"
)

content = content.replace(
    "setPhotoPreview(URL.createObjectURL(file));",
    "setPhotoPreview(URL.createObjectURL(file)); console.error(error);"
)

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Uncommented error handling in dashboard")
