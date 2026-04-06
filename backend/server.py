from dotenv import load_dotenv
load_dotenv()

import os, uuid, bcrypt, jwt, requests as http_req
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from emergentintegrations.llm.chat import LlmChat, UserMessage

# ── Config ──────────────────────────────────────────────────────────────────
MONGO_URL       = os.environ["MONGO_URL"]
DB_NAME         = os.environ.get("DB_NAME", "delight_db")
JWT_SECRET      = os.environ.get("JWT_SECRET", "delight-secret-2024")
JWT_ALG         = "HS256"
ADMIN_EMAIL     = os.environ.get("ADMIN_EMAIL", "admin@delight.com")
ADMIN_PASSWORD  = os.environ.get("ADMIN_PASSWORD", "admin123")
LLM_KEY         = os.environ.get("EMERGENT_LLM_KEY", "")
FRONTEND_URL    = os.environ.get("FRONTEND_URL", "*")

# ── DB ───────────────────────────────────────────────────────────────────────
_client = AsyncIOMotorClient(MONGO_URL)
db = _client[DB_NAME]

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

def doc(d: dict) -> dict:
    d.pop("_id", None); d.pop("password_hash", None); return d

async def current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(authorization[7:], JWT_SECRET, algorithms=[JWT_ALG])
        u = await db.users.find_one({"user_id": p["sub"]}, {"_id": 0, "password_hash": 0})
        if not u: raise HTTPException(401, "User not found")
        return u
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:     raise HTTPException(401, "Invalid token")

async def admin_user(u=Depends(current_user)):
    if u.get("role") != "admin": raise HTTPException(403, "Admin only")
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

# ── App Setup ─────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await seed_all()
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

