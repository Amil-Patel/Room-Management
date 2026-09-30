import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.component.html'
})
export class NavbarComponent {
  @Input() activeTab: 'dashboard' | 'bookings' | 'admin' = 'dashboard';
  
  public authService = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);
  private router = inject(Router);

  mobileNavOpen = false;

  get currentUser(): User | null {
    return this.authService.currentUserValue;
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
