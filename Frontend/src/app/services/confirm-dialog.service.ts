import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ConfirmDialogOptions, ConfirmDialogState } from './confirm-dialog.model';

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  private resolveFn: ((value: boolean) => void) | null = null;

  private readonly stateSubject = new BehaviorSubject<ConfirmDialogState>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'primary'
  });

  readonly state$ = this.stateSubject.asObservable();

  confirm(options: ConfirmDialogOptions): Promise<boolean> {
    // Close any previous dialog as cancelled
    if (this.resolveFn) {
      this.resolveFn(false);
      this.resolveFn = null;
    }

    this.stateSubject.next({
      open: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'primary'
    });

    return new Promise<boolean>((resolve) => {
      this.resolveFn = resolve;
    });
  }

  accept(): void {
    this.close(true);
  }

  dismiss(): void {
    this.close(false);
  }

  private close(result: boolean): void {
    const current = this.stateSubject.value;
    this.stateSubject.next({ ...current, open: false });

    if (this.resolveFn) {
      this.resolveFn(result);
      this.resolveFn = null;
    }
  }
}
