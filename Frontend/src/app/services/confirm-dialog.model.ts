export type ConfirmDialogVariant = 'danger' | 'primary' | 'warning';

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
}

export interface ConfirmDialogState extends ConfirmDialogOptions {
  open: boolean;
}
