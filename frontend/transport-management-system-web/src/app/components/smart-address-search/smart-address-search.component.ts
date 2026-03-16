import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, filter, takeUntil } from 'rxjs/operators';
import { SmartAddressSearchService, GeocodingSuggestion } from '../../services/smart-address-search.service';

@Component({
  selector: 'app-smart-address-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule
  ],
  templateUrl: './smart-address-search.component.html',
  styleUrls: ['./smart-address-search.component.scss']
})
export class SmartAddressSearchComponent implements OnInit, OnDestroy {
  @Input() placeholder: string = 'Rechercher une adresse...';
  @Input() label: string = 'Adresse';
  @Input() required: boolean = true;
  @Input() showCurrentLocationButton: boolean = true;
  @Output() addressSelected = new EventEmitter<{ address: string, latitude: number, longitude: number }>();
  @Output() clearAddress = new EventEmitter<void>();

  searchQuery: string = '';
  suggestions: GeocodingSuggestion[] = [];
  isLoading: boolean = false;
  isFocused: boolean = false;
  selectedSuggestion: GeocodingSuggestion | null = null;

  private destroy$ = new Subject<void>();

  constructor(private addressSearchService: SmartAddressSearchService) {}

  ngOnInit(): void {
    // La logique de debounce est déjà dans le service
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(): void {
    if (!this.searchQuery || this.searchQuery.length < 3) {
      this.suggestions = [];
      return;
    }

    this.isLoading = true;

    this.addressSearchService.searchSuggestions(this.searchQuery, 5).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (results) => {
        this.suggestions = results;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Search error:', error);
        this.isLoading = false;
        this.suggestions = [];
      }
    });
  }

  selectSuggestion(suggestion: GeocodingSuggestion): void {
    this.selectedSuggestion = suggestion;
    this.searchQuery = suggestion.address;
    this.suggestions = [];
    this.isFocused = false;

    this.addressSelected.emit({
      address: suggestion.address,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude
    });
  }

  clearSelection(): void {
    this.searchQuery = '';
    this.selectedSuggestion = null;
    this.suggestions = [];
    this.clearAddress.emit();
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      this.isLoading = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.isLoading = false;
          const { latitude, longitude } = position.coords;
          
          // Reverse geocoding pour obtenir l'adresse
          this.addressSearchService.reverseGeocode(latitude, longitude).subscribe({
            next: (result) => {
              if (result) {
                this.searchQuery = result.address;
                this.selectedSuggestion = {
                  address: result.address,
                  latitude: result.latitude,
                  longitude: result.longitude,
                  displayName: result.displayName
                };
                this.addressSelected.emit({
                  address: result.address,
                  latitude: result.latitude,
                  longitude: result.longitude
                });
              }
            },
            error: (error) => {
              console.error('Reverse geocoding error:', error);
            }
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          this.isLoading = false;
          alert('Impossible de récupérer votre position. Veuillez saisir une adresse manuellement.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      alert('La géolocalisation n\'est pas supportée par votre navigateur.');
    }
  }

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    // Delay to allow clicking on suggestion
    setTimeout(() => {
      this.isFocused = false;
      if (!this.selectedSuggestion) {
        this.suggestions = [];
      }
    }, 200);
  }
}
