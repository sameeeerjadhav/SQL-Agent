import sqlite3
import os

# Define path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "inventory.db")

# Connect (creates file if missing)
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create Tables
cursor.execute("""
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT,
    price REAL,
    stock_quantity INTEGER
);
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER,
    quantity INTEGER,
    order_date DATE,
    FOREIGN KEY(product_id) REFERENCES products(id)
);
""")

# Insert Sample Data
products = [
    ('Laptop', 'Electronics', 1200.00, 50),
    ('Smartphone', 'Electronics', 800.00, 100),
    ('Desk Chair', 'Furniture', 150.00, 20),
    ('Coffee Table', 'Furniture', 200.00, 15),
    ('Headphones', 'Electronics', 100.00, 200)
]

cursor.executemany("INSERT INTO products (name, category, price, stock_quantity) VALUES (?, ?, ?, ?)", products)

orders = [
    (1, 2, '2023-10-01'),
    (2, 5, '2023-10-02'),
    (1, 1, '2023-10-03'),
    (3, 10, '2023-10-04'),
    (5, 2, '2023-10-05')
]

cursor.executemany("INSERT INTO orders (product_id, quantity, order_date) VALUES (?, ?, ?)", orders)

conn.commit()
conn.close()

print(f"Database seeded at {DB_PATH}")
