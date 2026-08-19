class MembersViewModel {
    constructor(app) {
        this.app = app;
        this.members = [];
        this.searchQuery = "";
        this.currentEditingId = null;
    }

    async loadMembers() {
        this.members = await MemberModel.getAll(this.searchQuery);
        this.render();
    }

    handleSearch(event) {
        this.searchQuery = event.target.value;
        this.loadMembers();
    }

    openAddModal() {
        this.currentEditingId = null;
        document.getElementById('member-modal-title').innerText = "Register New Member";
        document.getElementById('member-modal-submit').innerText = "Register Member";
        document.getElementById('member-form-id').value = "";
        document.getElementById('member-form').reset();
        document.getElementById('member-status').value = "active";
        document.getElementById('member-modal').classList.remove('hidden');
    }

    async editMember(id) {
        this.app.showPreloader(true);
        const member = await MemberModel.getById(id);
        this.app.showPreloader(false);
        if (member) {
            this.currentEditingId = id;
            document.getElementById('member-modal-title').innerText = "Edit Member Details";
            document.getElementById('member-modal-submit').innerText = "Update Details";
            document.getElementById('member-form-id').value = member.id;
            document.getElementById('member-first-name').value = member.first_name;
            document.getElementById('member-last-name').value = member.last_name;
            document.getElementById('member-email').value = member.email || "";
            document.getElementById('member-phone').value = member.phone || "";
            document.getElementById('member-status').value = member.status;
            
            document.getElementById('member-modal').classList.remove('hidden');
        } else {
            this.app.showNotification("Failed to fetch member details.", "error");
        }
    }

    closeModal() {
        document.getElementById('member-modal').classList.add('hidden');
        document.getElementById('member-form').reset();
        this.currentEditingId = null;
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const first_name = document.getElementById('member-first-name').value.trim();
        const last_name = document.getElementById('member-last-name').value.trim();
        const email = document.getElementById('member-email').value.trim();
        const phone = document.getElementById('member-phone').value.trim();
        const status = document.getElementById('member-status').value;

        if (!first_name || !last_name) {
            this.app.showNotification("First Name and Last Name are required.", "warning");
            return;
        }

        const member = new MemberModel({
            id: this.currentEditingId,
            first_name, last_name, email, phone, status
        });

        this.app.showPreloader(true);
        const result = await member.save();
        this.app.showPreloader(false);

        if (result.success) {
            this.app.showNotification(result.message, "success");
            this.closeModal();
            this.loadMembers();
            this.app.dashboardVM.refreshStats();
        } else {
            this.app.showNotification(result.message || "Failed to save member details.", "error");
        }
    }

    async deleteMember(id) {
        if (!confirm("Are you sure you want to permanently delete this member registration?")) {
            return;
        }

        this.app.showPreloader(true);
        const result = await MemberModel.delete(id);
        this.app.showPreloader(false);

        if (result.success) {
            this.app.showNotification(result.message, "success");
            this.loadMembers();
            this.app.dashboardVM.refreshStats();
        } else {
            this.app.showNotification(result.message || "Failed to delete member.", "error");
        }
    }

    render() {
        const tbody = document.getElementById('members-table-body');
        tbody.innerHTML = "";

        if (this.members.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        <i class="fa-solid fa-users-slash" style="font-size: 2rem; margin-bottom: 0.5rem; display: block; opacity: 0.5;"></i>
                        No registered members matching query.
                    </td>
                </tr>
            `;
            return;
        }

        this.members.forEach(member => {
            const tr = document.createElement('tr');
            
            // Member status formatting
            const statusClass = member.status === 'active' ? 'badge-active' : 'badge-suspended';

            tr.innerHTML = `
                <td><strong>${this.app.escapeHtml(member.fullName)}</strong></td>
                <td>${this.app.escapeHtml(member.email || 'N/A')}</td>
                <td>${this.app.escapeHtml(member.phone || 'N/A')}</td>
                <td>${this.app.escapeHtml(member.membership_date)}</td>
                <td>
                    <span class="badge ${statusClass}">
                        ${member.status}
                    </span>
                </td>
                <td class="text-right">
                    <div class="actions-cell">
                        <button class="btn btn-secondary btn-icon btn-sm" onclick="app.membersVM.editMember(${member.id})" title="Edit Profile">
                            <i class="fa-solid fa-user-pen"></i>
                        </button>
                        <button class="btn btn-danger btn-icon btn-sm" onclick="app.membersVM.deleteMember(${member.id})" title="De-register Member">
                            <i class="fa-solid fa-user-minus"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}
