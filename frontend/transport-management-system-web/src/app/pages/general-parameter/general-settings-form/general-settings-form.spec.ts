import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralSettingsForm } from './general-settings-form';

describe('GeneralSettingsForm', () => {
  let component: GeneralSettingsForm;
  let fixture: ComponentFixture<GeneralSettingsForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralSettingsForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralSettingsForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
