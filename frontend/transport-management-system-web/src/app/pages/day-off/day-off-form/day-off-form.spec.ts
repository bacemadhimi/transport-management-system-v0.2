import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DayOffForm } from './day-off-form';

describe('DayOffForm', () => {
  let component: DayOffForm;
  let fixture: ComponentFixture<DayOffForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DayOffForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DayOffForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
