from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64
import json
import aiofiles
import google.generativeai as genai
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'menu_management')]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'menu-genius-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# API Keys
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

# Create the main app
app = FastAPI(title="MenuGenius API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Upload directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    business_name: Optional[str] = None
    location: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    business_name: Optional[str] = None
    location: Optional[str] = None
    credits: int = 0
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    current_price: float
    suggested_price: Optional[float] = None
    approved_price: Optional[float] = None
    food_cost: Optional[float] = None
    profit_per_plate: Optional[float] = None
    ingredients: List[Dict[str, Any]] = []
    competitor_prices: List[Dict[str, Any]] = []
    price_decision: Optional[str] = None  # maintain, increase, decrease, custom

class MenuJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    status: str = "pending"  # pending, analyzing, completed, approved
    items: List[MenuItem] = []
    total_food_cost: Optional[float] = None
    total_profit: Optional[float] = None
    location: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MenuJobCreate(BaseModel):
    name: str
    location: Optional[str] = None

class PriceApproval(BaseModel):
    item_id: str
    decision: str  # maintain, increase, decrease, custom
    custom_price: Optional[float] = None

class CreditPackage(BaseModel):
    id: str
    name: str
    credits: int
    price: float

# Credit packages (one-time purchases)
CREDIT_PACKAGES = {
    "starter": CreditPackage(id="starter", name="Starter Pack", credits=5, price=9.99),
    "professional": CreditPackage(id="professional", name="Professional Pack", credits=15, price=24.99),
    "enterprise": CreditPackage(id="enterprise", name="Enterprise Pack", credits=50, price=69.99),
}

# Subscription plans
class SubscriptionPlan(BaseModel):
    id: str
    name: str
    credits_per_month: int
    price_per_month: float
    features: List[str]

SUBSCRIPTION_PLANS = {
    "basic": SubscriptionPlan(
        id="basic", 
        name="Basic Plan", 
        credits_per_month=10, 
        price_per_month=19.99,
        features=["10 menu analyses/month", "AI-powered extraction", "Basic support"]
    ),
    "pro": SubscriptionPlan(
        id="pro", 
        name="Pro Plan", 
        credits_per_month=30, 
        price_per_month=49.99,
        features=["30 menu analyses/month", "Priority AI processing", "Competitor analysis", "Email support"]
    ),
    "business": SubscriptionPlan(
        id="business", 
        name="Business Plan", 
        credits_per_month=100, 
        price_per_month=149.99,
        features=["100 menu analyses/month", "Fastest AI processing", "Full competitor insights", "Priority support", "API access"]
    ),
}

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== AUTH ROUTES ==============

# Admin credentials
ADMIN_EMAIL = "admin@menugenius.com"
ADMIN_PASSWORD = "admin123"

@api_router.get("/auth/admin-login", response_model=TokenResponse)
async def admin_login():
    """Auto-login as admin - for development/demo purposes"""
    # Check if admin exists, create if not
    admin = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
    
    if not admin:
        admin_id = str(uuid.uuid4())
        admin = {
            "id": admin_id,
            "email": ADMIN_EMAIL,
            "password": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "business_name": "MenuGenius Admin",
            "location": "Headquarters",
            "credits": 9999,  # Unlimited credits for admin
            "is_admin": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin)
    
    token = create_token(admin["id"])
    user_response = UserResponse(
        id=admin["id"],
        email=admin["email"],
        name=admin["name"],
        business_name=admin.get("business_name"),
        location=admin.get("location"),
        credits=admin.get("credits", 9999),
        created_at=admin["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "business_name": user_data.business_name,
        "location": user_data.location,
        "credits": 3,  # Free starter credits
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id)
    user_response = UserResponse(
        id=user_id,
        email=user["email"],
        name=user["name"],
        business_name=user["business_name"],
        location=user["location"],
        credits=user["credits"],
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"])
    user_response = UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        business_name=user.get("business_name"),
        location=user.get("location"),
        credits=user.get("credits", 0),
        created_at=user["created_at"]
    )
    return TokenResponse(access_token=token, user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        business_name=user.get("business_name"),
        location=user.get("location"),
        credits=user.get("credits", 0),
        created_at=user["created_at"]
    )

# ============== MENU ROUTES ==============

@api_router.post("/menus/upload")
async def upload_menu(
    files: List[UploadFile] = File(...),
    name: str = "Uploaded Menu",
    location: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    """Upload one or more menu files (images or PDFs) for analysis"""
    # Check credits
    if user.get("credits", 0) < 1:
        raise HTTPException(status_code=402, detail="Insufficient credits. Please purchase more credits.")
    
    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail="No files provided")
    
    file_paths = []
    
    for file in files:
        # Save each uploaded file
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ['.pdf', '.png', '.jpg', '.jpeg', '.webp']:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.filename}. Please upload PDF or image files.")
        
        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{file_id}{file_ext}"
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        file_paths.append(str(file_path))
        logger.info(f"Saved file: {file.filename} -> {file_path}")
    
    # Create menu job
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "user_id": user["id"],
        "name": name,
        "status": "pending",
        "file_path": file_paths[0] if file_paths else None,  # Legacy support
        "file_paths": file_paths,  # All uploaded files
        "items": [],
        "location": location or user.get("location"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.menu_jobs.insert_one(job)
    
    # Deduct credit
    await db.users.update_one({"id": user["id"]}, {"$inc": {"credits": -1}})
    
    logger.info(f"Created job {job_id} with {len(file_paths)} file(s)")
    return {"job_id": job_id, "message": f"Menu uploaded successfully ({len(file_paths)} page(s)). Analysis will begin shortly.", "total_pages": len(file_paths)}

@api_router.post("/menus/{job_id}/add-page")
async def add_menu_page(
    job_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Add additional pages to an existing menu job"""
    job = await db.menu_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Menu job not found")
    
    # Save uploaded file
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ['.pdf', '.png', '.jpg', '.jpeg', '.webp']:
        raise HTTPException(status_code=400, detail="Unsupported file type.")
    
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}{file_ext}"
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Add to file_paths list
    file_paths = job.get("file_paths", [job.get("file_path")])
    file_paths.append(str(file_path))
    
    await db.menu_jobs.update_one(
        {"id": job_id},
        {"$set": {"file_paths": file_paths, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Page added. Total pages: {len(file_paths)}", "total_pages": len(file_paths)}

@api_router.post("/menus/{job_id}/analyze")
async def analyze_menu(job_id: str, user: dict = Depends(get_current_user)):
    import asyncio
    import PIL.Image
    
    job = await db.menu_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Menu job not found")
    
    if job["status"] not in ["pending", "completed"]:
        raise HTTPException(status_code=400, detail=f"Cannot analyze menu in {job['status']} status")
    
    await db.menu_jobs.update_one({"id": job_id}, {"$set": {"status": "analyzing"}})
    
    try:
        # Get all file paths (support multi-page)
        file_paths = job.get("file_paths", [job.get("file_path")])
        
        all_items = []
        max_retries = 3
        
        # Use Gemini 2.0 Flash for image analysis (fast and cost-effective)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        system_prompt = """You are a restaurant menu analysis expert. Extract ALL menu items with details.

For each item provide:
1. Item name (exactly as on menu)
2. Description (if available)  
3. Price (actual menu price)
4. Estimated ingredients with portions
5. Food cost based on industry pricing

Return ONLY valid JSON (no markdown, no explanation):
{
    "items": [
        {
            "name": "Item Name",
            "description": "Description",
            "current_price": 12.99,
            "ingredients": [{"name": "Ingredient", "portion": "4 oz", "estimated_cost": 1.50}],
            "food_cost": 4.50
        }
    ]
}

CRITICAL: Extract ALL items. Do not skip any."""
        
        for page_idx, file_path in enumerate(file_paths):
            page_items = []
            last_error = None
            
            for attempt in range(max_retries):
                try:
                    logger.info(f"Page {page_idx + 1} attempt {attempt + 1}: Using Gemini 2.0 Flash")
                    
                    # Load image
                    image = PIL.Image.open(file_path)
                    
                    # Generate content with image
                    response = model.generate_content([
                        system_prompt,
                        image,
                        f"Analyze this menu page (page {page_idx + 1} of {len(file_paths)}). Extract EVERY menu item with prices, ingredients, and food costs. Return ONLY JSON."
                    ])
                    
                    # Parse response
                    response_text = response.text.strip()
                    
                    # Clean up response - remove markdown code blocks if present
                    if response_text.startswith("```"):
                        lines = response_text.split("\n")
                        # Remove first line (```json) and last line (```)
                        lines = [l for l in lines if not l.startswith("```")]
                        response_text = "\n".join(lines)
                    
                    menu_data = json.loads(response_text)
                    page_items = menu_data.get("items", [])
                    logger.info(f"Page {page_idx + 1}: Found {len(page_items)} items (attempt {attempt + 1})")
                    break  # Success, exit retry loop
                    
                except json.JSONDecodeError as e:
                    last_error = f"JSON parse error: {str(e)}"
                    logger.warning(f"Page {page_idx + 1} attempt {attempt + 1}: {last_error}")
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"Page {page_idx + 1} attempt {attempt + 1} failed: {last_error}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
            
            if page_items:
                all_items.extend(page_items)
            elif last_error:
                logger.error(f"Failed to analyze page {page_idx + 1} after {max_retries} attempts: {last_error}")
        
        # Process all collected items and add IDs
        processed_items = []
        total_food_cost = 0
        total_profit = 0
        
        # Remove duplicates based on name (case-insensitive)
        seen_names = set()
        unique_items = []
        for item in all_items:
            name_lower = item.get("name", "").lower().strip()
            if name_lower and name_lower not in seen_names:
                seen_names.add(name_lower)
                unique_items.append(item)
        
        for item in unique_items:
            item_id = str(uuid.uuid4())
            current_price = float(item.get("current_price", 0))
            food_cost = float(item.get("food_cost", 0))
            profit = current_price - food_cost
            
            # Calculate suggested price (targeting 30% food cost ratio)
            suggested_price = round(food_cost / 0.30, 2) if food_cost > 0 else current_price
            
            processed_item = {
                "id": item_id,
                "name": item.get("name", "Unknown Item"),
                "description": item.get("description"),
                "current_price": current_price,
                "suggested_price": suggested_price,
                "approved_price": None,
                "food_cost": food_cost,
                "profit_per_plate": round(profit, 2),
                "ingredients": item.get("ingredients", []),
                "competitor_prices": [],
                "price_decision": None
            }
            processed_items.append(processed_item)
            total_food_cost += food_cost
            total_profit += profit
        
        # Update job with results
        await db.menu_jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "items": processed_items,
                    "total_food_cost": round(total_food_cost, 2),
                    "total_profit": round(total_profit, 2),
                    "pages_analyzed": len(file_paths),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Analysis complete", "items_found": len(processed_items), "pages_analyzed": len(file_paths)}
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        await db.menu_jobs.update_one({"id": job_id}, {"$set": {"status": "pending"}})
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@api_router.get("/menus", response_model=List[dict])
async def get_menus(user: dict = Depends(get_current_user)):
    jobs = await db.menu_jobs.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return jobs

@api_router.get("/menus/{job_id}")
async def get_menu(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.menu_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Menu job not found")
    return job

# Model for ingredient update
class IngredientUpdate(BaseModel):
    name: str
    portion: Optional[str] = None
    estimated_cost: float

class ItemIngredientsUpdate(BaseModel):
    ingredients: List[IngredientUpdate]

@api_router.put("/menus/{job_id}/items/{item_id}/ingredients")
async def update_item_ingredients(
    job_id: str, 
    item_id: str, 
    update: ItemIngredientsUpdate, 
    user: dict = Depends(get_current_user)
):
    """Update ingredient prices for a menu item and recalculate food cost"""
    job = await db.menu_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Menu job not found")
    
    items = job.get("items", [])
    item_found = False
    
    for item in items:
        if item["id"] == item_id:
            item_found = True
            # Update ingredients
            item["ingredients"] = [ing.model_dump() for ing in update.ingredients]
            
            # Recalculate food cost
            new_food_cost = sum(ing.estimated_cost for ing in update.ingredients)
            item["food_cost"] = round(new_food_cost, 2)
            
            # Recalculate food cost percentage
            if item.get("current_price", 0) > 0:
                item["food_cost_pct"] = round((new_food_cost / item["current_price"]) * 100, 1)
            
            # Recalculate suggested price (target 30% food cost)
            if new_food_cost > 0:
                item["suggested_price"] = round(new_food_cost / 0.30, 2)
            
            # Recalculate profit per plate
            if item.get("approved_price"):
                item["profit_per_plate"] = round(item["approved_price"] - new_food_cost, 2)
            elif item.get("current_price"):
                item["profit_per_plate"] = round(item["current_price"] - new_food_cost, 2)
            
            break
    
    if not item_found:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Update the menu job
    await db.menu_jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "items": items,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Return the updated item
    updated_item = next((i for i in items if i["id"] == item_id), None)
    return {
        "message": "Ingredients updated successfully",
        "item": updated_item
    }

@api_router.post("/menus/{job_id}/approve")
async def approve_prices(job_id: str, approvals: List[PriceApproval], user: dict = Depends(get_current_user)):
    job = await db.menu_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Menu job not found")
    
    items = job.get("items", [])
    approval_map = {a.item_id: a for a in approvals}
    
    total_profit = 0
    total_revenue = 0
    total_food_cost = 0
    
    for item in items:
        if item["id"] in approval_map:
            approval = approval_map[item["id"]]
            item["price_decision"] = approval.decision
            
            if approval.decision == "maintain":
                item["approved_price"] = item["current_price"]
            elif approval.decision == "increase":
                item["approved_price"] = item["suggested_price"]
            elif approval.decision == "decrease":
                # Decrease by 10% from suggested
                item["approved_price"] = round(item["suggested_price"] * 0.9, 2)
            elif approval.decision == "custom" and approval.custom_price:
                item["approved_price"] = approval.custom_price
            
            if item["approved_price"] and item.get("food_cost"):
                item["profit_per_plate"] = round(item["approved_price"] - item["food_cost"], 2)
                total_profit += item["profit_per_plate"]
                total_revenue += item["approved_price"]
                total_food_cost += item["food_cost"]
    
    await db.menu_jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "status": "approved",
                "items": items,
                "total_profit": round(total_profit, 2),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Save price history snapshot for comparison tracking
    snapshot = {
        "id": str(uuid.uuid4()),
        "menu_id": job_id,
        "user_id": user["id"],
        "menu_name": job.get("name"),
        "snapshot_date": datetime.now(timezone.utc).isoformat(),
        "total_items": len(items),
        "total_revenue": round(total_revenue, 2),
        "total_food_cost": round(total_food_cost, 2),
        "total_profit": round(total_profit, 2),
        "profit_margin": round((total_profit / total_revenue * 100) if total_revenue > 0 else 0, 1),
        "items": [
            {
                "name": item.get("name"),
                "original_price": item.get("current_price"),
                "approved_price": item.get("approved_price"),
                "food_cost": item.get("food_cost"),
                "profit": item.get("profit_per_plate"),
                "decision": item.get("price_decision")
            }
            for item in items if item.get("approved_price")
        ]
    }
    await db.price_history.insert_one(snapshot)
    
    return {"message": "Prices approved successfully", "snapshot_id": snapshot["id"]}

@api_router.delete("/menus/{job_id}")
async def delete_menu(job_id: str, user: dict = Depends(get_current_user)):
    result = await db.menu_jobs.delete_one({"id": job_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu job not found")
    return {"message": "Menu deleted successfully"}

# ============== COMPETITOR ANALYSIS ==============

@api_router.post("/menus/{job_id}/competitor-analysis")
async def analyze_competitors(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.menu_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Menu job not found")
    
    location = job.get("location") or user.get("location") or "New York"
    items = job.get("items", [])
    
    if not items:
        raise HTTPException(status_code=400, detail="No menu items to analyze")
    
    # Use AI to generate realistic competitor pricing based on location and item types
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"competitor-{job_id}",
            system_message=f"""You are a restaurant market analyst. For the given menu items and location ({location}), 
            provide realistic competitor pricing data from 4-5 nearby restaurants within a 60-mile radius.
            Create realistic restaurant names that fit the local market.
            Consider local market conditions, restaurant types, and typical pricing strategies.
            
            Return JSON in this format:
            {{
                "analysis_location": "{location}",
                "radius_miles": 60,
                "restaurants_analyzed": [
                    {{"name": "Restaurant Name", "type": "Casual Dining", "distance_miles": 5.2}}
                ],
                "competitors": [
                    {{
                        "item_name": "Item from menu",
                        "competitor_prices": [
                            {{"restaurant": "Restaurant Name", "price": 12.99, "distance_miles": 5.2}}
                        ],
                        "avg_market_price": 13.50,
                        "price_range": {{"min": 11.99, "max": 15.99}}
                    }}
                ]
            }}
            """
        ).with_model("gemini", "gemini-2.5-flash")
        
        item_names = [item["name"] for item in items[:10]]  # Limit to 10 items
        message = UserMessage(
            text=f"Analyze competitor pricing for these menu items in {location} (60-mile radius): {json.dumps(item_names)}"
        )
        
        response = await chat.send_message(message)
        
        # Parse response
        clean_response = response.strip()
        if clean_response.startswith("```"):
            clean_response = clean_response.split("```")[1]
            if clean_response.startswith("json"):
                clean_response = clean_response[4:]
        
        competitor_data = json.loads(clean_response)
        
        # Extract restaurants list for transparency
        restaurants_analyzed = competitor_data.get("restaurants_analyzed", [])
        
        # Update items with competitor data
        competitor_map = {c["item_name"]: c for c in competitor_data.get("competitors", [])}
        
        for item in items:
            if item["name"] in competitor_map:
                comp_info = competitor_map[item["name"]]
                item["competitor_prices"] = comp_info.get("competitor_prices", [])
                item["avg_market_price"] = comp_info.get("avg_market_price")
                item["market_price_range"] = comp_info.get("price_range")
                
                # Update suggested price based on competitor average
                if item["competitor_prices"]:
                    avg_competitor = sum(p["price"] for p in item["competitor_prices"]) / len(item["competitor_prices"])
                    food_cost = item.get("food_cost", 0)
                    
                    # Suggest price: competitive but maintains at least 30% food cost ratio
                    min_price_for_margin = food_cost / 0.30 if food_cost > 0 else item["current_price"]
                    item["suggested_price"] = round(max(avg_competitor * 0.97, min_price_for_margin), 2)
        
        # Store competitor metadata with the job
        await db.menu_jobs.update_one(
            {"id": job_id},
            {"$set": {
                "items": items, 
                "competitor_analysis": {
                    "location": location,
                    "radius_miles": 60,
                    "restaurants_analyzed": restaurants_analyzed,
                    "analyzed_at": datetime.now(timezone.utc).isoformat()
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "message": "Competitor analysis complete",
            "location": location,
            "restaurants_analyzed": restaurants_analyzed,
            "items_analyzed": len([i for i in items if i.get("competitor_prices")])
        }
        
    except Exception as e:
        logger.error(f"Competitor analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Competitor analysis failed: {str(e)}")

# ============== LOCATION SEARCH ==============

# Common US cities for quick lookup
US_CITIES = [
    {"city": "New York", "state": "NY", "lat": 40.7128, "lng": -74.0060},
    {"city": "Los Angeles", "state": "CA", "lat": 34.0522, "lng": -118.2437},
    {"city": "Chicago", "state": "IL", "lat": 41.8781, "lng": -87.6298},
    {"city": "Houston", "state": "TX", "lat": 29.7604, "lng": -95.3698},
    {"city": "Phoenix", "state": "AZ", "lat": 33.4484, "lng": -112.0740},
    {"city": "Philadelphia", "state": "PA", "lat": 39.9526, "lng": -75.1652},
    {"city": "San Antonio", "state": "TX", "lat": 29.4241, "lng": -98.4936},
    {"city": "San Diego", "state": "CA", "lat": 32.7157, "lng": -117.1611},
    {"city": "Dallas", "state": "TX", "lat": 32.7767, "lng": -96.7970},
    {"city": "Austin", "state": "TX", "lat": 30.2672, "lng": -97.7431},
    {"city": "San Jose", "state": "CA", "lat": 37.3382, "lng": -121.8863},
    {"city": "Fort Worth", "state": "TX", "lat": 32.7555, "lng": -97.3308},
    {"city": "Jacksonville", "state": "FL", "lat": 30.3322, "lng": -81.6557},
    {"city": "Columbus", "state": "OH", "lat": 39.9612, "lng": -82.9988},
    {"city": "Charlotte", "state": "NC", "lat": 35.2271, "lng": -80.8431},
    {"city": "San Francisco", "state": "CA", "lat": 37.7749, "lng": -122.4194},
    {"city": "Indianapolis", "state": "IN", "lat": 39.7684, "lng": -86.1581},
    {"city": "Seattle", "state": "WA", "lat": 47.6062, "lng": -122.3321},
    {"city": "Denver", "state": "CO", "lat": 39.7392, "lng": -104.9903},
    {"city": "Boston", "state": "MA", "lat": 42.3601, "lng": -71.0589},
    {"city": "Nashville", "state": "TN", "lat": 36.1627, "lng": -86.7816},
    {"city": "Detroit", "state": "MI", "lat": 42.3314, "lng": -83.0458},
    {"city": "Portland", "state": "OR", "lat": 45.5051, "lng": -122.6750},
    {"city": "Las Vegas", "state": "NV", "lat": 36.1699, "lng": -115.1398},
    {"city": "Memphis", "state": "TN", "lat": 35.1495, "lng": -90.0490},
    {"city": "Atlanta", "state": "GA", "lat": 33.7490, "lng": -84.3880},
    {"city": "Miami", "state": "FL", "lat": 25.7617, "lng": -80.1918},
    {"city": "Orlando", "state": "FL", "lat": 28.5383, "lng": -81.3792},
    {"city": "Tampa", "state": "FL", "lat": 27.9506, "lng": -82.4572},
    {"city": "Minneapolis", "state": "MN", "lat": 44.9778, "lng": -93.2650},
]

class LocationSearchResult(BaseModel):
    formatted_address: str
    city: str
    state: str
    country: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@api_router.get("/location/search")
async def search_location(query: str, user: dict = Depends(get_current_user)):
    """Search for locations - instant local lookup only, no AI"""
    if not query or len(query) < 2:
        return {"results": []}
    
    query_lower = query.lower().strip()
    
    # Match against known cities (instant, no API call)
    matching_cities = []
    for city_data in US_CITIES:
        city_lower = city_data["city"].lower()
        state_lower = city_data["state"].lower()
        full_name = f"{city_lower}, {state_lower}"
        
        if (query_lower in city_lower or 
            query_lower in state_lower or 
            query_lower in full_name or
            city_lower.startswith(query_lower)):
            matching_cities.append({
                "formatted_address": f"{city_data['city']}, {city_data['state']}, USA",
                "city": city_data["city"],
                "state": city_data["state"],
                "country": "USA",
                "latitude": city_data["lat"],
                "longitude": city_data["lng"]
            })
    
    # Sort by relevance (exact matches first)
    matching_cities.sort(key=lambda x: (
        0 if x["city"].lower().startswith(query_lower) else 1,
        len(x["city"])
    ))
    
    # If user entered a specific address with numbers, format it nicely
    if any(c.isdigit() for c in query) and matching_cities:
        # Append the street address to the first matching city
        best_city = matching_cities[0]
        formatted = f"{query}, {best_city['city']}, {best_city['state']}, USA"
        return {"results": [{
            "formatted_address": formatted,
            "city": best_city["city"],
            "state": best_city["state"],
            "country": "USA",
            "latitude": best_city["latitude"],
            "longitude": best_city["longitude"]
        }]}
    
    # Return city matches
    if matching_cities:
        return {"results": matching_cities[:5]}
    
    # If no matches, just return what they typed
    if len(query) > 5:
        return {"results": [{
            "formatted_address": f"{query}, USA",
            "city": query,
            "state": "",
            "country": "USA",
            "latitude": None,
            "longitude": None
        }]}
    
    return {"results": []}

# ============== PRICE COMPARISON & ANALYTICS ==============

@api_router.get("/analytics/price-history")
async def get_price_history(user: dict = Depends(get_current_user)):
    """Get all price history snapshots for comparison"""
    history = await db.price_history.find(
        {"user_id": user["id"]}, 
        {"_id": 0}
    ).sort("snapshot_date", -1).to_list(100)
    return history

@api_router.get("/analytics/price-history/{menu_id}")
async def get_menu_price_history(menu_id: str, user: dict = Depends(get_current_user)):
    """Get price history for a specific menu"""
    history = await db.price_history.find(
        {"menu_id": menu_id, "user_id": user["id"]}, 
        {"_id": 0}
    ).sort("snapshot_date", -1).to_list(50)
    return history

@api_router.get("/analytics/summary")
async def get_analytics_summary(user: dict = Depends(get_current_user)):
    """Get overall analytics summary"""
    # Get all snapshots
    history = await db.price_history.find(
        {"user_id": user["id"]}, 
        {"_id": 0}
    ).sort("snapshot_date", 1).to_list(1000)
    
    if not history:
        return {
            "total_snapshots": 0,
            "total_menus_analyzed": 0,
            "total_items_priced": 0,
            "total_profit_generated": 0,
            "avg_profit_margin": 0,
            "profit_trend": [],
            "revenue_trend": [],
            "top_performing_items": []
        }
    
    # Calculate metrics
    total_profit = sum(h.get("total_profit", 0) for h in history)
    total_revenue = sum(h.get("total_revenue", 0) for h in history)
    total_items = sum(h.get("total_items", 0) for h in history)
    avg_margin = total_profit / total_revenue * 100 if total_revenue > 0 else 0
    
    # Get unique menus
    unique_menus = len(set(h.get("menu_id") for h in history))
    
    # Build trend data (last 10 snapshots)
    recent = history[-10:] if len(history) > 10 else history
    profit_trend = [
        {
            "date": h.get("snapshot_date", "")[:10],
            "profit": h.get("total_profit", 0),
            "menu": h.get("menu_name", "")[:20]
        }
        for h in recent
    ]
    
    revenue_trend = [
        {
            "date": h.get("snapshot_date", "")[:10],
            "revenue": h.get("total_revenue", 0),
            "food_cost": h.get("total_food_cost", 0)
        }
        for h in recent
    ]
    
    # Find top performing items across all snapshots
    item_profits = {}
    for h in history:
        for item in h.get("items", []):
            name = item.get("name", "Unknown")
            profit = item.get("profit", 0)
            if name in item_profits:
                item_profits[name]["total_profit"] += profit
                item_profits[name]["count"] += 1
            else:
                item_profits[name] = {"name": name, "total_profit": profit, "count": 1}
    
    top_items = sorted(
        item_profits.values(), 
        key=lambda x: x["total_profit"], 
        reverse=True
    )[:10]
    
    return {
        "total_snapshots": len(history),
        "total_menus_analyzed": unique_menus,
        "total_items_priced": total_items,
        "total_profit_generated": round(total_profit, 2),
        "avg_profit_margin": round(avg_margin, 1),
        "profit_trend": profit_trend,
        "revenue_trend": revenue_trend,
        "top_performing_items": top_items
    }

@api_router.get("/analytics/compare")
async def compare_snapshots(
    snapshot_ids: str,  # comma-separated IDs
    user: dict = Depends(get_current_user)
):
    """Compare multiple price snapshots"""
    ids = [id.strip() for id in snapshot_ids.split(",")]
    
    snapshots = await db.price_history.find(
        {"id": {"$in": ids}, "user_id": user["id"]},
        {"_id": 0}
    ).to_list(10)
    
    if len(snapshots) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 snapshots to compare")
    
    # Sort by date
    snapshots.sort(key=lambda x: x.get("snapshot_date", ""))
    
    # Calculate changes between first and last
    first = snapshots[0]
    last = snapshots[-1]
    
    profit_change = last.get("total_profit", 0) - first.get("total_profit", 0)
    revenue_change = last.get("total_revenue", 0) - first.get("total_revenue", 0)
    margin_change = last.get("profit_margin", 0) - first.get("profit_margin", 0)
    
    # Item-level comparison
    first_items = {i.get("name"): i for i in first.get("items", [])}
    last_items = {i.get("name"): i for i in last.get("items", [])}
    
    item_changes = []
    for name, last_item in last_items.items():
        if name in first_items:
            first_item = first_items[name]
            price_change = (last_item.get("approved_price", 0) or 0) - (first_item.get("approved_price", 0) or 0)
            profit_change_item = (last_item.get("profit", 0) or 0) - (first_item.get("profit", 0) or 0)
            item_changes.append({
                "name": name,
                "old_price": first_item.get("approved_price"),
                "new_price": last_item.get("approved_price"),
                "price_change": round(price_change, 2),
                "price_change_pct": round(price_change / first_item.get("approved_price", 1) * 100, 1) if first_item.get("approved_price") else 0,
                "profit_change": round(profit_change_item, 2)
            })
    
    return {
        "snapshots": snapshots,
        "summary": {
            "period": f"{first.get('snapshot_date', '')[:10]} to {last.get('snapshot_date', '')[:10]}",
            "profit_change": round(profit_change, 2),
            "profit_change_pct": round(profit_change / first.get("total_profit", 1) * 100, 1) if first.get("total_profit") else 0,
            "revenue_change": round(revenue_change, 2),
            "margin_change": round(margin_change, 1)
        },
        "item_changes": sorted(item_changes, key=lambda x: x["profit_change"], reverse=True)
    }

# ============== PAYMENT ROUTES ==============

@api_router.get("/credits/packages")
async def get_credit_packages():
    return list(CREDIT_PACKAGES.values())

@api_router.post("/credits/checkout")
async def create_checkout(package_id: str, request: Request, user: dict = Depends(get_current_user)):
    if package_id not in CREDIT_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package")
    
    package = CREDIT_PACKAGES[package_id]
    host_url = str(request.base_url).rstrip('/')
    
    # Replace internal URL with external URL for redirects
    frontend_url = os.environ.get('FRONTEND_URL', host_url.replace(':8001', ':3000'))
    
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=package.price,
        currency="usd",
        success_url=f"{frontend_url}/credits?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend_url}/credits",
        metadata={
            "user_id": user["id"],
            "package_id": package_id,
            "credits": str(package.credits)
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Record transaction
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "package_id": package_id,
        "amount": package.price,
        "credits": package.credits,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/credits/status/{session_id}")
async def get_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user["id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Check with Stripe
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    if status.payment_status == "paid" and transaction["status"] != "completed":
        # Update transaction and add credits
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed", "payment_status": status.payment_status}}
        )
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"credits": transaction["credits"]}}
        )
        
        return {"status": "completed", "credits_added": transaction["credits"]}
    
    return {"status": transaction["status"], "payment_status": status.payment_status}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request, stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature")):
    body = await request.body()
    
    try:
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
        event = await stripe_checkout.handle_webhook(body, stripe_signature)
        
        if event.payment_status == "paid":
            transaction = await db.payment_transactions.find_one({"session_id": event.session_id})
            if transaction and transaction["status"] != "completed":
                await db.payment_transactions.update_one(
                    {"session_id": event.session_id},
                    {"$set": {"status": "completed", "payment_status": "paid"}}
                )
                
                # Handle subscription vs one-time purchase
                if transaction.get("type") == "subscription":
                    # Activate subscription
                    await db.users.update_one(
                        {"id": transaction["user_id"]},
                        {
                            "$set": {
                                "subscription": {
                                    "plan_id": transaction["plan_id"],
                                    "status": "active",
                                    "started_at": datetime.now(timezone.utc).isoformat(),
                                    "next_renewal": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                                }
                            },
                            "$inc": {"credits": transaction["credits"]}
                        }
                    )
                else:
                    # One-time credit purchase
                    await db.users.update_one(
                        {"id": transaction["user_id"]},
                        {"$inc": {"credits": transaction["credits"]}}
                    )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error"}

# ============== SUBSCRIPTION ROUTES ==============

@api_router.get("/subscriptions/plans")
async def get_subscription_plans():
    """Get all available subscription plans"""
    return [plan.model_dump() for plan in SUBSCRIPTION_PLANS.values()]

@api_router.post("/subscriptions/checkout")
async def create_subscription_checkout(plan_id: str, request: Request, user: dict = Depends(get_current_user)):
    """Create a checkout session for a subscription plan"""
    if plan_id not in SUBSCRIPTION_PLANS:
        raise HTTPException(status_code=400, detail="Invalid subscription plan")
    
    plan = SUBSCRIPTION_PLANS[plan_id]
    host_url = str(request.base_url).rstrip('/')
    frontend_url = os.environ.get('FRONTEND_URL', host_url.replace(':8001', ':3000'))
    webhook_url = f"{host_url}api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=plan.price_per_month,
        currency="usd",
        success_url=f"{frontend_url}/subscription?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{frontend_url}/subscription",
        metadata={
            "user_id": user["id"],
            "plan_id": plan_id,
            "type": "subscription",
            "credits": str(plan.credits_per_month)
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Record transaction
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "plan_id": plan_id,
        "type": "subscription",
        "amount": plan.price_per_month,
        "credits": plan.credits_per_month,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"checkout_url": session.url, "session_id": session.session_id}

@api_router.get("/subscriptions/status/{session_id}")
async def get_subscription_status(session_id: str, user: dict = Depends(get_current_user)):
    """Check subscription payment status"""
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user["id"], "type": "subscription"},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    status = await stripe_checkout.get_checkout_status(session_id)
    
    if status.payment_status == "paid" and transaction["status"] != "completed":
        # Update transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed", "payment_status": status.payment_status}}
        )
        
        # Activate subscription and add credits
        plan = SUBSCRIPTION_PLANS[transaction["plan_id"]]
        await db.users.update_one(
            {"id": user["id"]},
            {
                "$set": {
                    "subscription": {
                        "plan_id": transaction["plan_id"],
                        "plan_name": plan.name,
                        "status": "active",
                        "credits_per_month": plan.credits_per_month,
                        "started_at": datetime.now(timezone.utc).isoformat(),
                        "next_renewal": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                    }
                },
                "$inc": {"credits": plan.credits_per_month}
            }
        )
        
        return {
            "status": "completed", 
            "credits_added": plan.credits_per_month,
            "plan_name": plan.name
        }
    
    return {"status": transaction["status"], "payment_status": status.payment_status}

@api_router.get("/subscriptions/current")
async def get_current_subscription(user: dict = Depends(get_current_user)):
    """Get user's current subscription status"""
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0, "subscription": 1})
    subscription = user_data.get("subscription") if user_data else None
    
    if subscription and subscription.get("status") == "active":
        # Check if renewal is due
        next_renewal = subscription.get("next_renewal")
        if next_renewal:
            renewal_date = datetime.fromisoformat(next_renewal.replace('Z', '+00:00'))
            if renewal_date < datetime.now(timezone.utc):
                subscription["status"] = "expired"
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"subscription.status": "expired"}}
                )
    
    return {"subscription": subscription}

