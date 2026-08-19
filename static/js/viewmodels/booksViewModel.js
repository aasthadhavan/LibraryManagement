class BooksViewModel {
    constructor(app) {
        this.app = app;
        this.books = [];
        this.searchQuery = "";
        this.currentEditingId = null;
    }

    async loadBooks() {
        this.books = await BookModel.getAll(this.searchQuery);
        this.render();
    }

    handleSearch(event) {
        this.searchQuery = event.target.value;
        this.loadBooks();
    }

    openAddModal() {
        this.currentEditingId = null;
        document.getElementById('book-modal-title').innerText = "Add New Book";
        document.getElementById('book-modal-submit').innerText = "Add Book";
        document.getElementById('book-form-id').value = "";
        document.getElementById('book-form').reset();
        document.getElementById('book-modal').classList.remove('hidden');
    }

    async editBook(id) {
        this.app.showPreloader(true);
        const book = await BookModel.getById(id);
        this.app.showPreloader(false);
        if (book) {
            this.currentEditingId = id;
            document.getElementById('book-modal-title').innerText = "Edit Book Details";
            document.getElementById('book-modal-submit').innerText = "Update Details";
            document.getElementById('book-form-id').value = book.id;
            document.getElementById('book-title').value = book.title;
            document.getElementById('book-author').value = book.author;
            document.getElementById('book-isbn').value = book.isbn;
            document.getElementById('book-genre').value = book.genre || "";
            document.getElementById('book-year').value = book.published_year || "";
            document.getElementById('book-copies').value = book.total_copies;
            document.getElementById('book-location').value = book.location || "";
            
            document.getElementById('book-modal').classList.remove('hidden');
        } else {
            this.app.showNotification("Failed to fetch book data.", "error");
        }
    }

    closeModal() {
        document.getElementById('book-modal').classList.add('hidden');
        document.getElementById('book-form').reset();
        this.currentEditingId = null;
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const title = document.getElementById('book-title').value.trim();
        const author = document.getElementById('book-author').value.trim();
        const isbn = document.getElementById('book-isbn').value.trim();
        const genre = document.getElementById('book-genre').value.trim();
        const published_year = document.getElementById('book-year').value ? parseInt(document.getElementById('book-year').value) : null;
        const total_copies = parseInt(document.getElementById('book-copies').value);
        const location = document.getElementById('book-location').value.trim();

        if (!title || !author || !isbn) {
            this.app.showNotification("Title, Author, and ISBN are required fields.", "warning");
            return;
        }

        const book = new BookModel({
            id: this.currentEditingId,
            title, author, isbn, genre, published_year, total_copies, location
        });

        this.app.showPreloader(true);
        const result = await book.save();
        this.app.showPreloader(false);

        if (result.success) {
            this.app.showNotification(result.message, "success");
            this.closeModal();
            this.loadBooks();
            this.app.dashboardVM.refreshStats();
        } else {
            this.app.showNotification(result.message || "Failed to save book.", "error");
        }
    }

    async deleteBook(id) {
        if (!confirm("Are you sure you want to permanently delete this book from the catalog?")) {
            return;
        }

        this.app.showPreloader(true);
        const result = await BookModel.delete(id);
        this.app.showPreloader(false);

        if (result.success) {
            this.app.showNotification(result.message, "success");
            this.loadBooks();
            this.app.dashboardVM.refreshStats();
        } else {
            this.app.showNotification(result.message || "Failed to delete book.", "error");
        }
    }

    render() {
        const tbody = document.getElementById('books-table-body');
        tbody.innerHTML = "";

        if (this.books.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        <i class="fa-solid fa-book-open-reader" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
                        No books matching search criteria.
                    </td>
                </tr>
            `;
            return;
        }

        this.books.forEach(book => {
            const tr = document.createElement('tr');
            
            // Available / Total copies display logic
            let copiesBadgeClass = "badge-active";
            if (book.available_copies === 0) {
                copiesBadgeClass = "badge-suspended";
            } else if (book.available_copies < book.total_copies) {
                copiesBadgeClass = "badge-issued";
            }

            tr.innerHTML = `
                <td><strong>${this.app.escapeHtml(book.title)}</strong></td>
                <td>${this.app.escapeHtml(book.author)}</td>
                <td><span class="isbn-text">${this.app.escapeHtml(book.isbn)}</span></td>
                <td>${this.app.escapeHtml(book.genre || 'N/A')}</td>
                <td>${this.app.escapeHtml(book.location || 'Unassigned')}</td>
                <td>
                    <span class="badge ${copiesBadgeClass}">
                        ${book.available_copies} / ${book.total_copies} available
                    </span>
                </td>
                <td class="text-right">
                    <div class="actions-cell">
                        <button class="btn btn-secondary btn-icon btn-sm" onclick="app.booksVM.editBook(${book.id})" title="Edit Details">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn btn-danger btn-icon btn-sm" onclick="app.booksVM.deleteBook(${book.id})" title="Delete Book">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}
