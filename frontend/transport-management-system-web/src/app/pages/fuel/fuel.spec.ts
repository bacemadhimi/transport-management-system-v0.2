import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fuel } from './fuel';

describe('Fuel', () => {
  let component: Fuel;
  let fixture: ComponentFixture<Fuel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fuel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fuel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