@api_router.post("/subscriptions/cancel")
async def cancel_subscription(user: dict = Depends(get_current_user)):
    """Cancel user's subscription"""
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0, "subscription": 1})
    
    if not user_data or not user_data.get("subscription"):
        raise HTTPException(status_code=400, detail="No active subscription found")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"subscription.status": "cancelled", "subscription.cancelled_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Subscription cancelled. You'll retain access until the end of your billing period."}

# ============== EXPORT ROUTES ==============

@api_router.get("/menus/{job_id}/export")
async def export_menu(job_id: str, format: str = "json", user: dict = Depends(get_current_user)):
    from fastapi.responses import Response
    
    job = await db.menu_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Menu job not found")
    
    # Add food cost % to each item
    items = job.get("items", [])
    for item in items:
        current_price = item.get("current_price", 0)
        food_cost = item.get("food_cost", 0)
        if current_price > 0:
            item["food_cost_pct"] = round((food_cost / current_price) * 100, 1)
        else:
            item["food_cost_pct"] = 0
    
    menu_name = job.get('name', 'menu').replace(' ', '_').replace('/', '-')[:50]
    
    if format == "json":
        # Include summary data
        total_food_cost = sum(item.get("food_cost", 0) for item in items)
        total_revenue = sum(item.get("current_price", 0) for item in items)
        job["summary"] = {
            "total_items": len(items),
            "total_food_cost": round(total_food_cost, 2),
            "total_revenue": round(total_revenue, 2),
            "avg_food_cost_pct": round((total_food_cost / total_revenue * 100) if total_revenue > 0 else 0, 1)
        }
        
        # Return as downloadable file
        json_content = json.dumps(job, indent=2)
        return Response(
            content=json_content,
            media_type="application/json",
            headers={
                "Content-Disposition": f'attachment; filename="{menu_name}_export.json"'
            }
        )
    elif format == "csv":
        # Generate CSV with food cost %
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Name", "Description", "Current Price", "Food Cost $", "Food Cost %", 
            "Suggested Price", "Approved Price", "Profit/Plate", "Competitors"
        ])
        
        for item in items:
            # Format competitor info
            competitors = item.get("competitor_prices", [])
            competitor_str = "; ".join([
                f"{c.get('restaurant', 'Unknown')}: ${c.get('price', 0):.2f} ({c.get('distance_miles', 0)}mi)"
                for c in competitors
            ]) if competitors else "N/A"
            
            writer.writerow([
                item.get("name", ""),
                item.get("description", ""),
                f"${item.get('current_price', 0):.2f}",
                f"${item.get('food_cost', 0):.2f}",
                f"{item.get('food_cost_pct', 0):.1f}%",
                f"${item.get('suggested_price', 0):.2f}",
                f"${item.get('approved_price', 0):.2f}" if item.get('approved_price') else "—",
                f"${item.get('profit_per_plate', 0):.2f}",
                competitor_str
            ])
        
        # Add summary row
        writer.writerow([])
        total_food_cost = sum(item.get("food_cost", 0) for item in items)
        total_revenue = sum(item.get("current_price", 0) for item in items)
        total_profit = sum(item.get("profit_per_plate", 0) for item in items)
        avg_food_cost_pct = (total_food_cost / total_revenue * 100) if total_revenue > 0 else 0
        
        writer.writerow(["TOTALS", "", f"${total_revenue:.2f}", f"${total_food_cost:.2f}", 
                        f"{avg_food_cost_pct:.1f}%", "", "", f"${total_profit:.2f}", ""])
        
        csv_content = output.getvalue()
        
        # Return as downloadable file with BOM for Excel compatibility
        return Response(
            content="\ufeff" + csv_content,
            media_type="text/csv; charset=utf-8",
            headers={
                "Content-Disposition": f'attachment; filename="{menu_name}_export.csv"'
            }
        )
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "MenuGenius API v1.0 - © Billy Harman, BHdesignsbyBILLY - All Rights Reserved"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "owner": "Billy Harman - BHdesignsbyBILLY"}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
