import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RoomService } from '../../services/room.service';
import { LocationService } from '../../services/location.service';
import { BookingService } from '../../services/booking.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { Room } from '../../models/room.model';
import { User } from '../../models/user.model';
import { Location } from '../../models/location.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: []
})
export class DashboardComponent implements OnInit {
  public authService = inject(AuthService);
  private roomService = inject(RoomService);
  private locationService = inject(LocationService);
  private bookingService = inject(BookingService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  currentUser: User | null = null;
  rooms: Room[] = [];
  locations: Location[] = [];
  availableBuildings: string[] = [];
  availableFloors: string[] = [];
  
  userStats = {
    upcomingCount: 0,
    pastCount: 0,
    totalHours: 0
  };

  // Search & Filter Form (Dual Building + Floor Filter)
  searchForm: FormGroup = this.fb.group({
    date: ['', Validators.required],
    startTime: ['', Validators.required],
    endTime: ['', Validators.required],
    minCapacity: [null],
    buildingName: [''],
    floor: [''],
    search: ['']
  });

  availableRoomsSearched = false;
  isSearching = false;
  minDate = '';

  // Booking Modal & Scalable Participant Search
  showBookingModal = false;
  isBookingRoom = false;
  selectedRoom: Room | null = null;
  availableUsers: User[] = [];
  selectedParticipants: string[] = [];
  participantSearchTerm = '';
  modalError = '';

  // Global Alert Message
  toast = {
    show: false,
    message: '',
    type: 'success' as 'success' | 'danger'
  };

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    this.initSearchDefaults();
    this.loadLocations();
    this.loadDashboardData();
    this.loadAvailableUsers();
  }

  initSearchDefaults(): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    this.minDate = `${yyyy}-${mm}-${dd}`;

