"""
MenuMaker - Professional Menu Creation Platform
Copyright (c) 2025 BHdesignsbyBILLY - Billy Harman
All Rights Reserved.

This software is proprietary and confidential.
Owned and controlled 100% by BHdesignsbyBILLY - Billy Harman

Unauthorized copying, distribution, modification, public display,
or public performance of this software is strictly prohibited.
"""

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import io
import re
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage
from PyPDF2 import PdfReader
from docx import Document
from PIL import Image
import pytesseract

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(
    title="MenuMaker API",
    description="Professional Menu Creation Platform - Copyright (c) 2025 BHdesignsbyBILLY - Billy Harman. All Rights Reserved.",
    version="1.0.0",
    contact={
        "name": "Billy Harman",
        "email": "contact@bhdesignsbybilly.com"
    },
    license_info={
        "name": "Proprietary",
        "url": "https://menumaker.app/license"
    }
)
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7
ADMIN_SECRET = os.environ.get('ADMIN_SECRET', 'admin-secret-2025')

security = HTTPBearer()

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
class RestaurantProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    restaurant_name: str
    logo_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantProfileCreate(BaseModel):
    restaurant_name: str
    logo_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    admin_secret: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    user: User

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: str
    category: str
    image_url: Optional[str] = None

class MenuPageDesign(BaseModel):
    """Design settings for a single menu page"""
    backgroundColor: str = "#ffffff"
    backgroundImage: str = ""
    backgroundOpacity: int = 100
    titleFont: str = "Playfair Display"
    titleSize: int = 52
    titleColor: str = "#1a1a1a"
    itemFont: str = "DM Sans"
    menuBorderStyle: str = "none"
    menuBorderWidth: int = 2
    menuBorderColor: str = "#1a1a1a"
    decorativeBorder: str = "none"
    decorativeBorderColor: str = "#1a1a1a"

