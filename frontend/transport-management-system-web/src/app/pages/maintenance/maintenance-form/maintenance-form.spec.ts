import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaintenanceForm } from './maintenance-form';

describe('MaintenanceForm', () => {
  let component: MaintenanceForm;
  let fixture: ComponentFixture<MaintenanceForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaintenanceForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaintenanceForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
