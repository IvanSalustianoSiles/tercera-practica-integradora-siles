import config from "../../config.js";
import { errorDictionary } from "../../config.js";
import CustomError from "../custom.error.class.js";
import fs from "fs";
import { generateRandomId } from "../utils.js";

// Clase para controlar los métodos referentes a los usuarios.
class UserFSClass {
  constructor() {
    this.userArray = [];
    this.path = `${config.DIRNAME}/jsons/user.json`;
  }
  getAllUsers = async () => {
    try {
      await this.readFileAndSave();
      const users = this.userArray();
      if (!users) throw new CustomError(errorDictionary.GENERAL_FOUND_ERROR, `Users`);
      return users;
    } catch (error) {
      return undefined;
    };
  };
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
      await this.readFileAndSave();
      const myUser = await this.userArray.find(user => user.email == emailValue);
      if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);  
      return myUser;
    } catch (error) {
      return undefined;
    }
  };
  findUserById = async (uid) => {
    try {
      await this.readFileAndSave();
      const myUser = await this.userArray.find(user => user._id == uid);
      if (!myUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR);  
      return myUser;
    } catch (error) {
      return undefined;
    }
  };
  addUser = async (user) => {
    try {
      if (Object.values(user).includes(undefined) || Object.values(user).includes("")) throw new CustomError(errorDictionary.FEW_PARAMS_ERROR, "Ingrese más datos de usuario.");
      const role = user.role;
      user.role = !role ? "user" : user.role;
      user._id = generateRandomId();
      while (this.userArray.some(pUser => pUser._id == user._id)) {
        user._id = generateRandomId();
      };
      await this.readFileAndSave();
      this.userArray.push({ ...user });
      await this.updateFile(this.userArray);
      return user;
    } catch (error) {
      return undefined;
    }
  };
  updateUser = async (filter, update, options = { new: true }) => {
    try {
        await this.readFileAndSave();
        let filteredUser = {};
        for (let i = 0; i < Object.values(filter).length; i++) {
          let filterValue = Object.values(filter)[i];
          let filterProp = Object.keys(filter)[i];
          this.userArray = this.userArray.filter(user => user[filterProp] == filterValue);
        };
        filteredUser = await this.userArray[0];
        if (!filteredUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a actualizar`);
        let updatedUser = filteredUser;
        await this.readFileAndSave();
        const userIndex = this.userArray.indexOf(filteredUser);
        for (let i = 0; i < Object.values(update).length; i++) {
          let updateValue = Object.values(update)[i];
          let updateProp = Object.keys(update)[i];
          updatedUser[updateProp] = updateValue;
        };

        if (!updatedUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario actualizado`);
  
        this.userArray.splice(userIndex, 1, updatedUser);
        await this.updateFile(this.userArray);
        if (options.new == true) {
          return updatedUser;
        } else {
          return filteredUser;
        };
    } catch (error) {
      return undefined;
    };
  };
  deleteUser = async (filter) => {
    try {
      await this.readFileAndSave();
      let filteredUser = {hombre: true, casado: false, money: 0};
      for (let i = 0; i < Object.values(filter).length; i++) {
        let filterValue = Object.values(filter)[i];
        let filterProp = Object.keys(filter)[i];
        this.userArray = this.userArray.filter(user => user[filterProp] == filterValue);
      };
      filteredUser = await this.userArray[0];
      if (!filteredUser) throw new CustomError(errorDictionary.FOUND_USER_ERROR, `Usuario a eliminar`);
      await this.readFileAndSave();
      let filteredIndex = this.userArray.indexOf(filteredUser);
      this.userArray.splice(filteredIndex, 1);
      await this.updateFile(this.userArray);
      return filteredUser;
    } catch (error) {
      return undefined;
    }
  };
  paginateUsers = async (limit = 10, page = 1, role, where) => {
    try {
      
      const lecture = await this.readFileAndSave();

      let matrixUsers = [];
      let j = 0;
      matrixUsers.push([]);

      role
        ? (this.userArray = this.userArray.filter(
            (user) => user.role == role
          ))
        : this.userArray;

      for (let i = 0; i < this.userArray.length; i++) {
        if (i == 0 || !(i % limit == 0)) {
          matrixUsers[j].push(this.userArray[i]);
        } else {
          matrixUsers.push([]);
          j++;
          matrixUsers[j].push(this.userArray[i]);
        }
      }
      let pageUsers = matrixUsers[page - 1];
      let totalPages = matrixUsers.length;
      let prevPage = page == 1 ? undefined : page - 1;
      let nextPage = !matrixUsers[page] ? undefined : page + 1;
      let prevUrl;
      let nextUrl;

      if (role) {
        prevPage
          ? (prevUrl = `${where}?role=${role}&page=${prevPage}&limit=${limit}`)
          : null;
        nextPage
          ? (nextUrl = `${where}?role=${role}&page=${nextPage}&limit=${limit}`)
          : null;
      } else {
        prevPage
          ? (prevUrl = `${where}?page=${prevPage}&limit=${limit}`)
          : null;
        nextPage
          ? (nextUrl = `${where}?page=${nextPage}&limit=${limit}`)
          : null;
      }
      this.getting = false;

      const paginateUsersFormat = pageUsers.map( user => {
        user = { _doc: user, _id: user._id }
        return user;
      });

      const toSendObject = {
        status: "success",
        payload: { docs: paginateUsersFormat, prevPage: prevPage, page: page, totalPages: totalPages, nextPage: nextPage },
        prevLink: prevUrl,
        nextLink: nextUrl,
      };
    
      return toSendObject;

    } catch (error) {
      return undefined;
    }
  };
  updateFile = async (array) => {
    try {
      fs.writeFileSync(`${this.path}`, JSON.stringify(array));
    } catch (error) {
      return undefined;
    }
  };
  readFileAndSave = async () => {
    try {
      if (fs.existsSync(this.path)) {
        let fileContent = fs.readFileSync(this.path, "utf-8") || null;
        let parsedFileContent = await JSON.parse(fileContent) || null;
        this.userArray = await parsedFileContent || [];
      } else {
        this.updateFile(this.userArray);
      }
      return this.userArray;
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
// updateFile (array)
// readFileAndSave()

const UserFSService = new UserFSClass();

export default UserFSService;
