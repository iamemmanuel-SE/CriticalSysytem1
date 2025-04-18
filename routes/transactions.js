 const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.js');
router.use(auth);
const { createTransaction, getTransactions, getTransaction, deleteTransaction, updateTransaction } = require('../controllers/transactions.js');
router.post('/', createTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransaction);
router.delete('/:id', deleteTransaction);
router.put('/:id', updateTransaction);
module.exports = router;