import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\(dashboard)\dashboard\page.tsx"
with open(path, "r", encoding="utf8") as f:
    content = f.read()

start_sig = "const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {"
end_sig = "const handleSubmit = async (e: React.FormEvent) => {"

start_idx = content.find(start_sig)
end_idx = content.find(end_sig)

if start_idx == -1 or end_idx == -1:
    print("Could not find functions")
else:
    new_func = """const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingPhoto(true);
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        let position: any = null;
        try {
          position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
        } catch(e) {
          console.error("GPS Error", e);
        }

        // Reverse Geocode
        let address = "Location unavailable";
        let cityState = "Unknown Location";
        if (position) {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
            const data = await res.json();
            address = data.display_name || address;
            cityState = data.address?.state_district || data.address?.city || data.address?.state || cityState;
          } catch(e) {
            console.error("Geocode Error", e);
          }
        }

        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => { img.onload = resolve; });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context missing");

        ctx.drawImage(img, 0, 0);

        // Watermark Box Design (Inspired by GPS Map Camera)
        const margin = Math.max(10, img.width * 0.02);
        const boxHeight = Math.max(100, img.height * 0.15);
        const boxY = img.height - boxHeight - margin;
        const boxWidth = img.width - (margin * 2);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        // Draw rounded rectangle if supported, else fallback to standard rect
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(margin, boxY, boxWidth, boxHeight, 15);
            ctx.fill();
        } else {
            ctx.fillRect(margin, boxY, boxWidth, boxHeight);
        }

        const textX = margin + 15;
        let textY = boxY + (boxHeight * 0.25);
        
        ctx.textAlign = 'left';
        
        // 1. City / State (Bold white with Indian Flag emoji)
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(20, img.height * 0.025)}px sans-serif`;
        ctx.fillText(`🇮🇳 ${cityState}`, textX, textY);
        
        // 2. Full Address (Smaller gray/white)
        textY += (boxHeight * 0.25);
        ctx.font = `normal ${Math.max(14, img.height * 0.018)}px sans-serif`;
        ctx.fillStyle = '#e5e7eb';
        const maxChars = Math.floor(boxWidth / (img.height * 0.012));
        const shortAddr = address.length > maxChars ? address.substring(0, maxChars) + '...' : address;
        ctx.fillText(shortAddr, textX, textY);
        
        // 3. Lat/Long & Accuracy (Blue / Green)
        textY += (boxHeight * 0.28);
        ctx.font = `normal ${Math.max(14, img.height * 0.018)}px sans-serif`;
        
        if (position) {
            const latLng = `Lat ${position.coords.latitude.toFixed(6)}° Long ${position.coords.longitude.toFixed(6)}°`;
            const acc = position.coords.accuracy ? `  •  Acc: ±${Math.round(position.coords.accuracy)}m` : '';
            const time = `  •  ${new Date().toLocaleString()}`;
            
            ctx.fillStyle = '#60a5fa'; // Blue
            ctx.fillText(latLng, textX, textY);
            
            const latLngWidth = ctx.measureText(latLng).width;
            ctx.fillStyle = '#4ade80'; // Green
            ctx.fillText(acc, textX + latLngWidth, textY);
            
            const accWidth = ctx.measureText(acc).width;
            ctx.fillStyle = '#9ca3af'; // Gray
            ctx.fillText(time, textX + latLngWidth + accWidth, textY);
        } else {
            ctx.fillStyle = '#f87171'; // Red
            ctx.fillText(`GPS SIGNAL NOT FOUND  •  ${new Date().toLocaleString()}`, textX, textY);
        }

        const watermarkedUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoPreview(watermarkedUrl);
      } catch (error) {
        setPhotoPreview(URL.createObjectURL(file));
      } finally {
        setIsProcessingPhoto(false);
      }
    }
  };

  """
    content = content[:start_idx] + new_func + content[end_idx:]
    with open(path, "w", encoding="utf8") as f:
        f.write(content)
    print("Camera issue resolved")
