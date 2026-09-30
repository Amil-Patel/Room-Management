import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from '../../services/confirm-dialog.service';
import { ConfirmDialogState } from '../../services/confirm-dialog.model';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-dialog.component.html'
})
export class ConfirmDialogComponent {
  private confirmDialog = inject(ConfirmDialogService);
  state: ConfirmDialogState | null = null;

  constructor() {
    this.confirmDialog.state$.subscribe((state) => {
      this.state = state;
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.state?.open) {
      this.dismiss();
    }
  }

  accept(): void {
    this.confirmDialog.accept();
  }

  dismiss(): void {
    this.confirmDialog.dismiss();
  }
}
