import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:45000,
 use:{baseURL:'http://127.0.0.1:3000',viewport:{width:390,height:844},launchOptions:{executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']},screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:'npm run dev',url:'http://127.0.0.1:3000',reuseExistingServer:!process.env.CI,timeout:120000}
});
