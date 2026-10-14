import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import './assets/styles/global.scss';
import App from './App.vue';
import router from './router';
createApp(App).use(createPinia()).use(Antd).use(router).mount('#app');
