import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Overtime } from './overtime';

describe('Overtime', () => {
  let component: Overtime;
  let fixture: ComponentFixture<Overtime>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Overtime]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Overtime);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
