import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { POService } from '../../service/po.service';
import { CompanyService } from '../../../company/services/company.service';
import { CompanyProfileDto } from '../../../company/model/company.model';
import { environment } from '../../../../enviornments/environment';

@Component({
    selector: 'app-po-print-modal',
    standalone: true,
    imports: [CommonModule, MaterialModule],
    providers: [DatePipe, CurrencyPipe],
    templateUrl: './po-print-modal.component.html',
    styleUrls: ['./po-print-modal.component.scss']
})
export class PoPrintModalComponent implements OnInit {
    companyInfo: CompanyProfileDto | null = null;
    public isLoading: boolean = false;

    public isPageLoading: boolean = false;

    constructor(
        public dialogRef: MatDialogRef<PoPrintModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private poService: POService,
        private companyService: CompanyService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        console.log('PO Print Data:', this.data);
        this.loadCompanyProfile();
    }

    loadCompanyProfile(): void {
        this.isPageLoading = true;
        this.companyService.getCompanyProfile().subscribe({
            next: (res) => {
                this.companyInfo = res;
                this.isPageLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error fetching company profile:', err);
                this.isPageLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    getImgUrl(url: string | null | undefined): string {
        if (!url) return '';
        if (url.startsWith('data:image') || url.startsWith('http')) {
            return url;
        }
        const cleanUrl = url.startsWith('/') ? url.substring(1) : url;
        return `${environment.CompanyRootUrl}/${cleanUrl}`;
    }

    print(): void {
        const companyName = this.companyInfo?.name || 'Electric Inventory System';
        const logoUrl = this.companyInfo?.logoUrl ? this.getImgUrl(this.companyInfo.logoUrl) : '';

        // Construct Address String safely using multi-branch logic
        let addressStr = '';
        if (this.companyInfo?.addresses && this.companyInfo.addresses.length > 0) {
            const addr = this.companyInfo.addresses.find(a => a.isHeadOffice) || this.companyInfo.addresses[0];
            addressStr = `${addr.addressLine1}, ${addr.addressLine2 ? addr.addressLine2 + ', ' : ''}${addr.city}, ${addr.state} - ${addr.pinCode}`;
        }

        const contactInfo = `Contact: ${this.companyInfo?.primaryPhone || ''} | Email: ${this.companyInfo?.primaryEmail || ''}`;

        const printContent = document.querySelector('.print-content');
        if (!printContent) return;

        const WindowPrt = window.open('', '', 'left=0,top=0,width=900,height=900,toolbar=0,scrollbars=0,status=0');
        if (!WindowPrt) return;

        WindowPrt.document.write(`
            <html>
                <head>
                    <title>Print PO - ${this.data.poNumber || 'Document'}</title>
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                        /* Reuse styles from component or define print specific styles here */
                        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
                        .logo-section { display: flex; align-items: center; gap: 15px; }
                        .company-logo { width: 60px; height: 60px; object-fit: contain; }
                        .company-name h1 { margin: 0; font-size: 24px; color: #1a56db; }
                        .company-name p { margin: 2px 0; font-size: 12px; color: #666; }
                        .doc-title h2 { margin: 0; color: #444; }

                        .po-info-card { background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                        .info-row { display: flex; justify-content: space-between; }
                        .info-group { display: flex; flex-direction: column; }
                        .info-group label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
                        .info-group span { font-weight: 600; font-size: 14px; }

                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; color: #555; }
                        td { padding: 10px; border-bottom: 1px solid #eee; font-size: 13px; }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }

                        .invoice-summary { margin-top: 30px; display: flex; flex-direction: column; align-items: flex-end; }
                        .summary-row { display: flex; justify-content: space-between; width: 250px; padding: 5px 0; }
                        .summary-row.grand-total { font-weight: bold; font-size: 16px; color: #1a56db; border-top: 1px solid #eee; margin-top: 10px; padding-top: 10px; }
                        
                        @media print {
                            .no-print { display: none; }
                            body { -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body onload="window.print();window.close()">
                     <div class="header">
                        <div class="logo-section">
                            ${logoUrl ? `<img src="${logoUrl}" class="company-logo" alt="Logo">` : ''}
                            <div class="company-name">
                                <h1>${companyName}</h1>
                                <p>${addressStr}</p>
                                <p>${contactInfo}</p>
                            </div>
                        </div>
                        <div class="doc-title">
                             <h2>${this.data?.status === 'Received' ? 'TAX INVOICE' : (this.data?.headerTitle || 'BILL OF SUPPLY')}</h2>
                        </div>
                    </div>

                    <!-- Re-use content bodies (PO Info, Table, Summary) from DOM but ideally constructed clean -->
                     <div class="po-info-card">
                        <div class="info-row">
                            <div class="info-group">
                                <label>PO Number</label>
                                <span>${this.data?.poNumber || 'N/A'}</span>
                            </div>
                            <div class="info-group">
                                <label>Date</label>
                                <span>${new DatePipe('en-US').transform(this.data?.poDate, 'dd MMM yyyy')}</span>
                            </div>
                            <div class="info-group">
                                <label>Supplier</label>
                                <span>${this.data?.supplierName || 'Unknown'}</span>
                            </div>
                        </div>
                    </div>

                    ${document.querySelector('.items-table')?.outerHTML || ''}
                    ${document.querySelector('.invoice-summary')?.outerHTML || ''}

                </body>
            </html>
        `);
        WindowPrt.document.close();
    }

    downloadPDF(): void {
        console.log('Download triggered for ID:', this.data?.id);
        if (!this.data?.id) {
            console.error('Missing ID in data');
            return;
        }

        this.isLoading = true; // Start loader
        this.poService.downloadPOReport(this.data.id).subscribe({
            next: (blob: Blob) => {
                this.isLoading = false; // Stop loader
                // Angular sometimes misses this change if it happens outside its zone or too fast
                this.cdr.detectChanges();

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `PO-${this.data.poNumber || 'Report'}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                console.log('Download initiated successfully');
            },
            error: (err) => {
                this.isLoading = false; // Stop loader on error
                this.cdr.detectChanges();
                console.error('Download failed', err);
            }
        });
    }

    close(): void {
        this.dialogRef.close();
    }
}
