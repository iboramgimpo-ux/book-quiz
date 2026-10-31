// 최소 서비스워커: 홈 화면 앱 설치(PWA)를 위해 필요하며, 파일을 따로 저장하지 않고 항상 최신 사이트를 불러옵니다.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