class MenuPage(BaseModel):
    """A single page in a multi-page menu"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    page_number: int = 1
    title: str = ""
    subtitle: str = ""
    items: List[MenuItem] = []
    design: MenuPageDesign = Field(default_factory=MenuPageDesign)

class Menu(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    template_id: Optional[str] = None
    items: List[MenuItem] = []  # Legacy: flat items list for backward compatibility
    pages: List[MenuPage] = []  # New: multi-page support
    include_warning: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuCreate(BaseModel):
    title: str
    template_id: Optional[str] = None
    pages: Optional[List[MenuPage]] = None

class MenuUpdate(BaseModel):
    title: Optional[str] = None
    items: Optional[List[MenuItem]] = None
    pages: Optional[List[MenuPage]] = None
    include_warning: Optional[bool] = None

class Template(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    preview_image: str
    category: str
    style: dict

class AIDescriptionRequest(BaseModel):
    dish_name: str
    ingredients: Optional[str] = None
    style: Optional[str] = "professional"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(user_id: str = Depends(get_current_user)) -> str:
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user or not user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user_id

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    is_admin = False
    if user_data.admin_secret == ADMIN_SECRET:
        is_admin = True
    
    user = User(
        email=user_data.email,
        name=user_data.name,
        is_admin=is_admin
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id)
    return AuthResponse(token=token, user=user)

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    user_dict = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_dict:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_dict['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_dict.pop('password')
    if isinstance(user_dict['created_at'], str):
        user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    
    user = User(**user_dict)
    token = create_token(user.id)
    return AuthResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user)):
    user_dict = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user_dict:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_dict['created_at'], str):
        user_dict['created_at'] = datetime.fromisoformat(user_dict['created_at'])
    
    return User(**user_dict)

@api_router.post("/menus", response_model=Menu)
async def create_menu(menu_data: MenuCreate, user_id: str = Depends(get_current_user)):
    menu = Menu(
        user_id=user_id,
        title=menu_data.title,
        template_id=menu_data.template_id,
        pages=menu_data.pages or []
    )
    
    menu_dict = menu.model_dump()
    menu_dict['created_at'] = menu_dict['created_at'].isoformat()
    menu_dict['updated_at'] = menu_dict['updated_at'].isoformat()
    
    await db.menus.insert_one(menu_dict)
    return menu

@api_router.get("/menus", response_model=List[Menu])
async def get_menus(user_id: str = Depends(get_current_user)):
    menus = await db.menus.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    
    for menu in menus:
        if isinstance(menu['created_at'], str):
            menu['created_at'] = datetime.fromisoformat(menu['created_at'])
        if isinstance(menu['updated_at'], str):
            menu['updated_at'] = datetime.fromisoformat(menu['updated_at'])
    
    return menus

@api_router.get("/menus/{menu_id}", response_model=Menu)
async def get_menu(menu_id: str, user_id: str = Depends(get_current_user)):
    menu = await db.menus.find_one({"id": menu_id, "user_id": user_id}, {"_id": 0})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    if isinstance(menu['created_at'], str):
        menu['created_at'] = datetime.fromisoformat(menu['created_at'])
    if isinstance(menu['updated_at'], str):
        menu['updated_at'] = datetime.fromisoformat(menu['updated_at'])
    
    return Menu(**menu)

@api_router.put("/menus/{menu_id}", response_model=Menu)
async def update_menu(menu_id: str, menu_data: MenuUpdate, user_id: str = Depends(get_current_user)):
    menu = await db.menus.find_one({"id": menu_id, "user_id": user_id}, {"_id": 0})
    if not menu:
        raise HTTPException(status_code=404, detail="Menu not found")
    
    update_data = menu_data.model_dump(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.menus.update_one(
        {"id": menu_id, "user_id": user_id},
        {"$set": update_data}
    )
    
    updated_menu = await db.menus.find_one({"id": menu_id}, {"_id": 0})
    if isinstance(updated_menu['created_at'], str):
        updated_menu['created_at'] = datetime.fromisoformat(updated_menu['created_at'])
    if isinstance(updated_menu['updated_at'], str):
        updated_menu['updated_at'] = datetime.fromisoformat(updated_menu['updated_at'])
    
    return Menu(**updated_menu)

@api_router.delete("/menus/{menu_id}")
async def delete_menu(menu_id: str, user_id: str = Depends(get_current_user)):
    result = await db.menus.delete_one({"id": menu_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu not found")
    return {"message": "Menu deleted successfully"}

@api_router.get("/templates", response_model=List[Template])
async def get_templates():
    templates = [
        Template(
            id="template-1",
            name="Classic Elegance",
            description="Traditional fine dining menu with serif typography",
            preview_image="https://images.unsplash.com/photo-1750943024048-a4c9912b1425?w=400",
            category="Fine Dining",
            style={"font": "Playfair Display", "layout": "single-column"}
        ),
        Template(
            id="template-2",
            name="Modern Minimal",
            description="Clean, contemporary design for modern restaurants",
            preview_image="https://images.unsplash.com/photo-1622021142947-da7dedc7c39a?w=400",
            category="Modern",
            style={"font": "DM Sans", "layout": "two-column"}
        ),
        Template(
            id="template-3",
            name="Bistro Charm",
            description="Casual, welcoming style for cafes and bistros",
            preview_image="https://images.unsplash.com/photo-1761695939620-a18c88ab83b7?w=400",
            category="Casual",
            style={"font": "DM Sans", "layout": "grid"}
        ),
        Template(
            id="template-4",
            name="Rustic Warmth",
            description="Earthy tones perfect for farm-to-table restaurants",
            preview_image="https://images.pexels.com/photos/3717880/pexels-photo-3717880.jpeg?w=400",
            category="Rustic",
            style={"font": "Playfair Display", "layout": "single-column"}
        ),
        Template(
            id="template-5",
            name="Luxury Gold",
            description="Premium design with gold accents",
            preview_image="https://images.unsplash.com/photo-1750943024048-a4c9912b1425?w=400",
            category="Luxury",
            style={"font": "Playfair Display", "layout": "single-column"}
        ),
        Template(
            id="template-6",
            name="Street Food",
            description="Bold, vibrant design for casual eateries",
            preview_image="https://images.unsplash.com/photo-1622021142947-da7dedc7c39a?w=400",
            category="Casual",
            style={"font": "DM Sans", "layout": "grid"}
        ),
        Template(
            id="template-7",
            name="Mediterranean",
            description="Fresh, bright colors for Mediterranean cuisine",
            preview_image="https://images.pexels.com/photos/3717880/pexels-photo-3717880.jpeg?w=400",
            category="Cuisine-Specific",
            style={"font": "DM Sans", "layout": "two-column"}
        ),
        Template(
            id="template-8",
            name="Asian Fusion",
            description="Contemporary design with Asian influences",
            preview_image="https://images.unsplash.com/photo-1761695939620-a18c88ab83b7?w=400",
            category="Cuisine-Specific",
            style={"font": "DM Sans", "layout": "grid"}
        ),
        Template(
            id="template-9",
            name="Vintage Diner",
            description="Retro American diner style",
            preview_image="https://images.unsplash.com/photo-1750943024048-a4c9912b1425?w=400",
            category="Themed",
            style={"font": "DM Sans", "layout": "two-column"}
        ),
        Template(
            id="template-10",
            name="Artisan Bakery",
            description="Warm, handcrafted feel for bakeries",
            preview_image="https://images.pexels.com/photos/3717880/pexels-photo-3717880.jpeg?w=400",
            category="Specialty",
            style={"font": "Playfair Display", "layout": "grid"}
        ),
    ]
    return templates

@api_router.post("/ai/generate-description")
async def generate_description(request: AIDescriptionRequest, user_id: str = Depends(get_current_user)):
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        session_id = f"menu-description-{user_id}-{uuid.uuid4()}"
        
        style_prompts = {
            "professional": "Write a professional, appetizing menu description.",
            "casual": "Write a casual, friendly menu description.",
            "creative": "Write a creative, unique menu description with personality.",
            "chef": "You are a professional chef writing elegant, concise menu descriptions. Use culinary terminology, highlight cooking methods, and emphasize quality ingredients. Be sophisticated yet accessible. Keep it 1-2 short sentences maximum."
        }
        
        system_message = f"{style_prompts.get(request.style, style_prompts['chef'])} Focus on sensory appeal and authenticity."
        
        ingredients_text = f" Key ingredients: {request.ingredients}" if request.ingredients else ""
        user_text = f"Create a short, chef-inspired menu description for: {request.dish_name}.{ingredients_text}\n\nRequirements:\n- Maximum 20 words\n- Use culinary terms\n- Highlight cooking method or key ingredient\n- Make it mouth-watering\n- No generic phrases"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        )
        chat.with_model("openai", "gpt-5.1")
        
        user_message = UserMessage(text=user_text)
        response = await chat.send_message(user_message)
        
        return {"description": response}
    except Exception as e:
        logging.error(f"AI generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate description: {str(e)}")

# Admin endpoints
@api_router.get("/admin/users")
async def get_all_users(admin_id: str = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    return users

@api_router.get("/admin/menus")
async def get_all_menus(admin_id: str = Depends(require_admin)):
    menus = await db.menus.find({}, {"_id": 0}).to_list(1000)
    for menu in menus:
        if isinstance(menu.get('created_at'), str):
            menu['created_at'] = datetime.fromisoformat(menu['created_at'])
        if isinstance(menu.get('updated_at'), str):
            menu['updated_at'] = datetime.fromisoformat(menu['updated_at'])
    return menus

@api_router.get("/admin/stats")
async def get_stats(admin_id: str = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    total_menus = await db.menus.count_documents({})
    admin_users = await db.users.count_documents({"is_admin": True})
    
    # Get recent activity
    recent_users = await db.users.find({}, {"_id": 0, "password": 0}).sort([("created_at", -1)]).limit(5).to_list(5)
    recent_menus = await db.menus.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(5).to_list(5)
    
    return {
        "total_users": total_users,
        "total_menus": total_menus,
        "admin_users": admin_users,
        "recent_users": recent_users,
        "recent_menus": recent_menus
    }

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, admin_id: str = Depends(require_admin)):
    # Delete user's menus first
    await db.menus.delete_many({"user_id": user_id})
    # Delete user
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User and their menus deleted successfully"}

@api_router.delete("/admin/menus/{menu_id}")
async def admin_delete_menu(menu_id: str, admin_id: str = Depends(require_admin)):
    result = await db.menus.delete_one({"id": menu_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu not found")
    return {"message": "Menu deleted successfully"}

# File extraction helper functions
def extract_text_from_pdf(file_bytes: bytes) -> dict:
    """Extract text from PDF file, page by page"""
    try:
        pdf_file = io.BytesIO(file_bytes)
        reader = PdfReader(pdf_file)
        pages_data = []
        all_text = ""
        
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            pages_data.append({
                "page_number": i + 1,
                "text": page_text.strip()
            })
            all_text += page_text + "\n"
        
        return {
            "total_pages": len(reader.pages),
            "pages": pages_data,
            "combined_text": all_text.strip()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract text from PDF: {str(e)}")

def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from Word document"""
    try:
        docx_file = io.BytesIO(file_bytes)
        doc = Document(docx_file)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract text from Word document: {str(e)}")

