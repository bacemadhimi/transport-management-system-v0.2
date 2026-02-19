import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Marque } from './marque';

describe('Marque', () => {
  let component: Marque;
  let fixture: ComponentFixture<Marque>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Marque]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Marque);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
