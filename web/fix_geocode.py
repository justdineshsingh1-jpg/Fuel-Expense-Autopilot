import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\dashboard\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

old_fetch = "const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);"
new_fetch = "const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`);"

content = content.replace(old_fetch, new_fetch)

old_data = """            const data = await res.json();
            address = data.display_name || address;
            cityState = data.address?.state_district || data.address?.city || data.address?.state || cityState;"""
new_data = """            const data = await res.json();
            address = data.locality + ", " + data.principalSubdivision + " - " + data.postcode || address;
            cityState = data.city || data.locality || cityState;"""

content = content.replace(old_data, new_data)

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Replaced Nominatim with BigDataCloud")
