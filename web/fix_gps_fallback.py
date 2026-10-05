import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\dashboard\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

old_geo = """        try {
          position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        } catch(e) {
          console.error("GPS Error", e);
        }"""
new_geo = """        try {
          position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000 });
        } catch(e) {
          try {
            console.warn("High accuracy failed, trying low accuracy...");
            position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 5000 });
          } catch(e2) {
            console.error("All GPS Failed", e2);
          }
        }"""

content = content.replace(old_geo, new_geo)

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Added GPS fallback")
