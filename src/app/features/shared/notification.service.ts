import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { StatusDialogComponent } from '../../shared/components/status-dialog-component/status-dialog-component';
// Path check kar lein

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    constructor(private dialog: MatDialog) { }

    /**
     * Universal popup for Success, Error or Warning
     * @param isSuccess Boolean to toggle Green/Red UI
     * @param message The text to display
     */
    showStatus(isSuccess: boolean, message: string): void {
        this.dialog.open(StatusDialogComponent, {
            width: '400px',
            // data structure matches your StatusDialogComponent constructor
            data: { isSuccess, message },
            // Responsive class
            panelClass: 'responsive-dialog'
        });
    }

    /**
 * Check if Delivery Date is greater than or equal to PO Date
 * @param poDate Selection date of PO
 * @param deliveryDate Expected arrival date
 */
    isValidDeliveryDate(poDate: any, deliveryDate: any): boolean {
        if (!poDate || !deliveryDate) return true;

        const parseDate = (dateInput: any) => {
            if (dateInput instanceof Date) return dateInput.setHours(0, 0, 0, 0);

            // Agar string hai (e.g., "2026-01-25") toh split karke parse karein
            if (typeof dateInput === 'string' && dateInput.includes('-')) {
                const [year, month, day] = dateInput.split('-').map(Number);
                return new Date(year, month - 1, day).getTime();
            }
            return new Date(dateInput).setHours(0, 0, 0, 0);
        };

        const d1 = parseDate(poDate);
        const d2 = parseDate(deliveryDate);

        // getTime() comparison 
        return d2 >= d1;
    }
}
