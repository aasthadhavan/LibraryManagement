import sqlite3
import os
import hashlib
from datetime import datetime, date

DATABASE_DIR = os.path.join(os.path.dirname(__file__), 'database')
DATABASE_PATH = os.path.join(DATABASE_DIR, 'library.db')

def get_db_connection():
    if not os.path.exists(DATABASE_DIR):
        os.makedirs(DATABASE_DIR)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def hash_password(password):
    salt = os.urandom(16)
    hash_val = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt.hex() + ":" + hash_val.hex()

def verify_password(stored_password, provided_password):
    try:
        salt_hex, hash_hex = stored_password.split(':')
        salt = bytes.fromhex(salt_hex)
        hash_val = bytes.fromhex(hash_hex)
        new_hash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000)
        return new_hash == hash_val
    except Exception:
        return False

class Database:
    @staticmethod
    def init_db():
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create books table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS books (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT NOT NULL,
                isbn TEXT UNIQUE NOT NULL,
                genre TEXT,
                published_year INTEGER,
                total_copies INTEGER DEFAULT 1,
                available_copies INTEGER DEFAULT 1,
                location TEXT
            )
        ''')
        
        # Create members table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                membership_date DATE DEFAULT CURRENT_DATE,
                status TEXT DEFAULT 'active'
            )
        ''')
        
        # Create borrow_records table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS borrow_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                book_id INTEGER NOT NULL,
                member_id INTEGER NOT NULL,
                issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
                due_date DATE NOT NULL,
                return_date DATE,
                fine_amount REAL DEFAULT 0.00,
                status TEXT DEFAULT 'issued',
                FOREIGN KEY (book_id) REFERENCES books (id) ON DELETE CASCADE,
                FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
            )
        ''')
        
        conn.commit()
        conn.close()


class User:
    def __init__(self, username, email, role='admin', password_hash=None, id=None):
        self.id = id
        self.username = username
        self.email = email
        self.role = role
        self.password_hash = password_hash

    @staticmethod
    def find_by_username(username):
        conn = get_db_connection()
        row = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        if row:
            return User(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                role=row['role'],
                password_hash=row['password_hash']
            )
        return None

    @staticmethod
    def find_by_email(email):
        conn = get_db_connection()
        row = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()
        if row:
            return User(
                id=row['id'],
                username=row['username'],
                email=row['email'],
                role=row['role'],
                password_hash=row['password_hash']
            )
        return None

    def save(self, password):
        conn = get_db_connection()
        self.password_hash = hash_password(password)
        try:
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)',
                (self.username, self.password_hash, self.email, self.role)
            )
            self.id = cursor.lastrowid
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()


class Book:
    def __init__(self, title, author, isbn, genre, published_year, total_copies, available_copies, location, id=None):
        self.id = id
        self.title = title
        self.author = author
        self.isbn = isbn
        self.genre = genre
        self.published_year = published_year
        self.total_copies = total_copies
        self.available_copies = available_copies
        self.location = location

    @staticmethod
    def get_all():
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM books ORDER BY title ASC').fetchall()
        conn.close()
        return [Book(**dict(row)) for row in rows]

    @staticmethod
    def find_by_id(book_id):
        conn = get_db_connection()
        row = conn.execute('SELECT * FROM books WHERE id = ?', (book_id,)).fetchone()
        conn.close()
        return Book(**dict(row)) if row else None

    @staticmethod
    def search(query):
        conn = get_db_connection()
        search_pattern = f"%{query}%"
        rows = conn.execute('''
            SELECT * FROM books 
            WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR genre LIKE ?
            ORDER BY title ASC
        ''', (search_pattern, search_pattern, search_pattern, search_pattern)).fetchall()
        conn.close()
        return [Book(**dict(row)) for row in rows]

    def save(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO books (title, author, isbn, genre, published_year, total_copies, available_copies, location)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (self.title, self.author, self.isbn, self.genre, self.published_year, self.total_copies, self.available_copies, self.location))
            self.id = cursor.lastrowid
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()

    def update(self):
        conn = get_db_connection()
        try:
            conn.execute('''
                UPDATE books 
                SET title = ?, author = ?, isbn = ?, genre = ?, published_year = ?, total_copies = ?, available_copies = ?, location = ?
                WHERE id = ?
            ''', (self.title, self.author, self.isbn, self.genre, self.published_year, self.total_copies, self.available_copies, self.location, self.id))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()

    @staticmethod
    def delete(book_id):
        conn = get_db_connection()
        try:
            conn.execute('DELETE FROM books WHERE id = ?', (book_id,))
            conn.commit()
            return True
        except Exception:
            return False
        finally:
            conn.close()


class Member:
    def __init__(self, first_name, last_name, email, phone, membership_date=None, status='active', id=None):
        self.id = id
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.phone = phone
        self.membership_date = membership_date or date.today().strftime('%Y-%m-%d')
        self.status = status

    @staticmethod
    def get_all():
        conn = get_db_connection()
        rows = conn.execute('SELECT * FROM members ORDER BY first_name ASC, last_name ASC').fetchall()
        conn.close()
        return [Member(**dict(row)) for row in rows]

    @staticmethod
    def find_by_id(member_id):
        conn = get_db_connection()
        row = conn.execute('SELECT * FROM members WHERE id = ?', (member_id,)).fetchone()
        conn.close()
        return Member(**dict(row)) if row else None

    @staticmethod
    def search(query):
        conn = get_db_connection()
        search_pattern = f"%{query}%"
        rows = conn.execute('''
            SELECT * FROM members 
            WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?
            ORDER BY first_name ASC, last_name ASC
        ''', (search_pattern, search_pattern, search_pattern, search_pattern)).fetchall()
        conn.close()
        return [Member(**dict(row)) for row in rows]

    def save(self):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute('''
                INSERT INTO members (first_name, last_name, email, phone, membership_date, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (self.first_name, self.last_name, self.email, self.phone, self.membership_date, self.status))
            self.id = cursor.lastrowid
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()

    def update(self):
        conn = get_db_connection()
        try:
            conn.execute('''
                UPDATE members 
                SET first_name = ?, last_name = ?, email = ?, phone = ?, status = ?
                WHERE id = ?
            ''', (self.first_name, self.last_name, self.email, self.phone, self.status, self.id))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()

    @staticmethod
    def delete(member_id):
        conn = get_db_connection()
        try:
            conn.execute('DELETE FROM members WHERE id = ?', (member_id,))
            conn.commit()
            return True
        except Exception:
            return False
        finally:
            conn.close()


