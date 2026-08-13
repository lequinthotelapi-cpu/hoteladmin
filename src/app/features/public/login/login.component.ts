import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { fadeInUpAnimation } from '../../../../@fury/animations/fade-in-up.animation';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AlertService } from '../../../core/services/alert.service';
import { ErrorHandler } from '../../../core/utils/error-handler';

@Component({
  selector: 'fury-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  animations: [fadeInUpAnimation]
})
export class LoginComponent implements OnInit {

  private static readonly REMEMBER_EMAIL_KEY = 'rememberedEmail';

  form: UntypedFormGroup;

  inputType = 'password';
  visible = false;

  constructor(private router: Router,
              private fb: UntypedFormBuilder,
              private cd: ChangeDetectorRef,
              private alertService: AlertService,
              private authService: AuthService,
              private notificationService: NotificationService
  ) {
  }

  ngOnInit() {
    const rememberedEmail = localStorage.getItem(LoginComponent.REMEMBER_EMAIL_KEY) || '';

    this.form = this.fb.group({
      email: [rememberedEmail, Validators.required],
      password: ['', Validators.required],
      rememberMe: [!!rememberedEmail]
    });
  }

  async send() {
    if (this.form.valid) {
      try {
        const { email, password, rememberMe } = this.form.value;
        this.alertService.loading('Iniciando sesión...');
        await this.authService.signIn(email, password);
        this.alertService.close();

        if (rememberMe) {
          localStorage.setItem(LoginComponent.REMEMBER_EMAIL_KEY, email);
        } else {
          localStorage.removeItem(LoginComponent.REMEMBER_EMAIL_KEY);
        }

        this.router.navigate(['/dashboard']);
        this.alertService.toast('Sesión iniciada correctamente', 'success');
      } catch (error: any) {
        this.alertService.close();
        
        const errorDetail = ErrorHandler.getErrorDetail(error);
        
        if (error.message.includes('Límite de sesiones')) {
          const confirmed = await this.alertService.confirm(
            'Ya tienes una sesión activa. ¿Deseas cerrar las sesiones anteriores e iniciar una nueva?',
            'Límite de sesiones alcanzado',
            'Sí, cerrar sesiones anteriores',
            'Cancelar'
          );
          
          if (confirmed) {
            try {
              this.alertService.loading('Limpiando sesiones...');
              window.location.reload();
            } catch (resetError: any) {
              this.alertService.close();
              this.alertService.error('Por favor, contacta al administrador para resetear tus sesiones');
            }
          }
        } else {
          this.alertService.error(
            `${errorDetail.message}\n\nCódigo de error: ${errorDetail.code}`,
            errorDetail.title
          );
        }
      }
    }
  }

  toggleVisibility() {
    if (this.visible) {
      this.inputType = 'password';
      this.visible = false;
      this.cd.markForCheck();
    } else {
      this.inputType = 'text';
      this.visible = true;
      this.cd.markForCheck();
    }
  }
}
