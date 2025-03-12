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

// 📌 1️⃣ Obtener balance total y PNL
export const obtenerBalanceTotalYPnl = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await executeQuery("SELECT * FROM futuros_balance LIMIT 1");
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'No hay datos de balance' });
            return;
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el balance total y PNL' });
    }
};

// 📌 Registrar balance diario y actualizar PNL
export const registrarBalanceDiario = async (req: Request, res: Response): Promise<void> => {
    const { balance_final } = req.body;

    if (!balance_final || balance_final < 0) {
        res.status(400).json({ error: "El balance debe ser un número positivo" });
        return;
    }

    const id = uuidv4();

    try {
        // 🔹 Obtener el balance del día anterior para calcular PNL diario
        const lastBalanceResult = await executeQuery(
            "SELECT balance_final FROM balances_diarios ORDER BY fecha DESC LIMIT 1"
        );

        let pnl_dia = 0;
        // Verificar si se encontró un balance anterior
        if (lastBalanceResult.rows.length > 0) {
            const lastBalance = lastBalanceResult.rows[0].balance_final;
           
            
            // Verificar si el valor de lastBalance es un número válido
            if (typeof lastBalance === 'number') {
                pnl_dia = balance_final - lastBalance; // 📌 Diferencia entre el balance de hoy y el anterior
            } else {
                throw new Error('El balance anterior no es un número válido');
            }
        }
       
        // 🔹 Insertar nuevo balance diario con PNL calculado
        await executeQuery(
            "INSERT INTO balances_diarios (id, fecha, balance_final, pnl_dia) VALUES (?, DATE('now', '-6 hours'), ?, ?)",
            [id, balance_final, pnl_dia]
        );
        

        // 🔹 Actualizar los valores en la tabla futuros_balance
        const updateQuery = ` 
            UPDATE futuros_balance
            SET 
                balance_total = ?,
                pnl_diario = ?,
                pnl_semanal = (SELECT SUM(pnl_dia) FROM balances_diarios WHERE fecha >= DATE('now', '-6 days')),
                pnl_mensual = (SELECT SUM(pnl_dia) FROM balances_diarios WHERE fecha >= DATE('now', 'start of month')),
                pnl_anual = (SELECT SUM(pnl_dia) FROM balances_diarios WHERE fecha >= DATE('now', 'start of year'))
            WHERE id = (SELECT id FROM futuros_balance LIMIT 1); -- Aseguramos que solo se actualice un registro
        `;

        // Ejecutamos la consulta de actualización
        await executeQuery(updateQuery, [balance_final, pnl_dia]);

        res.status(201).json({
            message: "Balance diario registrado y actualizado correctamente",
            pnl_dia
        });

    } catch (error) {
        console.error("Database query error:", error);
        res.status(500).json({ error: "Error al registrar o actualizar el balance diario" });
    }
};


// 📌 3️⃣ Obtener historial de balances diarios
export const obtenerHistorialBalances = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await executeQuery("SELECT * FROM balances_diarios ORDER BY fecha DESC");
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de balances' });
    }
};
