import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Float, Integer, JSON, DateTime, Text
from database import Base

def gen_uuid():
    return str(uuid.uuid4())

def now_utc():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, default="")
    phone = Column(String, default="")
    picture = Column(String, default="")
    role = Column(String, default="user")
    password_hash = Column(String, default="")
    created_at = Column(DateTime(timezone=True), default=now_utc)

class Restaurant(Base):
    __tablename__ = "restaurants"
    id = Column(String, primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    cuisine = Column(JSON, default=list)
    description = Column(Text, default="")
    image = Column(String, default="")
    cover_image = Column(String, default="")
    rating = Column(Float, default=4.5)
    review_count = Column(Integer, default=0)
    delivery_time = Column(String, default="30-40 min")
    delivery_fee = Column(Float, default=2.99)
    min_order = Column(Float, default=15.0)
    price_range = Column(String, default="$$")
    tags = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    owner_id = Column(String, nullable=True, index=True)
    menu_categories = Column(JSON, default=list)
    commission_rate = Column(Float, default=5.0)
    created_at = Column(DateTime(timezone=True), default=now_utc)

class Cart(Base):
    __tablename__ = "carts"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, unique=True, nullable=False, index=True)
    restaurant_id = Column(String, nullable=True)
    restaurant_name = Column(String, default="")
    restaurant_image = Column(String, default="")
    items = Column(JSON, default=list)
    updated_at = Column(DateTime(timezone=True), default=now_utc)

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True, default=gen_uuid)
    order_number = Column(String, unique=True, nullable=False)
    user_id = Column(String, nullable=False, index=True)
    user_name = Column(String, default="")
    user_email = Column(String, default="")
    restaurant_id = Column(String, nullable=True)
    restaurant_name = Column(String, default="")
    restaurant_image = Column(String, default="")
    items = Column(JSON, default=list)
    subtotal = Column(Float, default=0.0)
    delivery_fee = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    status = Column(String, default="pending")
    delivery_address = Column(Text, default="")
    delivery_lat = Column(Float, nullable=True)   # GPS latitude of customer drop-off
    delivery_lng = Column(Float, nullable=True)   # GPS longitude of customer drop-off
    payment_method = Column(String, default="cod")
    estimated_delivery = Column(String, default="35-45 min")
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(String, primary_key=True, default=gen_uuid)
    session_id = Column(String, nullable=False, index=True)
    user_id = Column(String, nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
