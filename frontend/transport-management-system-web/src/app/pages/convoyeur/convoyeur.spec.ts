import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Convoyeur } from './convoyeur';

describe('Convoyeur', () => {
  let component: Convoyeur;
  let fixture: ComponentFixture<Convoyeur>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Convoyeur]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Convoyeur);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
