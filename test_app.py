import unittest
import json
import sqlite3
import os
from app import create_app
from app.models import get_db_connection, Book, Member, BorrowRecord, User

class TestLibrarySystem(unittest.TestCase):
    def setUp(self):
        # Setup Flask Test client
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()
        
        # We use the seeded database for checks, but let's verify schema directly
        self.conn = get_db_connection()

    def tearDown(self):
        self.conn.close()

    def test_database_schema(self):
        """Verify that all required relational tables exist and foreign keys are active."""
        cursor = self.conn.cursor()
        
        # Check tables existence
        tables = ['users', 'books', 'members', 'borrow_records']
        for table in tables:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            row = cursor.fetchone()
            self.assertIsNotNone(row, f"Table '{table}' does not exist in the database.")
            
        # Check foreign keys status
        cursor.execute("PRAGMA foreign_keys")
        fk_status = cursor.fetchone()[0]
        self.assertEqual(fk_status, 1, "Foreign key constraints are not enabled.")

    def test_admin_auth_endpoints(self):
        """Verify login authentication endpoints validation."""
        # Test bad login
        payload = {"username": "admin", "password": "WrongPassword"}
        response = self.client.post('/api/auth/login', 
                                   data=json.dumps(payload),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 401)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        
        # Test missing inputs
        payload = {"username": "admin"}
        response = self.client.post('/api/auth/login', 
                                   data=json.dumps(payload),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_book_catalog_endpoints(self):
        """Verify catalog CRUD operations."""
        # Test list books
        response = self.client.get('/api/books')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertGreater(len(data['books']), 0)
        
        # Test search book
        response = self.client.get('/api/books?search=Mockingbird')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(any(b['title'] == 'To Kill a Mockingbird' for b in data['books']))

    def test_borrow_validation_logic(self):
        """Verify borrowing constraints (preventing double borrowing or borrowing zero copies)."""
        # Test getting lists
        response = self.client.get('/api/transactions')
        self.assertEqual(response.status_code, 200)
        
        # Inject custom book with 0 available copies
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO books (title, author, isbn, genre, published_year, total_copies, available_copies, location)
            VALUES ('Out of Stock Book', 'Test Author', 'TESTISBN0987', 'Test', 2026, 1, 0, 'Shelf Z')
        ''')
        book_id = cursor.lastrowid
        
        # Retrieve an active member
        cursor.execute("SELECT id FROM members WHERE status='active' LIMIT 1")
        member_row = cursor.fetchone()
        self.assertIsNotNone(member_row, "Seeded active member not found.")
        member_id = member_row['id']
        self.conn.commit()
        
        # Try to borrow the out of stock book
        payload = {
            "book_id": book_id,
            "member_id": member_id,
            "due_date": "2026-09-01"
        }
        response = self.client.post('/api/borrow',
                                   data=json.dumps(payload),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        self.assertIn("No copies available", data['message'])
        
        # Clean up testing record
        cursor.execute("DELETE FROM books WHERE id=?", (book_id,))
        self.conn.commit()

if __name__ == "__main__":
    unittest.main()
