import urllib.request
from PIL import Image, ImageDraw, ImageFont

url = "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800"
urllib.request.urlretrieve(url, "sample_receipt.jpg")

img = Image.open("sample_receipt.jpg")

wpercent = (800 / float(img.size[0]))
hsize = int((float(img.size[1]) * float(wpercent)))
img = img.resize((800, hsize), Image.Resampling.LANCZOS)

draw = ImageDraw.Draw(img, 'RGBA')

rect_y1 = img.height - 100
rect_y2 = img.height
draw.rectangle([(0, rect_y1), (800, rect_y2)], fill=(0, 0, 0, 160))

watermark_text = "Lat: 26.143254, Lng: 91.789654\nGS Road, Dispur, Guwahati, Assam\nTime: 06/10/2026, 06:30:45 PM"

try:
    font = ImageFont.truetype("arial.ttf", 22)
except IOError:
    font = ImageFont.load_default()

draw.text((15, rect_y1 + 15), watermark_text, fill=(255, 255, 255, 255), font=font)

artifact_dir = r"C:\Users\MIS\.gemini\antigravity\brain\2d82ab4e-64e7-4cf5-9c42-db3034ce58ab"
output_path = artifact_dir + "\\gps_watermark_preview.jpg"
img.save(output_path, "JPEG", quality=65)

print("Generated:", output_path)
