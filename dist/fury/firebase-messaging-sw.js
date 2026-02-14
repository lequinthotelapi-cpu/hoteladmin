importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCxR8K4O1hlF7QvOkXlbjwferyO66ovaFw',
  authDomain: 'lequinthotel-ca6ef.firebaseapp.com',
  projectId: 'lequinthotel-ca6ef',
  messagingSenderId: '803175500602',
  appId: '1:803175500602:web:0e920a81f67bbbce8bde03'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(
    payload.notification.title,
    {
      body: payload.notification.body,
      icon: '/assets/icons/icon-72x72.png'
    }
  );
});
