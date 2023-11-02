import { ChangeDetectorRef, Component, computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  RX_RENDER_STRATEGIES_CONFIG,
  RxStrategyProvider,
} from '@rx-angular/cdk/render-strategies';
import { Promise as unpatchedPromise } from '@rx-angular/cdk/zone-less/browser';
import { mockConsole } from '@test-helpers/rx-angular';
import { EMPTY, NEVER, Observable, asapScheduler, of, timer } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { RxPush } from '../push.pipe';

function wrapWithSpace(str: string): string {
  return ' ' + str + ' ';
}

@Component({
  template: ` {{ (value$ | push : strategy | json) || 'undefined' }} `,
})
class PushPipeTestComponent {
  value$: Observable<number> = of(42);
  strategy?: string;
}

let fixturePushPipeTestComponent: ComponentFixture<PushPipeTestComponent>;
let pushPipeTestComponent: {
  value$: Observable<unknown> | unknown | undefined | null;
  strategy?: string;
};
let componentNativeElement: HTMLElement;
let strategyProvider: RxStrategyProvider;
let pushPipe: RxPush;

const setupPushPipeComponent = () => {
  TestBed.configureTestingModule({
    declarations: [PushPipeTestComponent],
    imports: [RxPush],
    providers: [
      RxPush,
      ChangeDetectorRef,
      {
        provide: RX_RENDER_STRATEGIES_CONFIG,
        useValue: {
          primaryStrategy: 'native',
          customStrategies: {
            custom: {
              name: 'custom',
              work: (cdRef) => {
                cdRef.detectChanges();
              },
              behavior:
                ({ work }) =>
                (o$) =>
                  o$.pipe(tap(() => work())),
            },
          },
        },
      },
    ],
  });

  fixturePushPipeTestComponent = TestBed.createComponent(PushPipeTestComponent);
  pushPipeTestComponent = fixturePushPipeTestComponent.componentInstance;
  componentNativeElement = fixturePushPipeTestComponent.nativeElement;
  strategyProvider = TestBed.inject(RxStrategyProvider);
  pushPipe = TestBed.inject(RxPush);
};

describe('RxPush', () => {
  beforeAll(() => mockConsole());
  beforeEach(setupPushPipeComponent);

  it('should be instantiable', () => {
    expect(pushPipe).toBeDefined();
  });

  describe('transform function', () => {
    it('should not track signal reads in subscriptions', () => {
      const trigger = signal(false);

      const obs = new Observable(() => {
        // Whenever `obs` is subscribed, synchronously read `trigger`.
        trigger();
      });

      let trackCount = 0;
      const tracker = computed(() => {
        // Subscribe to `obs` within this `computed`. If the subscription side effect runs
        // within the computed, then changes to `trigger` will invalidate this computed.
        pushPipe.transform(obs);

        // The computed returns how many times it's run.
        return ++trackCount;
      });

      expect(tracker()).toBe(1);
      trigger.set(true);
      expect(tracker()).toBe(1);
    });
  });
});

