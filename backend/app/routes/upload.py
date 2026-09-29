from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
import uuid
import os

router = APIRouter()

UPLOAD_DIR = "uploads"

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
        
    file_extension = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
        
    # In production, this would upload to S3 and return a public URL
    return {"url": f"/static/{file_name}"}
