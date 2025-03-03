import { executeQuery } from "../services/dbService";
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const crearDeuda = async (req: Request, res: Response): Promise<void> => {
    const { monto, descripcion } = req.body;

    if (!monto || monto <= 0 || !descripcion) {
        res.status(400).json({ error: "Monto y descripción son obligatorios" });
        return;
    }

    const id = uuidv4();

    try {
        await executeQuery(
            "INSERT INTO deudas (id, monto, descripcion) VALUES (?, ?, ?)",
            [id, monto, descripcion]
        );

        res.status(201).json({ message: "Deuda registrada correctamente", id });
    } catch (error) {
        res.status(500).json({ error: "Error al registrar la deuda" });
    }
};


export const obtenerDeudas = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await executeQuery("SELECT * FROM deudas ORDER BY fecha DESC");
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener deudas" });
    }
};

export const pagarDeuda = async (req: Request, res: Response): Promise<void> => {
    const { deuda_id, cuenta_id } = req.body;

    if (!deuda_id || !cuenta_id) {
        res.status(400).json({ error: "Debe proporcionar deuda_id y cuenta_id" });
        return;
    }

    try {
        // Obtener la deuda
        const deudaResult = await executeQuery("SELECT * FROM deudas WHERE id = ?", [deuda_id]);
        if (deudaResult.rows.length === 0) {
            res.status(404).json({ error: "Deuda no encontrada" });
            return;
        }

        const deuda = deudaResult.rows[0];

        if (deuda.estado === "pagado") {
            res.status(400).json({ error: "La deuda ya ha sido pagada" });
            return;
        }

        // Obtener el saldo de la cuenta
        const cuentaResult = await executeQuery("SELECT saldo FROM cuentas WHERE id = ?", [cuenta_id]);
        if (cuentaResult.rows.length === 0) {
            res.status(404).json({ error: "Cuenta no encontrada" });
            return;
        }

        const saldoCuenta = cuentaResult.rows[0]?.saldo ?? 0;

        const montoDeuda = deuda.monto ?? 0;
        if (saldoCuenta < montoDeuda) {
            res.status(400).json({ error: "Saldo insuficiente para pagar la deuda" });
            return;
        }

        // Registrar la transacción como un "gasto"
        const transaccion_id = uuidv4();
        await executeQuery(
            "INSERT INTO transacciones (id, monto, descripcion, tipo, cuenta_id) VALUES (?, ?, ?, 'gastos', ?)",
            [transaccion_id, deuda.monto, `Pago de deuda: ${deuda.descripcion}`, cuenta_id]
        );

        // Restar el saldo de la cuenta
        await executeQuery("UPDATE cuentas SET saldo = saldo - ? WHERE id = ?", [deuda.monto, cuenta_id]);

        // Marcar la deuda como pagada
        await executeQuery(
            "UPDATE deudas SET estado = 'pagado', fecha_pago = datetime('now') WHERE id = ?",
            [deuda_id]
        );

        res.status(200).json({ message: "Deuda pagada exitosamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al procesar el pago de la deuda" });
    }
};
