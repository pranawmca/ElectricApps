import { Component, Input, OnInit,inject} from '@angular/core';
import { Validators, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../../product/service/product.service';
import { PriceListService } from '../service/pricelist.service';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../../../shared/material/material/material-module';
import { RouterLink } from '@angular/router';
import { PriceListModel } from '../models/pricelist.model';


@Component({
  selector: 'app-pricelist-items',
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './pricelist-items.html',
  styleUrl: './pricelist-items.scss',
})
export class PricelistItems implements OnInit {

  private service = inject(PriceListService);
  private productService = inject(ProductService);
  private fb = inject(FormBuilder);

  @Input() priceListId!: number;

  /** ✅ Explicit typing to avoid never[] */
  products = this.productService.getAll();
  items: PriceListModel[] = [];

  /** ✅ Non-nullable, enterprise-safe form */
  form = this.fb.nonNullable.group({
    productId: [0, Validators.required],
    price: [0, Validators.required],
    minQty: [1],
    maxQty: [0],
    isActive: [true]
  });

  ngOnInit() {
   
  }

  addItem() {
   

    
  }
}
