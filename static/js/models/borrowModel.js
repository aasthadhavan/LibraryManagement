class BorrowRecordModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.book_id = data.book_id || null;
        this.member_id = data.member_id || null;
        this.issue_date = data.issue_date || "";
        this.due_date = data.due_date || "";
        this.return_date = data.return_date || null;
        this.fine_amount = data.fine_amount || 0.00;
        this.status = data.status || "issued";
        
        // Joined details
        this.book_title = data.book_title || "";
        this.member_name = data.member_name || "";
    }
}

class BorrowModel {
    static async getAllTransactions() {
        try {
            const response = await fetch('/api/transactions');
            const data = await response.json();
            if (data.success) {
                return data.transactions.map(t => new BorrowRecordModel(t));
            }
            return [];
        } catch (error) {
            console.error("BorrowModel.getAllTransactions Error:", error);
            return [];
        }
    }

    static async borrowBook(bookId, memberId, issueDate, dueDate) {
        try {
            const response = await fetch('/api/borrow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    book_id: bookId,
                    member_id: memberId,
                    issue_date: issueDate,
                    due_date: dueDate
                })
            });
            return await response.json();
        } catch (error) {
            console.error("BorrowModel.borrowBook Error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }

    static async returnBook(recordId, returnDate) {
        try {
            const response = await fetch('/api/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    record_id: recordId,
                    return_date: returnDate
                })
            });
            return await response.json();
        } catch (error) {
            console.error("BorrowModel.returnBook Error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }

    static async getDashboardStats() {
        try {
            const response = await fetch('/api/dashboard/stats');
            const data = await response.json();
            if (data.success) {
                return data.stats;
            }
            return null;
        } catch (error) {
            console.error("BorrowModel.getDashboardStats Error:", error);
            return null;
        }
    }
}
