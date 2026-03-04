import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypeTruckForm } from './type-truck-form';

describe('TypeTruckForm', () => {
  let component: TypeTruckForm;
  let fixture: ComponentFixture<TypeTruckForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeTruckForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypeTruckForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});