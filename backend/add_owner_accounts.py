import asyncio
import uuid
from sqlalchemy import select
from models import User, Restaurant
from database import AsyncSessionLocal, engine, Base
import bcrypt
import uuid
import bcrypt
from sqlalchemy import select
from database import AsyncSessionLocal, engine, Base
from models import User, Restaurant

async def create_owner(name: str, email: str, password: str, restaurant_name: str):
    async with AsyncSessionLocal() as session:
        # Create owner user
        user = User(
            user_id=f"owner_{uuid.uuid4().hex[:12]}",
            email=email.lower(),
            name=name,
            password_hash=bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode(),  # hashed password
            role="restaurant_owner",
            picture="",
            phone=""
        )
        session.add(user)
        # Find restaurant and assign owner
        result = await session.execute(
            select(Restaurant).where(Restaurant.name == restaurant_name)
        )
        restaurant = result.scalar_one_or_none()
        if restaurant:
            restaurant.owner_id = user.user_id
        await session.commit()
        await session.refresh(user)
        if restaurant:
            await session.refresh(restaurant)
        print(f"Created owner {email} for restaurant '{restaurant_name}'")

async def main():
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await create_owner(
        name="RR Durbar Owner",
        email="rr.durbar@example.com",
        password="owner123",
        restaurant_name="RR Durbar"
    )
    await create_owner(
        name="Sweet Magic Owner",
        email="sweet.magic@example.com",
        password="owner123",
        restaurant_name="Sweet Magic"
    )

if __name__ == "__main__":
    asyncio.run(main())
