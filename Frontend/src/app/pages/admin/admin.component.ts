import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { LocationService } from '../../services/location.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { User } from '../../models/user.model';
import { Room } from '../../models/room.model';
import { Booking } from '../../models/booking.model';
import { Location } from '../../models/location.model';
import { AuditLog } from '../../models/audit-log.model';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './admin.component.html',
  styleUrls: []
})
export class AdminComponent implements OnInit {
  private adminService = inject(AdminService);
  private locationService = inject(LocationService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  activeTab: 'rooms' | 'users' | 'bookings' | 'locations' | 'audit' = 'rooms';
  isLoading = false;
  searchTerm = '';
  
  users: User[] = [];
  rooms: Room[] = [];
  bookings: Booking[] = [];
  locations: Location[] = [];
  auditLogs: AuditLog[] = [];

  // Add / Edit Room Modal State
  showRoomModal = false;
  isSavingRoom = false;
  editingRoom: Room | null = null;
  roomForm!: FormGroup;

  // Add / Edit Location Modal State
  showLocModal = false;
  isSavingLoc = false;
  editingLoc: Location | null = null;
  locForm!: FormGroup;

  // Booking Details Modal State
  showBookingDetailsModal = false;
  selectedBookingDetails: Booking | null = null;

  modalError = '';

  // Toast Alerts
  toast = {
    show: false,
    message: '',
    type: 'success' as 'success' | 'danger'
  };

  analyticsData: any = null;

  ngOnInit(): void {
    this.initRoomForm();
    this.initLocForm();
    this.loadAllData();
  }

  loadAllData(): void {
    this.isLoading = true;
    let loadedCount = 0;
    const checkDone = () => {
      loadedCount++;
      if (loadedCount >= 6) this.isLoading = false;
    };

    this.adminService.getRooms().subscribe({
      next: (res) => { this.rooms = res; checkDone(); },
      error: () => checkDone()
    });

    this.adminService.getLocations().subscribe({
      next: (res) => { this.locations = res; checkDone(); },
      error: () => checkDone()
    });

    this.adminService.getUsers().subscribe({
      next: (res) => { this.users = res; checkDone(); },
      error: () => checkDone()
    });

    this.adminService.getBookings().subscribe({
      next: (res) => { this.bookings = res; checkDone(); },
      error: () => checkDone()
    });

    this.adminService.getAuditLogs().subscribe({
      next: (res) => { this.auditLogs = res; checkDone(); },
      error: () => checkDone()
    });

    this.adminService.getAnalytics().subscribe({
      next: (res) => { this.analyticsData = res; checkDone(); },
      error: () => checkDone()
    });
  }

  setTab(tab: 'rooms' | 'users' | 'bookings' | 'locations' | 'audit'): void {
    this.activeTab = tab;
  }

  // --- EXECUTIVE KPI COMPUTATIONS ---
  get confirmedBookingsCount(): number {
    return this.bookings.filter(b => b.status === 'CONFIRMED').length;
  }

  get maintenanceRoomsCount(): number {
    return this.rooms.filter(r => r.status !== 'AVAILABLE' || !r.is_active).length;
  }

  get activeUsersCount(): number {
    return this.users.filter(u => u.is_active).length;
  }

  get adminCount(): number {
    return this.users.filter(u => u.is_admin).length;
  }

  // --- FILTERED DATASETS FOR ADMIN LIVE SEARCH ---
  get filteredRooms(): Room[] {
    if (!this.searchTerm.trim()) return this.rooms;
    const term = this.searchTerm.toLowerCase().trim();
    return this.rooms.filter(r => 
      r.name.toLowerCase().includes(term) ||
      (r.location?.building_name && r.location.building_name.toLowerCase().includes(term))
    );
  }

  get filteredLocations(): Location[] {
    if (!this.searchTerm.trim()) return this.locations;
    const term = this.searchTerm.toLowerCase().trim();
    return this.locations.filter(l => 
      l.building_name.toLowerCase().includes(term) ||
      l.floor.toLowerCase().includes(term) ||
      (l.city && l.city.toLowerCase().includes(term))
    );
  }

  get filteredUsers(): User[] {
    if (!this.searchTerm.trim()) return this.users;
    const term = this.searchTerm.toLowerCase().trim();
    return this.users.filter(u => 
      u.full_name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  }

  get filteredBookings(): Booking[] {
    if (!this.searchTerm.trim()) return this.bookings;
    const term = this.searchTerm.toLowerCase().trim();
    return this.bookings.filter(b => 
      b.title.toLowerCase().includes(term) ||
      (b.room?.name && b.room.name.toLowerCase().includes(term)) ||
      (b.user?.full_name && b.user.full_name.toLowerCase().includes(term))
    );
  }

  get filteredAuditLogs(): AuditLog[] {
    if (!this.searchTerm.trim()) return this.auditLogs;
    const term = this.searchTerm.toLowerCase().trim();
    return this.auditLogs.filter(a => 
      a.action_type.toLowerCase().includes(term) ||
      a.admin_email.toLowerCase().includes(term) ||
      a.description.toLowerCase().includes(term)
    );
  }

  // --- ONE-CLICK CSV REPORT EXPORT ---
  exportBookingsCSV(): void {
    if (this.bookings.length === 0) {
      this.showToast('No booking records available to export.', 'danger');
      return;
    }

    const headers = ['Booking ID', 'Meeting Title', 'Room Name', 'Building Name', 'Floor', 'Reserved By User', 'User Email', 'Start Time', 'End Time', 'Status', 'Participants Count'];
    
    const rows = this.bookings.map(b => [
      `"${b.id}"`,
      `"${b.title.replace(/"/g, '""')}"`,
      `"${b.room?.name || 'N/A'}"`,
      `"${b.room?.location?.building_name || b.location?.building_name || 'N/A'}"`,
      `"${b.room?.location?.floor || b.location?.floor || 'N/A'}"`,
      `"${b.user?.full_name || 'N/A'}"`,
      `"${b.user?.email || 'N/A'}"`,
      `"${new Date(b.start_time).toLocaleString()}"`,
      `"${new Date(b.end_time).toLocaleString()}"`,
      `"${b.status}"`,
      `"${b.participants?.length || 0}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Meeting_Bookings_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast('CSV Bookings Report downloaded successfully!');
  }

  loadRooms(): void {
    this.adminService.getRooms().subscribe({
      next: (rooms) => this.rooms = rooms,
      error: (err) => this.showToast(err.error?.detail || 'Failed to load rooms', 'danger')
    });
  }

  loadLocations(): void {
    this.adminService.getLocations().subscribe({
      next: (locs) => this.locations = locs,
      error: () => {}
    });
  }

  loadUsers(): void {
    this.adminService.getUsers().subscribe({
      next: (users) => this.users = users,
      error: (err) => this.showToast(err.error?.detail || 'Failed to load users', 'danger')
    });
  }

  loadBookings(): void {
    this.adminService.getBookings().subscribe({
      next: (bookings) => this.bookings = bookings,
      error: (err) => this.showToast(err.error?.detail || 'Failed to load system bookings', 'danger')
    });
  }

  loadAuditLogs(): void {
    this.adminService.getAuditLogs().subscribe({
      next: (logs) => this.auditLogs = logs,
      error: () => {}
    });
  }

  // --- LOCATION MANAGEMENT ---
  initLocForm(loc?: Location): void {
    this.locForm = this.fb.group({
      building_name: [loc ? loc.building_name : '', [Validators.required]],
      floor: [loc ? loc.floor : '', [Validators.required]],
      block: [loc ? (loc.block || '') : ''],
      city: [loc ? (loc.city || 'HQ') : 'HQ'],
      address: [loc ? (loc.address || '') : ''],
      is_active: [loc ? loc.is_active : true]
    });
  }

  openAddLocModal(): void {
    this.editingLoc = null;
    this.modalError = '';
    this.initLocForm();
    this.showLocModal = true;
  }

  openEditLocModal(loc: Location): void {
    this.editingLoc = loc;
    this.modalError = '';
    this.initLocForm(loc);
    this.showLocModal = true;
  }

  closeLocModal(): void {
    this.showLocModal = false;
    this.editingLoc = null;
    this.modalError = '';
  }

  saveLocation(): void {
    this.modalError = '';
    if (this.locForm.invalid) {
      this.locForm.markAllAsTouched();
      return;
    }

    this.isSavingLoc = true;
    const formVals = this.locForm.value;

    const payload = {
      building_name: formVals.building_name.trim(),
      floor: formVals.floor.trim(),
      block: formVals.block?.trim() || undefined,
      city: formVals.city?.trim() || 'HQ',
      address: formVals.address?.trim() || undefined,
      is_active: formVals.is_active
    };

    if (this.editingLoc) {
      this.adminService.updateLocation(this.editingLoc.id, payload).subscribe({
        next: () => {
          this.isSavingLoc = false;
          this.closeLocModal();
          this.showToast('Location updated successfully');
          this.loadLocations();
          this.loadAuditLogs();
        },
        error: (err) => {
          this.isSavingLoc = false;
          const msg = err.error?.detail || 'Failed to update location.';
          this.modalError = msg;
          this.showToast(msg, 'danger');
        }
      });
    } else {
      this.adminService.createLocation(payload).subscribe({
        next: () => {
          this.isSavingLoc = false;
          this.closeLocModal();
          this.showToast('New location created successfully');
          this.loadLocations();
          this.loadAuditLogs();
        },
        error: (err) => {
          this.isSavingLoc = false;
          const msg = err.error?.detail || 'Failed to create location.';
          this.modalError = msg;
          this.showToast(msg, 'danger');
        }
      });
    }
  }

  async toggleLocActive(loc: Location): Promise<void> {
    const actionName = loc.is_active ? 'deactivate' : 'activate';
    const confirmed = await this.confirmDialog.confirm({
      title: `${actionName.toUpperCase()} Location`,
      message: `Are you sure you want to ${actionName} "${loc.building_name} - ${loc.floor}"?`,
      confirmText: `${actionName.toUpperCase()} Location`,
      cancelText: 'Cancel',
      variant: loc.is_active ? 'warning' : 'primary'
    });

    if (!confirmed) return;

    this.adminService.updateLocation(loc.id, { is_active: !loc.is_active }).subscribe({
      next: (updatedLoc) => {
        loc.is_active = updatedLoc.is_active;
        this.showToast(`Location "${loc.building_name} - ${loc.floor}" is now ${updatedLoc.is_active ? 'Active' : 'Inactive'}`);
        this.loadAuditLogs();
      },
      error: (err) => {
        this.showToast(err.error?.detail || 'Failed to update location status', 'danger');
      }
    });
  }

  // --- USER ACCOUNT MANAGEMENT ---
  async toggleUserActive(user: User): Promise<void> {
    const actionName = user.is_active ? 'deactivate' : 'activate';
    const confirmed = await this.confirmDialog.confirm({
      title: `${actionName.toUpperCase()} User Account`,
      message: `Are you sure you want to ${actionName} "${user.full_name}" (${user.email})?`,
      confirmText: `${actionName.toUpperCase()} User`,
      cancelText: 'Cancel',
      variant: user.is_active ? 'warning' : 'primary'
    });

    if (!confirmed) return;

    this.adminService.toggleUserStatus(user.id).subscribe({
      next: (updatedUser) => {
        user.is_active = updatedUser.is_active;
        this.showToast(`User ${updatedUser.full_name} is now ${updatedUser.is_active ? 'Active' : 'Deactivated'}`);
        this.loadAuditLogs();
      },
      error: (err) => {
        this.showToast(err.error?.detail || 'Failed to change user status', 'danger');
      }
    });
  }

  // --- ROOM MANAGEMENT & OPERATIONAL STATUSES ---
  selectedRoomFeatures: string[] = [];
  featureInputTerm = '';
  imagePreview: string = '';

  addFeatureTag(name: string): void {
    const clean = name.trim();
    if (!clean) return;
    if (!this.selectedRoomFeatures.includes(clean)) {
      this.selectedRoomFeatures.push(clean);
    }
    this.featureInputTerm = '';
  }

  removeFeatureTag(name: string): void {
    this.selectedRoomFeatures = this.selectedRoomFeatures.filter(f => f !== name);
  }

  onRoomFileSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
        this.roomForm.patchValue({ image_url: this.imagePreview });
      };
      reader.readAsDataURL(file);
    }
  }

  initRoomForm(room?: Room): void {
    const defaultImg = room ? (room.image_url || '') : 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600';
    this.imagePreview = defaultImg;
    this.roomForm = this.fb.group({
      name: [room ? room.name : '', [Validators.required]],
      capacity: [room ? room.capacity : 10, [Validators.required, Validators.min(1)]],
      location_id: [room ? (room.location_id || '') : (this.locations[0]?.id || '')],
      status: [room ? room.status : 'AVAILABLE', [Validators.required]],
      description: [room ? (room.description || '') : ''],
      image_url: [defaultImg],
      is_active: [room ? room.is_active : true]
    });
  }

  openAddRoomModal(): void {
    this.editingRoom = null;
    this.selectedRoomFeatures = ['4K Projector', 'Whiteboard', 'High-speed Wi-Fi'];
    this.featureInputTerm = '';
    this.imagePreview = 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600';
    this.modalError = '';
    this.initRoomForm();
    this.showRoomModal = true;
  }

  openEditRoomModal(room: Room): void {
    this.editingRoom = room;
    this.selectedRoomFeatures = room.features ? [...room.features] : [];
    this.featureInputTerm = '';
    this.imagePreview = room.image_url || 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=600';
    this.modalError = '';
    this.initRoomForm(room);
    this.showRoomModal = true;
  }

  closeRoomModal(): void {
    this.showRoomModal = false;
    this.editingRoom = null;
    this.selectedRoomFeatures = [];
    this.featureInputTerm = '';
    this.imagePreview = '';
    this.modalError = '';
  }

  saveRoom(): void {
    this.modalError = '';
    if (this.roomForm.invalid) {
      this.roomForm.markAllAsTouched();
      return;
    }

    this.isSavingRoom = true;
    const formVals = this.roomForm.value;

    const payload = {
      name: formVals.name.trim(),
      capacity: Number(formVals.capacity),
      location_id: formVals.location_id || undefined,
      status: formVals.status,
      features: this.selectedRoomFeatures,
      description: formVals.description?.trim() || undefined,
      image_url: formVals.image_url?.trim() || undefined,
      is_active: formVals.is_active
    };

    if (this.editingRoom) {
      this.adminService.updateRoom(this.editingRoom.id, payload).subscribe({
        next: () => {
          this.isSavingRoom = false;
          this.closeRoomModal();
          this.showToast('Room updated successfully');
          this.loadRooms();
          this.loadAuditLogs();
        },
        error: (err) => {
          this.isSavingRoom = false;
          const msg = err.error?.detail || 'Failed to update room.';
          this.modalError = msg;
          this.showToast(msg, 'danger');
        }
      });
    } else {
      this.adminService.createRoom(payload).subscribe({
        next: () => {
          this.isSavingRoom = false;
          this.closeRoomModal();
          this.showToast('New room created successfully');
          this.loadRooms();
          this.loadAuditLogs();
        },
        error: (err) => {
          this.isSavingRoom = false;
          const msg = err.error?.detail || 'Failed to create room.';
          this.modalError = msg;
          this.showToast(msg, 'danger');
        }
      });
    }
  }

  // --- BOOKING DETAILS MODAL ---
  openBookingDetailsModal(booking: Booking): void {
    this.selectedBookingDetails = booking;
    this.showBookingDetailsModal = true;
  }

  closeBookingDetailsModal(): void {
    this.showBookingDetailsModal = false;
    this.selectedBookingDetails = null;
  }

  // --- BOOKINGS CANCELLATION ---
  async adminCancelBooking(booking: Booking): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Admin Cancel Booking',
      message: `Cancel booking "${booking.title}" reserved for ${booking.user?.full_name || 'User'}?`,
      confirmText: 'Cancel Booking',
      cancelText: 'Go Back',
      variant: 'danger'
    });

    if (!confirmed) return;

    this.adminService.cancelBooking(booking.id).subscribe({
      next: () => {
        this.showToast('Booking cancelled by Admin');
        this.loadBookings();
        this.loadAuditLogs();
      },
      error: (err) => {
        this.showToast(err.error?.detail || 'Failed to cancel booking', 'danger');
      }
    });
  }

  showToast(message: string, type: 'success' | 'danger' = 'success'): void {
    this.toast = { show: true, message, type };
    setTimeout(() => {
      this.toast.show = false;
    }, 4000);
  }
}
