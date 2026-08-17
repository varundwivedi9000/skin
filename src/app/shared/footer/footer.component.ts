import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC } from '../../core/content';
import { ViewportService } from '../../core/viewport.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly viewport = inject(ViewportService);

  protected readonly clinic = CLINIC;
  protected readonly year = new Date().getFullYear();

  protected readonly footerGrid = computed(() => {
    const mob = this.viewport.isMobile();
    const padding = mob ? '40px 20px 32px' : '56px clamp(20px,5vw,72px) 40px';
    const columns = mob ? 'minmax(0,1fr)' : 'minmax(0,1.4fr) repeat(3,minmax(0,1fr))';
    const gap = mob ? '28px' : '36px';
    return `max-width:1180px;margin:0 auto;padding:${padding};display:grid;grid-template-columns:${columns};gap:${gap}`;
  });
}
