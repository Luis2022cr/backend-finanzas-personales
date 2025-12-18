import { Request, Response } from 'express';
import { executeQuery } from '../services/dbService';
import { AppError } from '../utils/appError';
import { subiryConvetirR2 } from '../services/r2Service';
import { v4 as uuidv4 } from 'uuid';

export const getCriptos = async (req: Request, res: Response): Promise<void> => {
    try {
        const results = await executeQuery(
            "SELECT * FROM criptos ORDER BY nombre;"
        );
        res.status(200).json(results.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener criptos' });
    }
};

export const getTransaccionesCripto = async (req: Request, res: Response): Promise<void> => {
    try {
        const results = await executeQuery(
            "SELECT * FROM transaccionesCripto ORDER BY fecha DESC;"
        );
        res.status(200).json(results.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener transacciones cripto' });
    }
};



export const crearTransaccionCripto = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { cripto_id, tipo, cantidad, precio_unitario } = req.body;

    // Validaciones básicas
    if (!cripto_id || !tipo || !cantidad || cantidad <= 0) {
        res.status(400).json({ error: "Datos inválidos" });
        return;
    }

    if (!["COMPRA", "VENTA", "EARN"].includes(tipo)) {
        res.status(400).json({ error: "Tipo de transacción inválido" });
        return;
    }

    const total_usd = tipo === "EARN" ? 0 : cantidad * (precio_unitario ?? 0);

    try {
        // 1️⃣ Obtener estado actual de la cripto
        const criptoResult = await executeQuery(
            "SELECT cantidad, precio_promedio FROM criptos WHERE id = ?",
            [cripto_id]
        );

        if (criptoResult.rows.length === 0) {
            res.status(404).json({ error: "Cripto no encontrada" });
            return;
        }

        // Convertimos los valores a number para operaciones seguras
        const cantidadActualNum = Number(criptoResult.rows[0].cantidad ?? 0);
        const precioPromedioActualNum = Number(criptoResult.rows[0].precio_promedio ?? 0);

        let nuevaCantidad: number = cantidadActualNum;
        let nuevoPrecioPromedio: number = precioPromedioActualNum;

        // 2️⃣ Calcular según tipo
        if (tipo === "COMPRA") {
            const costoActual = cantidadActualNum * precioPromedioActualNum;
            const costoCompra = cantidad * (precio_unitario ?? 0);

            nuevaCantidad = cantidadActualNum + cantidad;
            nuevoPrecioPromedio =
                nuevaCantidad > 0 ? (costoActual + costoCompra) / nuevaCantidad : 0;
        }

        if (tipo === "VENTA") {
            if (cantidad > cantidadActualNum) {
                res.status(400).json({ error: "Cantidad insuficiente para vender" });
                return;
            }
            nuevaCantidad = cantidadActualNum - cantidad;
        }

        if (tipo === "EARN") {
            nuevaCantidad = cantidadActualNum + cantidad;
        }

        // 3️⃣ Insertar transacción
        await executeQuery(
            `
            INSERT INTO transaccionesCripto 
            (cripto_id, tipo, cantidad, precio_unitario, total_usd)
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                cripto_id,
                tipo,
                cantidad,
                tipo === "EARN" ? 0 : precio_unitario,
                total_usd,
            ]
        );

        // 4️⃣ Actualizar cripto
        await executeQuery(
            `
            UPDATE criptos
            SET cantidad = ?, precio_promedio = ?, fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = ?
            `,
            [nuevaCantidad, nuevoPrecioPromedio, cripto_id]
        );

        res.status(201).json({
            message: "Transacción cripto registrada correctamente",
            nuevaCantidad,
            nuevoPrecioPromedio,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al registrar la transacción cripto" });
    }
};
