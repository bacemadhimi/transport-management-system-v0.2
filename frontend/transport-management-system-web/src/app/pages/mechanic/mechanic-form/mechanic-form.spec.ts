import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MechanicForm } from './mechanic-form';

describe('MechanicForm', () => {
  let component: MechanicForm;
  let fixture: ComponentFixture<MechanicForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MechanicForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MechanicForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