class BorrowRecord:
    def __init__(self, book_id, member_id, issue_date, due_date, return_date=None, fine_amount=0.00, status='issued', id=None, book_title=None, member_name=None):
        self.id = id
        self.book_id = book_id
        self.member_id = member_id
        self.issue_date = issue_date
        self.due_date = due_date
        self.return_date = return_date
        self.fine_amount = fine_amount
        self.status = status
        
        # Extended fields for convenience in UI display
        self.book_title = book_title
        self.member_name = member_name

    @staticmethod
    def get_all():
        conn = get_db_connection()
        rows = conn.execute('''
            SELECT br.*, b.title as book_title, (m.first_name || ' ' || m.last_name) as member_name
            FROM borrow_records br
            JOIN books b ON br.book_id = b.id
            JOIN members m ON br.member_id = m.id
            ORDER BY br.issue_date DESC
        ''').fetchall()
        conn.close()
        return [BorrowRecord(**dict(row)) for row in rows]

    @staticmethod
    def find_by_id(record_id):
        conn = get_db_connection()
        row = conn.execute('''
            SELECT br.*, b.title as book_title, (m.first_name || ' ' || m.last_name) as member_name
            FROM borrow_records br
            JOIN books b ON br.book_id = b.id
            JOIN members m ON br.member_id = m.id
            WHERE br.id = ?
        ''', (record_id,)).fetchone()
        conn.close()
        return BorrowRecord(**dict(row)) if row else None

    @staticmethod
    def get_active_borrows_count_by_member(member_id):
        conn = get_db_connection()
        row = conn.execute('SELECT COUNT(*) as count FROM borrow_records WHERE member_id = ? AND status != "returned"', (member_id,)).fetchone()
        conn.close()
        return row['count'] if row else 0

    @staticmethod
    def borrow_book(book_id, member_id, issue_date_str, due_date_str):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            # Check availability
            book_row = cursor.execute('SELECT available_copies, total_copies FROM books WHERE id = ?', (book_id,)).fetchone()
            if not book_row:
                return False, "Book not found."
            
            if book_row['available_copies'] <= 0:
                return False, "No copies available for loan."

            # Check if member is suspended
            member_row = cursor.execute('SELECT status FROM members WHERE id = ?', (member_id,)).fetchone()
            if not member_row:
                return False, "Member not found."
            if member_row['status'] != 'active':
                return False, f"Member is not active (Status: {member_row['status']}). Cannot borrow books."

            # Issue transaction: Insert record & decrement book stock
            cursor.execute('''
                INSERT INTO borrow_records (book_id, member_id, issue_date, due_date, status)
                VALUES (?, ?, ?, ?, 'issued')
            ''', (book_id, member_id, issue_date_str, due_date_str))
            
            cursor.execute('''
                UPDATE books 
                SET available_copies = available_copies - 1
                WHERE id = ?
            ''', (book_id,))
            
            conn.commit()
            return True, "Book issued successfully."
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

    @staticmethod
    def return_book(record_id, return_date_str):
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            record = cursor.execute('SELECT * FROM borrow_records WHERE id = ?', (record_id,)).fetchone()
            if not record:
                return False, "Borrow record not found."
            if record['status'] == 'returned':
                return False, "Book already returned."

            book_id = record['book_id']
            due_date_str = record['due_date']
            
            # Late fine calculation ($2.00 per day late)
            due_dt = datetime.strptime(due_date_str, '%Y-%m-%d').date()
            ret_dt = datetime.strptime(return_date_str, '%Y-%m-%d').date()
            
            fine = 0.0
            if ret_dt > due_dt:
                days_late = (ret_dt - due_dt).days
                fine = float(days_late) * 2.0  # $2.00 / day
            
            # Update record & increment book stock
            cursor.execute('''
                UPDATE borrow_records 
                SET return_date = ?, fine_amount = ?, status = 'returned'
                WHERE id = ?
            ''', (return_date_str, fine, record_id))
            
            cursor.execute('''
                UPDATE books 
                SET available_copies = available_copies + 1
                WHERE id = ?
            ''', (book_id,))
            
            conn.commit()
            return True, {"msg": "Book returned successfully.", "fine": fine}
        except Exception as e:
            conn.rollback()
            return False, str(e)
        finally:
            conn.close()

    @staticmethod
    def calculate_overdue_fines():
        """Helper to dynamically calculate fines for overdue records that are not returned yet."""
        conn = get_db_connection()
        cursor = conn.cursor()
        today_str = date.today().strftime('%Y-%m-%d')
        
        # Find all issued books whose due_date is in the past
        records = cursor.execute('''
            SELECT id, due_date FROM borrow_records 
            WHERE status = 'issued' AND due_date < ?
        ''', (today_str,)).fetchall()
        
        for r in records:
            due_dt = datetime.strptime(r['due_date'], '%Y-%m-%d').date()
            today_dt = date.today()
            days_late = (today_dt - due_dt).days
            fine = float(days_late) * 2.0
            
            cursor.execute('''
                UPDATE borrow_records
                SET fine_amount = ?, status = 'overdue'
                WHERE id = ?
            ''', (fine, r['id']))
            
        conn.commit()
        conn.close()

    @staticmethod
    def get_dashboard_stats():
        # First calculate current overdues
        BorrowRecord.calculate_overdue_fines()
        
        conn = get_db_connection()
        stats = {}
        
        # Total Books (sum of total_copies)
        row = conn.execute('SELECT SUM(total_copies) as total_books FROM books').fetchone()
        stats['total_books'] = row['total_books'] if row['total_books'] is not None else 0
        
        # Total Members
        row = conn.execute('SELECT COUNT(*) as total_members FROM members').fetchone()
        stats['total_members'] = row['total_members'] if row['total_members'] is not None else 0
        
        # Currently Issued Books (status = 'issued' or status = 'overdue')
        row = conn.execute('SELECT COUNT(*) as issued_books FROM borrow_records WHERE status != "returned"').fetchone()
        stats['issued_books'] = row['issued_books'] if row['issued_books'] is not None else 0
        
        # Overdue Books (status = 'overdue')
        row = conn.execute('SELECT COUNT(*) as overdue_books FROM borrow_records WHERE status = "overdue"').fetchone()
        stats['overdue_books'] = row['overdue_books'] if row['overdue_books'] is not None else 0
        
        # Total Fines Collected (sum of return transactions fine_amount)
        row = conn.execute('SELECT SUM(fine_amount) as total_fines FROM borrow_records').fetchone()
        stats['total_fines'] = row['total_fines'] if row['total_fines'] is not None else 0.0
        
        conn.close()
        return stats
