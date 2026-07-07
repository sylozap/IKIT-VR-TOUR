import '@/styles/main.css';
import { App } from '@/app/App';

const mount = document.getElementById('app');
if (!mount) {
  throw new Error('Root element #app was not found in index.html');
}

const app = new App(mount);
void app.start();

// Vite HMR: tear the app down cleanly on hot reload so GPU resources and DOM
// listeners never accumulate across edits.
if (import.meta.hot) {
  import.meta.hot.dispose(() => app.dispose());
}
