from app.models import Database, User, Book, Member, BorrowRecord, get_db_connection
from datetime import date, timedelta

def seed():
    print("Initializing Database...")
    Database.init_db()
    
    # Check if admin user already exists
    admin = User.find_by_username("admin")
    if not admin:
        print("Seeding admin user...")
        admin = User(username="admin", email="admin@aasthaslibrary.com", role="admin")
        admin.save("Password123")
    else:
        print("Admin user already exists.")

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if books exist, if not seed them
    cursor.execute("SELECT COUNT(*) as count FROM books")
    if cursor.fetchone()['count'] == 0:
        print("Seeding books...")
        books = [
            Book("The Great Gatsby", "F. Scott Fitzgerald", "9780743273565", "Classic Fiction", 1925, 5, 5, "Shelf A1"),
            Book("To Kill a Mockingbird", "Harper Lee", "9780061120084", "Classic Fiction", 1960, 3, 3, "Shelf A2"),
            Book("1984", "George Orwell", "9780451524935", "Dystopian", 1949, 4, 4, "Shelf B1"),
            Book("Clean Code", "Robert C. Martin", "9780132350884", "Technology", 2008, 2, 1, "Shelf C3"),
            Book("Design Patterns: Elements of Reusable Object-Oriented Software", "Erich Gamma", "9780201633610", "Technology", 1994, 3, 3, "Shelf C4"),
            Book("The Hobbit", "J.R.R. Tolkien", "9780345339683", "Fantasy", 1937, 6, 6, "Shelf D1"),
            Book("Introduction to Algorithms", "Thomas H. Cormen", "9780262033848", "Computer Science", 2009, 2, 2, "Shelf C1")
        ]
        for book in books:
            book.save()
            
    # Check if members exist, if not seed them
    cursor.execute("SELECT COUNT(*) as count FROM members")
    if cursor.fetchone()['count'] == 0:
        print("Seeding members...")
        members = [
            Member("John", "Doe", "john.doe@example.com", "555-0199", status="active"),
            Member("Jane", "Smith", "jane.smith@example.com", "555-0144", status="active"),
            Member("Alice", "Johnson", "alice.j@example.com", "555-0177", status="suspended"),
            Member("Robert", "Williams", "robert.w@example.com", "555-0122", status="active")
        ]
        for member in members:
            member.save()
            
    # Check if borrow records exist, if not seed them
    cursor.execute("SELECT COUNT(*) as count FROM borrow_records")
    if cursor.fetchone()['count'] == 0:
        print("Seeding borrow records...")
        
        # Get book and member IDs dynamically
        cursor.execute("SELECT id FROM books WHERE title = 'Clean Code'")
        clean_code_id = cursor.fetchone()['id']
        
        cursor.execute("SELECT id FROM books WHERE title = '1984'")
        orwell_1984_id = cursor.fetchone()['id']
        
        cursor.execute("SELECT id FROM members WHERE email = 'john.doe@example.com'")
        john_id = cursor.fetchone()['id']
        
        cursor.execute("SELECT id FROM members WHERE email = 'jane.smith@example.com'")
        jane_id = cursor.fetchone()['id']
        
        today = date.today()
        
        # Active issue: John Doe borrowed Clean Code (already decremented stock in books seed: 2 total, 1 available)
        cursor.execute('''
            INSERT INTO borrow_records (book_id, member_id, issue_date, due_date, status)
            VALUES (?, ?, ?, ?, 'issued')
        ''', (clean_code_id, john_id, (today - timedelta(days=5)).strftime('%Y-%m-%d'), (today + timedelta(days=9)).strftime('%Y-%m-%d')))
        
        # Overdue issue: Jane Smith borrowed 1984 25 days ago, due 11 days ago (not returned, fine applies)
        issue_date_overdue = (today - timedelta(days=25)).strftime('%Y-%m-%d')
        due_date_overdue = (today - timedelta(days=11)).strftime('%Y-%m-%d')
        
        cursor.execute('''
            INSERT INTO borrow_records (book_id, member_id, issue_date, due_date, status)
            VALUES (?, ?, ?, ?, 'overdue')
        ''', (orwell_1984_id, jane_id, issue_date_overdue, due_date_overdue))
        
        # Decrement available copies for 1984 because of the issue
        cursor.execute('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', (orwell_1984_id,))
        
    conn.commit()
    conn.close()
    
    # Calculate overdue fines to sync
    BorrowRecord.calculate_overdue_fines()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed()
