import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StorageLocationDetails } from './storage-location-details';

describe('StorageLocationDetails', () => {
  let component: StorageLocationDetails;
  let fixture: ComponentFixture<StorageLocationDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorageLocationDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StorageLocationDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
