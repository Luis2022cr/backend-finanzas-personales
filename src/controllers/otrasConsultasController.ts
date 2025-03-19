import { Request, Response } from 'express';
import { executeQuery } from '../services/dbService';
import { v4 as uuidv4 } from 'uuid';

// Obtener balance total, ingresos y gastos en un solo endpoint
export const obtenerBalanceIngresosYGastos = async (req: Request, res: Response): Promise<void> => {
    try {
        // Obtener el balance total (suma de todos los saldos de las cuentas)
        const balanceTotalResult = await executeQuery("SELECT SUM(saldo) AS balance_total FROM cuentas");
        const balanceTotal = balanceTotalResult.rows[0]?.balance_total || 0;

        // Obtener el total de ingresos
        const ingresosResult = await executeQuery("SELECT SUM(monto) AS total_ingresos FROM transacciones WHERE tipo = 'ingresos'");
        const totalIngresos = ingresosResult.rows[0]?.total_ingresos || 0;

        // Obtener el total de gastos
        const gastosResult = await executeQuery("SELECT SUM(monto) AS total_gastos FROM transacciones WHERE tipo = 'gastos'");
        const totalGastos = gastosResult.rows[0]?.total_gastos || 0;

        res.status(200).json({
            balance_total: balanceTotal,
            total_ingresos: totalIngresos,
            total_gastos: totalGastos
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el balance, ingresos y gastos' });
    }
};

