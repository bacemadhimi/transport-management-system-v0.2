import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DayOff } from './day-off';

describe('DayOff', () => {
  let component: DayOff;
  let fixture: ComponentFixture<DayOff>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DayOff]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DayOff);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
