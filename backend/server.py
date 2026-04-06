from dotenv import load_dotenv
load_dotenv()

import os, uuid, bcrypt, jwt, requests as http_req
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func, String, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from emergentintegrations.llm.chat import LlmChat, UserMessage

from database import AsyncSessionLocal, engine, Base
from models import User, Restaurant, Cart, Order, ChatMessage

# ── Config ──────────────────────────────────────────────────────────────────
JWT_SECRET   = os.environ.get("JWT_SECRET", "delight-secret-2024")
JWT_ALG      = "HS256"
ADMIN_EMAIL  = os.environ.get("ADMIN_EMAIL", "admin@delight.com")
ADMIN_PASS   = os.environ.get("ADMIN_PASSWORD", "admin123")
LLM_KEY      = os.environ.get("EMERGENT_LLM_KEY", "")

# ── Helpers ──────────────────────────────────────────────────────────────────
def hp(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def vp(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())

def make_token(uid: str, email: str, role: str) -> str:
    return jwt.encode(
        {"sub": uid, "email": email, "role": role,
         "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET, algorithm=JWT_ALG)

def model_to_dict(obj) -> dict:
    d = {}
    for c in obj.__table__.columns:
        val = getattr(obj, c.name)
        if hasattr(val, 'isoformat'):
            val = val.isoformat()
        d[c.name] = val
    return d

def fmt_user(user: User) -> dict:
    d = model_to_dict(user)
    d.pop('password_hash', None)
    return d

async def current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.user_id == p["sub"]))
        user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(401, "User not found")
    return fmt_user(user)

async def admin_user(u=Depends(current_user)):
    if u.get("role") != "admin":
        raise HTTPException(403, "Admin only")
    return u

# ── Pydantic Models ───────────────────────────────────────────────────────────
class RegisterReq(BaseModel):
    name: str; email: EmailStr; password: str

class LoginReq(BaseModel):
    email: EmailStr; password: str

class GoogleReq(BaseModel):
    session_id: str

class CartItemReq(BaseModel):
    restaurant_id: str; restaurant_name: str; restaurant_image: str
    item_id: str; name: str; price: float; quantity: int; image: str

class UpdateQtyReq(BaseModel):
    quantity: int

class OrderReq(BaseModel):
    delivery_address: str; payment_method: str = "cod"

class StatusReq(BaseModel):
    status: str

class ChatReq(BaseModel):
    message: str; session_id: str

class RestaurantReq(BaseModel):
    name: str; cuisine: List[str]; description: str; image: str
    cover_image: str; rating: float = 4.5; review_count: int = 100
    delivery_time: str = "30-40 min"; delivery_fee: float = 2.99
    min_order: float = 15.0; price_range: str = "$$"; tags: List[str] = []
    menu_categories: List[Any] = []

# ── Seed Data ─────────────────────────────────────────────────────────────────
RESTAURANTS_SEED = [
  {"name":"The Black Pearl","cuisine":["Fine Dining","European"],
   "description":"An exquisite fine dining experience in the heart of the city. Curated tasting menus, rare wines, and impeccable service.",
   "image":"https://images.unsplash.com/photo-1766832255363-c9f060ade8b0?w=400&q=80",
   "cover_image":"https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80",
   "rating":4.9,"review_count":347,"delivery_time":"40-55 min","delivery_fee":5.99,
   "min_order":50.0,"price_range":"$$$$","tags":["Fine Dining","Romantic","Award Winning"],
   "menu_categories":[
     {"id":"bp_s","name":"Starters","items":[
       {"id":"bp_s1","name":"Black Truffle Bruschetta","description":"House bread, black truffle, aged parmesan","price":18.0,"image":"https://images.pexels.com/photos/1117452/pexels-photo-1117452.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["vegetarian"]},
       {"id":"bp_s2","name":"Seared Foie Gras","description":"Pan seared foie gras, brioche, fig compote","price":28.0,"image":"https://images.pexels.com/photos/299347/pexels-photo-299347.jpeg?w=300","is_available":True,"is_popular":False,"dietary":[]},
       {"id":"bp_s3","name":"Burrata Caprese","description":"Fresh burrata, heirloom tomatoes, basil oil","price":16.0,"image":"https://images.pexels.com/photos/5939411/pexels-photo-5939411.jpeg?w=300","is_available":True,"is_popular":False,"dietary":["vegetarian","gluten_free"]},
     ]},
     {"id":"bp_m","name":"Mains","items":[
       {"id":"bp_m1","name":"Wagyu Beef Tenderloin","description":"A5 Wagyu, roasted bone marrow, truffle jus","price":89.0,"image":"https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["gluten_free"]},
       {"id":"bp_m2","name":"Pan Seared Sea Bass","description":"Chilean sea bass, saffron cream, micro herbs","price":55.0,"image":"https://images.unsplash.com/photo-1565686481561-d8ceaa689e01?w=300&q=80","is_available":True,"is_popular":True,"dietary":["gluten_free"]},
       {"id":"bp_m3","name":"Roasted Duck Confit","description":"Duck leg confit, cherry sauce, dauphinois","price":48.0,"image":"https://images.pexels.com/photos/2673353/pexels-photo-2673353.jpeg?w=300","is_available":True,"is_popular":False,"dietary":[]},
     ]},
     {"id":"bp_d","name":"Desserts","items":[
       {"id":"bp_d1","name":"Chocolate Fondant","description":"Valrhona dark chocolate, vanilla ice cream","price":14.0,"image":"https://images.pexels.com/photos/3026804/pexels-photo-3026804.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["vegetarian"]},
       {"id":"bp_d2","name":"Crème Brûlée","description":"Classic vanilla bean, caramelised sugar","price":12.0,"image":"https://images.pexels.com/photos/3625372/pexels-photo-3625372.jpeg?w=300","is_available":True,"is_popular":False,"dietary":["vegetarian","gluten_free"]},
     ]},
   ]},
  {"name":"Sakura Garden","cuisine":["Japanese","Sushi"],
   "description":"Authentic Japanese cuisine crafted by master chefs. Fresh sashimi flown daily from Tsukiji market.",
   "image":"https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=400&q=80",
   "cover_image":"https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=800&q=80",
   "rating":4.8,"review_count":512,"delivery_time":"30-45 min","delivery_fee":3.99,
   "min_order":25.0,"price_range":"$$$","tags":["Japanese","Sushi","Fresh"],
   "menu_categories":[
     {"id":"sk_su","name":"Sushi & Sashimi","items":[
       {"id":"sk_su1","name":"Salmon Sashimi (8pc)","description":"Premium Atlantic salmon, wasabi, gari","price":24.0,"image":"https://images.unsplash.com/photo-1774635804786-5ebb8f88dcdf?w=300&q=80","is_available":True,"is_popular":True,"dietary":["gluten_free"]},
       {"id":"sk_su2","name":"Spicy Tuna Roll (8pc)","description":"Spicy tuna, cucumber, sriracha mayo","price":18.0,"image":"https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=300&q=80","is_available":True,"is_popular":True,"dietary":[]},
       {"id":"sk_su3","name":"Omakase Platter","description":"Chef selection 15pc premium sushi","price":65.0,"image":"https://images.pexels.com/photos/2323398/pexels-photo-2323398.jpeg?w=300","is_available":True,"is_popular":False,"dietary":[]},
     ]},
     {"id":"sk_h","name":"Hot Dishes","items":[
       {"id":"sk_h1","name":"Black Truffle Ramen","description":"Rich tonkotsu broth, black truffle oil, ajitsuke tamago","price":28.0,"image":"https://images.pexels.com/photos/884600/pexels-photo-884600.jpeg?w=300","is_available":True,"is_popular":True,"dietary":[]},
       {"id":"sk_h2","name":"Wagyu Gyoza (6pc)","description":"Pan-fried wagyu dumplings, ponzu dipping","price":18.0,"image":"https://images.pexels.com/photos/5718072/pexels-photo-5718072.jpeg?w=300","is_available":True,"is_popular":False,"dietary":[]},
     ]},
     {"id":"sk_d","name":"Desserts","items":[
       {"id":"sk_d1","name":"Mochi Ice Cream (3pc)","description":"Matcha, mango, strawberry mochi","price":12.0,"image":"https://images.pexels.com/photos/6546024/pexels-photo-6546024.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["vegetarian","gluten_free"]},
     ]},
   ]},
  {"name":"Burger & Co.","cuisine":["American","Burgers"],
   "description":"Craft burgers made with 200g grass-fed beef patties, fresh-baked buns, and secret house sauces.",
   "image":"https://images.pexels.com/photos/109400/pexels-photo-109400.jpeg?w=400",
   "cover_image":"https://images.unsplash.com/photo-1611309454921-16cef3438ee0?w=800&q=80",
   "rating":4.7,"review_count":893,"delivery_time":"20-30 min","delivery_fee":1.99,
   "min_order":15.0,"price_range":"$$","tags":["Burgers","Fast Food","Popular"],
   "menu_categories":[
     {"id":"bc_b","name":"Signature Burgers","items":[
       {"id":"bc_b1","name":"Classic Smash","description":"Double smashed patty, American cheese, special sauce","price":14.0,"image":"https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?w=300","is_available":True,"is_popular":True,"dietary":[]},
       {"id":"bc_b2","name":"BBQ Bacon Beast","description":"Triple patty, crispy bacon, BBQ sauce, jalapeño","price":20.0,"image":"https://images.unsplash.com/photo-1611309454921-16cef3438ee0?w=300&q=80","is_available":True,"is_popular":True,"dietary":[]},
       {"id":"bc_b3","name":"Truffle Mushroom","description":"Single patty, truffle aioli, sautéed mushrooms","price":18.0,"image":"https://images.pexels.com/photos/109400/pexels-photo-109400.jpeg?w=300","is_available":True,"is_popular":False,"dietary":[]},
       {"id":"bc_b4","name":"Vegan Black Bean","description":"Black bean patty, avocado, chipotle mayo","price":16.0,"image":"https://images.pexels.com/photos/1351238/pexels-photo-1351238.jpeg?w=300","is_available":True,"is_popular":False,"dietary":["vegan","gluten_free"]},
     ]},
     {"id":"bc_s","name":"Sides","items":[
       {"id":"bc_s1","name":"Truffle Parmesan Fries","description":"Crispy fries, truffle oil, grated parmesan","price":8.0,"image":"https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["vegetarian","gluten_free"]},
       {"id":"bc_s2","name":"Onion Rings (8pc)","description":"Beer-battered crispy onion rings","price":6.0,"image":"https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?w=300","is_available":True,"is_popular":False,"dietary":["vegetarian"]},
     ]},
     {"id":"bc_dr","name":"Drinks","items":[
       {"id":"bc_dr1","name":"Vanilla Milkshake","description":"Hand-spun premium vanilla milkshake","price":7.0,"image":"https://images.pexels.com/photos/103566/pexels-photo-103566.jpeg?w=300","is_available":True,"is_popular":False,"dietary":["vegetarian"]},
     ]},
   ]},
  {"name":"Spice Route","cuisine":["Indian","North Indian"],
   "description":"Authentic North Indian cuisine. Every spice blend is house-made from whole spices ground daily.",
   "image":"https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?w=400",
   "cover_image":"https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?w=800",
   "rating":4.6,"review_count":421,"delivery_time":"35-45 min","delivery_fee":2.49,
   "min_order":20.0,"price_range":"$$","tags":["Indian","Spicy","Vegetarian Friendly"],
   "menu_categories":[
     {"id":"sr_t","name":"Tandoor Specials","items":[
       {"id":"sr_t1","name":"Chicken Tikka (6pc)","description":"Tandoor marinated chicken, mint chutney","price":16.0,"image":"https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["gluten_free"]},
       {"id":"sr_t2","name":"Paneer Tikka (6pc)","description":"Smoky cottage cheese, bell peppers, spices","price":14.0,"image":"https://images.pexels.com/photos/9609853/pexels-photo-9609853.jpeg?w=300","is_available":True,"is_popular":False,"dietary":["vegetarian","gluten_free"]},
     ]},
     {"id":"sr_c","name":"Curries","items":[
       {"id":"sr_c1","name":"Butter Chicken","description":"Slow-cooked chicken, rich tomato-cream sauce","price":18.0,"image":"https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["gluten_free"]},
       {"id":"sr_c2","name":"Dal Makhani","description":"Black lentils, slow cooked 24hrs, cream, butter","price":14.0,"image":"https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["vegetarian","gluten_free"]},
       {"id":"sr_c3","name":"Lamb Rogan Josh","description":"Tender lamb, Kashmiri spices, aromatic gravy","price":22.0,"image":"https://images.pexels.com/photos/3590401/pexels-photo-3590401.jpeg?w=300","is_available":True,"is_popular":False,"dietary":["gluten_free"]},
     ]},
     {"id":"sr_br","name":"Breads & Rice","items":[
       {"id":"sr_br1","name":"Garlic Naan","description":"Tandoor bread with garlic & butter","price":4.0,"image":"https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?w=300","is_available":True,"is_popular":False,"dietary":["vegetarian"]},
       {"id":"sr_br2","name":"Lamb Biryani","description":"Aged basmati, saffron, whole spices, dum cooked","price":24.0,"image":"https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["gluten_free"]},
     ]},
   ]},
  {"name":"La Bella Italia","cuisine":["Italian","Pizza","Pasta"],
   "description":"Handcrafted pasta and Neapolitan pizzas baked in a 450°C wood-fired oven, imported from Naples.",
   "image":"https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?w=400",
   "cover_image":"https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=800",
   "rating":4.7,"review_count":634,"delivery_time":"30-40 min","delivery_fee":2.99,
   "min_order":20.0,"price_range":"$$$","tags":["Italian","Pizza","Pasta","Romantic"],
   "menu_categories":[
     {"id":"li_a","name":"Antipasti","items":[
       {"id":"li_a1","name":"Burrata Pugliese","description":"Fresh burrata, San Marzano tomato, basil oil","price":16.0,"image":"https://images.pexels.com/photos/5939411/pexels-photo-5939411.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["vegetarian","gluten_free"]},
       {"id":"li_a2","name":"Prosciutto e Melone","description":"18-month DOP prosciutto, cantaloupe melon","price":18.0,"image":"https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?w=300","is_available":True,"is_popular":False,"dietary":["gluten_free"]},
     ]},
     {"id":"li_pa","name":"Pasta","items":[
       {"id":"li_pa1","name":"Spaghetti Carbonara","description":"Free-range eggs, guanciale, pecorino romano","price":22.0,"image":"https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg?w=300","is_available":True,"is_popular":True,"dietary":[]},
       {"id":"li_pa2","name":"Black Truffle Tagliatelle","description":"Fresh egg pasta, black truffle, parmigiano","price":32.0,"image":"https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["vegetarian"]},
       {"id":"li_pa3","name":"Seafood Linguine","description":"Clams, mussels, prawns, white wine, garlic","price":28.0,"image":"https://images.pexels.com/photos/2093051/pexels-photo-2093051.jpeg?w=300","is_available":True,"is_popular":False,"dietary":[]},
     ]},
     {"id":"li_pz","name":"Pizzas","items":[
       {"id":"li_pz1","name":"Margherita DOC","description":"San Marzano, fior di latte, fresh basil","price":18.0,"image":"https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["vegetarian"]},
       {"id":"li_pz2","name":"Black Truffle & Mushroom","description":"Truffle cream, mixed mushrooms, fontina","price":28.0,"image":"https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?w=300","is_available":True,"is_popular":True,"dietary":["vegetarian"]},
       {"id":"li_pz3","name":"Nduja & Honey","description":"Spicy nduja, stracciatella, wildflower honey","price":24.0,"image":"https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?w=300","is_available":True,"is_popular":False,"dietary":[]},
     ]},
   ]},
]

async def seed_all():
    async with AsyncSessionLocal() as session:
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # Admin user
        res = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        if not res.scalar_one_or_none():
            uid = f"user_{uuid.uuid4().hex[:12]}"
            session.add(User(
                user_id=uid, email=ADMIN_EMAIL, name="Admin",
                password_hash=hp(ADMIN_PASS), role="admin",
                phone="", picture=""
            ))

        # Test user
        res = await session.execute(select(User).where(User.email == "user@delight.com"))
        if not res.scalar_one_or_none():
            uid = f"user_{uuid.uuid4().hex[:12]}"
            session.add(User(
                user_id=uid, email="user@delight.com", name="Test User",
                password_hash=hp("user123"), role="user",
                phone="", picture=""
            ))

        # Restaurants
        res = await session.execute(select(func.count(Restaurant.id)))
        count = res.scalar()
        if count == 0:
            for r in RESTAURANTS_SEED:
                session.add(Restaurant(
                    id=str(uuid.uuid4()),
                    name=r["name"], cuisine=r["cuisine"],
                    description=r["description"], image=r["image"],
                    cover_image=r["cover_image"], rating=r["rating"],
                    review_count=r["review_count"], delivery_time=r["delivery_time"],
                    delivery_fee=r["delivery_fee"], min_order=r["min_order"],
                    price_range=r["price_range"], tags=r["tags"],
                    is_active=True, menu_categories=r["menu_categories"]
                ))
        await session.commit()
    print("✅ Seeding complete (PostgreSQL)")

# ── App Setup ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_all()
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

# ── AUTH ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register(body: RegisterReq):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.email == body.email.lower()))
        if res.scalar_one_or_none():
            raise HTTPException(400, "Email already registered")
        uid = f"user_{uuid.uuid4().hex[:12]}"
        user = User(
            user_id=uid, email=body.email.lower(), name=body.name,
            password_hash=hp(body.password), role="user", phone="", picture=""
        )
        session.add(user)
        await session.commit()
    token = make_token(uid, body.email.lower(), "user")
    return {"token": token, "user": {"user_id": uid, "email": body.email.lower(), "name": body.name, "role": "user", "picture": ""}}

@app.post("/api/auth/login")
async def login(body: LoginReq):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.email == body.email.lower()))
        user = res.scalar_one_or_none()
    if not user or not vp(body.password, user.password_hash or ""):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user.user_id, user.email, user.role)
    return {"token": token, "user": fmt_user(user)}

@app.get("/api/auth/me")
async def me(u=Depends(current_user)):
    return u

@app.post("/api/auth/google")
async def google_auth(body: GoogleReq):
    try:
        resp = http_req.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id}, timeout=10)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        raise HTTPException(400, f"Google auth failed: {e}")
    email = data["email"].lower()
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.email == email))
        existing = res.scalar_one_or_none()
        if existing:
            token = make_token(existing.user_id, email, existing.role)
            return {"token": token, "user": fmt_user(existing)}
        uid = f"user_{uuid.uuid4().hex[:12]}"
        user = User(
            user_id=uid, email=email, name=data.get("name", ""),
            picture=data.get("picture", ""), role="user",
            phone="", password_hash=""
        )
        session.add(user)
        await session.commit()
    token = make_token(uid, email, "user")
    return {"token": token, "user": {"user_id": uid, "email": email, "name": data.get("name",""), "role": "user", "picture": data.get("picture","")}}

# ── RESTAURANTS ───────────────────────────────────────────────────────────────
@app.get("/api/restaurants")
async def get_restaurants(
    search: str = "", cuisine: str = "", min_rating: float = 0,
    price_range: str = "", dietary: str = ""
):
    async with AsyncSessionLocal() as session:
        query = select(Restaurant).where(Restaurant.is_active == True)
        if search:
            query = query.where(Restaurant.name.ilike(f'%{search}%'))
        if cuisine:
            query = query.where(
                func.cast(Restaurant.cuisine, String).ilike(f'%{cuisine}%')
            )
        if min_rating > 0:
            query = query.where(Restaurant.rating >= min_rating)
        if price_range:
            query = query.where(Restaurant.price_range == price_range)
        result = await session.execute(query)
        restaurants = result.scalars().all()
    
    rlist = [model_to_dict(r) for r in restaurants]
    
    # Dietary filter: filter menu items if dietary param is given
    if dietary:
        filtered = []
        for r in rlist:
            cats = r.get("menu_categories", [])
            has_items = False
            for cat in cats:
                for item in cat.get("items", []):
                    if dietary in item.get("dietary", []):
                        has_items = True
                        break
                if has_items:
                    break
            if has_items:
                filtered.append(r)
        return filtered
    
    return rlist

@app.get("/api/restaurants/{rid}")
async def get_restaurant(rid: str):
    async with AsyncSessionLocal() as session:
        r = await session.get(Restaurant, rid)
    if not r:
        raise HTTPException(404, "Restaurant not found")
    return model_to_dict(r)

# ── SEARCH ────────────────────────────────────────────────────────────────────
@app.get("/api/search")
async def unified_search(q: str = ""):
    if not q:
        return {"restaurants": [], "menu_items": []}
    async with AsyncSessionLocal() as session:
        # Search restaurants by name
        res = await session.execute(
            select(Restaurant).where(
                Restaurant.is_active == True,
                Restaurant.name.ilike(f'%{q}%')
            ).limit(5)
        )
        rest_results = [model_to_dict(r) for r in res.scalars().all()]

        # Search menu items across all restaurants
        res2 = await session.execute(
            select(Restaurant).where(Restaurant.is_active == True)
        )
        all_restaurants = res2.scalars().all()

    menu_hits = []
    q_lower = q.lower()
    for r in all_restaurants:
        r_dict = model_to_dict(r)
        for cat in r_dict.get("menu_categories", []):
            for item in cat.get("items", []):
                if q_lower in item.get("name", "").lower() or q_lower in item.get("description", "").lower():
                    menu_hits.append({
                        "item": item,
                        "restaurant_id": r_dict["id"],
                        "restaurant_name": r_dict["name"],
                        "restaurant_image": r_dict["image"],
                        "category": cat.get("name", ""),
                    })
                    if len(menu_hits) >= 10:
                        break
            if len(menu_hits) >= 10:
                break

    return {"restaurants": rest_results, "menu_items": menu_hits}

# ── CART ──────────────────────────────────────────────────────────────────────
def cart_response(cart: Cart) -> dict:
    if not cart:
        return {"user_id": "", "restaurant_id": None, "restaurant_name": "", "restaurant_image": "", "items": []}
    d = model_to_dict(cart)
    return d

@app.get("/api/cart")
async def get_cart(u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Cart).where(Cart.user_id == u["user_id"]))
        cart = res.scalar_one_or_none()
    return cart_response(cart) or {"user_id": u["user_id"], "restaurant_id": None, "restaurant_name": "", "restaurant_image": "", "items": []}

@app.post("/api/cart/items")
async def add_to_cart(body: CartItemReq, u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Cart).where(Cart.user_id == u["user_id"]))
        cart = res.scalar_one_or_none()

        if cart and cart.restaurant_id and cart.restaurant_id != body.restaurant_id and cart.items:
            raise HTTPException(400, "Cart has items from another restaurant. Clear cart first.")

        if not cart:
            cart = Cart(
                id=str(uuid.uuid4()),
                user_id=u["user_id"],
                restaurant_id=body.restaurant_id,
                restaurant_name=body.restaurant_name,
                restaurant_image=body.restaurant_image,
                items=[]
            )
            session.add(cart)
            await session.flush()

        items = list(cart.items or [])
        existing = next((i for i in items if i.get("item_id") == body.item_id), None)
        if existing:
            existing["quantity"] += body.quantity
        else:
            items.append({
                "item_id": body.item_id, "name": body.name,
                "price": body.price, "quantity": body.quantity, "image": body.image
            })

        cart.items = items
        cart.restaurant_id = body.restaurant_id
        cart.restaurant_name = body.restaurant_name
        cart.restaurant_image = body.restaurant_image
        cart.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(cart)
    return cart_response(cart)

@app.put("/api/cart/items/{item_id}")
async def update_cart_item(item_id: str, body: UpdateQtyReq, u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Cart).where(Cart.user_id == u["user_id"]))
        cart = res.scalar_one_or_none()
        if not cart:
            raise HTTPException(404, "Cart not found")
        items = list(cart.items or [])
        if body.quantity <= 0:
            items = [i for i in items if i.get("item_id") != item_id]
        else:
            for i in items:
                if i.get("item_id") == item_id:
                    i["quantity"] = body.quantity
        cart.items = items
        cart.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(cart)
    return cart_response(cart)

@app.delete("/api/cart/items/{item_id}")
async def remove_cart_item(item_id: str, u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Cart).where(Cart.user_id == u["user_id"]))
        cart = res.scalar_one_or_none()
        if not cart:
            raise HTTPException(404, "Cart not found")
        cart.items = [i for i in (cart.items or []) if i.get("item_id") != item_id]
        cart.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(cart)
    return cart_response(cart)

@app.delete("/api/cart")
async def clear_cart(u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Cart).where(Cart.user_id == u["user_id"]))
        cart = res.scalar_one_or_none()
        if cart:
            cart.items = []
            cart.restaurant_id = None
            cart.restaurant_name = ""
            cart.restaurant_image = ""
            cart.updated_at = datetime.now(timezone.utc)
            await session.commit()
    return {"message": "Cart cleared"}

# ── ORDERS ────────────────────────────────────────────────────────────────────
STATUSES = ["pending", "confirmed", "preparing", "out_for_delivery", "delivered"]

@app.post("/api/orders")
async def place_order(body: OrderReq, u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Cart).where(Cart.user_id == u["user_id"]))
        cart = res.scalar_one_or_none()
        if not cart or not cart.items:
            raise HTTPException(400, "Cart is empty")

        items = list(cart.items)
        subtotal = sum(i["price"] * i["quantity"] for i in items)

        delivery_fee = 2.99
        if cart.restaurant_id:
            r = await session.get(Restaurant, cart.restaurant_id)
            if r:
                delivery_fee = r.delivery_fee

        order_num = f"DLT-{str(uuid.uuid4().int)[:6]}"
        order = Order(
            id=str(uuid.uuid4()),
            order_number=order_num,
            user_id=u["user_id"], user_name=u.get("name", ""), user_email=u.get("email", ""),
            restaurant_id=cart.restaurant_id, restaurant_name=cart.restaurant_name,
            restaurant_image=cart.restaurant_image,
            items=items, subtotal=round(subtotal, 2),
            delivery_fee=delivery_fee, total=round(subtotal + delivery_fee, 2),
            status="pending", delivery_address=body.delivery_address,
            payment_method=body.payment_method, estimated_delivery="35-45 min"
        )
        session.add(order)

        # Clear cart
        cart.items = []
        cart.restaurant_id = None
        cart.restaurant_name = ""
        cart.restaurant_image = ""
        cart.updated_at = datetime.now(timezone.utc)

        await session.commit()
        await session.refresh(order)
    return model_to_dict(order)

