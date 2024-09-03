// Imports
import config from "./config.js";
import express from "express";
import handlebars from "express-handlebars";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport from "passport";
import cluster from "cluster";
import cors from "cors";
import { CLOptions } from "./config.js";
import { initSocket, errorHandler, addLogger }  from "./services/index.js";
import { productRoutes, cartRoutes, viewRoutes, userRoutes, authRoutes } from "./routes/index.js";
import { MongoSingleton }  from "./services/index.js";

// Inicializamos cluster
if (cluster.isPrimary) {
  for (let i = 0; i < 2; i++) cluster.fork(); // cpus.length me devuelve cero.
  cluster.on("exit", (worker, code, signal) => {
    console.log(`Instancia ${worker.process.pid} caída.`);
    cluster.fork();
  })
} else {
  try {
    // Server init
    const app = express();
    const httpServer = app.listen(config.PORT, async () => {
      await MongoSingleton.getInstance(); // Lo manejamos con promesas, como hacíamos con Firebase en React.
      console.log(
        `[CL_OPTIONS]:`, 
        CLOptions, 
        "\n", 
        `Servidor activo en el puerto ${config.PORT}, conectado a [${config.DATA_SOURCE}]:'${config.SERVER}', [PID]: ${process.pid}.`
      );
    });
    const socketServer = initSocket(httpServer);
  
    // Settings & app middlewares:
  
    // General
    app.use(cors({
      origin: "*"
    }));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser(config.SECRET));
    app.use(
      session({
        secret: config.SECRET,
        resave: true,
        saveUninitialized: true,
        store: MongoStore.create({
          mongoUrl: config.MONGO_URI,
          mongoOptions: { useNewUrlParser: true, useUnifiedTopology: true },
          ttl: 28800,
        }),
        cookie: {
          maxAge: 1000 * 60 * 60,
          httpOnly: true,
          sameSite: "lax"
        }
        // store: new fileStorage({path: "./sessions", ttl: 3600000, retries: 0})
      })
    );
    app.use(passport.initialize());
    app.use(passport.session());
    app.set("socketServer", socketServer);
  
    // Views
    app.engine("handlebars", handlebars.engine());
    app.set("views", `${config.DIRNAME}/views`);
    app.set("view engine", "handlebars");
  
    app.use(addLogger);
  
    // Routes
    app.use("/", viewRoutes);
    app.use("/api/products", productRoutes);
    app.use("/api/carts", cartRoutes);
    app.use("/api/users", userRoutes);
    app.use("/api/auth", authRoutes);
  
    // Static
    app.use("/static", express.static(`${config.DIRNAME}/public`));
    app.use(errorHandler);
  } catch (error) { 
    console.log(error.message);
  }
};

