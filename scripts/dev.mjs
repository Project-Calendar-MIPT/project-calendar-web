import { createInterface } from 'readline';
import { spawn } from 'child_process';

const REMOTE_URL = 'https://mipt.impelix.dev/api';
const LOCAL_URL = 'http://localhost:8080/api';

const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log('\nКуда отправлять API запросы?');
console.log('  1) Удалённый сервер — mipt.impelix.dev  (по умолчанию)');
console.log('  2) Локальный Docker  — localhost:8080');
console.log('');

rl.question('Выберите [1/2] (Enter = 1): ', (answer) => {
  rl.close();

  const useLocal = answer.trim() === '2';
  const apiUrl = useLocal ? LOCAL_URL : REMOTE_URL;

  if (useLocal) {
    console.log('');
    console.log('  Нужно поднять бэкенд из project-calendar-core:');
    console.log('  cd ../project-calendar-core && docker compose up -d');
    console.log('  (сборка образа занимает несколько минут при первом запуске)');
    console.log('');
  } else {
    console.log(`\n  API: ${apiUrl}\n`);
  }

  const env = { ...process.env, VITE_API_BASE_URL: apiUrl };
  const vite = spawn('vite', [], { env, stdio: 'inherit', shell: true });
  vite.on('exit', (code) => process.exit(code ?? 0));
});
