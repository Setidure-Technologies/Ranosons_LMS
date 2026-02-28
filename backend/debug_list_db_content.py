import sqlite3
import os

DB_PATH = "ranoson.db"

def list_tables(cursor):
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    return [row[0] for row in cursor.fetchall()]

def print_table_records(cursor, table_name):
    print(f"\n--- Table: {table_name} ---")
    try:
        # Get column names
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Columns: {', '.join(columns)}")
        
        # Get top 10 records
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 10")
        rows = cursor.fetchall()
        
        if not rows:
            print("(No records found)")
        else:
            for i, row in enumerate(rows, 1):
                print(f"{i}. {row}")
    except sqlite3.OperationalError as e:
        print(f"Error reading table {table_name}: {e}")

def main():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        tables = list_tables(cursor)
        
        if not tables:
            print("No tables found in the database.")
        else:
            print(f"Found tables: {', '.join(tables)}")
            for table in tables:
                # Skip internal sqlite tables if any (though sqlite_master filter usually handles it)
                if table.startswith("sqlite_"):
                    continue
                print_table_records(cursor, table)
                
        conn.close()
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
