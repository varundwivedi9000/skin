import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ViewportService } from '../../core/viewport.service';
import { gridCols } from '../../shared/grid.util';
import { DETAILS, TreatmentDetail, TreatmentGroup } from '../../core/content';

@Component({
  selector: 'app-treatment-detail',
  standalone: true,
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './treatment-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreatmentDetailComponent {
  private readonly viewport = inject(ViewportService);

  readonly slug = input<string>('clinical');

  protected readonly detail = computed<TreatmentDetail>(
    () => DETAILS[this.slug() as TreatmentGroup['key']] ?? DETAILS['clinical'],
  );

  protected readonly detailGrid = computed(
    () => gridCols(this.viewport.isMobile(), 1.2, 0.8) + ';margin-top:32px',
  );

  protected readonly stickySide = computed(() => (this.viewport.isMobile() ? '' : 'position:sticky;top:96px'));
}
