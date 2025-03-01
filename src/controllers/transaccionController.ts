import { Request, Response } from 'express';
import { executeQuery } from '../services/dbService';
import { AppError } from '../utils/appError';
import { subiryConvetirR2 } from '../services/r2Service';
import { v4 as uuidv4 } from 'uuid';

// Obtener todas las transacciones
export const getTransacciones = async (req: Request, res: Response): Promise<void> => {
    try {
        // Realizamos el JOIN para obtener las transacciones y el nombre de la cuenta
        const results = await executeQuery(`
            SELECT transacciones.*, cuentas.nombre AS cuenta_nombre
            FROM transacciones
            JOIN cuentas ON transacciones.cuenta_id = cuentas.id
            ORDER BY transacciones.fecha DESC;
        `);
        res.status(200).json(results.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener transacciones' });
    }
};


// Obtener una transacción por ID
export const getTransaccionPorId = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const resultados = await executeQuery("SELECT * FROM transacciones WHERE id = ?", [id]);

        if (resultados.rows.length > 0) {
            const transaccion = resultados.rows[0];
            res.status(200).json({ transaccion });
        } else {
            throw new AppError("Transacción no encontrada", 404);
        }
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al obtener la transacción' });
        }
    }
};

// Crear una nueva transacción
export const crearTransaccion = async (req: Request, res: Response): Promise<void> => {
    const { monto, descripcion, tipo, fecha, cuenta_id } = req.body;
    const file = req.files && typeof req.files === 'object' && 'file' in req.files
        ? (req.files['file'] as Express.Multer.File[])[0]
        : undefined;
    try {
        // Validación de campos obligatorios
        if (!monto || !descripcion || !tipo || !fecha || !cuenta_id) {
            throw new AppError('Faltan campos obligatorios', 400);
        }
        // Subir archivo si existe
        let imageUrl = '';
        if (file) {
            imageUrl = await subiryConvetirR2(file, 'transacciones'); // Si hay archivo, lo sube y obtiene la URL
        }

        const id = uuidv4();

        await executeQuery(
            "INSERT INTO transacciones (id, monto, descripcion, tipo, fecha, cuenta_id, recibo) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, monto, descripcion, tipo, fecha, cuenta_id, imageUrl || '']
        );

        res.status(201).json({ message: 'Transacción creada exitosamente' });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al crear la transacción' });
        }
    }
};

//Enpoint para tranferir entre cuentas
export const transferirFondos = async (req: Request, res: Response): Promise<void> => {
    const { monto, descripcion, cuenta_origen, cuenta_destino, fecha } = req.body;

    try {
        // Validación de campos obligatorios
        if (!monto || !descripcion || !cuenta_origen || !cuenta_destino || !fecha) {
            throw new AppError('Faltan campos obligatorios', 400);
        }

        if (cuenta_origen === cuenta_destino) {
            throw new AppError('Las cuentas origen y destino no pueden ser iguales', 400);
        }

        // Crear transacción de débito (gasto) en la cuenta de origen
        const idGasto = uuidv4();
        await executeQuery(
            "INSERT INTO transacciones (id, monto, descripcion, tipo, fecha, cuenta_id) VALUES (?, ?, ?, ?, ?, ?)",
            [idGasto, monto, descripcion, 'gastos', fecha, cuenta_origen]
        );

        // Crear transacción de crédito (ingreso) en la cuenta de destino
        const idIngreso = uuidv4();
        await executeQuery(
            "INSERT INTO transacciones (id, monto, descripcion, tipo, fecha, cuenta_id) VALUES (?, ?, ?, ?, ?, ?)",
            [idIngreso, monto, descripcion, 'ingresos', fecha, cuenta_destino]
        );

        res.status(201).json({ message: 'Transferencia realizada exitosamente' });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al realizar la transferencia' });
        }
    }
};

// Actualizar una transacción
export const actualizarTransaccion = async (req: Request, res: Response): Promise<void> => {
    const transaccionId = req.params.id;
    const { monto, descripcion, tipo, fecha, recibo } = req.body;

    try {
        const datosActualizar: { [key: string]: string | number } = { monto, descripcion, tipo, fecha };
        if (recibo) {
            datosActualizar.recibo = recibo;
        }

        await executeQuery(
            `UPDATE transacciones SET ${Object.keys(datosActualizar).map(key => `${key} = ?`).join(', ')} WHERE id = ?`,
            [...Object.values(datosActualizar), transaccionId]
        );

        res.status(200).json({ message: 'Transacción actualizada exitosamente' });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al actualizar la transacción' });
        }
    }
};

// Eliminar una transacción
export const eliminarTransaccion = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        await executeQuery("DELETE FROM transacciones WHERE id = ?", [id]);
        res.status(200).json({ message: 'Transacción eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la transacción' });
    }
};
