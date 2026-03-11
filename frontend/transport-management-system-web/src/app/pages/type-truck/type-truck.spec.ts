import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypeTruck } from './type-truck';

describe('TypeTruck', () => {
  let component: TypeTruck;
  let fixture: ComponentFixture<TypeTruck>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypeTruck]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TypeTruck);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});