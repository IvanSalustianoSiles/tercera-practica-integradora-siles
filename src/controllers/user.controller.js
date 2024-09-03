import config from "../config.js";
import { UserMDBService, UserFSService } from "../services/index.js";
import { errorDictionary } from "../config.js";
import CustomError from "../services/custom.error.class.js";

class UserDTOCLass {
  constructor() {
  };
  removeSensitive = async (user) => {
    try {
      const { password, email, phoneNumber, ...filteredUser } = user;
      return filteredUser;
    } catch (error) {
      throw new CustomError(errorDictionary.UNHANDLED_ERROR, `Error de ejecución DTO; [${error}]`);
    }
  };
  parseStringToNumbers = async (stringyNumbs) => {
    try {
      let numbyStrings = {};
      for (let i = 0; i < Object.values(stringyNumbs).length; i++) {
        let myString = Object.values(stringyNumbs)[i];
        let stringKey = Object.keys(stringyNumbs)[i];
        if (myString == +myString) {
          myString = +myString;
        };
        numbyStrings[stringKey] = myString;
      };
      return numbyStrings;
    } catch (error) {
      throw new CustomError(error.type, `Error de ejecución DTO; [${error.message}]`);
    }
  };
};

const DTO = new UserDTOCLass();

// Clase para controlar los métodos referentes a los usuarios.
class UserManagerClass {
  constructor(service) {
    this.service = service;
  };
  getAllUsers = async () => {
    try {
      await this.readFileAndSave();
      const users = this.userArray();
      if (!users) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Users`);
      return users;
    } catch (error) {
      throw new CustomError(error.type, `[Service::MDB]: ${error}`);
    };
  };
  isRegistered = async (focusRoute, returnObject, req, res) => {
    try {
      return await this.service.isRegistered(focusRoute, returnObject, req, res);
    } catch (error) {
      throw new CustomError(error.type, `[isRegistered]: ${error.message}`);
    }
  };
  findUserByEmail = async (emailValue) => {
    try {
      return await this.service.findUserByEmail(emailValue);
    } catch (error) {
      throw new CustomError(error.type, `[findUserByEmail]: ${error.message}`);
    }
  };
  findUserById = async (uid) => {
    try {
      const myUser = await this.service.findUserById(uid);
      if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);  
      return myUser;
    } catch (error) {
      return undefined;
    }
  };
  findFilteredUser = async (emailValue) => {
    try {
      const foundUser = await this.service.findUserByEmail(emailValue);
      const filteredUser = await DTO.removeSensitive(foundUser);
      return filteredUser;
    } catch (error) {
      throw new CustomError(error.type, `[findFilteredUser]: ${error.message}`);
    }
  };
  addUser = async (user) => {
    try {
      return await this.service.addUser(user);
    } catch (error) {
      throw new CustomError(error.type, `[addUser]: ${error.message}`);
    }
  };
  updateUser = async (filter, update, options) => {
    try {
      return await this.service.updateUser(filter, update, options);
    } catch (error) {
      throw new CustomError(error.type, `[updateUser]: ${error.message}`);
    }
  };
  deleteUser = async (filter) => {
    try {
      return await this.service.deleteUser(filter);
    } catch (error) {
      throw new CustomError(error.type, `[deletetUser]: ${error.message}`);
    }
  };
  paginateUsers = async (limit, page, role, where) => {
    try {
      const parsed = await DTO.parseStringToNumbers({limit, page, role, where});     
      return await this.service.paginateUsers(parsed != {} ? parsed.limit : limit, parsed != {} ? parsed.page : page, parsed != {} ? parsed.role : role, where);
    } catch (error) {
      throw new CustomError(error.type, `[paginateUsers]: ${error.message}`);
    }
  };
};

// Métodos a utilizar:
// isRegistered (focusRoute, returnObject, req, res)
// findUserByEmail (emailValue)
// addUser (user)
// updateUser (filter, update, options)
// deleteUser (filter)
// paginateUsers (...filters)


const service = config.DATA_SOURCE == "MDB" 
? UserMDBService
: UserFSService;

const UserManager = new UserManagerClass(service);

export default UserManager;

