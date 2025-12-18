// index.ts
import { Router } from 'express';
import * as cuentaController from '../controllers/cuentaController';
import * as transaccionController from '../controllers/transaccionController';
import { login, register } from '../controllers/authController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import * as otrasConsultasController from '../controllers/otrasConsultasController';
import { crearDeuda, obtenerDeudas, pagarDeuda, pagarParcialmenteDeuda } from '../controllers/deudasController';
import { crearTransaccionCripto, getCriptos, getTransaccionesCripto } from '../controllers/CriptoController';

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
 
// deudas
router.get('/deudas', obtenerDeudas);
router.post('/crear-deudas', crearDeuda);
router.post('/pagar-deudas', pagarDeuda);
router.post('/pagar-deudas-parcial', pagarParcialmenteDeuda);

//Cripto
router.get('/cripto', getCriptos);
router.post('/cripto', crearTransaccionCripto);
router.get('/transaccionescripto', getTransaccionesCripto);


export default router; 
