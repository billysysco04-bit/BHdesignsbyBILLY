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
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
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

# LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY', '')

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

# Credit packages
CREDIT_PACKAGES = {
    "starter": CreditPackage(id="starter", name="Starter Pack", credits=5, price=9.99),
    "professional": CreditPackage(id="professional", name="Professional Pack", credits=15, price=24.99),
    "enterprise": CreditPackage(id="enterprise", name="Enterprise Pack", credits=50, price=69.99),
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
    file: UploadFile = File(...),
    name: str = "Uploaded Menu",
    location: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    # Check credits
    if user.get("credits", 0) < 1:
        raise HTTPException(status_code=402, detail="Insufficient credits. Please purchase more credits.")
    
    # Save uploaded file
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ['.pdf', '.png', '.jpg', '.jpeg', '.webp']:
        raise HTTPException(status_code=400, detail="Unsupported file type. Please upload PDF or image files.")
    
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}{file_ext}"
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Create menu job
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "user_id": user["id"],
        "name": name,
        "status": "pending",
        "file_path": str(file_path),
        "items": [],
        "location": location or user.get("location"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.menu_jobs.insert_one(job)
    
    # Deduct credit
    await db.users.update_one({"id": user["id"]}, {"$inc": {"credits": -1}})
    
    return {"job_id": job_id, "message": "Menu uploaded successfully. Analysis will begin shortly."}

@api_router.post("/menus/{job_id}/analyze")
async def analyze_menu(job_id: str, user: dict = Depends(get_current_user)):
    job = await db.menu_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Menu job not found")
    
    if job["status"] not in ["pending", "completed"]:
        raise HTTPException(status_code=400, detail=f"Cannot analyze menu in {job['status']} status")
    
    await db.menu_jobs.update_one({"id": job_id}, {"$set": {"status": "analyzing"}})
    
    try:
        # Initialize AI chat
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"menu-{job_id}",
            system_message="""You are a restaurant menu analysis expert. Analyze the uploaded menu and extract all items with their details.
            For each item, provide:
            1. Item name
            2. Description (if available)
            3. Price
            4. Estimated ingredients with portions
            5. Estimated food cost based on industry-standard ingredient pricing
            
            Return the data as a JSON array with this structure:
            {
                "items": [
                    {
                        "name": "Item Name",
                        "description": "Item description",
                        "current_price": 12.99,
                        "ingredients": [
                            {"name": "Ingredient", "portion": "4 oz", "estimated_cost": 1.50}
                        ],
                        "food_cost": 4.50
                    }
                ]
            }
            """
        ).with_model("gemini", "gemini-2.5-flash")
        
        # Prepare file for analysis
        file_path = job.get("file_path")
        mime_type = "application/pdf" if file_path.endswith(".pdf") else "image/jpeg"
        
        file_content = FileContentWithMimeType(file_path=file_path, mime_type=mime_type)
        
        message = UserMessage(
            text="Please analyze this menu and extract all items with their prices, estimated ingredients, and food costs. Return as JSON.",
            file_contents=[file_content]
        )
        
        response = await chat.send_message(message)
        
        # Parse response
        try:
            # Clean response - remove markdown code blocks if present
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            
            menu_data = json.loads(clean_response)
            items = menu_data.get("items", [])
        except json.JSONDecodeError:
            logger.error(f"Failed to parse AI response: {response}")
            items = []
        
        # Process items and add IDs
        processed_items = []
        total_food_cost = 0
        total_profit = 0
        
        for item in items:
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
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        
        return {"message": "Analysis complete", "items_found": len(processed_items)}
        
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
            provide realistic competitor pricing data from 3-5 fictional but realistic nearby restaurants.
            Consider local market conditions, restaurant types, and typical pricing strategies.
            
            Return JSON in this format:
            {{
                "competitors": [
                    {{
                        "item_name": "Item from menu",
                        "competitor_prices": [
                            {{"restaurant": "Restaurant Name", "price": 12.99, "distance_miles": 2.5}}
                        ]
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
        
        # Update items with competitor data
        competitor_map = {c["item_name"]: c["competitor_prices"] for c in competitor_data.get("competitors", [])}
        
        for item in items:
            if item["name"] in competitor_map:
                item["competitor_prices"] = competitor_map[item["name"]]
                
                # Update suggested price based on competitor average
                if item["competitor_prices"]:
                    avg_competitor = sum(p["price"] for p in item["competitor_prices"]) / len(item["competitor_prices"])
                    food_cost_ratio = item.get("food_cost", 0) / item["current_price"] if item["current_price"] > 0 else 0.3
                    
                    # Suggest price that maintains margin but is competitive
                    item["suggested_price"] = round(max(avg_competitor * 0.95, item.get("food_cost", 0) / 0.30), 2)
        
        await db.menu_jobs.update_one(
            {"id": job_id},
            {"$set": {"items": items, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Competitor analysis complete"}
        
    except Exception as e:
        logger.error(f"Competitor analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Competitor analysis failed: {str(e)}")

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
                await db.users.update_one(
                    {"id": transaction["user_id"]},
                    {"$inc": {"credits": transaction["credits"]}}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error"}

# ============== EXPORT ROUTES ==============

@api_router.get("/menus/{job_id}/export")
async def export_menu(job_id: str, format: str = "json", user: dict = Depends(get_current_user)):
    job = await db.menu_jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Menu job not found")
    
    if format == "json":
        return job
    elif format == "csv":
        # Generate CSV
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Name", "Description", "Current Price", "Food Cost", "Suggested Price", "Approved Price", "Profit"])
        
        for item in job.get("items", []):
            writer.writerow([
                item.get("name", ""),
                item.get("description", ""),
                item.get("current_price", ""),
                item.get("food_cost", ""),
                item.get("suggested_price", ""),
                item.get("approved_price", ""),
                item.get("profit_per_plate", "")
            ])
        
        return {"csv_data": output.getvalue(), "filename": f"{job['name']}_export.csv"}
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
