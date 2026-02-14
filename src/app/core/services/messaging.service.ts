import { Injectable } from '@angular/core';
import { Messaging, getToken, onMessage } from '@angular/fire/messaging';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  
  constructor(private messaging: Messaging) {}

  async requestPermission() {
    try {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      console.log('Permission result:', permission);
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        return await this.getToken();
      } else {
        console.log('Unable to get permission to notify.');
        return null;
      }
    } catch (error) {
      console.debug('Push notifications not available:', error);
      return null;
    }
  }

  async getToken() {
    try {
      const token = await getToken(this.messaging, {
        vapidKey: 'BMYz1eOUgBH8muhKrh4UjnSzj38T0Vx5DwmbgCtDYZFCyQopREDXZTbdtf3-JGepsCah1wcdtiWYMs8gJpiyrc8'
      });
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.debug('Push notifications not available:', error);
      return null;
    }
  }

  listenForMessages() {
    try {
      console.log('Setting up message listener...');
      onMessage(this.messaging, (payload) => {
        console.log('Message received in foreground: ', payload);
        this.showNotification(payload);
      });
    } catch (error) {
      console.debug('Push notifications not available:', error);
    }
  }

  private showNotification(payload: any) {
    if (Notification.permission === 'granted') {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon || '/assets/icons/icon-72x72.png'
      });
    }
  }
}