from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
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

class Menu(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    template_id: Optional[str] = None
    items: List[MenuItem] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuCreate(BaseModel):
    title: str
    template_id: Optional[str] = None

class MenuUpdate(BaseModel):
    title: Optional[str] = None
    items: Optional[List[MenuItem]] = None

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
        template_id=menu_data.template_id
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
            "creative": "Write a creative, unique menu description with personality."
        }
        
        system_message = f"{style_prompts.get(request.style, style_prompts['professional'])} Keep it concise (2-3 sentences max) and mouth-watering."
        
        ingredients_text = f" Ingredients: {request.ingredients}" if request.ingredients else ""
        user_text = f"Create a menu description for: {request.dish_name}.{ingredients_text}"
        
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