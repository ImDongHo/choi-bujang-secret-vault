// 11단계: 오프라인 안내용 서비스 워커입니다.
// - 안내 페이지(offline.html)와 아이콘만 저장합니다. 메모·공지 같은 자료와 /api 응답은 저장하지 않습니다.
// - 화면 이동 요청이 네트워크에서 실패할 때만 안내 페이지를 보여 줍니다. 기기 확인을 대신하지 않습니다.
const CACHE = 'byteback-offline-v1';
const OFFLINE_FILES = ['/offline.html', '/icon.svg'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(OFFLINE_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return; // 자료·API는 손대지 않음
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  }
});
