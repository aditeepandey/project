from app import app, db

# Create tables within the application context
with app.app_context():
    # Import models after app is created
    import models  # noqa: F401

    # Create all tables
    db.create_all()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
