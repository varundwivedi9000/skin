import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ViewportService } from '../../core/viewport.service';
import { GROUPS } from '../../core/content';

@Component({
  selector: 'app-treatments',
  standalone: true,
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './treatments.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentsComponent {
  private readonly viewport = inject(ViewportService);

  protected readonly groups = GROUPS;

  protected readonly trtRowGrid = computed(() =>
    this.viewport.isMobile()
      ? 'display:grid;grid-template-columns:minmax(0,1fr);gap:22px'
      : 'display:grid;grid-template-columns:minmax(0,0.9fr) minmax(0,1.3fr);gap:clamp(24px,5vw,64px);align-items:end',
  );

  protected pageImage(key: string): string {
    return `uploads/asc-grp-page-${key}.jpeg`;
  }
}
