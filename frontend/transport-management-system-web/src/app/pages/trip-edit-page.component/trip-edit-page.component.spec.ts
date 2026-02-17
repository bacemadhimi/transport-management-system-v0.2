import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TripEditPageComponent } from './trip-edit-page.component';

describe('TripEditPageComponent', () => {
  let component: TripEditPageComponent;
  let fixture: ComponentFixture<TripEditPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TripEditPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TripEditPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
