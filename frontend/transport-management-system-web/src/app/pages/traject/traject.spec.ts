import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Traject } from './traject';

describe('Traject', () => {
  let component: Traject;
  let fixture: ComponentFixture<Traject>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Traject]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Traject);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
