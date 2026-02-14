// Script para actualizar parámetros roomStatuses en Firestore
// Ejecutar en consola del navegador (F12)

async function updateRoomStatuses() {
  const { getFirestore, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const db = getFirestore();
  const docRef = doc(db, 'parameters', 'roomStatuses');
  
  await updateDoc(docRef, {
    options: [
      { value: 'available', label: 'Disponible', active: true, order: 0 },
      { value: 'reserved', label: 'Reservada', active: true, order: 1 },
      { value: 'occupied', label: 'Ocupada', active: true, order: 2 },
      { value: 'dirty', label: 'Sucia', active: true, order: 3 },
      { value: 'cleaning', label: 'En Limpieza', active: true, order: 4 },
      { value: 'maintenance', label: 'Mantenimiento', active: true, order: 5 },
      { value: 'blocked', label: 'Bloqueada', active: true, order: 6 }
    ],
    updatedAt: new Date()
  });
  
  console.log('✅ Parámetros actualizados. Recarga la página.');
}

// Ejecutar
updateRoomStatuses();
