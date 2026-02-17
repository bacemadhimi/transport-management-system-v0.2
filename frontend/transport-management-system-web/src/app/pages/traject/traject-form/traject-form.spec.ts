import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TrajectForm } from './traject-form';

describe('TrajectForm', () => {
  let component: TrajectForm;
  let fixture: ComponentFixture<TrajectForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrajectForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TrajectForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
