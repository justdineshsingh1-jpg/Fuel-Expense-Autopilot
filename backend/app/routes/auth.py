from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.database import get_db
from app.schemas.user import UserLogin, UserCreate, UserResponse, TokenResponse
from app.models.user import User
from app.auth.jwt_handler import verify_password, get_password_hash, create_access_token
from app.auth.dependencies import get_current_user
from pydantic import BaseModel
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random
import string

router = APIRouter()

class ForgotPasswordRequest(BaseModel):
    email: str

def send_reset_email(recipient_email: str, new_password: str):
    sender_email = 'admin@dhanpurna.net'
    sender_password = 'sowj crys iqha bxci'
    
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = 'Fuel Autopilot - Password Reset'
    
    body = f"""Hello,
    
Your password for the Fuel Expense Autopilot system has been successfully reset.
    
Your new temporary password is: {new_password}
    
Please log in to the application and ensure you keep this password secure.
    
Best regards,
Fuel Autopilot System
"""
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(sender_email, sender_password.replace(' ', ''))
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == credentials.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "user": user}

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == user_in.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    db_user = User(
        employee_code=user_in.employee_code,
        full_name=user_in.full_name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=user_in.role,
        department=user_in.department,
        reporting_to=user_in.reporting_to,
        shift_start_time=user_in.shift_start_time,
        shift_end_time=user_in.shift_end_time
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == req.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        # Return ok anyway to prevent email enumeration
        return {"message": "If an account exists, a reset link has been sent."}
        
    # Generate 8 char temporary password
    new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    
    # Send email first
    success = send_reset_email(user.email, new_password)
    
    if success:
        # Update DB if email sent
        user.password_hash = get_password_hash(new_password)
        await db.commit()
        return {"message": "If an account exists, a reset link has been sent."}
    else:
        raise HTTPException(status_code=500, detail="Failed to send reset email")

