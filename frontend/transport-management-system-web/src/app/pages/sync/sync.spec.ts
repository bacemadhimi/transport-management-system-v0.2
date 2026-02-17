import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sync } from './sync';

describe('Sync', () => {
  let component: Sync;
  let fixture: ComponentFixture<Sync>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sync]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sync);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
