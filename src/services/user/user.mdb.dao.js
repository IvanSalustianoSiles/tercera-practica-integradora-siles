import config from "../../config.js";
import { usersModel } from "../../models/index.js";
import { errorDictionary } from "../../config.js";
import CustomError from "../custom.error.class.js";

// Clase para controlar los métodos referentes a los usuarios.
class UserMDBClass {
  constructor(model) {
    this.model = model;
  };
  getAllUsers = async () => {
    try {
      const users = await this.model.find().lean();
      if (!users) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Users`);
      return users;
    } catch (error) {
      return undefined;
    };
  }
  isRegistered = async (focusRoute, returnObject, req, res) => {
    try {
      return req.session.user
        ? res.render(focusRoute, returnObject)
        : res.redirect("/login");
    } catch (error) {
      return undefined;
    }
  };
  findUserByEmail = async (emailValue) => {
    try {
      let myUser = await usersModel.find({ email: emailValue }).lean();
      if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);
      return myUser[0];
    } catch (error) {
      return undefined;
    }
  };
  findUserById = async (uid) => {
    try {
      const myUser = await this.model.findById(uid);
      if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);  
      return myUser;
    } catch (error) {
      return undefined;
    }
  };
  addUser = async (user) => {
    try {
      const dbUser = await this.model.create({ ...user });
      if (!dbUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a agregar`);
      return dbUser;
    } catch (error) {
      return undefined;
    }
  };
  updateUser = async (filter, update, options = { new: true }) => {
    try {
      console.log(filter, update);
      
      const dbUser = await this.model.findOneAndUpdate(filter, update, options);
      
      if (!dbUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a actualizar`);
      return dbUser;
    } catch (error) {
      return undefined;
    }
  };
  deleteUser = async (filter) => {
    try {
      const dbUser = await this.model.findOneAndDelete(filter);
      if (!dbUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a eliminar`);
      return dbUser;
    } catch (error) {
      return undefined;
    }
  };
  paginateUsers = async (limit = 10, page = 1, role = "user", where) => {
    try {
      const dbUsers = await this.model.paginate({ role: role }, { page: page, limit: limit });
      if (!dbUsers) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuarios paginados`);
      return dbUsers;
    } catch (error) {
      return undefined;
    }
  };
};

// Métodos a utilizar:
// isRegistered (focusRoute, returnObject, req, res)
// isRegisteredwToken (focusRoute, returnObject, req, res)
// findUserByEmail (emailValue)
// addUser (user)
// updateUser (filter, update, options)
// deleteUser (filter)
// paginateUsers (...filters)

const UserMDBService = new UserMDBClass(usersModel);

export default UserMDBService;
