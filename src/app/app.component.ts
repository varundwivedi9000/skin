import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

import { NavComponent } from './shared/nav/nav.component';
import { FooterComponent } from './shared/footer/footer.component';
import { StickyCtaComponent } from './shared/sticky-cta/sticky-cta.component';
import { ViewportService } from './core/viewport.service';
import { ADMIN_PATH } from './app.routes';

const STICKY_CTA_PATHS = new Set(['', 'treatments', 'conditions', 'doctors', 'contact']);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavComponent, FooterComponent, StickyCtaComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportService);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isAdminRoute = computed(() => this.currentUrl().split('?')[0].slice(1) === ADMIN_PATH);

  protected readonly showStickyCta = computed(() => {
    if (!this.viewport.isMobile()) return false;
    const topSegment = this.currentUrl().split('?')[0].split('/')[1] ?? '';
    return STICKY_CTA_PATHS.has(topSegment);
  });
}
