from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.user import User
from app.models.room import Room
from app.models.location import Location
from app.core.security import get_password_hash
from app.routers import auth, rooms, bookings, locations, admin

def seed_data():
    db = SessionLocal()
    try:
        # Seed initial sample users and admin
        if db.query(User).count() == 0:
            admin_user = User(
                email="admin@meeting.com",
                hashed_password=get_password_hash("admin123"),
                full_name="Admin User",
                is_admin=True
            )
            user_1 = User(
                email="user@meeting.com",
                hashed_password=get_password_hash("password123"),
                full_name="John Doe"
            )
            user_2 = User(
                email="jane@meeting.com",
                hashed_password=get_password_hash("password123"),
                full_name="Jane Smith"
            )
            db.add_all([admin_user, user_1, user_2])
            db.commit()
            print("Seeded default admin (admin@meeting.com / admin123) and sample users.")

        # Seed initial sample locations
        if db.query(Location).count() == 0:
            loc_1 = Location(building_name="Building A", floor="3rd Floor", block="North Wing", city="Tech Park", address="100 Innovation Way", is_active=True)
            loc_2 = Location(building_name="Building A", floor="2nd Floor", block="North Wing", city="Tech Park", address="100 Innovation Way", is_active=True)
            loc_3 = Location(building_name="Building B", floor="1st Floor", block="South Block", city="Tech Park", address="102 Innovation Way", is_active=True)
            loc_4 = Location(building_name="Building B", floor="Ground Floor", block="South Block", city="Tech Park", address="102 Innovation Way", is_active=True)
            db.add_all([loc_1, loc_2, loc_3, loc_4])
            db.commit()
            print("Seeded default locations.")

        # Seed initial sample meeting rooms linked to locations
        if db.query(Room).count() == 0:
            locs = db.query(Location).all()
            loc_map = {f"{l.building_name}_{l.floor}": l.id for l in locs}

            rooms_list = [
                Room(
                    name="Boardroom Alpha",
                    capacity=16,
                    location_id=loc_map.get("Building A_3rd Floor"),
                    features=["Projector", "Video Conference", "Whiteboard", "High-speed Wi-Fi"],
                    description="A spacious executive conference room perfect for board meetings, presentations, and large group discussions.",
                    image_url="https://images.unsplash.com/photo-1577412647305-991150c7d163?q=80&w=600&auto=format&fit=crop"
                ),
                Room(
                    name="Huddle Space Beta",
                    capacity=4,
                    location_id=loc_map.get("Building B_1st Floor"),
                    features=["LED TV Screen", "Whiteboard", "Air Conditioning"],
                    description="A cozy, private space ideal for quick team syncs, brainstorms, or informal collaborations.",
                    image_url="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600&auto=format&fit=crop"
                ),
                Room(
                    name="Focus Room Gamma",
                    capacity=2,
                    location_id=loc_map.get("Building A_2nd Floor"),
                    features=["Monitor", "Whiteboard", "Acoustic Panels"],
                    description="Designed for deep focus, video interviews, or calls. Highly quiet and acoustic-shielded.",
                    image_url="https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=600&auto=format&fit=crop"
                ),
                Room(
                    name="Creative Studio Delta",
                    capacity=10,
                    location_id=loc_map.get("Building B_Ground Floor"),
                    status="UNDER_MAINTENANCE",
                    features=["Smart TV", "Dual Whiteboards", "Adjustable Lighting", "Comfortable Lounge Seats"],
                    description="A modern space currently undergoing scheduled audiovisual upgrade and maintenance.",
                    image_url="https://images.unsplash.com/photo-1517502884422-41eaaced0168?q=80&w=600&auto=format&fit=crop"
                )
            ]
            db.add_all(rooms_list)
            db.commit()
            print("Seeded default rooms.")
        # Seed initial sample audit logs
        from app.models.audit_log import AuditLog
        if db.query(AuditLog).count() == 0:
            log1 = AuditLog(admin_email="admin@meeting.com", action_type="SYSTEM_INITIALIZED", description="Workspace System & Database schema initialized successfully.")
            log2 = AuditLog(admin_email="admin@meeting.com", action_type="LOCATION_CREATED", description="Created initial workspace locations (Building A, Building B).")
            log3 = AuditLog(admin_email="admin@meeting.com", action_type="ROOM_CREATED", description="Created catalog meeting rooms (Boardroom Alpha, Huddle Space Beta, Innovation Lab).")
            db.add_all([log1, log2, log3])
            db.commit()
            print("Seeded default audit logs.")
    except Exception as e:
        print(f"Data seeding failed: {e}")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Connecting to database and initializing schema...")
    Base.metadata.create_all(bind=engine)

    # Auto-migration for new columns and column types on existing database instances
    with engine.begin() as conn:
        try:
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurrence VARCHAR(50) DEFAULT 'NONE';"))
            conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS recurrence_group_id VARCHAR(36);"))
            conn.execute(text("ALTER TABLE rooms ALTER COLUMN image_url TYPE TEXT;"))
        except Exception as alter_err:
            print(f"Column migration notice: {alter_err}")
    
    try:
        seed_data()
    except Exception as err:
        print(f"Database schema mismatch detected ({err}). Recreating tables with updated schema...")
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        seed_data()
    yield

# Initialize FastAPI instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(locations.router, prefix=settings.API_V1_STR)
app.include_router(rooms.router, prefix=settings.API_V1_STR)
app.include_router(bookings.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Meeting Room Booking System API",
        "version": "1.0.0"
    }
