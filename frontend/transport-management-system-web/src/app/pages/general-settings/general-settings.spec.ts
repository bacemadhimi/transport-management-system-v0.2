import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralSettings } from './general-settings';

describe('GeneralSettings', () => {
  let component: GeneralSettings;
  let fixture: ComponentFixture<GeneralSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralSettings]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralSettings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
