import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import Tooltip from 'primevue/tooltip';
import Ripple from 'primevue/ripple';
import ToastService from 'primevue/toastservice';

import App from './App.vue';
// import 'primevue/resources/themes/lara-dark-indigo/theme.css'; // primevue
import 'primevue/resources/themes/tailwind-light/theme.css'; // primevue
import 'primevue/resources/primevue.min.css'; // core css
import 'primeicons/primeicons.css'; // icons
import 'uno.css';

const app = createApp(App);

app.use(PrimeVue);
app.use(ToastService);
app.directive('tooltip', Tooltip);
app.directive('ripple', Ripple);

app.mount('#app');
