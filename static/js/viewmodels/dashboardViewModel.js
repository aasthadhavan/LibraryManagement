class DashboardViewModel {
    constructor(app) {
        this.app = app;
        this.stats = {
            total_books: 0,
            issued_books: 0,
            overdue_books: 0,
            total_members: 0,
            total_fines: 0.00
        };
    }

    async refreshStats() {
        const stats = await BorrowModel.getDashboardStats();
        if (stats) {
            this.stats = stats;
            this.updateView();
        }
    }

    updateView() {
        // Bind text elements
        document.getElementById('stat-total-books').innerText = this.stats.total_books;
        document.getElementById('stat-issued-books').innerText = this.stats.issued_books;
        document.getElementById('stat-overdue-books').innerText = this.stats.overdue_books;
        document.getElementById('stat-total-members').innerText = this.stats.total_members;
        document.getElementById('stat-total-fines').innerText = `$${parseFloat(this.stats.total_fines).toFixed(2)}`;

        // Dynamic updates for SVG bar charts based on stats
        const maxVal = Math.max(this.stats.total_books, 10); // avoid divide by zero, relative sizing
        const chartHeight = 140; // Max height in SVG coordinate system

        const totalBooksHeight = (this.stats.total_books / maxVal) * chartHeight;
        const issuedBooksHeight = (this.stats.issued_books / maxVal) * chartHeight;
        const overdueBooksHeight = (this.stats.overdue_books / maxVal) * chartHeight;

        const bar1 = document.querySelector('.bar-anim-1');
        const bar2 = document.querySelector('.bar-anim-2');
        const bar3 = document.querySelector('.bar-anim-3');

        if (bar1 && bar2 && bar3) {
            // Recalculate SVG coordinate details
            // Rectangle y is from top down. Height extends to baseline at y=170
            bar1.setAttribute('y', (170 - totalBooksHeight).toString());
            bar1.setAttribute('height', Math.max(totalBooksHeight, 5).toString());

            bar2.setAttribute('y', (170 - issuedBooksHeight).toString());
            bar2.setAttribute('height', Math.max(issuedBooksHeight, 5).toString());

            bar3.setAttribute('y', (170 - overdueBooksHeight).toString());
            bar3.setAttribute('height', Math.max(overdueBooksHeight, 5).toString());
        }
    }
}
