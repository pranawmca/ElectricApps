import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SaleReturnService } from '../services/sale-return.service';
import { MaterialModule } from '../../../../shared/material/material/material-module';

@Component({
    selector: 'app-credit-note-view',
    standalone: true,
    imports: [CommonModule, MaterialModule],
    templateUrl: './credit-note-view.component.html',
    styleUrl: './credit-note-view.component.scss',
})
export class CreditNoteViewComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private srService = inject(SaleReturnService);

    creditNoteData: any;
    isLoading = true;

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            const id = params['id'];
            if (id) {
                this.loadCreditNote(id);
            }
        });
    }

    loadCreditNote(id: string) {
        this.isLoading = true;
        this.srService.getSaleReturnById(id).subscribe({
            next: (res) => {
                this.creditNoteData = res;
                this.isLoading = false;
            },
            error: () => this.isLoading = false
        });
    }

    print() {
        window.print();
    }

    goBack() {
        this.router.navigate(['/app/inventory/sale-return']);
    }
}
