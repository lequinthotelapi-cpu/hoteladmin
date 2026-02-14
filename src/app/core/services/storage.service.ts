import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  constructor(private storage: Storage) {}

  async uploadUserAvatar(file: File, uid: string): Promise<string> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `${uid}_${timestamp}.${extension}`;
    const storageRef = ref(this.storage, `users/avatars/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  }

  async deleteUserAvatar(avatarUrl: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, avatarUrl);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting avatar:', error);
    }
  }

  async uploadGuestPhoto(file: File): Promise<string> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `guest_${timestamp}.${extension}`;
    const storageRef = ref(this.storage, `guests/photos/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  }

  async deleteGuestPhoto(photoUrl: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, photoUrl);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting guest photo:', error);
    }
  }

  async uploadProductPhoto(file: File): Promise<string> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `product_${timestamp}.${extension}`;
    const storageRef = ref(this.storage, `products/photos/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  }

  async deleteProductPhoto(photoUrl: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, photoUrl);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting product photo:', error);
    }
  }

  async uploadExpenseReceipt(file: File): Promise<string> {
    const timestamp = Date.now();
    const extension = file.name.split('.').pop();
    const fileName = `receipt_${timestamp}.${extension}`;
    const storageRef = ref(this.storage, `expenses/receipts/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    
    return downloadURL;
  }

  async deleteExpenseReceipt(receiptUrl: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, receiptUrl);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting expense receipt:', error);
    }
  }
}
