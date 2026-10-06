import os
from PIL import Image

image_path = r'C:\Users\MIS\.gemini\antigravity\brain\2d82ab4e-64e7-4cf5-9c42-db3034ce58ab\fuel_app_logo_1791286247309.jpg'
res_dir = r'C:\Users\MIS\OneDrive\Fuel Expense Autopilot\mobile\android\app\src\main\res'

sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

try:
    img = Image.open(image_path).convert('RGBA')
    for folder, size in sizes.items():
        folder_path = os.path.join(res_dir, folder)
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
        
        resized = img.resize((size, size), Image.Resampling.LANCZOS)
        out_path = os.path.join(folder_path, 'ic_launcher.png')
        resized.save(out_path, 'PNG')
        
        # Save round version too just in case
        out_path_round = os.path.join(folder_path, 'ic_launcher_round.png')
        resized.save(out_path_round, 'PNG')

    print('Icons replaced successfully!')
except Exception as e:
    print('Error:', e)
