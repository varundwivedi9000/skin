import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONDITIONS } from '../../core/content';

@Component({
  selector: 'app-conditions',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './conditions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConditionsComponent {
  protected readonly conditions = CONDITIONS;
}
