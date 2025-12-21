"""
MenuMaker - Professional Menu Creation Platform
Copyright (c) 2025 BHdesignsbyBILLY - Billy Harman
All Rights Reserved.

This software is proprietary and confidential.
Owned and controlled 100% by BHdesignsbyBILLY - Billy Harman

Unauthorized copying, distribution, modification, public display,
or public performance of this software is strictly prohibited.
"""

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

app = FastAPI(
    title="MenuMaker API",
    description="Professional Menu Creation Platform - Copyright (c) 2025 BHdesignsbyBILLY - Billy Harman",
    version="1.0.0"
)
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7
ADMIN_SECRET = os.environ.get('ADMIN_SECRET', 'admin-secret-2025')

security = HTTPBearer()
