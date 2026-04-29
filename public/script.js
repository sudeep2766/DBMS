const complaintForm = document.getElementById('complaintForm');
const complaintsBody = document.getElementById('complaintsBody');
const responseMsg = document.getElementById('responseMsg');
const loginForm = document.getElementById('loginForm');
const loginMsg = document.getElementById('loginMsg');

// Handle form submission
if (complaintForm) {
    complaintForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Basic data extraction
        const data = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            mobile: document.getElementById('mobile').value,
            region: document.getElementById('region').value,
            incident_date: document.getElementById('incident_date').value,
            type: document.getElementById('type').value,
            description: document.getElementById('description').value,
            platform: document.getElementById('platform').value || null,
            suspect_info: document.getElementById('suspect_info').value || null,
            evidence_file: document.getElementById('evidence').files[0]?.name || null
        };

        try {
            const response = await fetch('/api/complaints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            
            if (response.ok) {
                responseMsg.style.color = '#00ff88';
                responseMsg.textContent = result.message;
                complaintForm.reset();
            } else {
                responseMsg.style.color = '#ff3e3e';
                responseMsg.textContent = result.error;
            }
        } catch (error) {
            console.error('Error:', error);
            responseMsg.textContent = 'Failed to submit complaint.';
        }
    });
}

// Handle login submission
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                window.location.href = result.redirect;
            } else {
                loginMsg.textContent = result.error;
            }
        } catch (error) {
            console.error('Error:', error);
            loginMsg.textContent = 'Login failed. Please try again.';
        }
    });
}

// Load complaints for dashboards
async function loadComplaints(view) {
    if (!complaintsBody) return;

    try {
        const response = await fetch('/api/complaints');
        if (response.status === 401) {
            window.location.href = '/login.html';
            return;
        }
        const complaints = await response.json();

        // Update Stats
        const total = complaints.length;
        const pending = complaints.filter(c => c.status === 'Pending').length;
        const resolved = complaints.filter(c => c.status === 'Resolved').length;

        if (document.getElementById('totalComplaints')) document.getElementById('totalComplaints').textContent = total;
        if (document.getElementById('pendingComplaints')) document.getElementById('pendingComplaints').textContent = pending;
        if (document.getElementById('resolvedComplaints')) document.getElementById('resolvedComplaints').textContent = resolved;

        complaintsBody.innerHTML = '';
        complaints.forEach(c => {
            const row = document.createElement('tr');
            const statusClass = `status-${c.status.toLowerCase().replace(' ', '-')}`;
            
            let actions = `
                <select onchange="updateStatus(${c.id}, this.value)" class="action-btn">
                    <option value="Pending" ${c.status === 'Pending' ? 'selected' : ''}>Pending</option>
                    <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Resolved" ${c.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                </select>
            `;

            if (view === 'admin') {
                actions += `<button onclick="deleteComplaint(${c.id})" class="action-btn delete-btn">Delete</button>`;
                row.innerHTML = `
                    <td>#${c.id}</td>
                    <td>
                        <div style="font-weight: 600;">${c.name}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${c.email} | ${c.mobile}</div>
                    </td>
                    <td>
                        <div>${c.type}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${c.region}</div>
                    </td>
                    <td><span class="status-badge ${statusClass}">${c.status}</span></td>
                    <td>${actions}</td>
                `;
            } else {
                row.innerHTML = `
                    <td>#${c.id}</td>
                    <td>
                        <div>${c.type}</div>
                        <div style="font-size: 0.8rem; color: var(--text-secondary);">${c.region} | ${c.incident_date}</div>
                    </td>
                    <td><span class="status-badge ${statusClass}">${c.status}</span></td>
                    <td>${actions}</td>
                `;
            }

            row.title = `Description: ${c.description}\nPlatform: ${c.platform || 'N/A'}\nSuspect: ${c.suspect_info || 'N/A'}`;
            complaintsBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching complaints:', error);
    }
}

async function updateStatus(id, status) {
    try {
        const response = await fetch(`/api/complaints/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            location.reload();
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

async function deleteComplaint(id) {
    if (!confirm('Are you sure you want to delete this complaint?')) return;
    try {
        const response = await fetch(`/api/complaints/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            location.reload();
        }
    } catch (error) {
        console.error('Error deleting complaint:', error);
    }
}

// PDF Generation Function
async function downloadPDF(view) {
    try {
        const response = await fetch('/api/complaints');
        const complaints = await response.json();

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation

        // Add title
        doc.setFontSize(20);
        doc.setTextColor(0, 114, 255);
        doc.text('CYBERSHIELD - COMPLAINTS REGISTER', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`View Level: ${view.toUpperCase()}`, 14, 33);

        const tableData = complaints.map(c => [
            c.id,
            `${c.name}\n${c.email}\n${c.mobile}`,
            c.type,
            c.region,
            c.incident_date,
            c.description.substring(0, 50) + (c.description.length > 50 ? '...' : ''),
            c.platform || 'N/A',
            c.status
        ]);

        doc.autoTable({
            startY: 40,
            head: [['ID', 'Reporter Details', 'Type', 'Region', 'Date', 'Description', 'Platform', 'Status']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 114, 255], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 245, 250] },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                5: { cellWidth: 50 } // Description column width
            }
        });

        doc.save(`cybershield_complaints_${view}_${Date.now()}.pdf`);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    }
}