describe('RxPush used as pipe in the template', () => {
  beforeAll(() => mockConsole());

  beforeEach(setupPushPipeComponent);

  it('should be instantiable', () => {
    expect(fixturePushPipeTestComponent).toBeDefined();
    expect(pushPipeTestComponent).toBeDefined();
    expect(componentNativeElement).toBeDefined();
  });

  it('should return undefined as value when initially undefined was passed (as no value ever was emitted)', () => {
    pushPipeTestComponent.value$ = undefined;
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('undefined'));
  });

  it('should return null as value when initially null was passed (as no value ever was emitted)', () => {
    pushPipeTestComponent.value$ = null;
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('null'));
  });

  it('should return 42 as value when initially 42 was passed (as static value)', () => {
    pushPipeTestComponent.value$ = 42;
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('42'));
  });

  it('should return undefined as value when initially of(undefined) was passed (as undefined was emitted)', () => {
    pushPipeTestComponent.value$ = of(undefined);
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('undefined'));
  });

  it('should return null as value when initially of(null) was passed (as null was emitted)', () => {
    pushPipeTestComponent.value$ = of(null);
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('null'));
  });

  it('should return undefined as value when initially EMPTY was passed (as no value ever was emitted)', () => {
    pushPipeTestComponent.value$ = EMPTY;
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('undefined'));
  });

  it('should return undefined as value when initially NEVER was passed (as no value ever was emitted)', () => {
    pushPipeTestComponent.value$ = NEVER;
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('undefined'));
  });

  it('should emitted value from passed observable without changing it', () => {
    pushPipeTestComponent.value$ = of(42);
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('42'));
  });

  it('should return undefined as value when a new observable NEVER was passed (as no value ever was emitted from new observable)', () => {
    pushPipeTestComponent.value$ = of(42);
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('42'));
    pushPipeTestComponent.value$ = of(43);
    fixturePushPipeTestComponent.detectChanges();
    expect(componentNativeElement.textContent).toBe(wrapWithSpace('43'));
  });

  describe('async values', () => {
    let cdSpy: jest.SpyInstance;

    beforeEach(() => {
      const strategy = strategyProvider.strategies['custom'];
      pushPipeTestComponent.strategy = 'custom';
      cdSpy = jest.spyOn(strategy, 'work');
    });

    it('should not detect changes with sync value', () => {
      fixturePushPipeTestComponent.detectChanges();
      expect(componentNativeElement.textContent).toBe(wrapWithSpace('42'));
      expect(cdSpy).toHaveBeenCalledTimes(0);
    });

    it('should detect changes with async value', async () => {
      const value$ = new Observable((sub) => {
        Promise.resolve().then(() => {
          sub.next(44);
          sub.complete();
        });
        return () => {
          sub.complete();
        };
      });
      pushPipeTestComponent.value$ = value$;
      fixturePushPipeTestComponent.detectChanges();
      expect(componentNativeElement.textContent).toBe(
        wrapWithSpace('undefined')
      );
      await Promise.resolve();
      expect(cdSpy).toBeCalledTimes(1);
      expect(componentNativeElement.textContent).toBe(wrapWithSpace('44'));
    });

    it('should detect changes with unpatched Promise', async () => {
      const value$ = new Observable((sub) => {
        unpatchedPromise.resolve().then(() => {
          sub.next(44);
          sub.complete();
        });
        return () => {
          sub.complete();
        };
      });
      pushPipeTestComponent.value$ = value$;
      fixturePushPipeTestComponent.detectChanges();
      expect(componentNativeElement.textContent).toBe(
        wrapWithSpace('undefined')
      );
      await unpatchedPromise.resolve();
      expect(cdSpy).toBeCalledTimes(1);
      expect(componentNativeElement.textContent).toBe(wrapWithSpace('44'));
    });

    it('should detect changes with asapScheduler', async () => {
      const value$ = timer(0, asapScheduler).pipe(map(() => 44));
      pushPipeTestComponent.value$ = value$;
      fixturePushPipeTestComponent.detectChanges();
      expect(componentNativeElement.textContent).toBe(
        wrapWithSpace('undefined')
      );
      await Promise.resolve();
      expect(cdSpy).toBeCalledTimes(1);
      expect(componentNativeElement.textContent).toBe(wrapWithSpace('44'));
    });

    it('should detect changes with macrotask', async () => {
      const value$ = timer(0).pipe(map(() => 44));
      pushPipeTestComponent.value$ = value$;
      fixturePushPipeTestComponent.detectChanges();
      expect(componentNativeElement.textContent).toBe(
        wrapWithSpace('undefined')
      );
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
      expect(cdSpy).toBeCalledTimes(1);
      expect(componentNativeElement.textContent).toBe(wrapWithSpace('44'));
    });
  });
});
