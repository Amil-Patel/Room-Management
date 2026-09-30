
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "app"))

from app.core.database import engine, Base
from app.main import seed_data

def reset_database():
    print("Dropping all existing database tables in PostgreSQL...")
    Base.metadata.drop_all(bind=engine)
    print("Creating fresh database tables with updated schema...")
    Base.metadata.create_all(bind=engine)
    print("Seeding initial default users and rooms...")
    seed_data()
    print("Database reset completed successfully!")

if __name__ == "__main__":
    reset_database()