# ── Seed Data ─────────────────────────────────────────────────────────────────
RESTAURANTS = [
  {"name":"The Black Pearl","cuisine":["Fine Dining","European"],
   "description":"An exquisite fine dining experience in the heart of the city. Curated tasting menus, rare wines, and impeccable service.",
   "image":"https://images.unsplash.com/photo-1766832255363-c9f060ade8b0?w=400&q=80",
   "cover_image":"https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=80",
   "rating":4.9,"review_count":347,"delivery_time":"40-55 min","delivery_fee":5.99,
   "min_order":50.0,"price_range":"$$$$","tags":["Fine Dining","Romantic","Award Winning"],
   "menu_categories":[
     {"id":"bp_s","name":"Starters","items":[
       {"id":"bp_s1","name":"Black Truffle Bruschetta","description":"House bread, black truffle, aged parmesan","price":18.0,"image":"https://images.pexels.com/photos/1117452/pexels-photo-1117452.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"bp_s2","name":"Seared Foie Gras","description":"Pan seared foie gras, brioche, fig compote","price":28.0,"image":"https://images.pexels.com/photos/299347/pexels-photo-299347.jpeg?w=300","is_available":True,"is_popular":False},
       {"id":"bp_s3","name":"Burrata Caprese","description":"Fresh burrata, heirloom tomatoes, basil oil","price":16.0,"image":"https://images.pexels.com/photos/5939411/pexels-photo-5939411.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"bp_m","name":"Mains","items":[
       {"id":"bp_m1","name":"Wagyu Beef Tenderloin","description":"A5 Wagyu, roasted bone marrow, truffle jus","price":89.0,"image":"https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"bp_m2","name":"Pan Seared Sea Bass","description":"Chilean sea bass, saffron cream, micro herbs","price":55.0,"image":"https://images.unsplash.com/photo-1565686481561-d8ceaa689e01?w=300&q=80","is_available":True,"is_popular":True},
       {"id":"bp_m3","name":"Roasted Duck Confit","description":"Duck leg confit, cherry sauce, dauphinois","price":48.0,"image":"https://images.pexels.com/photos/2673353/pexels-photo-2673353.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"bp_d","name":"Desserts","items":[
       {"id":"bp_d1","name":"Chocolate Fondant","description":"Valrhona dark chocolate, vanilla ice cream","price":14.0,"image":"https://images.pexels.com/photos/3026804/pexels-photo-3026804.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"bp_d2","name":"Crème Brûlée","description":"Classic vanilla bean, caramelised sugar","price":12.0,"image":"https://images.pexels.com/photos/3625372/pexels-photo-3625372.jpeg?w=300","is_available":True,"is_popular":False},
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
       {"id":"sk_su1","name":"Salmon Sashimi (8pc)","description":"Premium Atlantic salmon, wasabi, gari","price":24.0,"image":"https://images.unsplash.com/photo-1774635804786-5ebb8f88dcdf?w=300&q=80","is_available":True,"is_popular":True},
       {"id":"sk_su2","name":"Spicy Tuna Roll (8pc)","description":"Spicy tuna, cucumber, sriracha mayo","price":18.0,"image":"https://images.unsplash.com/photo-1617196034183-421b4040ed20?w=300&q=80","is_available":True,"is_popular":True},
       {"id":"sk_su3","name":"Omakase Platter","description":"Chef selection 15pc premium sushi","price":65.0,"image":"https://images.pexels.com/photos/2323398/pexels-photo-2323398.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"sk_h","name":"Hot Dishes","items":[
       {"id":"sk_h1","name":"Black Truffle Ramen","description":"Rich tonkotsu broth, black truffle oil, ajitsuke tamago","price":28.0,"image":"https://images.pexels.com/photos/884600/pexels-photo-884600.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"sk_h2","name":"Wagyu Gyoza (6pc)","description":"Pan-fried wagyu dumplings, ponzu dipping","price":18.0,"image":"https://images.pexels.com/photos/5718072/pexels-photo-5718072.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"sk_d","name":"Desserts","items":[
       {"id":"sk_d1","name":"Mochi Ice Cream (3pc)","description":"Matcha, mango, strawberry mochi","price":12.0,"image":"https://images.pexels.com/photos/6546024/pexels-photo-6546024.jpeg?w=300","is_available":True,"is_popular":True},
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
       {"id":"bc_b1","name":"Classic Smash","description":"Double smashed patty, American cheese, special sauce","price":14.0,"image":"https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"bc_b2","name":"BBQ Bacon Beast","description":"Triple patty, crispy bacon, BBQ sauce, jalapeño","price":20.0,"image":"https://images.unsplash.com/photo-1611309454921-16cef3438ee0?w=300&q=80","is_available":True,"is_popular":True},
       {"id":"bc_b3","name":"Truffle Mushroom","description":"Single patty, truffle aioli, sautéed mushrooms","price":18.0,"image":"https://images.pexels.com/photos/109400/pexels-photo-109400.jpeg?w=300","is_available":True,"is_popular":False},
       {"id":"bc_b4","name":"Vegan Black Bean","description":"Black bean patty, avocado, chipotle mayo","price":16.0,"image":"https://images.pexels.com/photos/1351238/pexels-photo-1351238.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"bc_s","name":"Sides","items":[
       {"id":"bc_s1","name":"Truffle Parmesan Fries","description":"Crispy fries, truffle oil, grated parmesan","price":8.0,"image":"https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"bc_s2","name":"Onion Rings (8pc)","description":"Beer-battered crispy onion rings","price":6.0,"image":"https://images.pexels.com/photos/2983101/pexels-photo-2983101.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"bc_dr","name":"Drinks","items":[
       {"id":"bc_dr1","name":"Vanilla Milkshake","description":"Hand-spun premium vanilla milkshake","price":7.0,"image":"https://images.pexels.com/photos/103566/pexels-photo-103566.jpeg?w=300","is_available":True,"is_popular":False},
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
       {"id":"sr_t1","name":"Chicken Tikka (6pc)","description":"Tandoor marinated chicken, mint chutney","price":16.0,"image":"https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"sr_t2","name":"Paneer Tikka (6pc)","description":"Smoky cottage cheese, bell peppers, spices","price":14.0,"image":"https://images.pexels.com/photos/9609853/pexels-photo-9609853.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"sr_c","name":"Curries","items":[
       {"id":"sr_c1","name":"Butter Chicken","description":"Slow-cooked chicken, rich tomato-cream sauce","price":18.0,"image":"https://images.pexels.com/photos/2474661/pexels-photo-2474661.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"sr_c2","name":"Dal Makhani","description":"Black lentils, slow cooked 24hrs, cream, butter","price":14.0,"image":"https://images.pexels.com/photos/5560763/pexels-photo-5560763.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"sr_c3","name":"Lamb Rogan Josh","description":"Tender lamb, Kashmiri spices, aromatic gravy","price":22.0,"image":"https://images.pexels.com/photos/3590401/pexels-photo-3590401.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"sr_br","name":"Breads & Rice","items":[
       {"id":"sr_br1","name":"Garlic Naan","description":"Tandoor bread with garlic & butter","price":4.0,"image":"https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?w=300","is_available":True,"is_popular":False},
       {"id":"sr_br2","name":"Lamb Biryani","description":"Aged basmati, saffron, whole spices, dum cooked","price":24.0,"image":"https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg?w=300","is_available":True,"is_popular":True},
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
       {"id":"li_a1","name":"Burrata Pugliese","description":"Fresh burrata, San Marzano tomato, basil oil","price":16.0,"image":"https://images.pexels.com/photos/5939411/pexels-photo-5939411.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"li_a2","name":"Prosciutto e Melone","description":"18-month DOP prosciutto, cantaloupe melon","price":18.0,"image":"https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"li_pa","name":"Pasta","items":[
       {"id":"li_pa1","name":"Spaghetti Carbonara","description":"Free-range eggs, guanciale, pecorino romano","price":22.0,"image":"https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"li_pa2","name":"Black Truffle Tagliatelle","description":"Fresh egg pasta, black truffle, parmigiano","price":32.0,"image":"https://images.pexels.com/photos/1437267/pexels-photo-1437267.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"li_pa3","name":"Seafood Linguine","description":"Clams, mussels, prawns, white wine, garlic","price":28.0,"image":"https://images.pexels.com/photos/2093051/pexels-photo-2093051.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
     {"id":"li_pz","name":"Pizzas","items":[
       {"id":"li_pz1","name":"Margherita DOC","description":"San Marzano, fior di latte, fresh basil","price":18.0,"image":"https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"li_pz2","name":"Black Truffle & Mushroom","description":"Truffle cream, mixed mushrooms, fontina","price":28.0,"image":"https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?w=300","is_available":True,"is_popular":True},
       {"id":"li_pz3","name":"Nduja & Honey","description":"Spicy nduja, stracciatella, wildflower honey","price":24.0,"image":"https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?w=300","is_available":True,"is_popular":False},
     ]},
   ]},
]

async def seed_all():
    # Admin user
    admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if not admin:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": ADMIN_EMAIL, "name": "Admin",
            "password_hash": hp(ADMIN_PASSWORD), "role": "admin",
            "phone": "", "picture": "", "created_at": datetime.now(timezone.utc)
        })
    # Test user
    test_user = await db.users.find_one({"email": "user@delight.com"})
    if not test_user:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": "user@delight.com", "name": "Test User",
            "password_hash": hp("user123"), "role": "user",
            "phone": "", "picture": "", "created_at": datetime.now(timezone.utc)
        })
    # Restaurants
    count = await db.restaurants.count_documents({})
    if count == 0:
        for r in RESTAURANTS:
            r["is_active"] = True
            r["created_at"] = datetime.now(timezone.utc)
            await db.restaurants.insert_one(r)
    print("✅ Seeding complete")

def fmt_restaurant(r: dict) -> dict:
    r["id"] = str(r.pop("_id"))
    return r

# ── AUTH ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register(body: RegisterReq):
    if await db.users.find_one({"email": body.email.lower()}):
        raise HTTPException(400, "Email already registered")
    uid = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": uid, "email": body.email.lower(), "name": body.name,
        "password_hash": hp(body.password), "role": "user",
        "phone": "", "picture": "", "created_at": datetime.now(timezone.utc)
    })
    token = make_token(uid, body.email.lower(), "user")
    return {"token": token, "user": {"user_id": uid, "email": body.email.lower(), "name": body.name, "role": "user", "picture": ""}}

@app.post("/api/auth/login")
async def login(body: LoginReq):
    u = await db.users.find_one({"email": body.email.lower()})
    if not u or not vp(body.password, u.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(u["user_id"], u["email"], u["role"])
    return {"token": token, "user": doc(dict(u))}

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
    existing = await db.users.find_one({"email": email}, {"_id": 0, "password_hash": 0})
    if existing:
        token = make_token(existing["user_id"], email, existing["role"])
        return {"token": token, "user": existing}
    uid = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": uid, "email": email, "name": data.get("name", ""),
        "picture": data.get("picture", ""), "role": "user",
        "phone": "", "password_hash": "", "created_at": datetime.now(timezone.utc)
    })
    token = make_token(uid, email, "user")
    return {"token": token, "user": {"user_id": uid, "email": email, "name": data.get("name",""), "role": "user", "picture": data.get("picture","")}}

# ── RESTAURANTS ───────────────────────────────────────────────────────────────
@app.get("/api/restaurants")
async def get_restaurants(search: str = "", cuisine: str = "", min_rating: float = 0, price_range: str = ""):
    q: dict = {"is_active": True}
    if search: q["name"] = {"$regex": search, "$options": "i"}
    if cuisine: q["cuisine"] = {"$regex": cuisine, "$options": "i"}
    if min_rating > 0: q["rating"] = {"$gte": min_rating}
    if price_range: q["price_range"] = price_range
    items = await db.restaurants.find(q).to_list(100)
    return [fmt_restaurant(r) for r in items]

@app.get("/api/restaurants/{rid}")
async def get_restaurant(rid: str):
    r = await db.restaurants.find_one({"_id": ObjectId(rid)})
    if not r: raise HTTPException(404, "Restaurant not found")
    return fmt_restaurant(r)

# ── CART ──────────────────────────────────────────────────────────────────────
@app.get("/api/cart")
async def get_cart(u=Depends(current_user)):
    cart = await db.carts.find_one({"user_id": u["user_id"]}, {"_id": 0})
    return cart or {"user_id": u["user_id"], "restaurant_id": None, "restaurant_name": "", "restaurant_image": "", "items": []}

@app.post("/api/cart/items")
async def add_to_cart(body: CartItemReq, u=Depends(current_user)):
    cart = await db.carts.find_one({"user_id": u["user_id"]})
    if cart and cart.get("restaurant_id") and cart["restaurant_id"] != body.restaurant_id and cart.get("items"):
        raise HTTPException(400, "Cart has items from another restaurant. Clear cart first.")
    if not cart:
        await db.carts.insert_one({"user_id": u["user_id"], "restaurant_id": body.restaurant_id,
            "restaurant_name": body.restaurant_name, "restaurant_image": body.restaurant_image,
            "items": [], "updated_at": datetime.now(timezone.utc)})
        cart = await db.carts.find_one({"user_id": u["user_id"]})
    items = cart.get("items", [])
    existing = next((i for i in items if i["item_id"] == body.item_id), None)
    if existing:
        existing["quantity"] += body.quantity
    else:
        items.append({"item_id": body.item_id, "name": body.name, "price": body.price,
                      "quantity": body.quantity, "image": body.image})
    await db.carts.update_one({"user_id": u["user_id"]},
        {"$set": {"items": items, "restaurant_id": body.restaurant_id,
                  "restaurant_name": body.restaurant_name, "restaurant_image": body.restaurant_image,
                  "updated_at": datetime.now(timezone.utc)}})
    updated = await db.carts.find_one({"user_id": u["user_id"]}, {"_id": 0})
    return updated

@app.put("/api/cart/items/{item_id}")
async def update_cart_item(item_id: str, body: UpdateQtyReq, u=Depends(current_user)):
    cart = await db.carts.find_one({"user_id": u["user_id"]})
    if not cart: raise HTTPException(404, "Cart not found")
    items = cart.get("items", [])
    if body.quantity <= 0:
        items = [i for i in items if i["item_id"] != item_id]
    else:
        for i in items:
            if i["item_id"] == item_id: i["quantity"] = body.quantity
    await db.carts.update_one({"user_id": u["user_id"]},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}})
    return await db.carts.find_one({"user_id": u["user_id"]}, {"_id": 0})

@app.delete("/api/cart/items/{item_id}")
async def remove_cart_item(item_id: str, u=Depends(current_user)):
    cart = await db.carts.find_one({"user_id": u["user_id"]})
    if not cart: raise HTTPException(404, "Cart not found")
    items = [i for i in cart.get("items", []) if i["item_id"] != item_id]
    await db.carts.update_one({"user_id": u["user_id"]},
        {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}})
    return await db.carts.find_one({"user_id": u["user_id"]}, {"_id": 0})

@app.delete("/api/cart")
async def clear_cart(u=Depends(current_user)):
    await db.carts.update_one({"user_id": u["user_id"]},
        {"$set": {"items": [], "restaurant_id": None, "restaurant_name": "", "restaurant_image": "",
                  "updated_at": datetime.now(timezone.utc)}}, upsert=True)
    return {"message": "Cart cleared"}

# ── ORDERS ────────────────────────────────────────────────────────────────────
STATUSES = ["pending","confirmed","preparing","out_for_delivery","delivered"]

@app.post("/api/orders")
async def place_order(body: OrderReq, u=Depends(current_user)):
    cart = await db.carts.find_one({"user_id": u["user_id"]})
    if not cart or not cart.get("items"):
        raise HTTPException(400, "Cart is empty")
    items = cart["items"]
    subtotal = sum(i["price"] * i["quantity"] for i in items)
    r = await db.restaurants.find_one({"_id": ObjectId(cart["restaurant_id"])})
    delivery_fee = r["delivery_fee"] if r else 2.99
    order_num = f"DLT-{str(uuid.uuid4().int)[:6]}"
    order = {
        "order_number": order_num, "user_id": u["user_id"],
        "user_name": u["name"], "user_email": u["email"],
        "restaurant_id": cart["restaurant_id"],
        "restaurant_name": cart["restaurant_name"],
        "restaurant_image": cart.get("restaurant_image",""),
        "items": items, "subtotal": round(subtotal, 2),
        "delivery_fee": delivery_fee, "total": round(subtotal + delivery_fee, 2),
        "status": "pending", "delivery_address": body.delivery_address,
        "payment_method": body.payment_method,
        "estimated_delivery": "35-45 min",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    result = await db.orders.insert_one(order)
    await db.carts.update_one({"user_id": u["user_id"]},
        {"$set": {"items": [], "restaurant_id": None, "restaurant_name": "", "restaurant_image": ""}})
    order["id"] = str(result.inserted_id)
    order.pop("_id", None)
    return order

@app.get("/api/orders")
async def get_orders(u=Depends(current_user)):
    orders = await db.orders.find({"user_id": u["user_id"]}).sort("created_at", -1).to_list(50)
    for o in orders: o["id"] = str(o.pop("_id"))
    return orders

@app.get("/api/orders/{oid}")
async def get_order(oid: str, u=Depends(current_user)):
    o = await db.orders.find_one({"_id": ObjectId(oid), "user_id": u["user_id"]})
    if not o: raise HTTPException(404, "Order not found")
    o["id"] = str(o.pop("_id")); return o

# ── CHAT ──────────────────────────────────────────────────────────────────────
CHAT_SYSTEM = """You are Delight's AI support agent — friendly, professional, and concise. 
Help users with: order status, restaurant info, delivery issues, menu questions, refunds. 
Keep responses short (2-3 sentences max). Always be warm and helpful. 
If you don't know something specific, offer to connect with a human agent."""

@app.post("/api/chat")
async def chat(body: ChatReq, u=Depends(current_user)):
    history = await db.chat_messages.find(
        {"session_id": body.session_id}).sort("created_at", 1).to_list(20)
    history_ctx = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-10:]])
    sys_msg = CHAT_SYSTEM + (f"\n\nConversation so far:\n{history_ctx}" if history_ctx else "")
    if not LLM_KEY:
        return {"response": "AI support is temporarily unavailable. Please contact us at support@delight.com"}
    try:
        chat_inst = LlmChat(api_key=LLM_KEY, session_id=body.session_id,
                            system_message=sys_msg).with_model("anthropic", "claude-haiku-4-5-20251001")
        resp = await chat_inst.send_message(UserMessage(text=body.message))
        now = datetime.now(timezone.utc)
        await db.chat_messages.insert_many([
            {"session_id": body.session_id, "user_id": u["user_id"],
             "role": "user", "content": body.message, "created_at": now},
            {"session_id": body.session_id, "user_id": u["user_id"],
             "role": "assistant", "content": resp, "created_at": now},
        ])
        return {"response": resp}
    except Exception as e:
        return {"response": f"I'm having trouble connecting right now. Please try again shortly."}

@app.get("/api/chat/history/{session_id}")
async def chat_history(session_id: str, u=Depends(current_user)):
    msgs = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(100)
    return msgs

# ── ADMIN ─────────────────────────────────────────────────────────────────────
@app.get("/api/admin/restaurants")
async def admin_restaurants(_u=Depends(admin_user)):
    items = await db.restaurants.find({}).to_list(100)
    return [fmt_restaurant(r) for r in items]

@app.post("/api/admin/restaurants")
async def admin_create_restaurant(body: RestaurantReq, _u=Depends(admin_user)):
    d = body.dict(); d["is_active"] = True; d["created_at"] = datetime.now(timezone.utc)
    result = await db.restaurants.insert_one(d)
    d["id"] = str(result.inserted_id); d.pop("_id", None); return d

@app.put("/api/admin/restaurants/{rid}")
async def admin_update_restaurant(rid: str, body: RestaurantReq, _u=Depends(admin_user)):
    d = body.dict()
    await db.restaurants.update_one({"_id": ObjectId(rid)}, {"$set": d})
    r = await db.restaurants.find_one({"_id": ObjectId(rid)})
    return fmt_restaurant(r)

@app.delete("/api/admin/restaurants/{rid}")
async def admin_delete_restaurant(rid: str, _u=Depends(admin_user)):
    await db.restaurants.delete_one({"_id": ObjectId(rid)})
    return {"message": "Deleted"}

@app.get("/api/admin/orders")
async def admin_orders(_u=Depends(admin_user)):
    orders = await db.orders.find({}).sort("created_at", -1).to_list(100)
    for o in orders: o["id"] = str(o.pop("_id"))
    return orders

@app.put("/api/admin/orders/{oid}/status")
async def admin_update_order(oid: str, body: StatusReq, _u=Depends(admin_user)):
    if body.status not in STATUSES + ["cancelled"]:
        raise HTTPException(400, "Invalid status")
    await db.orders.update_one({"_id": ObjectId(oid)},
        {"$set": {"status": body.status, "updated_at": datetime.now(timezone.utc)}})
    o = await db.orders.find_one({"_id": ObjectId(oid)})
    o["id"] = str(o.pop("_id")); return o

@app.get("/api/health")
async def health():
    return {"status": "ok", "app": "Delight"}
