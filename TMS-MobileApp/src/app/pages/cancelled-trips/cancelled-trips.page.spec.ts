import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { CancelledTripsPage } from './cancelled-trips.page';

describe('CancelledTripsPage', () => {
  let component: CancelledTripsPage;
  let fixture: ComponentFixture<CancelledTripsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CancelledTripsPage],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(CancelledTripsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});