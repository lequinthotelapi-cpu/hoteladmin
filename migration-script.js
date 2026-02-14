// Script para migrar datos de cashTransactions a transactions
// Ejecutar en la consola del navegador cuando estés logueado en la app

async function migrateCashTransactionsToTransactions() {
  const db = firebase.firestore();
  
  console.log('Iniciando migración...');
  
  // 1. Obtener todas las cashTransactions
  const cashTransactionsSnapshot = await db.collection('cashTransactions').get();
  console.log(`Encontradas ${cashTransactionsSnapshot.size} transacciones de caja`);
  
  let migratedCount = 0;
  const batch = db.batch();
  
  cashTransactionsSnapshot.forEach(doc => {
    const data = doc.data();
    const newDocRef = db.collection('transactions').doc(doc.id);
    batch.set(newDocRef, data);
    migratedCount++;
  });
  
  // 2. Ejecutar batch
  await batch.commit();
  console.log(`Migradas ${migratedCount} transacciones de caja a transactions`);
  
  // 3. Obtener todos los expenses
  const expensesSnapshot = await db.collection('expenses').get();
  console.log(`Encontrados ${expensesSnapshot.size} gastos`);
  
  let expensesCount = 0;
  const expensesBatch = db.batch();
  
  for (const doc of expensesSnapshot.docs) {
    const expense = doc.data();
    
    // Buscar si ya existe una transacción con referencia a este gasto
    const existingTransaction = await db.collection('transactions')
      .where('reference', '==', doc.id)
      .where('type', '==', 'expense')
      .get();
    
    if (existingTransaction.empty) {
      // No existe, crear transacción desde el gasto
      const newDocRef = db.collection('transactions').doc();
      expensesBatch.set(newDocRef, {
        cashRegisterId: expense.cashRegisterId || 'unknown',
        type: 'expense',
        amount: expense.amount,
        paymentMethod: expense.paymentMethod,
        category: expense.category,
        description: expense.description,
        invoiceNumber: expense.invoiceNumber || null,
        receiptUrl: expense.receiptUrl || null,
        reference: doc.id,
        createdAt: expense.createdAt,
        createdBy: expense.createdBy,
        createdByName: expense.createdByName || 'Usuario'
      });
      expensesCount++;
    }
  }
  
  await expensesBatch.commit();
  console.log(`Migrados ${expensesCount} gastos a transactions`);
  
  console.log('Migración completada!');
  console.log(`Total: ${migratedCount + expensesCount} registros migrados`);
  console.log('IMPORTANTE: Verifica los datos antes de eliminar las colecciones antiguas');
}

// Ejecutar migración
migrateCashTransactionsToTransactions();
