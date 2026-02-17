import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TruckAvailability } from './truck-availability';

describe('TruckAvailability', () => {
  let component: TruckAvailability;
  let fixture: ComponentFixture<TruckAvailability>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TruckAvailability]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TruckAvailability);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
