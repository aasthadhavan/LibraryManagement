class BookModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.title = data.title || "";
        this.author = data.author || "";
        this.isbn = data.isbn || "";
        this.genre = data.genre || "";
        this.published_year = data.published_year || null;
        this.total_copies = data.total_copies || 1;
        this.available_copies = data.available_copies || 1;
        this.location = data.location || "";
    }

    static async getAll(searchQuery = "") {
        try {
            const url = searchQuery ? `/api/books?search=${encodeURIComponent(searchQuery)}` : '/api/books';
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                return data.books.map(b => new BookModel(b));
            }
            return [];
        } catch (error) {
            console.error("BookModel.getAll Error:", error);
            return [];
        }
    }

    static async getById(id) {
        try {
            const response = await fetch(`/api/books/${id}`);
            const data = await response.json();
            if (data.success) {
                return new BookModel(data.book);
            }
            return null;
        } catch (error) {
            console.error("BookModel.getById Error:", error);
            return null;
        }
    }

    async save() {
        try {
            const url = this.id ? `/api/books/${this.id}` : '/api/books';
            const method = this.id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: this.title,
                    author: this.author,
                    isbn: this.isbn,
                    genre: this.genre,
                    published_year: this.published_year,
                    total_copies: this.total_copies,
                    location: this.location
                })
            });
            return await response.json();
        } catch (error) {
            console.error("BookModel.save Error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }

    static async delete(id) {
        try {
            const response = await fetch(`/api/books/${id}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error("BookModel.delete Error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }
}
