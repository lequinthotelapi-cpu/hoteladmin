import { Directive, Input, TemplateRef, ViewContainerRef, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { UserRepository } from '../../domain/repositories/user.repository';
import { UserRole } from '../../core/models/user-role.enum';

/**
 * Structural directive to show/hide elements based on user role
 * 
 * Usage:
 * <div *hasRole="'admin'">Admin only content</div>
 * <div *hasRole="['admin', 'manager']">Admin or Manager content</div>
 */
@Directive({
  selector: '[hasRole]'
})
export class HasRoleDirective implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  private requiredRoles: UserRole[] = [];

  @Input() set hasRole(roles: UserRole | UserRole[]) {
    this.requiredRoles = Array.isArray(roles) ? roles : [roles];
    this.updateView();
  }

  constructor(
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef,
    private authService: AuthService,
    private userRepository: UserRepository
  ) {}

  ngOnInit() {
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe(firebaseUser => {
        if (firebaseUser) {
          this.checkUserRole(firebaseUser.uid);
        } else {
          this.viewContainer.clear();
        }
      });
  }

  private checkUserRole(uid: string) {
    this.userRepository.getById(uid)
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        if (user && this.requiredRoles.includes(user.role as UserRole)) {
          this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
          this.viewContainer.clear();
        }
      });
  }

  private updateView() {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.checkUserRole(currentUser.uid);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
