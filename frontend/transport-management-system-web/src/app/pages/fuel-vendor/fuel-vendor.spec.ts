import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FuelVendor } from './fuel-vendor';

describe('FuelVendor', () => {
  let component: FuelVendor;
  let fixture: ComponentFixture<FuelVendor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FuelVendor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FuelVendor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