def extract_text_from_image(file_bytes: bytes) -> str:
    """Extract text from image using OCR"""
    try:
        image = Image.open(io.BytesIO(file_bytes))
        # Try to use tesseract
        try:
            text = pytesseract.image_to_string(image)
            return text.strip()
        except Exception as ocr_error:
            # If tesseract fails, return a helpful error
            logging.warning(f"OCR not available: {str(ocr_error)}")
            raise HTTPException(
                status_code=400, 
                detail="OCR is not available on this server. Please upload a PDF or Word document instead of an image."
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")

async def parse_menu_items_with_ai(extracted_text: str) -> List[dict]:
    """Use AI to parse extracted text into structured menu items"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        session_id = f"menu-extraction-{uuid.uuid4()}"
        
        system_message = """You are a menu extraction expert. Parse the provided menu text and extract individual menu items.
For each item, identify:
- name: The dish name
- description: Brief description (if available, otherwise empty string)
- price: Price in decimal format (e.g., "12.99"). If no price found, use "0.00"
- category: Classify as one of: Appetizers, Main Course, Desserts, Beverages, Salads, Sides

Return ONLY a valid JSON array of objects. Example format:
[{"name": "Grilled Salmon", "description": "Fresh Atlantic salmon", "price": "24.99", "category": "Main Course"}]

If no items can be extracted, return an empty array: []"""
        
        user_text = f"Extract menu items from this text:\n\n{extracted_text}"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_message
        )
        chat.with_model("openai", "gpt-5.1")
        
        user_message = UserMessage(text=user_text)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        # Clean response - remove markdown code blocks if present
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = re.sub(r'```json?\n?', '', clean_response)
            clean_response = re.sub(r'\n?```$', '', clean_response)
        
        items = json.loads(clean_response)
        
        # Add IDs to items
        for item in items:
            item['id'] = f"item-{uuid.uuid4()}"
            item['image_url'] = ""
        
        return items
    except json.JSONDecodeError as e:
        logging.error(f"JSON parse error: {str(e)}, Response: {response}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        logging.error(f"AI parsing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to parse menu items: {str(e)}")

@api_router.post("/import/upload")
async def upload_menu_file(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """Upload and extract menu items from file (PDF, Word, or Image) with multi-page support"""
    try:
        # Validate file type
        allowed_types = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'text/plain'  # Allow text files
        ]
        
        logging.info(f"Received file: {file.filename}, content_type: {file.content_type}")
        
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{file.content_type}'. Please upload PDF, Word document, image (JPEG/PNG), or text file"
            )
        
        # Read file content
        file_bytes = await file.read()
        
        # Extract text based on file type
        pages_data = []
        extracted_text = ""
        total_pages = 1
        
        if file.content_type == 'application/pdf':
            # PDF: Extract page by page
            pdf_result = extract_text_from_pdf(file_bytes)
            total_pages = pdf_result["total_pages"]
            extracted_text = pdf_result["combined_text"]
            
            # Parse items for each page
            for page_info in pdf_result["pages"]:
                if page_info["text"].strip():
                    page_items = await parse_menu_items_with_ai(page_info["text"])
                    pages_data.append({
                        "page_number": page_info["page_number"],
                        "text": page_info["text"][:300] + "..." if len(page_info["text"]) > 300 else page_info["text"],
                        "items": page_items
                    })
        elif file.content_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']:
            extracted_text = extract_text_from_docx(file_bytes)
            if extracted_text:
                page_items = await parse_menu_items_with_ai(extracted_text)
                pages_data.append({
                    "page_number": 1,
                    "text": extracted_text[:300] + "..." if len(extracted_text) > 300 else extracted_text,
                    "items": page_items
                })
        elif file.content_type in ['image/jpeg', 'image/jpg', 'image/png']:
            extracted_text = extract_text_from_image(file_bytes)
            if extracted_text:
                page_items = await parse_menu_items_with_ai(extracted_text)
                pages_data.append({
                    "page_number": 1,
                    "text": extracted_text[:300] + "..." if len(extracted_text) > 300 else extracted_text,
                    "items": page_items
                })
        elif file.content_type == 'text/plain':
            extracted_text = file_bytes.decode('utf-8')
            if extracted_text:
                page_items = await parse_menu_items_with_ai(extracted_text)
                pages_data.append({
                    "page_number": 1,
                    "text": extracted_text[:300] + "..." if len(extracted_text) > 300 else extracted_text,
                    "items": page_items
                })
        
        if not extracted_text:
            raise HTTPException(status_code=400, detail="No text could be extracted from the file")
        
        # Flatten all items for backward compatibility
        all_items = []
        for page in pages_data:
            all_items.extend(page.get("items", []))
        
        return {
            "success": True,
            "extracted_text": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text,
            "items_found": len(all_items),
            "items": all_items,
            "total_pages": total_pages,
            "pages": pages_data  # New: page-by-page data with items per page
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

# Restaurant Profile endpoints
@api_router.post("/profile/restaurant")
async def create_or_update_restaurant_profile(
    profile_data: RestaurantProfileCreate,
    user_id: str = Depends(get_current_user)
):
    """Create or update restaurant profile"""
    existing = await db.restaurant_profiles.find_one({"user_id": user_id}, {"_id": 0})
    
    profile = RestaurantProfile(
        user_id=user_id,
        **profile_data.model_dump()
    )
    
    profile_dict = profile.model_dump()
    profile_dict['updated_at'] = profile_dict['updated_at'].isoformat()
    
    if existing:
        await db.restaurant_profiles.update_one(
            {"user_id": user_id},
            {"$set": profile_dict}
        )
    else:
        await db.restaurant_profiles.insert_one(profile_dict)
    
    return profile

@api_router.get("/profile/restaurant")
async def get_restaurant_profile(user_id: str = Depends(get_current_user)):
    """Get user's restaurant profile"""
    profile = await db.restaurant_profiles.find_one({"user_id": user_id}, {"_id": 0})
    if not profile:
        return None
    
    if isinstance(profile.get('updated_at'), str):
        profile['updated_at'] = datetime.fromisoformat(profile['updated_at'])
    
    return RestaurantProfile(**profile)

# Feedback endpoint
class FeedbackSubmission(BaseModel):
    feedback_text: str
    rating: Optional[int] = None
    category: Optional[str] = "general"

@api_router.post("/feedback")
async def submit_feedback(
    feedback: FeedbackSubmission,
    user_id: str = Depends(get_current_user)
):
    """Submit user feedback"""
    feedback_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "feedback_text": feedback.feedback_text,
        "rating": feedback.rating,
        "category": feedback.category,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.feedback.insert_one(feedback_doc)
    return {"message": "Thank you for your feedback!"}

@api_router.get("/admin/feedback")
async def get_all_feedback(admin_id: str = Depends(require_admin)):
    """Get all user feedback (admin only)"""
    feedback_list = await db.feedback.find({}, {"_id": 0}).sort([("created_at", -1)]).to_list(100)
    return feedback_list

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()