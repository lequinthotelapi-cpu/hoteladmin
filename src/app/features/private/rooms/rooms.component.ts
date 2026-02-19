import { Component, OnInit, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RoomService } from '../../../core/services/room.service';
import { BookingService } from '../../../core/services/booking.service';
import { RoomStatusService, RoomWithStatus } from '../../../core/services/room-status.service';
import { ParametersService } from '../../../core/services/parameters.service';
import { RoomMapActionsDialogComponent } from './room-map-actions-dialog/room-map-actions-dialog.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'fury-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.scss']
})
export class RoomsComponent implements OnInit, AfterViewInit, OnDestroy {
  viewMode: 'list' | 'grid' | 'map' = 'map';
  rooms: RoomWithStatus[] = [];
  roomStatuses: any[] = [];
  roomTypes: any[] = [];
  private destroy$ = new Subject<void>();
  private tooltip!: HTMLDivElement;
  mapTheme: 'light' | 'dark' = 'light';
  selectedFloor: number = 1;
  selectedStatuses: Set<string> = new Set(['available', 'reserved', 'occupied', 'dirty', 'cleaning', 'maintenance']);
  piso1Path: SafeResourceUrl;
  piso2Path: SafeResourceUrl;

  constructor(
    private roomService: RoomService,
    private bookingService: BookingService,
    private roomStatusService: RoomStatusService,
    private parametersService: ParametersService,
    private dialog: MatDialog,
    private router: Router,
    private ngZone: NgZone,
    private sanitizer: DomSanitizer
  ) {
    this.updateMapPaths();
  }

  ngOnInit(): void {
    this.loadParameters();
    this.loadRooms();
    this.createTooltip();
  }

  ngAfterViewInit(): void {
  }

  async loadParameters(): Promise<void> {
    if (!this.parametersService.isLoaded()) {
      await this.parametersService.loadAllParameters();
    }
    this.roomStatuses = this.parametersService.getOptions('roomStatuses');
    this.roomTypes = this.parametersService.getOptions('roomTypes');
  }

