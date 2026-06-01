import asyncio
import uuid
from database import AsyncSessionLocal, engine, Base
from models import Restaurant

async def add_restaurants():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as session:
        new_restaurants = [
            {
                "name": "RR Durbar",
                "cuisine": ["Indian", "North Indian"],
                "description": "Authentic Indian dishes with a royal touch.",
                "image": "https://example.com/rr_durbar.jpg",
                "cover_image": "https://example.com/rr_durbar_cover.jpg",
                "rating": 4.6,
                "review_count": 0,
                "delivery_time": "30-40 min",
                "delivery_fee": 2.5,
                "min_order": 15.0,
                "price_range": "$$",
                "tags": ["Indian", "Royal"],
                "menu_categories": []
            },
            {
                "name": "Sweet Magic",
                "cuisine": ["Desserts", "Bakery"],
                "description": "Delicious sweet treats and pastries.",
                "image": "https://example.com/sweet_magic.jpg",
                "cover_image": "https://example.com/sweet_magic_cover.jpg",
                "rating": 4.7,
                "review_count": 0,
                "delivery_time": "20-30 min",
                "delivery_fee": 2.0,
                "min_order": 10.0,
                "price_range": "$$",
                "tags": ["Desserts", "Bakery"],
                "menu_categories": []
            }
        ]
        for r in new_restaurants:
            restaurant = Restaurant(
                id=str(uuid.uuid4()),
                name=r["name"],
                cuisine=r["cuisine"],
                description=r["description"],
                image=r["image"],
                cover_image=r["cover_image"],
                rating=r["rating"],
                review_count=r["review_count"],
                delivery_time=r["delivery_time"],
                delivery_fee=r["delivery_fee"],
                min_order=r["min_order"],
                price_range=r["price_range"],
                tags=r["tags"],
                is_active=True,
                menu_categories=r["menu_categories"]
            )
            session.add(restaurant)
        await session.commit()

if __name__ == "__main__":
    asyncio.run(add_restaurants())