    this.searchForm.patchValue({
      date: this.minDate,
      startTime: '09:00',
      endTime: '10:00',
      buildingName: '',
      floor: ''
    });
  }

  loadLocations(): void {
    this.locationService.getLocations().subscribe({
      next: (locs) => {
        this.locations = locs;
        const bSet = new Set<string>();
        locs.forEach(l => {
          if (l.building_name) bSet.add(l.building_name);
        });
        this.availableBuildings = Array.from(bSet);
      },
      error: () => {}
    });
  }

  get filteredFloors(): string[] {
    const selectedBuilding = this.searchForm.get('buildingName')?.value;
    if (!selectedBuilding) {
      const fSet = new Set<string>();
      this.locations.forEach(l => { if (l.floor) fSet.add(l.floor); });
      return Array.from(fSet);
    }

    const fSet = new Set<string>();
    this.locations
      .filter(l => l.building_name === selectedBuilding)
      .forEach(l => { if (l.floor) fSet.add(l.floor); });
    return Array.from(fSet);
  }

  onBuildingChange(): void {
    const currentFloor = this.searchForm.get('floor')?.value;
    if (currentFloor && !this.filteredFloors.includes(currentFloor)) {
      this.searchForm.patchValue({ floor: '' });
    }
  }

  loadAvailableUsers(): void {
    this.authService.getAllUsers().subscribe({
      next: (users) => this.availableUsers = users.filter(u => !u.is_admin),
      error: () => {}
    });
  }

  get filteredUsers(): User[] {
    const regularUsers = this.availableUsers.filter(u => !u.is_admin);
    if (!this.participantSearchTerm || !this.participantSearchTerm.trim()) {
      return regularUsers.slice(0, 5);
    }
    const term = this.participantSearchTerm.toLowerCase().trim();
    return regularUsers.filter(u => 
      u.full_name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term)
    ).slice(0, 5);
  }

  loadDashboardData(): void {
    this.loadUserStats();
    this.loadAllRooms();
  }

  loadAllRooms(): void {
    this.roomService.getRooms().subscribe({
      next: (rooms) => this.rooms = rooms,
      error: () => this.showToast('Failed to load rooms', 'danger')
    });
  }

  loadUserStats(): void {
    this.bookingService.getBookings({ upcoming_only: true }).subscribe({
      next: (upcoming) => {
        this.userStats.upcomingCount = upcoming.length;
        
        this.bookingService.getBookings({ past_only: true }).subscribe({
          next: (past) => {
            this.userStats.pastCount = past.length;
            
            let hours = 0;
            const allBookings = [...upcoming, ...past];
            allBookings.forEach(b => {
              if (b.status === 'CONFIRMED') {
                const diffMs = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
                hours += diffMs / (1000 * 60 * 60);
              }
            });
            this.userStats.totalHours = Math.round(hours * 10) / 10;
          }
        });
      }
    });
  }

  searchRooms(): void {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    this.isSearching = true;
    const formVals = this.searchForm.value;
    
    const startIso = new Date(`${formVals.date}T${formVals.startTime}`).toISOString();
    const endIso = new Date(`${formVals.date}T${formVals.endTime}`).toISOString();

    if (new Date(startIso) >= new Date(endIso)) {
      this.showToast('Start time must be before end time', 'danger');
      this.isSearching = false;
      return;
    }

    if (new Date(startIso) < new Date()) {
      this.showToast('Please select a future date and time', 'danger');
      this.isSearching = false;
      return;
    }

    const rawCapacity = formVals.minCapacity;
    const minCapacity =
      rawCapacity === null || rawCapacity === undefined || rawCapacity === ''
        ? undefined
        : Number(rawCapacity);

    if (minCapacity !== undefined && (Number.isNaN(minCapacity) || minCapacity < 1)) {
      this.showToast('Capacity must be a number of at least 1', 'danger');
      this.isSearching = false;
      return;
    }

    const filters: {
      min_capacity?: number;
      building_name?: string;
      floor?: string;
      start_time: string;
      end_time: string;
      search?: string;
    } = {
      start_time: startIso,
      end_time: endIso,
      building_name: formVals.buildingName || undefined,
      floor: formVals.floor || undefined,
      search: formVals.search?.trim() || undefined
    };

    if (minCapacity !== undefined) {
      filters.min_capacity = minCapacity;
    }

    this.roomService.getRooms(filters).subscribe({
      next: (rooms) => {
        this.rooms =
          minCapacity !== undefined
            ? rooms.filter((room) => room.capacity >= minCapacity)
            : rooms;
        this.availableRoomsSearched = true;
        this.isSearching = false;
      },
      error: () => {
        this.showToast('Failed to execute search', 'danger');
        this.isSearching = false;
      }
    });
  }

  resetSearch(): void {
    this.searchForm.reset();
    this.initSearchDefaults();
    this.availableRoomsSearched = false;
    this.loadAllRooms();
  }

  roomImageSrc(room: Room): string {
    return this.roomService.resolveImageUrl(room.image_url);
  }

  showToast(message: string, type: 'success' | 'danger' = 'success'): void {
    this.toast = { show: true, message, type };
    setTimeout(() => {
      this.toast.show = false;
    }, 4000);
  }

  // --- Booking & Participant Operations ---
  recurrencePattern: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'NONE';
  recurrenceDuration: '1_MONTH' | '2_MONTHS' | '3_MONTHS' | '6_MONTHS' | 'CUSTOM' = '1_MONTH';
  recurrenceCount: number = 4;

  onRecurrenceChange(): void {
    if (this.recurrencePattern === 'NONE') {
      this.recurrenceCount = 1;
      return;
    }
    this.updateRecurrenceCount();
  }

  updateRecurrenceCount(): void {
    if (this.recurrenceDuration === '1_MONTH') {
      this.recurrenceCount = this.recurrencePattern === 'DAILY' ? 30 : (this.recurrencePattern === 'WEEKLY' ? 4 : 1);
    } else if (this.recurrenceDuration === '2_MONTHS') {
      this.recurrenceCount = this.recurrencePattern === 'DAILY' ? 60 : (this.recurrencePattern === 'WEEKLY' ? 8 : 2);
    } else if (this.recurrenceDuration === '3_MONTHS') {
      this.recurrenceCount = this.recurrencePattern === 'DAILY' ? 90 : (this.recurrencePattern === 'WEEKLY' ? 12 : 3);
    } else if (this.recurrenceDuration === '6_MONTHS') {
      this.recurrenceCount = this.recurrencePattern === 'DAILY' ? 180 : (this.recurrencePattern === 'WEEKLY' ? 24 : 6);
    }
  }

  openBookingModal(room: Room): void {
    this.selectedRoom = room;
    this.selectedParticipants = [];
    this.participantSearchTerm = '';
    this.recurrencePattern = 'NONE';
    this.recurrenceDuration = '1_MONTH';
    this.recurrenceCount = 1;
    this.modalError = '';
    this.showBookingModal = true;
  }

  closeBookingModal(): void {
    this.showBookingModal = false;
    this.selectedRoom = null;
    this.selectedParticipants = [];
    this.participantSearchTerm = '';
    this.recurrencePattern = 'NONE';
    this.recurrenceDuration = '1_MONTH';
    this.recurrenceCount = 1;
    this.modalError = '';
  }

  addParticipant(nameOrEmail: string): void {
    const clean = nameOrEmail.trim();
    if (!clean) return;
    if (!this.selectedParticipants.includes(clean)) {
      this.selectedParticipants.push(clean);
    }
    this.participantSearchTerm = '';
  }

  removeParticipant(nameOrEmail: string): void {
    this.selectedParticipants = this.selectedParticipants.filter(p => p !== nameOrEmail);
  }

  toggleParticipant(userName: string): void {
    const index = this.selectedParticipants.indexOf(userName);
    if (index > -1) {
      this.selectedParticipants.splice(index, 1);
    } else {
      this.selectedParticipants.push(userName);
    }
  }

  isParticipantSelected(userName: string): boolean {
    return this.selectedParticipants.includes(userName);
  }

  async confirmBooking(bookingTitle: string): Promise<void> {
    this.modalError = '';
    
    if (!bookingTitle || bookingTitle.trim() === '') {
      this.modalError = 'Please enter a booking title / meeting agenda.';
      this.showToast(this.modalError, 'danger');
      return;
    }

    if (!this.selectedRoom) return;

    const confirmed = await this.confirmDialog.confirm({
      title: 'Confirm Booking',
      message: `Book "${this.selectedRoom.name}" for "${bookingTitle.trim()}" at the selected date and time?`,
      confirmText: 'Book Now',
      cancelText: 'Go Back',
      variant: 'primary'
    });

    if (!confirmed) return;

    this.isBookingRoom = true;
    const formVals = this.searchForm.value;

    const startIso = new Date(`${formVals.date}T${formVals.startTime}`).toISOString();
    const endIso = new Date(`${formVals.date}T${formVals.endTime}`).toISOString();

    const bookingData = {
      room_id: this.selectedRoom.id,
      location_id: this.selectedRoom.location_id,
      title: bookingTitle.trim(),
      start_time: startIso,
      end_time: endIso,
      recurrence: this.recurrencePattern,
      recurrence_count: Number(this.recurrenceCount),
      participants: this.selectedParticipants
    };

    this.bookingService.createBooking(bookingData).subscribe({
      next: () => {
        this.isBookingRoom = false;
        this.closeBookingModal();
        this.showToast('Room booked successfully with participants!');
        this.resetSearch();
        this.loadDashboardData();
      },
      error: (err) => {
        this.isBookingRoom = false;
        const errorMsg = err.error?.detail || 'Booking failed. The slot may have been filled.';
        this.modalError = errorMsg;
        this.showToast(errorMsg, 'danger');
      }
    });
  }
}
