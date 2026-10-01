from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.storage_service import upload_image_to_supabase

router = APIRouter()

class Base64UploadRequest(BaseModel):
    image_base64: str
    folder: str = 'misc'

class Base64UploadResponse(BaseModel):
    url: str

@router.post("/base64", response_model=Base64UploadResponse)
async def upload_base64_image(request: Base64UploadRequest):
    url = await upload_image_to_supabase(request.image_base64, request.folder)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload image to cloud storage")
    return {"url": url}