  loadRooms(): void {
    const rooms$ = this.roomService.getAllRooms();
    const bookings$ = this.bookingService.getAllBookings();
    
    this.roomStatusService.getRoomsWithStatus(rooms$, bookings$)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rooms) => {
          this.rooms = rooms;
          // Reaplicar colores si ya hay SVG cargados
          setTimeout(() => {
            const piso1 = document.getElementById('piso1-svg') as HTMLObjectElement;
            const piso2 = document.getElementById('piso2-svg') as HTMLObjectElement;
            if (piso1?.contentDocument) this.applySvgInteractivity(piso1.contentDocument);
            if (piso2?.contentDocument) this.applySvgInteractivity(piso2.contentDocument);
          }, 100);
        }
      });
  }

  createTooltip(): void {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'room-tooltip';
    this.tooltip.style.display = 'none';
    this.tooltip.style.position = 'fixed';
    this.tooltip.style.background = 'white';
    this.tooltip.style.padding = '0';
    this.tooltip.style.borderRadius = '12px';
    this.tooltip.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
    this.tooltip.style.zIndex = '1000';
    this.tooltip.style.pointerEvents = 'none';
    this.tooltip.style.fontSize = '14px';
    this.tooltip.style.minWidth = '240px';
    this.tooltip.style.overflow = 'hidden';
    document.body.appendChild(this.tooltip);
  }

  toggleView(mode: 'list' | 'grid' | 'map'): void {
    this.viewMode = mode;
  }

  onSvgLoad(event: Event): void {
    const objectElement = event.target as HTMLObjectElement;
    const svgDoc = objectElement.contentDocument;
    if (svgDoc) {
      this.applySvgInteractivity(svgDoc);
    }
  }

  private applySvgInteractivity(svgDoc: Document): void {
    // Buscar todos los elementos con id que empiecen con "room-"
    const roomElements = svgDoc.querySelectorAll('[id^="room-"]');
    
    roomElements.forEach((roomElement) => {
      const roomId = roomElement.id; // ej: "room-101"
      const roomNumber = roomId.replace('room-', ''); // ej: "101"
      const room = this.rooms.find(r => r.roomNumber === roomNumber);
      
      if (room) {
        // Aplicar color según estado
        this.applyRoomColor(roomElement, room.displayStatus);
        
        // Aplicar opacidad si el estado no está seleccionado
        const isFiltered = !this.selectedStatuses.has(room.displayStatus);
        
        // Remover listeners anteriores clonando el elemento
        const newElement = roomElement.cloneNode(true);
        roomElement.parentNode?.replaceChild(newElement, roomElement);
        
        // Aplicar opacidad al elemento completo
        if (isFiltered) {
          (newElement as SVGElement).style.opacity = '0.15';
          (newElement as SVGElement).style.pointerEvents = 'none';
        } else {
          (newElement as SVGElement).style.opacity = '1';
          (newElement as SVGElement).style.pointerEvents = 'all';
        }
        
        // Agregar eventos de hover para tooltip solo si no está filtrado
        if (!isFiltered) {
        newElement.addEventListener('mouseenter', (e: Event) => {
          const statusLabel = this.getRoomStatusLabel(room.displayStatus);
          const typeLabel = this.getRoomTypeLabel(room.roomType);
          const color = this.getStatusColor(room.displayStatus);
          
          const statusBgColor = this.getStatusBackgroundColor(room.displayStatus);
          
          this.tooltip.innerHTML = `
            <div style="background: ${statusBgColor}; border-left: 4px solid ${color};">
              <div style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <div style="flex: 1;">
                    <div style="font-size: 12px; color: #6b7280; font-weight: 500; margin-bottom: 4px;">HABITACIÓN</div>
                    <div style="font-size: 15px; font-weight: 600; color: #374151;">${typeLabel}</div>
                  </div>
                  <div style="width: 64px; height: 64px; border-radius: 12px; background: ${color}; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 28px; font-weight: 700;">${room.roomNumber}</span>
                  </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 12px; color: #6b7280; font-size: 13px; margin-bottom: 12px;">
                  <span>${room.capacity} ${room.capacity === 1 ? 'Persona' : 'Personas'}</span>
                  <span>•</span>
                  <span>Piso ${room.floor}</span>
                </div>
                
                <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid #e5e7eb;">
                  <span style="display: inline-block; padding: 6px 12px; border-radius: 20px; background: ${color}; color: white; font-size: 12px; font-weight: 600;">
                    ${statusLabel}
                  </span>
                  <span style="font-size: 18px; font-weight: 700; color: #10b981;">$${room.basePrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          `;
          this.tooltip.style.display = 'block';
        });
        
        newElement.addEventListener('mousemove', (e: MouseEvent) => {
          const objectElement = (e.target as Element).ownerDocument?.defaultView?.frameElement as HTMLElement;
          if (objectElement) {
            const rect = objectElement.getBoundingClientRect();
            this.tooltip.style.left = (rect.left + e.clientX + 10) + 'px';
            this.tooltip.style.top = (rect.top + e.clientY + 10) + 'px';
          }
        });
        
        newElement.addEventListener('mouseleave', () => {
          this.tooltip.style.display = 'none';
        });
        
        // Agregar evento de click al nuevo elemento
        newElement.addEventListener('click', () => {
          this.ngZone.run(() => this.handleRoomClick(room));
        });
        
        // Hacer el cursor pointer
        (newElement as SVGElement).style.cursor = 'pointer';
        }
      }
    });
    
    // Agregar estilos de animación para hover
    const style = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = `
      [id^="room-"] {
        transition: opacity 0.2s;
      }
      [id^="room-"]:hover path {
        opacity: 0.8;
      }
    `;
    svgDoc.documentElement.appendChild(style);
    
    // Animación de focos en modo oscuro
    if (this.mapTheme === 'dark') {
      const focos = svgDoc.querySelectorAll('[id^="focos"]');
      focos.forEach((foco) => {
        (foco as SVGElement).style.opacity = '0';
        (foco as SVGElement).style.animation = 'lightOn 3s ease-out 3s forwards';
      });
      
      const animStyle = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'style');
      animStyle.textContent = `
        @keyframes lightOn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
      `;
      svgDoc.documentElement.appendChild(animStyle);
    }
  }

  toggleStatusFilter(status: string): void {
    if (this.selectedStatuses.has(status)) {
      this.selectedStatuses.delete(status);
    } else {
      this.selectedStatuses.add(status);
    }
    // Reaplicar colores
    setTimeout(() => {
      const piso1 = document.getElementById('piso1-svg') as HTMLObjectElement;
      const piso2 = document.getElementById('piso2-svg') as HTMLObjectElement;
      if (piso1?.contentDocument) this.applySvgInteractivity(piso1.contentDocument);
      if (piso2?.contentDocument) this.applySvgInteractivity(piso2.contentDocument);
    }, 10);
  }

  isStatusSelected(status: string): boolean {
    return this.selectedStatuses.has(status);
  }

  toggleMapTheme(): void {
    this.mapTheme = this.mapTheme === 'light' ? 'dark' : 'light';
    this.updateMapPaths();
    setTimeout(() => {
      const piso1 = document.getElementById('piso1-svg') as HTMLObjectElement;
      const piso2 = document.getElementById('piso2-svg') as HTMLObjectElement;
      if (piso1?.contentDocument) this.applySvgInteractivity(piso1.contentDocument);
      if (piso2?.contentDocument) this.applySvgInteractivity(piso2.contentDocument);
    }, 100);
  }

  private updateMapPaths(): void {
    const theme = this.mapTheme === 'dark' ? '_rotate_dark' : '_rotate';
    this.piso1Path = this.sanitizer.bypassSecurityTrustResourceUrl(`assets/img/hotel-map/piso1${theme}.svg`);
    this.piso2Path = this.sanitizer.bypassSecurityTrustResourceUrl(`assets/img/hotel-map/piso2${theme}.svg`);
  }

  handleRoomClick(room: RoomWithStatus): void {
    const dialogRef = this.dialog.open(RoomMapActionsDialogComponent, {
      width: '400px',
      data: { room, roomStatuses: this.roomStatuses, roomTypes: this.roomTypes }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'refresh' || result === 'edit') {
        this.loadRooms();
        // Reaplicar colores después de recargar
        setTimeout(() => {
          const piso1 = document.getElementById('piso1-svg') as HTMLObjectElement;
          const piso2 = document.getElementById('piso2-svg') as HTMLObjectElement;
          if (piso1?.contentDocument) this.applySvgInteractivity(piso1.contentDocument);
          if (piso2?.contentDocument) this.applySvgInteractivity(piso2.contentDocument);
        }, 500);
      }
    });
  }

  private executeAction(action: string, room: RoomWithStatus): void {
    switch (action) {
      case 'check-in':
        this.router.navigate(['/bookings']);
        break;
      case 'check-out':
        this.router.navigate(['/bookings']);
        break;
      case 'view-account':
        this.router.navigate(['/guest-accounts']);
        break;
      case 'complete-cleaning':
        this.router.navigate(['/housekeeping']);
        break;
      case 'create-task':
        this.router.navigate(['/housekeeping']);
        break;
      case 'edit-room':
        this.router.navigate(['/rooms', room.id]);
        break;
    }
  }

  getRoomStatusLabel(value: string): string {
    const status = this.roomStatuses.find(s => s.value === value);
    return status ? status.label : value;
  }

  getRoomTypeLabel(value: string): string {
    const type = this.roomTypes.find(t => t.value === value);
    return type ? type.label : value;
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'available': '#10b981',
      'reserved': '#8b5cf6',
      'occupied': '#ef4444',
      'dirty': '#f59e0b',
      'cleaning': '#3b82f6',
      'maintenance': '#6366f1'
    };
    return colorMap[status] || '#6366f1';
  }

  getStatusBackgroundColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'available': 'rgba(16, 185, 129, 0.08)',
      'reserved': 'rgba(139, 92, 246, 0.08)',
      'occupied': 'rgba(239, 68, 68, 0.08)',
      'dirty': 'rgba(245, 158, 11, 0.08)',
      'cleaning': 'rgba(59, 130, 246, 0.08)',
      'maintenance': 'rgba(99, 102, 241, 0.08)'
    };
    return colorMap[status] || 'rgba(99, 102, 241, 0.08)';
  }

  applyRoomColor(element: Element, status: string): void {
    const paths = element.querySelectorAll('path');
    const colorMap: { [key: string]: { fill: string, stroke: string } } = {
      'available': { fill: '#d1fae5', stroke: '#10b981' },
      'reserved': { fill: '#ede9fe', stroke: '#8b5cf6' },
      'occupied': { fill: '#fee2e2', stroke: '#ef4444' },
      'dirty': { fill: '#fef3c7', stroke: '#f59e0b' },
      'cleaning': { fill: '#dbeafe', stroke: '#3b82f6' },
      'maintenance': { fill: '#e0e7ff', stroke: '#6366f1' }
    };
    
    const colors = colorMap[status] || { fill: '#f3f4f6', stroke: '#9ca3af' };
    
    paths.forEach((path) => {
      if (path.hasAttribute('fill')) {
        path.setAttribute('fill', colors.fill);
        path.setAttribute('fill-opacity', '0.5');
      }
      if (path.hasAttribute('stroke')) {
        path.setAttribute('stroke', colors.stroke);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.tooltip) {
      document.body.removeChild(this.tooltip);
    }
  }
}
