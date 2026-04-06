import { ChangeDetectorRef, Component, EventEmitter, inject, Input, OnInit, Output, OnChanges, SimpleChanges, AfterViewInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { Validators, FormBuilder, ReactiveFormsModule, FormGroup, FormArray, FormControl, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, of, Subject, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, finalize, tap } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { PriceListService } from '../service/pricelist.service';
import { ProductService } from '../../product/service/product.service';
import { StatusDialogComponent } from '../../../../shared/components/status-dialog-component/status-dialog-component';
import { ProductSelectionDialogComponent } from '../../../../shared/components/product-selection-dialog/product-selection-dialog';

@Component({
  selector: 'app-pricelist-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './pricelist-form.html',
  styleUrl: './pricelist-form.scss',
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.5)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.5)' }))
      ])
    ])
  ]
})
export class PricelistForm implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  isAtTop = true;
  private scrollContainer: HTMLElement | null = null;
  private scrollListener: any;
  private destroy$ = new Subject<void>();

  onScroll() {
    if (this.scrollContainer) {
      const { scrollTop } = this.scrollContainer;
      this.isAtTop = scrollTop < 50;
      this.cdr.detectChanges();
    }
  }

  toggleScroll() {
    if (this.scrollContainer) {
      if (this.isAtTop) {
        this.scrollContainer.scrollTo({ top: this.scrollContainer.scrollHeight, behavior: 'smooth' });
      } else {
        this.scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.scrollContainer = document.querySelector('.content');
      if (this.scrollContainer) {
        this.scrollListener = this.onScroll.bind(this);
        this.scrollContainer.addEventListener('scroll', this.scrollListener);
      }
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.scrollContainer && this.scrollListener) {
      this.scrollContainer.removeEventListener('scroll', this.scrollListener);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
  priceListForm!: FormGroup;
  filteredProducts: any[][] = [];
  loadingRowIndex: number | null = null;

  applicableGroups = [
    { label: 'All', value: 'ALL' },
    { label: 'Wholesale', value: 'WHOLESALE' },
    { label: 'Retail', value: 'RETAIL' },
    { label: 'Dealer', value: 'DEALER' },
    { label: 'Distributor', value: 'DISTRIBUTOR' },
    { label: 'Project / Contractor', value: 'PROJECT' }
  ];

  private productService = inject(ProductService);
  private priceListService = inject(PriceListService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  loading: boolean = false;

  @Input() editId: string | null = null;
  @Output() actionComplete = new EventEmitter<any>();

  isEditMode = false;
  showError = false;
  searchTerm: string = '';
  constructor(private fb: FormBuilder, private dialog: MatDialog) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['editId'] && !changes['editId'].firstChange) {
      const id = changes['editId'].currentValue;
      if (id) {
        this.loadPriceList(id);
      } else {
        this.isEditMode = false;
        this.priceListForm.reset();
        this.initForm();
        this.addItemRow();
      }
    }
  }

  ngOnInit(): void {
    this.initForm();

    const id = this.editId || this.route.snapshot.params['id'];

    if (id) {
      this.loadPriceList(id);
    } else {
      this.addItemRow();
    }

    this.priceListForm.get('priceType')?.valueChanges.subscribe(type => {
      this.updateAllRates(type);
    });

    this.priceListForm.get('defaultDiscount')?.valueChanges.subscribe(disc => {
      this.updateAllDiscounts(disc);
    });
  }

  updateAllDiscounts(disc: number) {
    this.items.controls.forEach(control => {
      control.get('discountPercent')?.setValue(disc, { emitEvent: false });
    });
    this.cdr.detectChanges();
  }

  initForm() {
    this.priceListForm = this.fb.group({
      name: ['', Validators.required],
      priceType: ['SALES', Validators.required],
      code: ['', Validators.required],
      applicableGroup: ['ALL'],
      currency: ['INR'],
      description: [''],
      validFrom: [new Date(), Validators.required],
      validTo: [null],
      isActive: [true],
      defaultDiscount: [0, [Validators.min(0), Validators.max(100)]],
      priceListItems: this.fb.array([])
    });
  }

  get items(): FormArray {
    return this.priceListForm.get('priceListItems') as FormArray;
  }

  updateAllRates(type: string) {
    this.items.controls.forEach((control) => {
      const product = control.get('productSearch')?.value;
      if (product && typeof product === 'object') {
        const newRate = type === 'SALES'
          ? (product.saleRate || product.mrp || product.rate || product.basePurchasePrice || 0)
          : (product.basePurchasePrice || 0);
        control.get('rate')?.setValue(newRate);
      }
    });
    this.cdr.detectChanges();
  }

  openBulkAddDialog() {
    const existingIds = this.items.controls
      .map(c => c.get('productId')?.value)
      .filter(id => id);

    const dialogRef = this.dialog.open(ProductSelectionDialogComponent, {
      width: '950px',
      maxWidth: '95vw',
      disableClose: false,
      data: { existingIds }
    });

    dialogRef.afterClosed().subscribe((selectedProducts: any[]) => {
      if (selectedProducts && selectedProducts.length > 0) {
        // Clear the first empty row if it's untouched
        if (this.items.length === 1 && !this.items.at(0).get('productId')?.value) {
          this.items.removeAt(0);
        }

        selectedProducts.forEach(product => {
          const isDuplicate = this.items.controls.some(control => control.get('productId')?.value === product.id);
          if (!isDuplicate) {
            this.addProductToForm(product);
          }
        });
        this.cdr.detectChanges();
      }
    });
  }

  addProductToForm(product: any) {
    const priceType = this.priceListForm.get('priceType')?.value;
    const defaultRate = priceType === 'SALES'
      ? (product.saleRate || product.mrp || product.rate || product.basePurchasePrice || 0)
      : (product.basePurchasePrice || 0);

    const defaultDisc = this.priceListForm.get('defaultDiscount')?.value || 0;
    const itemRow = this.fb.group({
      productId: [product.id, Validators.required],
      productSearch: [product, Validators.required],
      unit: [{ value: product.unit || product.uomName || product.uom || '-', disabled: true }],
      discountPercent: [defaultDisc, [Validators.min(0), Validators.max(100)]],
      rate: [defaultRate, [Validators.required, Validators.min(0)]],
      minQty: [1, [Validators.required, Validators.min(1)]],
      maxQty: [999999, Validators.required]
    });

    this.items.push(itemRow);
    const index = this.items.length - 1;
    this.setupSearch(index);
  }

  addItemRow() {
    const defaultDisc = this.priceListForm?.get('defaultDiscount')?.value || 0;
    const index = this.items.length;
    const itemRow = this.fb.group({
      productId: [null, Validators.required],
      productSearch: ['', Validators.required],
      unit: [''],
      discountPercent: [defaultDisc, [Validators.min(0), Validators.max(100)]],
      rate: [0, [Validators.required, Validators.min(0)]],
      minQty: [1, [Validators.required, Validators.min(1)]],
      maxQty: [999999, Validators.required]
    });

    this.items.push(itemRow);
    this.setupSearch(index);
    this.cdr.detectChanges();
  }

  setupSearch(index: number) {
    const row = this.items.at(index);
    row.get('productSearch')?.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      tap(value => {
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          row.patchValue({
            rate: 0,
            unit: '-',
            productId: null
          }, { emitEvent: false });
          this.loadingRowIndex = null;
        } else if (typeof value === 'string' && value.length >= 2) {
          this.loadingRowIndex = index;
        }
      }),
      switchMap(value => {
        if (typeof value !== 'string' || value.length < 2) {
          return of([]);
        }
        return this.productService.searchProducts(value).pipe(
          finalize(() => this.loadingRowIndex = null)
        );
      })
    ).subscribe(res => {
      this.filteredProducts[index] = res;
      this.cdr.detectChanges();
    });
  }

  onProductSelect(event: any, index: number) {
    const selectedProduct = event.option.value;

    const isDuplicate = this.items.controls.some((control, i) => {
      return i !== index && control.get('productId')?.value === selectedProduct.id;
    });

    if (isDuplicate) {
      this.dialog.open(StatusDialogComponent, {
        width: '350px',
        data: {
          isSuccess: false,
          message: `Duplicate Product! "${selectedProduct.productName}" is already added to the list.`
        }
      });

      this.items.at(index).patchValue({
        productId: null,
        productSearch: '',
        unit: '-',
        rate: 0
      });
      return;
    }

    const priceType = this.priceListForm.get('priceType')?.value;
    const defaultRate = priceType === 'SALES'
      ? (selectedProduct.saleRate || selectedProduct.mrp || selectedProduct.rate || selectedProduct.basePurchasePrice || 0)
      : (selectedProduct.basePurchasePrice || 0);

    this.items.at(index).patchValue({
      productId: selectedProduct.id,
      productSearch: selectedProduct,
      unit: selectedProduct.unit || selectedProduct.uomName || selectedProduct.uom || '-',
      rate: defaultRate
    }, { emitEvent: false });

    setTimeout(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }, 0);
  }

  displayFn(product: any): string {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return product.name || product.productName || '';
  }

  isItemVisible(index: number): boolean {
    if (!this.searchTerm) return true;
    const row = this.items.at(index);
    const product = row.get('productSearch')?.value;
    const name = this.displayFn(product).toLowerCase();
    return name.includes(this.searchTerm.toLowerCase());
  }

  removeItem(index: number) {
    if (this.items.length > 1) {
      this.items.removeAt(index);
      this.filteredProducts.splice(index, 1);
      this.cdr.detectChanges();
    }
  }

  get name(): FormControl { return this.priceListForm.get('name') as FormControl; }
  get showNameError(): boolean { return this.showError && this.name.invalid; }

  onSave() {
    this.showError = true;
    this.priceListForm.markAllAsTouched();
    if (this.priceListForm.invalid) return;

    this.loading = true;
    const rawValues = this.priceListForm.getRawValue();
    const currentId = this.editId || this.route.snapshot.params['id'];
    const name = rawValues.name;
    const code = rawValues.code;

    forkJoin([
      this.priceListService.checkDuplicateName(name, currentId),
      this.priceListService.checkDuplicateCode(code, currentId)
    ]).subscribe({
      next: ([isDuplicateName, isDuplicateCode]) => {
        if (isDuplicateName) {
          this.loading = false;
          this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
              isSuccess: false,
              message: `Duplicate Price List Name! "${name}" already exists.`
            }
          });
          this.cdr.detectChanges();
          return;
        }

        if (isDuplicateCode) {
          this.loading = false;
          this.dialog.open(StatusDialogComponent, {
            width: '400px',
            data: {
              isSuccess: false,
              message: `Duplicate Price List Code! "${code}" already exists.`
            }
          });
          this.cdr.detectChanges();
          return;
        }

        const currentUserId = localStorage.getItem('email') || '';
        const finalPayload = {
          ...rawValues,
          id: currentId || undefined,
          remarks: rawValues.description,
          validFrom: new Date(rawValues.validFrom).toISOString(),
          validTo: rawValues.validTo ? new Date(rawValues.validTo).toISOString() : null,
          createdBy: currentUserId,
          priceListItems: rawValues.priceListItems.map((item: any) => ({
            ...item,
            productSearch: undefined
          }))
        };

        const request$ = currentId
          ? this.priceListService.updatePriceList(currentId, finalPayload)
          : this.priceListService.createPriceList(finalPayload);

        request$.pipe(
          finalize(() => { this.loading = false; this.cdr.detectChanges(); })
        ).subscribe({
          next: () => {
            this.dialog.open(StatusDialogComponent, {
              width: '350px',
              data: {
                isSuccess: true,
                message: currentId ? 'Price List updated successfully!' : 'Price List saved successfully!'
              }
            }).afterClosed().subscribe(() => {
              this.actionComplete.emit(true);
              if (!this.editId) this.router.navigate(['/app/master/pricelists']);
            });
          },
          error: (err) => {
            let msg = 'Error occurred while saving.';
            if (err.error && typeof err.error === 'string') {
              msg = err.error; // Sometimes 500 returns plain text
            } else if (err.error?.message) {
              msg = err.error.message;
            } else if (err.message) {
              msg = err.message;
            }

            this.dialog.open(StatusDialogComponent, {
              width: '450px', // Wider for detailed messages
              data: { isSuccess: false, message: msg }
            });
          }
        });
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
        this.dialog.open(StatusDialogComponent, {
          width: '450px',
          data: { isSuccess: false, message: 'Failed to validate Price List. Please try again.' }
        });
      }
    });
  }

  cancel() {
    this.actionComplete.emit(false);
    this.router.navigate(['/app/master/pricelists']);
  }

  onFieldFocus(event: FocusEvent, fieldType: string) {
    (event.target as HTMLInputElement).select();
  }

  handleFocus(index: number, fieldName: string) {
    const control = this.items.at(index).get(fieldName);
    if (control && control.value === 0) control.setValue(null, { emitEvent: false });
  }

  handleBlur(index: number, fieldName: string) {
    const control = this.items.at(index).get(fieldName);
    if (control && (control.value === null || control.value === '')) control.setValue(0, { emitEvent: false });
    this.cdr.detectChanges();
  }

  loadPriceList(id: string) {
    this.loading = true;
    this.isEditMode = true;
    this.priceListService.getPriceListById(id).pipe(
      finalize(() => { this.loading = false; this.cdr.detectChanges(); })
    ).subscribe(data => {
      this.priceListForm.patchValue({
        name: data.name,
        priceType: data.priceType,
        code: data.code,
        applicableGroup: data.applicableGroup,
        currency: data.currency,
        description: data.remarks,
        validFrom: new Date(data.validFrom),
        validTo: data.validTo ? new Date(data.validTo) : null,
        isActive: data.isActive
      });

      const itemsArray = this.items;
      itemsArray.clear();

      const listData = data.items || data.priceListItems || [];

      listData.forEach((item: any, index: number) => {
        const row = this.fb.group({
          productId: [item.productId, Validators.required],
          productSearch: [item.productName || '', Validators.required],
          unit: [{ value: item.unit || '-', disabled: true }],
          discountPercent: [item.discountPercent || 0],
          rate: [item.rate, [Validators.required, Validators.min(0.01)]],
          minQty: [item.minQty || 1],
          maxQty: [item.maxQty || 999999]
        });
        itemsArray.push(row);
        this.setupSearch(index);
      });

      if (listData.length === 0) {
        this.addItemRow();
      }
    });
  }
}