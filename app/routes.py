from flask import Blueprint, request, jsonify, session
from app.models import User, Book, Member, BorrowRecord
from datetime import datetime, date

api = Blueprint('api', __name__)

# Authentication API
@api.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required."}), 400
        
    user = User.find_by_username(username)
    if user and verify_password(user.password_hash, password):
        session['user_id'] = user.id
        session['username'] = user.username
        session['role'] = user.role
        return jsonify({
            "success": True, 
            "message": "Login successful.", 
            "user": {"id": user.id, "username": user.username, "email": user.email, "role": user.role}
        })
    else:
        return jsonify({"success": False, "message": "Invalid username or password."}), 401

@api.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    email = data.get('email')
    
    if not username or not password or not email:
        return jsonify({"success": False, "message": "Username, password, and email are required."}), 400
        
    if User.find_by_username(username):
        return jsonify({"success": False, "message": "Username is already taken."}), 400
        
    if User.find_by_email(email):
        return jsonify({"success": False, "message": "Email is already registered."}), 400
        
    new_user = User(username=username, email=email, role='admin')
    if new_user.save(password):
        return jsonify({
            "success": True, 
            "message": "Registration successful. You can now log in.",
            "user": {"username": new_user.username, "email": new_user.email}
        })
    else:
        return jsonify({"success": False, "message": "Failed to register user due to database error."}), 500

@api.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "Logged out successfully."})

@api.route('/api/auth/me', methods=['GET'])
def get_current_user():
    if 'user_id' in session:
        return jsonify({
            "logged_in": True,
            "user": {
                "id": session['user_id'],
                "username": session['username'],
                "role": session['role']
            }
        })
    return jsonify({"logged_in": False}), 200


# Dashboard API
@api.route('/api/dashboard/stats', methods=['GET'])
def get_stats():
    try:
        stats = BorrowRecord.get_dashboard_stats()
        return jsonify({"success": True, "stats": stats})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# Books API
@api.route('/api/books', methods=['GET'])
def list_books():
    query = request.args.get('search', '')
    if query:
        books = Book.search(query)
    else:
        books = Book.get_all()
    
    books_data = [b.__dict__ for b in books]
    return jsonify({"success": True, "books": books_data})

@api.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = Book.find_by_id(book_id)
    if book:
        return jsonify({"success": True, "book": book.__dict__})
    return jsonify({"success": False, "message": "Book not found."}), 404

@api.route('/api/books', methods=['POST'])
def add_book():
    data = request.get_json() or {}
    title = data.get('title')
    author = data.get('author')
    isbn = data.get('isbn')
    genre = data.get('genre')
    published_year = data.get('published_year')
    total_copies = data.get('total_copies')
    location = data.get('location')
    
    if not title or not author or not isbn:
        return jsonify({"success": False, "message": "Title, Author, and ISBN are required fields."}), 400
        
    try:
        total_copies = int(total_copies) if total_copies is not None else 1
        published_year = int(published_year) if published_year else None
    except ValueError:
        return jsonify({"success": False, "message": "Invalid number formats for copies or publication year."}), 400

    new_book = Book(
        title=title, author=author, isbn=isbn, genre=genre,
        published_year=published_year, total_copies=total_copies,
        available_copies=total_copies, location=location
    )
    
    if new_book.save():
        return jsonify({"success": True, "message": f"Book '{title}' added successfully.", "book": new_book.__dict__})
    else:
        return jsonify({"success": False, "message": "Failed to add book. ISBN might already exist."}), 400

@api.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    book = Book.find_by_id(book_id)
    if not book:
        return jsonify({"success": False, "message": "Book not found."}), 404
        
    data = request.get_json() or {}
    
    # Calculate difference in total copies to update available copies
    old_total = book.total_copies
    new_total = int(data.get('total_copies', old_total))
    diff = new_total - old_total
    
    # Ensure available copies won't drop below zero
    new_available = book.available_copies + diff
    if new_available < 0:
        return jsonify({"success": False, "message": "Cannot decrease total copies. Some copies are currently issued."}), 400
        
    book.title = data.get('title', book.title)
    book.author = data.get('author', book.author)
    book.isbn = data.get('isbn', book.isbn)
    book.genre = data.get('genre', book.genre)
    book.published_year = int(data.get('published_year')) if data.get('published_year') else None
    book.total_copies = new_total
    book.available_copies = new_available
    book.location = data.get('location', book.location)
    
    if book.update():
        return jsonify({"success": True, "message": "Book updated successfully.", "book": book.__dict__})
    else:
        return jsonify({"success": False, "message": "Failed to update book. ISBN might conflict."}), 400

