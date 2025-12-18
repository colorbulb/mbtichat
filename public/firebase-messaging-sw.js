// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyCeNWoXGlC_cjXXATuauAmjBom-sVYjMEQ",
  authDomain: "intjchat.firebaseapp.com",
  projectId: "intjchat",
  storageBucket: "intjchat.firebasestorage.app",
  messagingSenderId: "993280462756",
  appId: "1:993280462756:web:1348268d9e3cd5b843fb31",
  measurementId: "G-T90XD8M1G9"
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'NE Dating';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/apple-touch-icon.png',
    badge: '/favicon-32x32.png',
    data: payload.data,
    tag: payload.data?.type || 'general'
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click received.', event);
  
  event.notification.close();
  
  const data = event.notification.data;
  let urlToOpen = '/';
  
  if (data?.type === 'message' && data?.chatId) {
    urlToOpen = `/chat/${data.chatId}`;
  } else if (data?.type === 'activity') {
    urlToOpen = '/events';
  } else if (data?.type === 'match') {
    urlToOpen = '/discover';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there is already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // If not, open a new window/tab with the target URL
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
