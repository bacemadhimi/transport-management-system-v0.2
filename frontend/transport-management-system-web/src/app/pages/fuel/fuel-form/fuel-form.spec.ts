import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FuelForm } from './fuel-form';

describe('FuelForm', () => {
  let component: FuelForm;
  let fixture: ComponentFixture<FuelForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FuelForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FuelForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
