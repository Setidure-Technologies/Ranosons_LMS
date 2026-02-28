import sqlite3
import os

db_path = 'ranoson.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
found = False

for (table_name,) in tables:
    try:
        cursor.execute(f'SELECT * FROM "{table_name}"')
        rows = cursor.fetchall()
        for row in rows:
            if any('Ashok' in str(val) or 'Kumar' in str(val) for val in row):
                print(f'Found in {table_name}: {row}')
                found = True
    except Exception as e:
        print(f"Error reading {table_name}: {e}")

if not found:
    print("No records found with 'Ashok' or 'Kumar' in the database.")

conn.close()
