import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OvertimeForm } from './overtime-form';

describe('OvertimeForm', () => {
  let component: OvertimeForm;
  let fixture: ComponentFixture<OvertimeForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OvertimeForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OvertimeForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
