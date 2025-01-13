// repairs/actions.js
export const bulkPrintReceivingRepairs = (repairs) => {
    // Filter repairs with status "RECEIVING"
    const receivingRepairs = repairs.filter(repair => repair.status === "RECEIVING");

    if (receivingRepairs.length === 0) {
        alert("No repairs with status 'RECEIVING' to print.");
        return;
    }

    // Generate a printable HTML document with inline styles for a consistent ticket layout
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Unable to open print window. Please check your browser settings.');
        return;
    }

    printWindow.document.write(`
        <html>
            <head>
                <title>Bulk Print Repairs</title>
                <style>
                    @page { size: 4in 6in; margin: 0; }
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    .ticket-container {
                        padding: 30px;
                        width: 4in;
                        height: 6in;
                        border: 1px solid #000;
                        border-radius: 8px;
                        box-shadow: 0 0 5px rgba(0,0,0,0.1);
                        display: flex;
                        flex-direction: column;
                        justify-content: space-between;
                    }
                    h1, h2, p { margin: 5px 0; }
                    .logo { width: 100px; height: 50px; }
                    .divider { border-top: 1px solid black; margin: 10px 0; }
                    .repair-header { display: flex; justify-content: space-between; }
                    .repair-tasks { padding-top: 8px; }
                    .repair-tasks ul { padding: 0; list-style: none; }
                    .repair-tasks li { padding: 2px 0; }
                    .repair-image { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; }
                    .status-checklist { padding-top: 10px; }
                    .status-checklist div { display: flex; align-items: center; }
                    .barcode { text-align: center; padding-top: 10px; }
                </style>
            </head>
            <body>
                <h1 style="text-align: center;">Receiving Repairs</h1>
                ${receivingRepairs.map(repair => `
                    <div class="ticket-container">
                        <!-- Header Section -->
                        <div class="repair-header">
                            <img src="/logos/[efd]500x250.png" alt="Logo" class="logo"/>
                            <div>
                                <h2>${repair.clientName}</h2>
                                <p><strong>Due Date:</strong> ${repair.promiseDate || 'N/A'}</p>
                                <p><strong>Metal Type:</strong> ${repair.metalType || 'N/A'}</p>
                                <p><strong>Description:</strong> ${repair.description}</p>
                            </div>
                        </div>
                        
                        <!-- Divider -->
                        <div class="divider"></div>

                        <!-- Tasks Section -->
                        <div class="repair-tasks">
                            <p><strong>Tasks:</strong></p>
                            <ul>
                                ${repair.repairTasks.map(task => `
                                    <li>${task.qty}x ${task.title}</li>
                                `).join('')}
                            </ul>
                        </div>

                        <!-- Picture and Status Section -->
                        <div class="repair-header">
                            <div class="repair-image-section">
                                ${repair.picture ? `<img src="${repair.picture}" class="repair-image"/>` : '<p>No Image Available</p>'}
                            </div>
                            <div class="status-checklist">
                                <p><strong>Status Checklist:</strong></p>
                                ${["Needs Parts", "Parts Ordered", "Ready for Work", "QC"].map(status => `
                                    <div>
                                        <input type="checkbox"/> ${status}
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Divider -->
                        <div class="divider"></div>

                        <!-- Barcode Section -->
                        <div class="barcode">
                            <p><strong>Repair ID: ${repair.repairID}</strong></p>
                        </div>
                    </div>
                    <div class="divider"></div>
                `).join('')}
            </body>
        </html>
    `);

    // Close the document and trigger the print
    printWindow.document.close();
    printWindow.print();
};
