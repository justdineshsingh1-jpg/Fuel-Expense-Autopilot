import httpx
import uuid
import base64
from typing import Optional
from app.config import settings

async def upload_image_to_supabase(base64_data: str, folder: str = 'receipts') -> Optional[str]:
    \"\"\"
    Uploads a base64 image (from canvas) to Supabase Storage.
    Returns the public URL of the uploaded image.
    \"\"\"
    try:
        # Remove the 'data:image/jpeg;base64,' prefix if present
        if ',' in base64_data:
            base64_data = base64_data.split(',')[1]
            
        image_bytes = base64.b64decode(base64_data)
        
        filename = f"{folder}/{uuid.uuid4()}.jpg"
        bucket_name = "fuel-receipts"
        
        url = f"{settings.SUPABASE_URL}/storage/v1/object/{bucket_name}/{filename}"
        
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "image/jpeg"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(url, content=image_bytes, headers=headers)
            
            if response.status_code in (200, 201):
                # Return the public URL
                return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{filename}"
            else:
                print(f"Supabase upload failed: {response.text}")
                return None
                
    except Exception as e:
        print(f"Error in upload_image_to_supabase: {e}")
        return None
