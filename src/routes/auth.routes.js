import passport from "passport";
import { Router } from "express";
import config from "../config.js";
import initAuthStrategies from "../auth/passport.strategies.js";
import { UserManager } from "../controllers/index.js";
import CustomError from "../services/custom.error.class.js";
import { errorDictionary } from "../config.js";
import { verifyRequiredBody } from "../services/index.js";
import { handlePolicies } from "../services/index.js";

const router = Router();

initAuthStrategies();

// Auth routes
router.post("/login", verifyRequiredBody(["email", "password"]), passport.authenticate("login", { failureRedirect: `/login?error=${encodeURI("Usuario y/o clave no válidos.")}` }), async (req, res) => {
    try {
      req.session.user = req.user;
      req.session.save(async (error) => {
        if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
        await req.logger.info(`${new Date().toDateString()} Usuario "${req.session.user.email}" logeado; Sesión almacenada. ${req.url}`);
        res.redirect("/products");
      });
    } catch (error) {
      req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
      res.send({ origin: config.SERVER, error: `[ERROR]: ${error}`});
    }
  }
);
router.post("/register", verifyRequiredBody(["first_name", "last_name", "password", "email", "phoneNumber", "description", "age"]), passport.authenticate("register", { failureRedirect: `/register?error=${encodeURI("Email y/o contraseña no válidos.")}` }), async (req, res) => {
    try {
      req.session.user = req.user;    
      let dbUser2 = await UserManager.addUser(req.user);
      req.session.user.role = dbUser2.role;
      req.session.save(async (error) => {
        if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
        await req.logger.info(`${new Date().toDateString()} Usuario "${req.session.user.email}" registrado; Sesión almacenada. ${req.url}`);
        res.redirect("/products");
      });
    } catch (error) {
      req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
      res.send({ origin: config.SERVER, error: `[ERROR]: ${error}`});
    }
  }
);
router.get("/ghlogin", passport.authenticate("ghlogin", { scope: ["user"] }), async (req, res) => {
}
);
router.get("/ghlogincallback", passport.authenticate("ghlogin", { failureRedirect: `/login?error=${encodeURI("Error de autenticación con GitHub")}` }), async (req, res) => {
    try {
      req.session.user = req.user;
      req.session.save(async (error) => {
        if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
        await req.logger.info(`${new Date().toDateString()} Usuario "${req.session.user.email}" logeado con GitHub; Sesión almacenada. ${req.url}`);
        res.redirect("/profile");
      });
    } catch (error) {
      req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
      res.send({ origin: config.SERVER, error: `[ERROR]: ${error}`});
    };
  }
);
router.get("/private", handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    if (!req.session.user) {
      res.redirect("/login");
    } else if (req.session.user.role == "admin") {
      try {
        res.status(200).send("Bienvenido, admin.");
      } catch (error) {
        throw new CustomError(errorDictionary.UNHANDLED_ERROR, `${error}`);
      }
    } else {
      try {
        throw new CustomError(errorDictionary.AUTHORIZE_USER_ERROR, `Sólo los administradores del sitio pueden ingresar.`);
      } catch (error) {
        throw new CustomError(errorDictionary.UNHANDLED_ERROR, `${error}`);
      }
    }
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, error: `[ERROR]: ${error}`});
  };
});
router.get("/logout", async (req, res) => {
  try {
    const email = req.session.user.email;
    req.session.destroy(async (error) => {
      if (error) throw new CustomError(errorDictionary.SESSION_ERROR, `${error}`);
      await req.logger.info(`${new Date().toDateString()} Usuario "${email}" cerró sesión; Sesión destruída. ${req.url}`);
      res.redirect("/login");
    });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, error: `[ERROR]: ${error}`});
}
});
router.get("/current", async (req, res) => {
  try {
    if (!req.session.user) return res.redirect("/login");
    const myUser = await UserManager.findFilteredUser(req.session.user.email);
    res.status(200).send({origin: config.SERVER, payload: myUser });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, error: `[ERROR]: ${error}`});
}
});
export default router;
