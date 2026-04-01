import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripsMapComponent } from './trips-map.component';

describe('TripsMap', () => {
  let component: TripsMapComponent;
  let fixture: ComponentFixture<TripsMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripsMapComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripsMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});