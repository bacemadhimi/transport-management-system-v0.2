import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConvoyeurForm } from './convoyeur-form';

describe('ConvoyeurForm', () => {
  let component: ConvoyeurForm;
  let fixture: ComponentFixture<ConvoyeurForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConvoyeurForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConvoyeurForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
