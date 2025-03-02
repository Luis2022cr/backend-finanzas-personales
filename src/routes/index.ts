// index.ts
import { Router } from 'express';
import * as cuentaController from '../controllers/cuentaController';
import * as transaccionController from '../controllers/transaccionController';
import { login, register } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import * as otrasConsultasController from '../controllers/otrasConsultasController';
import { obtenerBalanceTotalYPnl, obtenerHistorialBalances, registrarBalanceDiario } from '../controllers/otrasConsultasController';

const router: Router = Router();

router.post('/registro', register, authenticateJWT);
router.post('/login', login);

router.get('/cuentas', cuentaController.getCuentas);
router.get('/cuentas/:id', cuentaController.getCuentaPorId);
router.post('/cuentas/', cuentaController.crearCuenta);
router.put('/cuentas/:id', cuentaController.actualizarCuenta);
router.delete('/cuentas/:id', cuentaController.eliminarCuenta);

router.get('/transacciones', transaccionController.getTransacciones);
router.get('/transacciones/:id', transaccionController.getTransaccionPorId);
router.post('/transacciones', transaccionController.crearTransaccion);
router.put('/transacciones/:id', transaccionController.actualizarTransaccion);
router.delete('/transacciones/:id', transaccionController.eliminarTransaccion);

router.post('/traspaso-de-fondos', transaccionController.transferirFondos);

router.get('/balance-ingresos-y-gastos', otrasConsultasController.obtenerBalanceIngresosYGastos);
 
router.get('/balance-criypto', obtenerBalanceTotalYPnl);
router.post('/balance-diario-criypto', registrarBalanceDiario);
router.get('/historial-balances-criypto', obtenerHistorialBalances);

export default router; 
