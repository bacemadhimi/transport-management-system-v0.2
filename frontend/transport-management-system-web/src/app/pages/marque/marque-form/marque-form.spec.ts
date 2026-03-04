import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MarqueForm } from './marque-form';

describe('MarqueForm', () => {
  let component: MarqueForm;
  let fixture: ComponentFixture<MarqueForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarqueForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MarqueForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});