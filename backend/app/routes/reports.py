from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.services.export_service import generate_tally_csv

router = APIRouter()

@router.get("/export/csv")
async def export_csv(db: AsyncSession = Depends(get_db)):
    csv_content = await generate_tally_csv({}, db)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=tally_export.csv"}
    )