@app.get("/api/orders")
async def get_orders(u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(Order).where(Order.user_id == u["user_id"])
            .order_by(Order.created_at.desc()).limit(50)
        )
        orders = res.scalars().all()
    return [model_to_dict(o) for o in orders]

@app.get("/api/orders/{oid}")
async def get_order(oid: str, u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(Order).where(Order.id == oid, Order.user_id == u["user_id"])
        )
        order = res.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    return model_to_dict(order)

# ── CHAT ──────────────────────────────────────────────────────────────────────
CHAT_SYSTEM = """You are Delight's AI support agent — friendly, professional, and concise. 
Help users with: order status, restaurant info, delivery issues, menu questions, refunds. 
Keep responses short (2-3 sentences max). Always be warm and helpful. 
If you don't know something specific, offer to connect with a human agent."""

@app.post("/api/chat")
async def chat(body: ChatReq, u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == body.session_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(20)
        )
        history = res.scalars().all()

    history_ctx = "\n".join([f"{m.role.upper()}: {m.content}" for m in history[-10:]])
    sys_msg = CHAT_SYSTEM + (f"\n\nConversation so far:\n{history_ctx}" if history_ctx else "")

    if not LLM_KEY:
        return {"response": "AI support is temporarily unavailable. Please contact us at support@delight.com"}

    try:
        chat_inst = LlmChat(
            api_key=LLM_KEY, session_id=body.session_id, system_message=sys_msg
        ).with_model("anthropic", "claude-haiku-4-5-20251001")
        resp = await chat_inst.send_message(UserMessage(text=body.message))
        now = datetime.now(timezone.utc)
        async with AsyncSessionLocal() as session:
            session.add(ChatMessage(
                id=str(uuid.uuid4()), session_id=body.session_id,
                user_id=u["user_id"], role="user", content=body.message, created_at=now
            ))
            session.add(ChatMessage(
                id=str(uuid.uuid4()), session_id=body.session_id,
                user_id=u["user_id"], role="assistant", content=resp, created_at=now
            ))
            await session.commit()
        return {"response": resp}
    except Exception as e:
        return {"response": "I'm having trouble connecting right now. Please try again shortly."}

