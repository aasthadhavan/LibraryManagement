class MemberModel {
    constructor(data = {}) {
        this.id = data.id || null;
        this.first_name = data.first_name || "";
        this.last_name = data.last_name || "";
        this.email = data.email || "";
        this.phone = data.phone || "";
        this.membership_date = data.membership_date || "";
        this.status = data.status || "active";
    }

    get fullName() {
        return `${this.first_name} ${this.last_name}`;
    }

    static async getAll(searchQuery = "") {
        try {
            const url = searchQuery ? `/api/members?search=${encodeURIComponent(searchQuery)}` : '/api/members';
            const response = await fetch(url);
            const data = await response.json();
            if (data.success) {
                return data.members.map(m => new MemberModel(m));
            }
            return [];
        } catch (error) {
            console.error("MemberModel.getAll Error:", error);
            return [];
        }
    }

    static async getById(id) {
        try {
            const response = await fetch(`/api/members/${id}`);
            const data = await response.json();
            if (data.success) {
                return new MemberModel(data.member);
            }
            return null;
        } catch (error) {
            console.error("MemberModel.getById Error:", error);
            return null;
        }
    }

    async save() {
        try {
            const url = this.id ? `/api/members/${this.id}` : '/api/members';
            const method = this.id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: this.first_name,
                    last_name: this.last_name,
                    email: this.email,
                    phone: this.phone,
                    status: this.status
                })
            });
            return await response.json();
        } catch (error) {
            console.error("MemberModel.save Error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }

    static async delete(id) {
        try {
            const response = await fetch(`/api/members/${id}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error("MemberModel.delete Error:", error);
            return { success: false, message: "Network error occurred." };
        }
    }
}
