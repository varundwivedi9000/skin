import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ViewportService } from '../../core/viewport.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavComponent {
  protected readonly viewport = inject(ViewportService);
  protected readonly menuOpen = signal(false);

  constructor() {
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);
    router.events.pipe(takeUntilDestroyed(destroyRef)).subscribe((e) => {
      if (e instanceof NavigationStart) this.menuOpen.set(false);
    });
  }

  toggleMenu() {
    this.menuOpen.update((v) => !v);
  }
}
