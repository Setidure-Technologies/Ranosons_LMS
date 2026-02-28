import sqlite3
import os

db_path = r'c:\Users\Divyam\Desktop\setidure\Ranoson\backend\ranoson.db'

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- ROLES ---")
try:
    cursor.execute("SELECT id, name FROM roles")
    for row in cursor.fetchall():
        print(f"ID: {row[0]}, Name: {row[1]}")
except Exception as e:
    print(f"Error reading roles: {e}")

print("\n--- USERS ---")
try:
    cursor.execute("SELECT id, employee_code, role_id FROM users WHERE employee_code = 'ADMIN001'")
    for row in cursor.fetchall():
        print(f"ID: {row[0]}, Code: {row[1]}, Role ID: {row[2]}")
except Exception as e:
    print(f"Error reading users: {e}")

conn.close()
