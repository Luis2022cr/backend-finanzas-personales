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
            "INSERT INTO deudas (id, monto_original, monto_pendiente, descripcion) VALUES (?, ?, ?, ?)",
            [id, monto, monto, descripcion]
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

        const cuentaResult = await executeQuery("SELECT saldo FROM cuentas WHERE id = ?", [cuenta_id]);
        if (cuentaResult.rows.length === 0) {
            res.status(404).json({ error: "Cuenta no encontrada" });
            return;
        }

        const saldoCuenta = cuentaResult.rows[0]?.saldo ?? 0;
        const montoPendiente = deuda.monto_pendiente ?? 0;

        if (saldoCuenta < montoPendiente) {
            res.status(400).json({ error: "Saldo insuficiente para pagar la deuda" });
            return;
        }

        const transaccion_id = uuidv4();
        await executeQuery(
            "INSERT INTO transacciones (id, monto, descripcion, tipo, cuenta_id) VALUES (?, ?, ?, 'gastos', ?)",
            [transaccion_id, montoPendiente, `Pago de deuda: ${deuda.descripcion}`, cuenta_id]
        );


        await executeQuery(
            "UPDATE deudas SET estado = 'pagado', fecha_pago = datetime('now'), monto_pendiente = 0 WHERE id = ?",
            [deuda_id]
        );

        res.status(200).json({ message: "Deuda pagada exitosamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al procesar el pago de la deuda" });
    }
};


export const pagarParcialmenteDeuda = async (req: Request, res: Response): Promise<void> => {
    const { deuda_id, cuenta_id, monto_pago } = req.body;

    if (!deuda_id || !cuenta_id || !monto_pago || isNaN(monto_pago) || monto_pago <= 0) {
        res.status(400).json({ error: "Debe proporcionar deuda_id, cuenta_id y un monto válido a pagar" });
        return;
    }

    try {
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

        const cuentaResult = await executeQuery("SELECT saldo FROM cuentas WHERE id = ?", [cuenta_id]);
        if (cuentaResult.rows.length === 0) {
            res.status(404).json({ error: "Cuenta no encontrada" });
            return;
        }

        // Convertir los valores a número para evitar errores de tipo
        const saldoCuenta = Number(cuentaResult.rows[0]?.saldo ?? 0);
        const montoPendiente = Number(deuda.monto_pendiente ?? 0);
        const montoPagoNum = Number(monto_pago);

        if (saldoCuenta < montoPagoNum) {
            res.status(400).json({ error: "Saldo insuficiente para pagar la deuda" });
            return;
        }

        if (montoPagoNum > montoPendiente) {
            res.status(400).json({ error: "El monto a pagar excede la deuda pendiente" });
            return;
        }

        const transaccion_id = uuidv4();
        await executeQuery(
            "INSERT INTO transacciones (id, monto, descripcion, tipo, cuenta_id) VALUES (?, ?, ?, 'gastos', ?)",
            [transaccion_id, montoPagoNum, `Pago parcial de deuda: ${deuda.descripcion}`, cuenta_id]
        );

        const nuevoMontoPendiente = montoPendiente - montoPagoNum;
        if (nuevoMontoPendiente <= 0) {
            await executeQuery(
                "UPDATE deudas SET estado = 'pagado', fecha_pago = datetime('now'), monto_pendiente = 0 WHERE id = ?",
                [deuda_id]
            );
        } else {
            await executeQuery("UPDATE deudas SET monto_pendiente = ? WHERE id = ?", [nuevoMontoPendiente, deuda_id]);
        }

        res.status(200).json({ message: "Pago parcial de deuda realizado exitosamente", monto_restante: nuevoMontoPendiente });
    } catch (error) {
        res.status(500).json({ error: "Error al procesar el pago parcial de la deuda" });
    }
};
