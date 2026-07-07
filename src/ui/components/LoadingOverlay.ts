import type { Disposable } from '@/core/Disposable';

/** Full-bleed overlay shown while a panorama loads, and for fatal load errors. */
export class LoadingOverlay implements Disposable {
  public readonly element: HTMLDivElement;
  private readonly spinner: HTMLDivElement;
  private readonly message: HTMLParagraphElement;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'vt-loading';

    this.spinner = document.createElement('div');
    this.spinner.className = 'vt-loading__spinner';

    this.message = document.createElement('p');
    this.message.className = 'vt-loading__message';
    this.message.textContent = 'Загрузка панорамы…';

    this.element.append(this.spinner, this.message);
  }

  public showLoading(text = 'Загрузка панорамы…'): void {
    this.message.textContent = text;
    this.spinner.hidden = false;
    this.element.classList.remove('vt-loading--error', 'vt-loading--hidden');
  }

  public hide(): void {
    this.element.classList.add('vt-loading--hidden');
  }

  public showError(text: string): void {
    this.message.textContent = text;
    this.spinner.hidden = true;
    this.element.classList.add('vt-loading--error');
    this.element.classList.remove('vt-loading--hidden');
  }

  public dispose(): void {
    this.element.remove();
  }
}
