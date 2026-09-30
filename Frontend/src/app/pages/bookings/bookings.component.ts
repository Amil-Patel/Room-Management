import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { Booking } from '../../models/booking.model';
import { User } from '../../models/user.model';

import { NavbarComponent } from '../../components/navbar/navbar.component';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ReactiveFormsModule, NavbarComponent],
  templateUrl: './bookings.component.html',
  styleUrls: []
})
export class BookingsComponent implements OnInit {
  public authService = inject(AuthService);
  private bookingService = inject(BookingService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  currentUser: User | null = null;
  bookings: Booking[] = [];
  activeTab: 'upcoming' | 'past' = 'upcoming';
  isLoading = false;
  mobileNavOpen = false;
  minDate = '';

  // Edit Booking Modal
  showEditModal = false;
  isSavingEdit = false;
  selectedBooking: Booking | null = null;
  editForm!: FormGroup;

  // Global Alert Message
  toast = {
    show: false,
    message: '',
    type: 'success' as 'success' | 'danger'
  };

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
    const today = new Date();
    this.minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    this.loadBookings();
    this.initEditForm();
  }

  loadBookings(): void {
    this.isLoading = true;
    const filters = {
      upcoming_only: this.activeTab === 'upcoming' ? true : undefined,
      past_only: this.activeTab === 'past' ? true : undefined
    };

    this.bookingService.getBookings(filters).subscribe({
      next: (bookings) => {
        this.bookings = bookings;
        this.isLoading = false;
      },
      error: () => {
        this.showToast('Failed to load bookings list', 'danger');
        this.isLoading = false;
      }
    });
  }

  setTab(tab: 'upcoming' | 'past'): void {
    this.activeTab = tab;
    this.loadBookings();
  }

  async cancelBooking(id: string): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Cancel Booking',
      message: 'Are you sure you want to cancel this booking? This action cannot be undone.',
      confirmText: 'Cancel Booking',
      cancelText: 'Keep Booking',
      variant: 'danger'
    });

    if (!confirmed) return;

    this.bookingService.cancelBooking(id).subscribe({
      next: () => {
        this.showToast('Booking cancelled successfully');
        this.loadBookings();
      },
      error: (err) => {
        this.showToast(err.error?.detail || 'Failed to cancel booking', 'danger');
      }
    });
  }

  initEditForm(booking?: Booking): void {
    // Helper to format ISO datetime back into date and time strings for input fields
    let dateStr = '';
    let startStr = '09:00';
    let endStr = '10:00';

    if (booking) {
      const start = new Date(booking.start_time);
      const end = new Date(booking.end_time);
      
      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      dateStr = `${yyyy}-${mm}-${dd}`;
      
      startStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
      endStr = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
    }

    this.editForm = this.fb.group({
      title: [booking ? booking.title : '', [Validators.required]],
      date: [dateStr, [Validators.required]],
      startTime: [startStr, [Validators.required]],
      endTime: [endStr, [Validators.required]]
    });
  }

  modalError = '';

  openEditModal(booking: Booking): void {
    this.selectedBooking = booking;
    this.modalError = '';
    this.initEditForm(booking);
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedBooking = null;
    this.modalError = '';
  }

  async saveEdit(): Promise<void> {
    this.modalError = '';
    if (this.editForm.invalid || !this.selectedBooking) {
      this.editForm.markAllAsTouched();
      return;
    }

    const formVals = this.editForm.value;
    const startIso = new Date(`${formVals.date}T${formVals.startTime}`).toISOString();
    const endIso = new Date(`${formVals.date}T${formVals.endTime}`).toISOString();

    if (new Date(startIso) >= new Date(endIso)) {
      this.modalError = 'Start time must be before end time';
      this.showToast(this.modalError, 'danger');
      return;
    }

    const confirmed = await this.confirmDialog.confirm({
      title: 'Update Booking',
      message: 'Save these changes to your booking date and time?',
      confirmText: 'Save Changes',
      cancelText: 'Keep Editing',
      variant: 'primary'
    });

    if (!confirmed) return;

    this.isSavingEdit = true;

    const updateData = {
      title: formVals.title,
      start_time: startIso,
      end_time: endIso
    };

    this.bookingService.updateBooking(this.selectedBooking.id, updateData).subscribe({
      next: () => {
        this.isSavingEdit = false;
        this.closeEditModal();
        this.showToast('Booking updated successfully');
        this.loadBookings();
      },
      error: (err) => {
        this.isSavingEdit = false;
        const msg = err.error?.detail || 'Failed to update booking. Slot may overlap.';
        this.modalError = msg;
        this.showToast(msg, 'danger');
      }
    });
  }

  /** Export booking as a standard iCalendar (.ics) file for Google Calendar / Outlook */
  exportIcal(booking: Booking): void {
    const formatIcalDate = (dateStr: string) => {
      const dt = new Date(dateStr);
      return dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const startFormatted = formatIcalDate(booking.start_time);
    const endFormatted = formatIcalDate(booking.end_time);

    const roomName = booking.room?.name || 'Meeting Room';
    const roomLoc = booking.room?.location ? ` (${booking.room.location})` : '';

    const icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MeetSpace//Meeting Room Booking System//EN',
      'BEGIN:VEVENT',
      `SUMMARY:${booking.title}`,
      `LOCATION:${roomName}${roomLoc}`,
      `DESCRIPTION:Reserved via MeetSpace Meeting Room Booking System`,
      `DTSTART:${startFormatted}`,
      `DTEND:${endFormatted}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${booking.title.replace(/[^a-zA-Z0-9]/g, '_')}_booking.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Calendar event downloaded (.ics)', 'success');
  }

  /** Copy formatted meeting invite text to clipboard for Slack, Teams, or Email */
  copyInvite(booking: Booking): void {
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);

    const dateFormatted = startDate.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const startTimeStr = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const roomName = booking.room?.name || 'Meeting Room';
    const roomLoc = booking.room?.location ? ` (${booking.room.location})` : '';

    const inviteText = `📌 Meeting: ${booking.title}\n📍 Location: ${roomName}${roomLoc}\n📅 Date: ${dateFormatted}\n⏰ Time: ${startTimeStr} - ${endTimeStr}`;

    navigator.clipboard.writeText(inviteText).then(() => {
      this.showToast('Meeting invite copied to clipboard!', 'success');
    }).catch(() => {
      this.showToast('Failed to copy to clipboard', 'danger');
    });
  }

  // Toast Helper
  showToast(message: string, type: 'success' | 'danger' = 'success'): void {
    this.toast = { show: true, message, type };
    setTimeout(() => {
      this.toast.show = false;
    }, 4000);
  }

  async logout(): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Logout',
      message: 'Are you sure you want to log out of MeetSpace?',
      confirmText: 'Logout',
      cancelText: 'Stay Signed In',
      variant: 'warning'
    });

    if (!confirmed) return;

    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
