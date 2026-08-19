# Aastha's Library Management System

A production-ready, fully functional Library Management System developed for **Aastha's Library**. 

This project adheres strictly to **MVVM Architecture** and **Object-Oriented Analysis & Design (OOAD)** principles, using a file-persistent **SQLite3 database** and a responsive **Flask** backend.

---

## 🎨 Visual Design & Branding Details

- **Header Navigation Bar**: Top navigation featuring Aastha's Library brand logo, links to sections, and a clean navy button to trigger modal access.
- **LocalHands Style Hero Panel**: Large hero grid displaying the badge pill, slate titles "Your Knowledge, Our Priority.", and descriptions on the left, alongside the custom library reading graphic on the right.
- **Mock Catalog Search Bar**: Input field for users to inspect the catalog, prompting login modal access.
- **Decent, Professional Color Palette**: Uses dark slate/navy and terracotta orange accents over a clean white background. No neon pink or glowing shadows.
- **Sleek Modal Login Overlay**: Blurred backdrop card reveal triggered via the header action button.
- **Peach & Green Light Theme Toggle**: Swaps the dashboard to a peach background and forest green accents.

---

## 🏗️ Architecture & MVC/MVVM Connections

```
    VIEW (HTML/CSS)          VIEWMODEL (JS)          MODEL (Client JS)
 [ index.html/styles.css ] ↔ [ viewmodels/*.js ] ↔ [ models/*.js (fetch) ]
                                                            ↓ (HTTP API)
                                                   CONTROLLER (Flask Blueprint)
                                                     [ routes.py / app ]
                                                            ↓
                                                   MODEL (Server Python DB)
                                                     [ models.py / library.db ]
```

---

## 📂 Project Directory Structure

```
Aastha's Library/
├── app/
│   ├── __init__.py           # Flask app factory and DB setup hook
│   ├── models.py             # OOAD domain classes (User, Book, Member, BorrowRecord)
│   ├── routes.py             # API Blueprint routes (controllers)
│   └── database/
│       └── library.db        # SQLite3 Database file (relational, foreign keys active)
├── static/
│   ├── index.html            # Core View UI layout
│   ├── css/
│   │   └── styles.css        # Sacramento custom fonts and theme properties
│   └── js/
│       ├── app.js            # Router orchestrator (SPA routing, clock, theme toggles)
│       ├── models/           # Frontend Model layer (fetch services)
│       │   ├── authModel.js
│       │   ├── bookModel.js
│       │   ├── memberModel.js
│       │   └── borrowModel.js
│       └── viewmodels/       # Frontend ViewModel layer (form handlers, dynamic rendering)
│           ├── authViewModel.js
│           ├── dashboardViewModel.js
│           ├── booksViewModel.js
│           ├── membersViewModel.js
│           └── borrowViewModel.js
├── run.py                    # Runs server and auto-opens browser window
├── seed_db.py                # Pre-seeds SQLite database with default mock data
├── test_app.py               # Unit tests suite (verifies constraints and API responses)
├── requirements.txt          # Requirements file (flask)
└── README.md                 # User manual / instructions file
```

---

## ⚡ Setup & Launch Instructions

### 1. Pre-requisites
Ensure Python is installed on your system. Run a terminal inside the project folder:

```bash
pip install -r requirements.txt
```

### 2. Pre-populate Relational Schemas
To set up the SQLite database and seed it with initial books, members, borrow records, and overdue loans, run:

```bash
python seed_db.py
```

### 3. Run Application
Run the bootstrapper script:

```bash
python run.py
```
This automatically boots the server at `http://127.0.0.1:5000/` and launches it in your default browser.
- **Default Username**: `admin`
- **Default Password**: `Password123`

---

## 🧪 Verification & Auditing

### Unit Tests
To execute the automated unit testing suite verifying schema tables, authentication restrictions, and copy validations:
```bash
python test_app.py
```

