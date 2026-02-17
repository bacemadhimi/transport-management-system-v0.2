import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FuelVendorForm } from './fuel-vendor-form';

describe('FuelVendorForm', () => {
  let component: FuelVendorForm;
  let fixture: ComponentFixture<FuelVendorForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FuelVendorForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FuelVendorForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
