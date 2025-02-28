import { Request, Response } from 'express';
import { executeQuery } from '../services/dbService';
import { AppError } from '../utils/appError';
import { subiryConvetirR2 } from '../services/r2Service';
import { v4 as uuidv4 } from 'uuid';

// Obtener todas las cuentas
export const getCuentas = async (req: Request, res: Response): Promise<void> => {
    try {
        const results = await executeQuery("SELECT * FROM cuentas ORDER BY nombre;");
        res.status(200).json(results.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener cuentas' });
    }
};

// Obtener una cuenta por ID
export const getCuentaPorId = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const resultados = await executeQuery("SELECT * FROM cuentas WHERE id = ?", [id]);

        if (resultados.rows.length > 0) {
            const cuenta = resultados.rows[0];
            res.status(200).json({ cuenta });
        } else {
            throw new AppError("Cuenta no encontrada", 404);
        }
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al obtener la cuenta' });
        }
    }
};

// Crear una nueva cuenta
export const crearCuenta = async (req: Request, res: Response): Promise<void> => {
    const { nombre, saldo, numero_cuenta } = req.body;
    const file = req.files && typeof req.files === 'object' && 'file' in req.files
        ? (req.files['file'] as Express.Multer.File[])[0]
        : undefined;

    try {
        // Validación de campos obligatorios
        if (!nombre || !saldo || !numero_cuenta) {
            throw new AppError('Faltan campos obligatorios', 400);
        }
        if (!file) {
            throw new AppError("No se proporcionó ningún archivo.", 400);
        }

        const imageUrl = await subiryConvetirR2(file, 'ceuntas');
        const id = uuidv4();

        await executeQuery("INSERT INTO cuentas (id, nombre, saldo, numero_cuenta, imagen) VALUES (?, ?, ?, ?, ?)",
            [id,nombre, saldo, numero_cuenta, imageUrl || '']);

        res.status(201).json({ message: 'Cuenta creada exitosamente' });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al crear la cuenta' });
        }
    }
};

// Actualizar una cuenta
export const actualizarCuenta = async (req: Request, res: Response): Promise<void> => {
    const cuentaId = req.params.id;
    const { nombre, saldo, numero_cuenta, imagen } = req.body;

    try {
        const datosActualizar: { [key: string]: string | number } = { nombre, saldo, numero_cuenta };
        if (imagen) {
            datosActualizar.imagen = imagen;
        }

        await executeQuery(
            `UPDATE cuentas SET ${Object.keys(datosActualizar).map(key => `${key} = ?`).join(', ')} WHERE id = ?`,
            [...Object.values(datosActualizar), cuentaId]
        );

        res.status(200).json({ message: 'Cuenta actualizada exitosamente' });
    } catch (error) {
        if (error instanceof AppError) {
            res.status(error.statusCode).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Error al actualizar la cuenta' });
        }
    }
};

// Eliminar una cuenta
export const eliminarCuenta = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        await executeQuery("DELETE FROM cuentas WHERE id = ?", [id]);
        res.status(200).json({ message: 'Cuenta eliminada exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar la cuenta' });
    }
};