@app.get("/api/chat/history/{session_id}")
async def chat_history(session_id: str, u=Depends(current_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
            .limit(100)
        )
        msgs = res.scalars().all()
    return [model_to_dict(m) for m in msgs]

# ── ADMIN ─────────────────────────────────────────────────────────────────────
@app.get("/api/admin/restaurants")
async def admin_restaurants(_u=Depends(admin_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Restaurant))
        items = res.scalars().all()
    return [model_to_dict(r) for r in items]

@app.post("/api/admin/restaurants")
async def admin_create_restaurant(body: RestaurantReq, _u=Depends(admin_user)):
    async with AsyncSessionLocal() as session:
        r = Restaurant(
            id=str(uuid.uuid4()),
            name=body.name, cuisine=body.cuisine, description=body.description,
            image=body.image, cover_image=body.cover_image, rating=body.rating,
            review_count=body.review_count, delivery_time=body.delivery_time,
            delivery_fee=body.delivery_fee, min_order=body.min_order,
            price_range=body.price_range, tags=body.tags,
            is_active=True, menu_categories=body.menu_categories
        )
        session.add(r)
        await session.commit()
        await session.refresh(r)
    return model_to_dict(r)

@app.put("/api/admin/restaurants/{rid}")
async def admin_update_restaurant(rid: str, body: RestaurantReq, _u=Depends(admin_user)):
    async with AsyncSessionLocal() as session:
        r = await session.get(Restaurant, rid)
        if not r:
            raise HTTPException(404, "Restaurant not found")
        for k, v in body.dict().items():
            setattr(r, k, v)
        await session.commit()
        await session.refresh(r)
    return model_to_dict(r)

@app.delete("/api/admin/restaurants/{rid}")
async def admin_delete_restaurant(rid: str, _u=Depends(admin_user)):
    async with AsyncSessionLocal() as session:
        r = await session.get(Restaurant, rid)
        if r:
            await session.delete(r)
            await session.commit()
    return {"message": "Deleted"}

@app.get("/api/admin/orders")
async def admin_orders(_u=Depends(admin_user)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(Order).order_by(Order.created_at.desc()).limit(100)
        )
        orders = res.scalars().all()
    return [model_to_dict(o) for o in orders]

@app.put("/api/admin/orders/{oid}/status")
async def admin_update_order(oid: str, body: StatusReq, _u=Depends(admin_user)):
    if body.status not in STATUSES + ["cancelled"]:
        raise HTTPException(400, "Invalid status")
    async with AsyncSessionLocal() as session:
        order = await session.get(Order, oid)
        if not order:
            raise HTTPException(404, "Order not found")
        order.status = body.status
        order.updated_at = datetime.now(timezone.utc)
        await session.commit()
        await session.refresh(order)
    return model_to_dict(order)

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "Delight", "db": "PostgreSQL"}
