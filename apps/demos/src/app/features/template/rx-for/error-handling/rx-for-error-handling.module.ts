import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RxForModule } from '../../../../rx-angular-pocs/template/directives/for/rx-for.module';
import { StrategySelectModule } from '../../../../shared/debug-helper/strategy-select/strategy-select.module';
import { ValueProvidersModule } from '../../../../shared/debug-helper/value-provider/value-providers.module';
import { ErrorHandlingParentComponent } from './error-handling-parent.component';
import { ErrorHandlingChildComponent } from './error-handling-child.component';


@NgModule({
  declarations: [ErrorHandlingParentComponent, ErrorHandlingChildComponent],
  imports: [
    CommonModule,
    RxForModule,
    RouterModule.forChild([
      {
        path: '',
        component: ErrorHandlingParentComponent,
      },
    ]),
    ValueProvidersModule,
    StrategySelectModule,
  ],
})
export class RxForErrorHandlingModule {}