import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OrderSettings } from './order-settings';

describe('OrderSettings', () => {
  let component: OrderSettings;
  let fixture: ComponentFixture<OrderSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OrderSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OrderSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
