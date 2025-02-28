import express, { Application, Request, Response } from 'express';
import routes from './routes';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import helmet from 'helmet';

// Configuración de variables de entorno

dotenv.config(); // Carga las variables de entorno desde un archivo .env para que puedan ser usadas en la aplicación.

const app: Application = express(); // Inicializa la aplicación Express.
const port = process.env.PORT || 3000; // Define el puerto en el que correrá el servidor, utilizando la variable de entorno o el puerto 3000 por defecto.

// Configuración de seguridad con Helmet
app.use(helmet()); // Aplica configuraciones de seguridad recomendadas para Express, como ocultar cabeceras que podrían revelar información del servidor.

// Configuración de CORS
const allowedOrigins = [process.env.URL_FRONTEND, process.env.URL_LOCAL]; // Lista de orígenes permitidos para realizar solicitudes al servidor.

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Permite la solicitud si el origen está en la lista de permitidos.
    } else {
      callback(new Error('No permitido por CORS')); // Rechaza la solicitud si el origen no está permitido.
    }
  },
  allowedHeaders: ['Content-Type', 'Authorization'], // Cabeceras permitidas en las solicitudes.
}));

app.use(express.json()); // Habilita el middleware para analizar solicitudes entrantes con datos JSON.

// Configuración de multer para manejo de archivos
const storage = multer.memoryStorage();
const upload = multer({
    storage,
}).fields([
    { name: 'imagen_principal', maxCount: 1 },
    { name: 'imagenes_adicionales[]', maxCount: 5 },
    { name: 'file', maxCount: 1 },
]);

//direcciones con los respectvios routes
app.use('/api/v1', upload, routes);

// Configuración del motor de plantillas EJS
app.set('views', path.join(__dirname, 'views'));// Define el directorio donde están las vistas (templates) de la aplicación.
app.set('view engine', 'ejs');// Establece EJS como el motor de plantillas para renderizar vistas.


// Ruta para la página principal
app.get('/', (req: Request, res: Response) => {
  res.render('index', { title: 'Página Principal', message: 'Bienvenido a la Página Principal' });
});// Define una ruta GET para la página principal que renderiza la vista 'index.ejs' con los datos proporcionados.


// Inicio del servidor
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});// Inicia el servidor en el puerto definido y muestra un mensaje en la consola indicando que el servidor está corriendo.