@api.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    book = Book.find_by_id(book_id)
    if not book:
        return jsonify({"success": False, "message": "Book not found."}), 404
        
    # Check if any copies are issued
    if book.available_copies < book.total_copies:
        return jsonify({"success": False, "message": "Cannot delete book. Some copies are currently borrowed."}), 400
        
    if Book.delete(book_id):
        return jsonify({"success": True, "message": "Book deleted successfully."})
    else:
        return jsonify({"success": False, "message": "Failed to delete book."}), 500


# Members API
@api.route('/api/members', methods=['GET'])
def list_members():
    query = request.args.get('search', '')
    if query:
        members = Member.search(query)
    else:
        members = Member.get_all()
    
    members_data = [m.__dict__ for m in members]
    return jsonify({"success": True, "members": members_data})

@api.route('/api/members/<int:member_id>', methods=['GET'])
def get_member(member_id):
    member = Member.find_by_id(member_id)
    if member:
        return jsonify({"success": True, "member": member.__dict__})
    return jsonify({"success": False, "message": "Member not found."}), 404

@api.route('/api/members', methods=['POST'])
def add_member():
    data = request.get_json() or {}
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    phone = data.get('phone')
    status = data.get('status', 'active')
    
    if not first_name or not last_name:
        return jsonify({"success": False, "message": "First name and last name are required."}), 400
        
    new_member = Member(first_name=first_name, last_name=last_name, email=email, phone=phone, status=status)
    if new_member.save():
        return jsonify({"success": True, "message": f"Member '{first_name} {last_name}' registered successfully.", "member": new_member.__dict__})
    else:
        return jsonify({"success": False, "message": "Failed to register member. Email may be already in use."}), 400

@api.route('/api/members/<int:member_id>', methods=['PUT'])
def update_member(member_id):
    member = Member.find_by_id(member_id)
    if not member:
        return jsonify({"success": False, "message": "Member not found."}), 404
        
    data = request.get_json() or {}
    member.first_name = data.get('first_name', member.first_name)
    member.last_name = data.get('last_name', member.last_name)
    member.email = data.get('email', member.email)
    member.phone = data.get('phone', member.phone)
    member.status = data.get('status', member.status)
    
    if member.update():
        return jsonify({"success": True, "message": "Member details updated successfully.", "member": member.__dict__})
    else:
        return jsonify({"success": False, "message": "Failed to update member. Email may conflict."}), 400

@api.route('/api/members/<int:member_id>', methods=['DELETE'])
def delete_member(member_id):
    member = Member.find_by_id(member_id)
    if not member:
        return jsonify({"success": False, "message": "Member not found."}), 404
        
    # Check if member has outstanding borrow transactions
    active_borrows = BorrowRecord.get_active_borrows_count_by_member(member_id)
    if active_borrows > 0:
        return jsonify({"success": False, "message": f"Cannot delete member. Member has {active_borrows} borrowed books."}), 400
        
    if Member.delete(member_id):
        return jsonify({"success": True, "message": "Member deleted successfully."})
    else:
        return jsonify({"success": False, "message": "Failed to delete member."}), 500


# Borrowing & Return API
@api.route('/api/borrow', methods=['POST'])
def borrow_book():
    data = request.get_json() or {}
    book_id = data.get('book_id')
    member_id = data.get('member_id')
    issue_date_str = data.get('issue_date', date.today().strftime('%Y-%m-%d'))
    due_date_str = data.get('due_date')
    
    if not book_id or not member_id or not due_date_str:
        return jsonify({"success": False, "message": "Book ID, Member ID, and Due Date are required."}), 400
        
    success, msg = BorrowRecord.borrow_book(book_id, member_id, issue_date_str, due_date_str)
    if success:
        return jsonify({"success": True, "message": msg})
    else:
        return jsonify({"success": False, "message": msg}), 400

@api.route('/api/return', methods=['POST'])
def return_book():
    data = request.get_json() or {}
    record_id = data.get('record_id')
    return_date_str = data.get('return_date', date.today().strftime('%Y-%m-%d'))
    
    if not record_id:
        return jsonify({"success": False, "message": "Record ID is required."}), 400
        
    success, res = BorrowRecord.return_book(record_id, return_date_str)
    if success:
        return jsonify({
            "success": True, 
            "message": res["msg"], 
            "fine_amount": res["fine"]
        })
    else:
        return jsonify({"success": False, "message": res}), 400

@api.route('/api/transactions', methods=['GET'])
def list_transactions():
    BorrowRecord.calculate_overdue_fines()  # Recalculate fines on list query to ensure data is fresh
    records = BorrowRecord.get_all()
    records_data = [r.__dict__ for r in records]
    return jsonify({"success": True, "transactions": records_data})


# Password validation helper injection
from app.models import verify_password
