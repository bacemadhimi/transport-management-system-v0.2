import { ComponentFixture, TestBed } from '@angular/core/testing';

import { City } from './city';

describe('Location', () => {
  let component: City;
  let fixture: ComponentFixture<City>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [City]
    })
    .compileComponents();

    fixture = TestBed.createComponent(City);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
