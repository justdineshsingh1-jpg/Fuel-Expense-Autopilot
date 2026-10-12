import sys

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\upload_apk.js', 'r', encoding='utf-8') as f:
    c = f.read()

target = ".upload('FuelApp.apk', fileBuffer, {"
new_target = """const version = Math.floor(Date.now() / 1000);
    const filename = `FuelApp_v${version}.apk`;
    const { data, error } = await supabase.storage
        .from('apks')
        .upload(filename, fileBuffer, {"""

c = c.replace(target, new_target)
c = c.replace(".getPublicUrl('FuelApp.apk')", ".getPublicUrl(filename)")

with open(r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\upload_apk.js', 'w', encoding='utf-8') as f:
    f.write(c)
