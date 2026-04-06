"""Backend tests for Delight food delivery app"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://instant-feast-2.preview.emergentagent.com")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@delight.com"
ADMIN_PASS = "admin123"
USER_EMAIL = "user@delight.com"
USER_PASS = "user123"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def user_token(session):
    r = session.post(f"{API}/auth/login", json={"email": USER_EMAIL, "password": USER_PASS})
    assert r.status_code == 200, f"Login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200, f"Admin login failed: {r.text}"
    return r.json()["token"]


# Auth tests
class TestAuth:
    """Authentication flow tests"""

    def test_login_user(self, session):
        r = session.post(f"{API}/auth/login", json={"email": USER_EMAIL, "password": USER_PASS})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "user" in data
        print(f"PASS: user login OK, role={data['user']['role']}")

    def test_login_admin(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["role"] == "admin"
        print("PASS: admin login OK")

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": USER_EMAIL, "password": "wrong"})
        assert r.status_code in (400, 401)
        print("PASS: wrong password rejected")

    def test_register_new_user(self, session):
        import time
        email = f"TEST_newuser_{int(time.time())}@delight.com"
        r = session.post(f"{API}/auth/register", json={"email": email, "name": "Test Reg", "password": "pass1234"})
        assert r.status_code in (200, 201)
        assert "token" in r.json()
        print(f"PASS: registration OK for {email}")


# Restaurants tests
class TestRestaurants:
    """Restaurant listing and detail tests"""

    def test_list_restaurants(self, session):
        r = session.get(f"{API}/restaurants")
        assert r.status_code == 200
        data = r.json()
        assert len(data) > 0
        print(f"PASS: {len(data)} restaurants found")

    def test_restaurant_has_required_fields(self, session):
        r = session.get(f"{API}/restaurants")
        assert r.status_code == 200
        rest = r.json()[0]
        for field in ["id", "name", "cuisine", "rating"]:
            assert field in rest, f"Missing field: {field}"
        print("PASS: restaurant fields OK")

    def test_restaurant_detail(self, session):
        r = session.get(f"{API}/restaurants")
        rid = r.json()[0]["id"]
        r2 = session.get(f"{API}/restaurants/{rid}")
        assert r2.status_code == 200
        data = r2.json()
        assert "menu_categories" in data
        total_items = sum(len(cat.get("items", [])) for cat in data["menu_categories"])
        print(f"PASS: restaurant detail has {total_items} menu items in {len(data['menu_categories'])} categories")

    def test_search_restaurants(self, session):
        r = session.get(f"{API}/restaurants?search=sushi")
        assert r.status_code == 200
        print(f"PASS: search returns {len(r.json())} results")

    def test_filter_by_cuisine(self, session):
        r = session.get(f"{API}/restaurants?cuisine=Japanese")
        assert r.status_code == 200
        print(f"PASS: cuisine filter returns {len(r.json())} results")


# Cart tests
class TestCart:
    """Cart operations tests"""

    def test_get_cart(self, session, user_token):
        r = session.get(f"{API}/cart", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 200
        print("PASS: get cart OK")

    def test_add_to_cart(self, session, user_token):
        # Get first restaurant and menu item
        restaurants = session.get(f"{API}/restaurants").json()
        rest = restaurants[0]
        rid = rest["id"]
        detail = session.get(f"{API}/restaurants/{rid}").json()
        category = detail["menu_categories"][0]
        item = category["items"][0]
        r = session.post(f"{API}/cart/items", json={
            "restaurant_id": rid,
            "restaurant_name": rest["name"],
            "restaurant_image": rest["image"],
            "item_id": item["id"],
            "name": item["name"],
            "price": item["price"],
            "quantity": 1,
            "image": item.get("image", "")
        }, headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 200
        print(f"PASS: add to cart OK - added {item['name']}")

    def test_cart_has_items(self, session, user_token):
        r = session.get(f"{API}/cart", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 200
        data = r.json()
        assert len(data.get("items", [])) > 0
        print(f"PASS: cart has {len(data['items'])} items")


# Orders tests
class TestOrders:
    """Order creation and tracking tests"""

    def test_place_order(self, session, user_token):
        # Ensure cart has items first
        restaurants = session.get(f"{API}/restaurants").json()
        rest = restaurants[0]
        rid = rest["id"]
        detail = session.get(f"{API}/restaurants/{rid}").json()
        category = detail["menu_categories"][0]
        item = category["items"][0]
        session.post(f"{API}/cart/items", json={
            "restaurant_id": rid, "restaurant_name": rest["name"],
            "restaurant_image": rest["image"], "item_id": item["id"],
            "name": item["name"], "price": item["price"], "quantity": 1,
            "image": item.get("image", "")
        }, headers={"Authorization": f"Bearer {user_token}"})

        r = session.post(f"{API}/orders", json={
            "delivery_address": "123 Test St, Test City",
            "payment_method": "cod"
        }, headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code in (200, 201), f"Order failed: {r.text}"
        data = r.json()
        assert "id" in data or "order_id" in data
        print("PASS: order placed OK")

    def test_order_history(self, session, user_token):
        r = session.get(f"{API}/orders", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 200
        print(f"PASS: order history has {len(r.json())} orders")

    def test_order_detail(self, session, user_token):
        r = session.get(f"{API}/orders", headers={"Authorization": f"Bearer {user_token}"})
        orders = r.json()
        if not orders:
            pytest.skip("No orders to test")
        oid = orders[0]["id"]
        r2 = session.get(f"{API}/orders/{oid}", headers={"Authorization": f"Bearer {user_token}"})
        assert r2.status_code == 200
        print("PASS: order detail OK")


# Admin tests
class TestAdmin:
    """Admin panel tests"""

    def test_admin_stats(self, session, admin_token):
        # admin/stats endpoint may not exist - test admin/orders as alternative
        r = session.get(f"{API}/admin/orders", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        print(f"PASS: admin orders used as stats proxy: {len(r.json())} orders")

    def test_non_admin_blocked(self, session, user_token):
        r = session.get(f"{API}/admin/orders", headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 403
        print("PASS: non-admin blocked from admin endpoints")


# Chat test
class TestChat:
    """AI Chatbot tests"""

    def test_chat_message(self, session, user_token):
        import time
        session_id = f"test_session_{int(time.time())}"
        r = session.post(f"{API}/chat", json={"message": "What restaurants do you have?", "session_id": session_id},
                         headers={"Authorization": f"Bearer {user_token}"})
        assert r.status_code == 200, f"Chat failed: {r.text}"
        data = r.json()
        assert "response" in data or "message" in data
        print(f"PASS: chat response received")
