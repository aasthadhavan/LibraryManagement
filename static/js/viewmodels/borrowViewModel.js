class BorrowViewModel {
    constructor(app) {
        this.app = app;
        this.transactions = [];
        this.booksList = [];
        this.membersList = [];
    }

    async loadBorrowData() {
        this.app.showPreloader(true);
        this.transactions = await BorrowModel.getAllTransactions();
        this.booksList = await BookModel.getAll();
        this.membersList = await MemberModel.getAll();
        this.app.showPreloader(false);
        
        this.populateDropdowns();
        this.setDefaultDates();
        this.render();
    }

    populateDropdowns() {
        const bookSelect = document.getElementById('issue-book-select');
        const memberSelect = document.getElementById('issue-member-select');

        // Preserve first "placeholder" option
        bookSelect.innerHTML = '<option value="" disabled selected>Choose a book...</option>';
        memberSelect.innerHTML = '<option value="" disabled selected>Choose a member...</option>';

        // Populate books (only those with available copies)
        this.booksList.forEach(book => {
            if (book.available_copies > 0) {
                const opt = document.createElement('option');
                opt.value = book.id;
                opt.innerText = `${book.title} (By: ${book.author} - Loc: ${book.location || 'N/A'})`;
                bookSelect.appendChild(opt);
            }
        });

        // Populate active members
        this.membersList.forEach(member => {
            if (member.status === 'active') {
                const opt = document.createElement('option');
                opt.value = member.id;
                opt.innerText = `${member.fullName} (${member.email || member.phone || 'No Contact Info'})`;
                memberSelect.appendChild(opt);
            }
        });
    }

    setDefaultDates() {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        
        const todayStr = `${yyyy}-${mm}-${dd}`;
        document.getElementById('issue-date').value = todayStr;

        // Default due date to 14 days later
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + 14);
        const d_yyyy = dueDate.getFullYear();
        const d_mm = String(dueDate.getMonth() + 1).padStart(2, '0');
        const d_dd = String(dueDate.getDate()).padStart(2, '0');
        
        document.getElementById('due-date').value = `${d_yyyy}-${d_mm}-${d_dd}`;
    }

    async handleIssue(event) {
        event.preventDefault();

        const bookId = parseInt(document.getElementById('issue-book-select').value);
        const memberId = parseInt(document.getElementById('issue-member-select').value);
        const issueDate = document.getElementById('issue-date').value;
        const dueDate = document.getElementById('due-date').value;

        if (!bookId || !memberId || !dueDate) {
            this.app.showNotification("Please select a book, a member, and set a due date.", "warning");
            return;
        }

        this.app.showPreloader(true);
        const result = await BorrowModel.borrowBook(bookId, memberId, issueDate, dueDate);
        this.app.showPreloader(false);

        if (result.success) {
            this.app.showNotification(result.message, "success");
            
            // Reset form selections and reload lists
            document.getElementById('issue-book-select').value = "";
            document.getElementById('issue-member-select').value = "";
            
            await this.loadBorrowData();
            this.app.dashboardVM.refreshStats();
        } else {
            this.app.showNotification(result.message || "Failed to issue book.", "error");
        }
    }

    openReturnModal(recordId) {
        const record = this.transactions.find(t => t.id === recordId);
        if (!record) {
            this.app.showNotification("Record details could not be loaded.", "error");
            return;
        }

        document.getElementById('return-record-id').value = record.id;
        document.getElementById('return-display-book').innerText = record.book_title;
        document.getElementById('return-display-member').innerText = record.member_name;
        document.getElementById('return-display-issue-date').innerText = record.issue_date;
        document.getElementById('return-display-due-date').innerText = record.due_date;

        // Set return date input value to today
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        
        document.getElementById('return-date').value = `${yyyy}-${mm}-${dd}`;
        
        this.updateFineEstimation();
        document.getElementById('return-modal').classList.remove('hidden');
    }

    closeReturnModal() {
        document.getElementById('return-modal').classList.add('hidden');
        document.getElementById('return-form').reset();
    }

    updateFineEstimation() {
        const dueDateStr = document.getElementById('return-display-due-date').innerText;
        const returnDateStr = document.getElementById('return-date').value;

        if (!dueDateStr || !returnDateStr) return;

        const due = new Date(dueDateStr);
        const ret = new Date(returnDateStr);
        
        // Zero time elements to compare dates only
        due.setHours(0,0,0,0);
        ret.setHours(0,0,0,0);

        const fineBox = document.getElementById('return-fine-box');
        
        if (ret > due) {
            const diffTime = Math.abs(ret - due);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            const fine = diffDays * 2.0; // $2.00 fine per day late
            
            document.getElementById('return-fine-display').innerText = `$${fine.toFixed(2)} (${diffDays} day(s) overdue)`;
            fineBox.classList.remove('hidden');
        } else {
            fineBox.classList.add('hidden');
        }
    }

    async handleSubmitReturn(event) {
        event.preventDefault();
        
        const recordId = parseInt(document.getElementById('return-record-id').value);
        const returnDate = document.getElementById('return-date').value;

        if (!recordId || !returnDate) {
            this.app.showNotification("Return date is required.", "warning");
            return;
        }

        this.app.showPreloader(true);
        const result = await BorrowModel.returnBook(recordId, returnDate);
        this.app.showPreloader(false);

        if (result.success) {
            let msg = result.message;
            if (result.fine_amount > 0) {
                msg += ` Dynamic fine applied: $${result.fine_amount.toFixed(2)}`;
            }
            this.app.showNotification(msg, "success");
            this.closeReturnModal();
            await this.loadBorrowData();
            this.app.dashboardVM.refreshStats();
        } else {
            this.app.showNotification(result.message || "Failed to record return.", "error");
        }
    }

    openIssueForm() {
        // Just shifts UI focus to the issue tab view
        window.location.hash = "#borrow";
    }

    render() {
        const tbody = document.getElementById('transactions-table-body');
        tbody.innerHTML = "";

        if (this.transactions.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        <i class="fa-solid fa-receipt" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
                        No circulation transactions found.
                    </td>
                </tr>
            `;
            return;
        }

        this.transactions.forEach(t => {
            const tr = document.createElement('tr');
            
            // Format status badge
            let statusBadge = "";
            let actionBtn = "";
            
            if (t.status === 'returned') {
                statusBadge = `<span class="badge badge-returned"><i class="fa-solid fa-circle-check"></i> returned</span>`;
                actionBtn = `<button class="btn btn-secondary btn-sm" disabled><i class="fa-solid fa-square-minus"></i> Closed</button>`;
            } else if (t.status === 'overdue') {
                statusBadge = `<span class="badge badge-overdue"><i class="fa-solid fa-circle-exclamation"></i> overdue</span>`;
                actionBtn = `<button class="btn btn-orange btn-sm" onclick="app.borrowVM.openReturnModal(${t.id})"><i class="fa-solid fa-rotate-left"></i> Return</button>`;
            } else {
                statusBadge = `<span class="badge badge-issued"><i class="fa-solid fa-spinner"></i> checked-out</span>`;
                actionBtn = `<button class="btn btn-orange btn-sm" onclick="app.borrowVM.openReturnModal(${t.id})"><i class="fa-solid fa-rotate-left"></i> Return</button>`;
            }

            // Fine text format
            const fineText = t.fine_amount > 0 ? `<strong class="required">$${parseFloat(t.fine_amount).toFixed(2)}</strong>` : `<span style="color: var(--text-muted)">$0.00</span>`;

            tr.innerHTML = `
                <td><strong>${this.app.escapeHtml(t.book_title)}</strong></td>
                <td>${this.app.escapeHtml(t.member_name)}</td>
                <td>${this.app.escapeHtml(t.issue_date)}</td>
                <td>${this.app.escapeHtml(t.due_date)}</td>
                <td>${statusBadge}</td>
                <td>${fineText}</td>
                <td class="text-right">${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}
