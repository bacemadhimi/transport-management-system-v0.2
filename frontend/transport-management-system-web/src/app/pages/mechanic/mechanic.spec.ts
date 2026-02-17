import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mechanic } from './mechanic';

describe('Mechanic', () => {
  let component: Mechanic;
  let fixture: ComponentFixture<Mechanic>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Mechanic]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Mechanic);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
