import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TruckForm } from './truck-form';

describe('TruckForm', () => {
  let component: TruckForm;
  let fixture: ComponentFixture<TruckForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TruckForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TruckForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
