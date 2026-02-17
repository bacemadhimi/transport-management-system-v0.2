import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CityForm } from './city-form';

describe('LocationForm', () => {
  let component: CityForm;
  let fixture: ComponentFixture<CityForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CityForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CityForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
