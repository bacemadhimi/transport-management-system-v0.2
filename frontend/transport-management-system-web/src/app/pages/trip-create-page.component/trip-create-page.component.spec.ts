import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripCreatePageComponent } from './trip-create-page.component';

describe('TripCreatePageComponent', () => {
  let component: TripCreatePageComponent;
  let fixture: ComponentFixture<TripCreatePageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripCreatePageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripCreatePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});