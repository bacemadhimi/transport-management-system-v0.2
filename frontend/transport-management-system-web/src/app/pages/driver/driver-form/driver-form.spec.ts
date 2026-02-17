import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DriverForm } from './driver-form';

describe('DriverForm', () => {
  let component: DriverForm;
  let fixture: ComponentFixture<DriverForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DriverForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DriverForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
