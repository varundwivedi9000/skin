import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CLINIC } from '../../core/content';

@Component({
  selector: 'app-sticky-cta',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './sticky-cta.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StickyCtaComponent {
  protected readonly clinic = CLINIC;
}
