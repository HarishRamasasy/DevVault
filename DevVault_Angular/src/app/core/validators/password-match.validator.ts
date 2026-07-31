import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const passwordMatchValidator = (passwordKey: string, confirmPasswordKey: string): ValidatorFn => {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey)?.value;
    const confirmPassword = group.get(confirmPasswordKey)?.value;
    const confirmControl = group.get(confirmPasswordKey);

    if (confirmControl?.hasError('required')) {
      return null;
    }

    if (password !== confirmPassword) {
      confirmControl?.setErrors({ ...confirmControl.errors, passwordMismatch: true });
      return null;
    }

    if (confirmControl?.hasError('passwordMismatch')) {
      const { passwordMismatch, ...rest } = confirmControl.errors ?? {};
      confirmControl.setErrors(Object.keys(rest).length ? rest : null);
    }

    return null;
  };
};
