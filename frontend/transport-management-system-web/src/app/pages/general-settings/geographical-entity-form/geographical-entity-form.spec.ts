import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeographicalEntityForm } from './geographical-entity-form';

describe('GeographicalEntityForm', () => {
  let component: GeographicalEntityForm;
  let fixture: ComponentFixture<GeographicalEntityForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeographicalEntityForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeographicalEntityForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});