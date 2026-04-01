import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BarcodeTestPage } from './barcode-test.page';

describe('BarcodeTestPage', () => {
  let component: BarcodeTestPage;
  let fixture: ComponentFixture<BarcodeTestPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BarcodeTestPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
