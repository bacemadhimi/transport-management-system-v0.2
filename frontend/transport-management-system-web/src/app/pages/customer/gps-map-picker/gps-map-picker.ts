import { Component, inject, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import * as L from 'leaflet';

@Component({
  selector: 'app-gps-map-picker',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './gps-map-picker.html',
  styleUrls: ['./gps-map-picker.scss']
})
export class GpsMapPickerComponent implements OnInit, AfterViewInit, OnDestroy {
  private dialogRef = inject(MatDialogRef<GpsMapPickerComponent>);
  private data = inject<{ lat?: number; lng?: number }>(MAT_DIALOG_DATA, { optional: true });
  
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  map: L.Map | null = null;
  marker: L.Marker | null = null;
  selectedCoords: { lat: number; lng: number } | null = null;
  
  // Default center on Tunisia
  private readonly DEFAULT_LAT = 36.8065;
  private readonly DEFAULT_LNG = 10.1815;
  private readonly DEFAULT_ZOOM = 13;

  ngOnInit(): void {
    // Check if initial coordinates are provided
    if (this.data?.lat && this.data?.lng) {
      this.selectedCoords = {
        lat: this.data.lat,
        lng: this.data.lng
      };
      console.log('📍 Initial coordinates from form:', this.selectedCoords);
    }
  }

  ngAfterViewInit(): void {
    // Attendre que le modal soit complètement animé et rendu
    setTimeout(() => {
      this.initMap();
    }, 300);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Get current coordinates text for display
   */
  getCurrentCoordinatesText(): string {
    if (!this.selectedCoords) {
      return 'Cliquez sur la carte pour sélectionner une position';
    }
    return `Lat: ${this.selectedCoords.lat.toFixed(6)}, Lng: ${this.selectedCoords.lng.toFixed(6)}`;
  }

  /**
   * Initialize Leaflet map with OpenStreetMap tiles
   */
  private initMap(): void {
    // Vérifier que le conteneur est disponible via ViewChild
    if (!this.mapContainer || !this.mapContainer.nativeElement) {
      console.error('Map container not found via ViewChild');
      return;
    }

    const mapElement = this.mapContainer.nativeElement;
    
    // Vérifier que l'élément a une taille valide
    if (mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) {
      console.warn('Map container has no size, retrying in 100ms...');
      setTimeout(() => this.initMap(), 100);
      return;
    }

    console.log('✅ Initializing Leaflet map...');

    // Determine initial center - use provided coords or default
    const initialLat = this.selectedCoords?.lat ?? this.DEFAULT_LAT;
    const initialLng = this.selectedCoords?.lng ?? this.DEFAULT_LNG;
    const initialZoom = this.selectedCoords ? 16 : this.DEFAULT_ZOOM; // Zoom closer if we have coords

    // Create map instance
    this.map = L.map(mapElement).setView([initialLat, initialLng], initialZoom);

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(this.map);

    // If we have initial coordinates, place marker there
    if (this.selectedCoords) {
      console.log('📍 Placing initial marker at:', this.selectedCoords);
      this.setMarker(this.selectedCoords.lat, this.selectedCoords.lng);
    }

    // Handle map click to set marker
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      console.log('📍 Map clicked at:', e.latlng);
      this.setMarker(e.latlng.lat, e.latlng.lng);
    });

    // Force map to recalculate size after modal animation
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        console.log('✅ Map size invalidated and refreshed');
      }
    }, 500);

    console.log('✅ Leaflet map initialized successfully');
  }

  /**
   * Set or update marker position - using custom Google Maps style icon
   */
  private setMarker(lat: number, lng: number): void {
    this.selectedCoords = { lat, lng };

    // Remove existing marker if any
    if (this.marker) {
      this.map?.removeLayer(this.marker);
    }

    // Create custom Google Maps style icon (red pin)
    const googleMapsIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Create new draggable marker with Google Maps style
    this.marker = L.marker([lat, lng], {
      icon: googleMapsIcon,
      draggable: true
    }).addTo(this.map!);

    // Add tooltip showing coordinates
    this.marker.bindTooltip(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, {
      permanent: false,
      direction: 'top',
      offset: [0, -15]
    });

    // Update coords when marker is dragged
    this.marker.on('dragend', (e: L.DragEndEvent) => {
      const position = e.target.getLatLng();
      this.selectedCoords = {
        lat: position.lat,
        lng: position.lng
      };
      // Update tooltip with new coordinates
      if (this.marker) {
        this.marker.setTooltipContent(`${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`);
      }
    });

    // Center map on new marker
    this.map?.setView([lat, lng], this.DEFAULT_ZOOM);
  }

  /**
   * Confirm selection and close dialog
   */
  onConfirm(): void {
    if (this.selectedCoords) {
      this.dialogRef.close(this.selectedCoords);
    }
  }

  /**
   * Cancel selection and close dialog
   */
  onCancel(): void {
    this.dialogRef.close(null);
  }
}
