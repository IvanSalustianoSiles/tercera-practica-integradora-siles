import { Router } from "express";
import { UserManager, ProductManager } from "../controllers/index.js";
import { createHash, generateDateAndHour, generateRandomCode, isValidPassword, verifyMDBID } from "../services/index.js";
import config from "../config.js";
import { handlePolicies } from "../services/index.js";
import { errorDictionary } from "../config.js";
import nodemailer from "nodemailer";
import CustomError from "../services/custom.error.class.js";

const router = Router();

const transport = nodemailer.createTransport({
  service: "gmail",
  port: 587,
  auth: {
    user: config.GMAIL_APP_USER,
    pass: config.GMAIL_APP_PASSWORD
  }
});

router.get("/", async (req, res) => {
  try {
    const users = await UserManager.paginateUsers(req.query.limit, req.query.page, req.query.role, "/api/users"); 
    if (!users) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
    res.send({ status: 1, payload: users });
  } catch (error){
    return error;
  }
});
router.post("/", handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    const process = await UserManager.addUser(req.body);
    if (!process) throw new CustomError(errorDictionary.ADD_DATA_ERROR, `Usuario`);
    await req.logger.info(`${new Date().toDateString()} Usuario agregado. ${req.url}`);
    res.status(200).send({ status: 1, payload: process });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, error: `[ERROR]: ${error}`});
}
});
router.put("/:id", handlePolicies(["ADMIN"]), verifyMDBID(["id"]), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    const update = req.body;
    const options = { new: true };
    const process = await UserManager.updateUser(filter, update, options);
    if (!process) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, `Usuario`);
    res.status(200).send({ origin: config.SERVER, payload: process });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, error: `[ERROR]: ${error}`});
}
});
router.delete("/:id", handlePolicies(["ADMIN"]), verifyMDBID(["id"]), async (req, res) => {
  try {
    const filter = { _id: req.params.id };
    const process = await UserManager.deleteUser(filter);
    if (!process) throw new CustomError(errorDictionary.DELETE_DATA_ERROR, `Usuario`);
    await req.logger.info(`${new Date().toDateString()} Usuario de ID ${req.params.id} eliminado. ${req.url}`);
    res.status(200).send({ origin: config.SERVER, payload: process });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, error: `[ERROR]: ${error}`});
}
});
router.post("/restore", async (req, res) => {
  try {
    const { email } = req.body;

    const emailValidation = await UserManager.findUserByEmail(email);

    if (!emailValidation) res.redirect(`/restore?error=${encodeURI("Correo inválido.")}`);
    
    req.session.secretCode = generateRandomCode(15);
    req.session.user = emailValidation;
    req.session.cookie.maxAge = 1000 * 60 * 60; 
    req.session.save(error => {
      if (error) CustomError(errorDictionary.SESSION_ERROR, `${error.message}`);
      res.redirect(`/restore?ok=${encodeURI("Listo! revisa tu bandeja de entrada.")}`);

    })
    const emailSending = await transport.sendMail({
      from: `Las Chicas <${config.GMAIL_APP_USER}>`, 
      to: email,
      subject: `[NO RESPONDER A ESTE CORREO] Cambio de contraseña`,
      html: 
      `<div> 
        <h1>Hola, ${emailValidation.first_name}!</h1>
        <h2>Este es tu link de cambio de contraseña:</h2>
        <a href=http://localhost:8080/restorecallback/${req.session.secretCode}>Validar contraseña</a>
        <h4>Hora [ARG]: ${generateDateAndHour()}</h4>
        <h2>Vence muy pronto así que te recomendamos usarlo ahora mismo.</h2>
        <h2>Hasta luego y gracias por elegirnos!</h2>
      </div>`
    });
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, error: error});
}
});
router.post("/restorecallback", async (req, res) => {
  try {

    if (!req.session.secretCode) res.redirect(`/restore?error=${encodeURI(`Acceso denegado: Probablemente su link caducó.`)}`);
    
    const { password } = req.body;    

    const validationPass = isValidPassword(req.session.user, password);

    if (validationPass) res.redirect(`/restorecallback/${req.session.secretCode}?dataError=${encodeURI(`Escriba una contraseña diferente.`)}`);

    const updatedUser = await UserManager.updateUser({ email: req.session.user.email }, { password: createHash(password) });

    if (!updatedUser) throw new CustomError(errorDictionary.UPDATE_DATA_ERROR, "Usuario");

    res.redirect(`/login?changepass=${encodeURI(`Contraseña cambiada con éxito. ¿La probamos?`)}`);
    
  } catch (error) {
    req.logger.error(`${new Date().toDateString()}; ${error}; ${req.url}`);
    res.send({ origin: config.SERVER, error: error});
  }
});
router.post("/premium/:uid", verifyMDBID(["uid"]), handlePolicies(["ADMIN"]), async (req, res) => {
  try {
    const { uid } = req.params;

    const myUser = await UserManager.findUserById(uid);
        
    if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);

    let role = myUser.role.toUpperCase();

    if (role == "USER") {
      const updateOne = await UserManager.updateUser({_id: myUser._id}, {role: "premium"});
      if (!updateOne) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
      res.send({ origin: config.SERVER, payload: `Rol de usuario ${myUser.first_name} ${myUser.last_name} actualizado a ${updateOne.role}.`})
    } else {
      const updateTwo = await UserManager.updateUser({_id: myUser._id}, {role: "user"});
      if (!updateTwo) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
      res.send({ origin: config.SERVER, payload: `Rol de usuario ${myUser.first_name} ${myUser.last_name} actualizado a ${updateTwo.role}.`})
    }
  } catch (error) {
    res.send({ origin: config.SERVER, error: error });
  }
});
export default router;
