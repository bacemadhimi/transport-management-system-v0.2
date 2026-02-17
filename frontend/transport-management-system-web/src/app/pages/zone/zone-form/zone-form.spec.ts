import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ZoneForm } from './zone-form';

describe('ZoneForm', () => {
  let component: ZoneForm;
  let fixture: ComponentFixture<ZoneForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ZoneForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ZoneForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
