import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoricTrip } from './historic-trip';

describe('HistoricTrip', () => {
  let component: HistoricTrip;
  let fixture: ComponentFixture<HistoricTrip>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoricTrip]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoricTrip);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
