import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripsSettings } from './trips-settings';

describe('TripsSettings', () => {
  let component: TripsSettings;
  let fixture: ComponentFixture<TripsSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripsSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripsSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
