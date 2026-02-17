import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VendorForm } from './vendor-form';

describe('VendorForm', () => {
  let component: VendorForm;
  let fixture: ComponentFixture<VendorForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VendorForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
